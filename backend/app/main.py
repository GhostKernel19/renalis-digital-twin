#!/usr/bin/env python3
"""
RENALIS Digital Twin FastAPI Backend
Digital Twin Challenge 2026

Main application entrypoint providing REST endpoints for:
- System Health & Synthetic Cohort Verification (/health)
- Patient Cohort & Filtering (/patients, /patients/{id}, /patients/{id}/readings)
- Digital Twin State & 3-Month Projection (/patients/{id}/twin)
- Patient Intake & eGFR Calculation via 2021 CKD-EPI (/patients)
- Patient Daily Telemetry & Demonstration Urgent Rules (/patients/{id}/logs)
- Care Coordination Referrals (/referrals, /referrals/{id})
- Generic Care Team Follow-Ups (/follow-ups, /follow-ups/{id})
- Aggregate Cohort & Operational Statistics (/stats)
- Legacy Progression Assessment (/assess-patient)

Notice: All patient data and longitudinal telemetry are 100% synthetic.
Outputs are demonstration research prototypes for the Digital Twin Challenge 2026;
they are NOT clinically validated and MUST NOT be used for clinical decision-making.
Strictly adheres to Rule 5: NO drug names, doses, or treatment advice anywhere.
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
import sys
from typing import Any, Dict, List, Optional
import uuid

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware

# Ensure root directory is in sys.path for cross-module imports (ml.*)
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.app.database import (
    get_db_stats,
    get_daily_logs_by_patient,
    get_follow_ups,
    get_referrals,
    init_db,
    insert_added_patient,
    insert_assessment,
    insert_daily_log,
    insert_follow_up,
    insert_patient_readings,
    insert_referral,
    update_follow_up,
    update_referral,
)
from backend.app.data_loader import (
    check_synthetic_files,
    get_all_patients,
    get_cohort_risk_tier_distribution,
    get_patient_by_id,
    get_patient_readings,
    get_patients_file_path,
)
from backend.app.schemas import (
    AssessPatientRequest,
    AssessPatientResponse,
    DailyLogCreate,
    DailyLogResponse,
    FollowUpCreate,
    FollowUpResponse,
    FollowUpUpdate,
    PatientIntakeRequest,
    ReferralCreate,
    ReferralResponse,
    ReferralUpdate,
    StatsResponse,
    TwinResultResponse,
)
from backend.app.trend_estimator import estimate_3m_egfr_trend
from ml.features import FEATURE_PLAIN_NAMES

MODEL_PATH = ROOT_DIR / "ml" / "models" / "risk_model.joblib"
BASELINE_MODEL_PATH = ROOT_DIR / "ml" / "models" / "baseline_model.joblib"


def calculate_ckd_epi_2021(scr: float, age: float, sex: str) -> float:
    """Calculate baseline eGFR using the 2021 CKD-EPI Creatinine equation (without race).

    Reference: Inker LA, Eneanya ND, Coresh J, et al. NEJM 2021; 385:1737-1749.
    """
    is_female = (str(sex).strip().upper() in ("F", "FEMALE"))
    kappa = 0.7 if is_female else 0.9
    alpha = -0.241 if is_female else -0.302
    gender_factor = 1.012 if is_female else 1.000

    ratio = float(scr) / kappa
    egfr = (
        142.0
        * (min(ratio, 1.0) ** alpha)
        * (max(ratio, 1.0) ** -1.200)
        * (0.9938 ** float(age))
        * gender_factor
    )
    return float(round(max(min(egfr, 140.0), 5.0), 1))


def get_ckd_stage(egfr: float) -> str:
    """Classify eGFR value into standard KDIGO CKD stages."""
    if egfr >= 90.0:
        return "Stage 1 (G1, Normal/High)"
    elif egfr >= 60.0:
        return "Stage 2 (G2, Mildly decreased)"
    elif egfr >= 45.0:
        return "Stage 3a (G3a, Mildly to moderately decreased)"
    elif egfr >= 30.0:
        return "Stage 3b (G3b, Moderately to severely decreased)"
    elif egfr >= 15.0:
        return "Stage 4 (G4, Severely decreased)"
    else:
        return "Stage 5 (G5, Kidney failure)"


def is_trend_model_available() -> bool:
    """Check if the trained longitudinal risk model artifact exists."""
    return MODEL_PATH.exists()


def is_baseline_model_available() -> bool:
    """Check if the trained static baseline model artifact exists."""
    return BASELINE_MODEL_PATH.exists()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize database on startup."""
    init_db()
    yield


app = FastAPI(
    title="RENALIS CKD Digital Twin API",
    version="0.2.0",
    description=(
        "Computational digital twin and care coordination REST API for Chronic "
        "Kidney Disease (CKD) patient simulation and risk stratification."
    ),
    lifespan=lifespan,
)

# CORS configuration allowing local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================================
# 1. System Health & Diagnostics
# =========================================================================

@app.get("/health", summary="System Health & Model Status")
def get_health() -> Dict[str, Any]:
    """Check service health, synthetic data presence, and ML model artifacts."""
    synthetic_ok, synthetic_msg = check_synthetic_files()
    trend_model_exists = is_trend_model_available()
    baseline_model_exists = is_baseline_model_available()

    try:
        patients_path = str(get_patients_file_path().resolve())
    except FileNotFoundError:
        patients_path = "Missing - run 'python data/generate_synthetic.py --num-patients 500 --seed 42'"

    messages = []
    if not synthetic_ok:
        messages.append(synthetic_msg)
    if not trend_model_exists:
        messages.append("Risk model missing. Please run 'python ml/train.py' first.")
    if not baseline_model_exists:
        messages.append("Baseline model missing. Please run 'python ml/train_static.py' first.")

    is_all_healthy = synthetic_ok and trend_model_exists and baseline_model_exists
    final_message = (
        "Service is healthy, synthetic cohort (500 patients) is loaded, and risk models are ready."
        if is_all_healthy
        else " ".join(messages)
    )

    return {
        "status": "healthy" if is_all_healthy else "degraded",
        "service": "RENALIS Digital Twin Backend",
        "synthetic_data_available": synthetic_ok,
        "patients_data_path": patients_path,
        "model_loaded": trend_model_exists,
        "model_file_exists": trend_model_exists,
        "model_path": str(MODEL_PATH.resolve()),
        "baseline_model_loaded": baseline_model_exists,
        "baseline_model_file_exists": baseline_model_exists,
        "baseline_model_path": str(BASELINE_MODEL_PATH.resolve()),
        "message": final_message,
    }


# =========================================================================
# 2. Patients & Readings Endpoints
# =========================================================================

@app.get("/patients", summary="List Patient Cohort")
def list_patients(
    search: Optional[str] = Query(None, description="Search by patient ID"),
    risk_tier: Optional[str] = Query(None, description="Filter by risk tier: Low, Medium, High"),
    tier: Optional[str] = Query(None, description="Alias filter for risk tier: Low, Medium, High"),
    limit: Optional[int] = Query(50, ge=1, le=1000, description="Max patient records to return"),
    offset: int = Query(0, ge=0, description="Record pagination offset"),
) -> Dict[str, Any]:
    """Retrieve patient cohort with search, risk tier filter, and pagination.

    Every patient record includes precomputed model risk tier and probability.
    """
    selected_tier = risk_tier or tier
    try:
        return get_all_patients(
            search=search,
            risk_tier=selected_tier,
            limit=limit,
            offset=offset,
        )
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@app.get("/patients/{patient_id}", summary="Get Patient Details")
def get_patient(patient_id: str) -> Dict[str, Any]:
    """Retrieve individual patient profile with full historical telemetry readings."""
    try:
        patient = get_patient_by_id(patient_id)
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found.",
        )

    return patient


@app.get("/patients/{patient_id}/readings", summary="Get Patient Longitudinal Readings")
def get_readings_endpoint(patient_id: str) -> List[Dict[str, Any]]:
    """Retrieve monthly longitudinal biometric readings for a patient."""
    try:
        readings = get_patient_readings(patient_id)
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    if readings is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found.",
        )

    return readings


# =========================================================================
# 3. Digital Twin Progression Forecast & Intake
# =========================================================================

@app.get(
    "/patients/{patient_id}/twin",
    response_model=TwinResultResponse,
    summary="Get Digital Twin Progression State & 3-Month Projection",
)
def get_patient_twin(patient_id: str) -> TwinResultResponse:
    """Retrieve the interactive digital twin profile for a patient.

    Returns:
    - Latest kidney score (eGFR) and KDIGO CKD stage
    - Model progression probability and risk tier
    - Basis: 'trend model' (if >= 6 monthly readings) or 'baseline only' (< 6 readings)
    - Top 3 progression drivers in plain words
    - 3-month projected eGFR trajectory with lower and upper bounds (states method in response)
    """
    patient = get_patient_by_id(patient_id)
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found.",
        )

    from ml.predict import predict_risk

    readings = patient.get("readings", [])
    try:
        inference = predict_risk(
            patient=patient,
            readings=readings,
            model_path=MODEL_PATH,
            baseline_model_path=BASELINE_MODEL_PATH,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error computing twin progression risk: {str(e)}",
        )

    # Determine latest kidney score (eGFR)
    if readings:
        sorted_rds = sorted(readings, key=lambda r: int(r.get("month", 0)))
        latest_kidney_score = float(sorted_rds[-1].get("egfr", patient.get("baseline_egfr", 60.0)))
    else:
        latest_kidney_score = float(patient.get("baseline_egfr", 60.0))

    ckd_stage = get_ckd_stage(latest_kidney_score)

    # Convert top 3 features to plain English drivers
    raw_top = inference.get("top_features", [])[:3]
    plain_drivers = [
        FEATURE_PLAIN_NAMES.get(f, f.replace("_", " ").title())
        for f in raw_top
    ]

    # Compute 3-month linear trend projection with lower and upper bounds
    trend = estimate_3m_egfr_trend(
        baseline_egfr=patient.get("baseline_egfr", latest_kidney_score),
        readings=readings,
        probability=inference["probability"],
        tier=inference["tier"],
        basis=inference["basis"],
    )

    # Store or update assessment record
    insert_assessment({
        "patient_id": patient_id,
        "kidney_score": latest_kidney_score,
        "ckd_stage": ckd_stage,
        "probability": inference["probability"],
        "tier": inference["tier"],
        "basis": inference["basis"],
        "top_features": raw_top,
        "top_drivers": plain_drivers,
    })

    return TwinResultResponse(
        patient_id=patient_id,
        latest_kidney_score=round(latest_kidney_score, 1),
        ckd_stage=ckd_stage,
        probability=inference["probability"],
        tier=inference["tier"],
        basis=inference["basis"],
        top_drivers=plain_drivers,
        top_features=raw_top,
        estimated_3m_egfr_trend=trend,
        feature_contributions=inference.get("feature_contributions"),
    )


@app.post(
    "/patients",
    response_model=TwinResultResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Patient Intake & Digital Twin Generation",
)
def create_patient_intake(payload: PatientIntakeRequest) -> TwinResultResponse:
    """Onboard a new patient:

    1. Calculates baseline eGFR from serum creatinine using 2021 CKD-EPI equation.
    2. Stores the patient and optional earlier readings in SQLite database.
    3. Runs model progression inference (baseline only if < 6 readings, or trend model).
    4. Records the digital twin assessment.
    5. Returns the complete twin state and 3-month trajectory forecast.
    """
    pid = payload.patient_id.strip() if payload.patient_id else f"SYN-USR-{uuid.uuid4().hex[:6].upper()}"

    # Calculate baseline eGFR via CKD-EPI 2021
    calculated_egfr = calculate_ckd_epi_2021(
        scr=payload.baseline_creatinine,
        age=payload.age,
        sex=payload.sex,
    )

    # Format earlier scores/readings
    earlier_readings = [r.model_dump() for r in (payload.earlier_scores or [])]

    # Predict risk with baseline model or trend model
    from ml.predict import predict_risk
    patient_dict = {
        "patient_id": pid,
        "age": payload.age,
        "sex": payload.sex,
        "diabetes": payload.diabetes,
        "hypertension": payload.hypertension,
        "bmi": payload.bmi,
        "baseline_creatinine": payload.baseline_creatinine,
        "baseline_egfr": calculated_egfr,
        "urine_protein": payload.urine_protein,
    }

    try:
        inference = predict_risk(
            patient=patient_dict,
            readings=earlier_readings,
            model_path=MODEL_PATH,
            baseline_model_path=BASELINE_MODEL_PATH,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error during patient intake: {str(e)}",
        )

    patient_dict["risk_tier"] = inference["tier"]
    patient_dict["risk_probability"] = inference["probability"]
    patient_dict["basis"] = inference["basis"]

    # Persist patient and earlier readings to SQLite
    insert_added_patient(patient_dict)
    if earlier_readings:
        insert_patient_readings(pid, earlier_readings)

    # Determine latest kidney score
    if earlier_readings:
        sorted_rds = sorted(earlier_readings, key=lambda r: int(r.get("month", 0)))
        latest_kidney_score = float(sorted_rds[-1].get("egfr", calculated_egfr))
    else:
        latest_kidney_score = calculated_egfr

    ckd_stage = get_ckd_stage(latest_kidney_score)

    raw_top = inference.get("top_features", [])[:3]
    plain_drivers = [
        FEATURE_PLAIN_NAMES.get(f, f.replace("_", " ").title())
        for f in raw_top
    ]

    trend = estimate_3m_egfr_trend(
        baseline_egfr=calculated_egfr,
        readings=earlier_readings,
        probability=inference["probability"],
        tier=inference["tier"],
        basis=inference["basis"],
    )

    insert_assessment({
        "patient_id": pid,
        "kidney_score": latest_kidney_score,
        "ckd_stage": ckd_stage,
        "probability": inference["probability"],
        "tier": inference["tier"],
        "basis": inference["basis"],
        "top_features": raw_top,
        "top_drivers": plain_drivers,
    })

    return TwinResultResponse(
        patient_id=pid,
        latest_kidney_score=round(latest_kidney_score, 1),
        ckd_stage=ckd_stage,
        probability=inference["probability"],
        tier=inference["tier"],
        basis=inference["basis"],
        top_drivers=plain_drivers,
        top_features=raw_top,
        estimated_3m_egfr_trend=trend,
        feature_contributions=inference.get("feature_contributions"),
    )


# =========================================================================
# 4. Daily Logs & Demonstration Urgent Rules
# =========================================================================

@app.post(
    "/patients/{patient_id}/logs",
    response_model=DailyLogResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit Daily Patient Telemetry Log",
)
def create_patient_log(patient_id: str, payload: DailyLogCreate) -> DailyLogResponse:
    """Record patient daily telemetry.

    Demonstration Safety Rule:
    If symptoms include 'short of breath' or systolic is 180 mmHg or higher,
    returns urgent=True with an emergency advisory to seek urgent help and call 112.
    Marked clearly as a demonstration rule, NOT clinical guidance.
    """
    patient = get_patient_by_id(patient_id)
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found.",
        )

    symptoms_lower = [str(s).strip().lower() for s in payload.symptoms]
    has_sob = any(
        "short of breath" in s or "shortness of breath" in s or "breathless" in s
        for s in symptoms_lower
    )
    high_sbp = payload.systolic >= 180

    if has_sob or high_sbp:
        urgent = True
        urgent_message = (
            "Urgent: Shortness of breath or critical blood pressure (systolic >= 180 mmHg) detected. "
            "Please seek immediate urgent emergency medical evaluation and call 112 immediately. "
            "[Notice: This safety alert is triggered by an automated prototype demonstration rule; "
            "it is NOT medical advice or clinical guidance.]"
        )
    else:
        urgent = False
        urgent_message = (
            "Daily telemetry recorded successfully. Vitals are within expected demonstration ranges. "
            "[Notice: Prototype demonstration rule, not clinical guidance.]"
        )

    log_record = {
        "patient_id": patient_id,
        "systolic": payload.systolic,
        "diastolic": payload.diastolic,
        "steps": payload.steps,
        "medicines_taken": payload.medicines_taken,
        "symptoms": payload.symptoms,
        "urgent": urgent,
        "urgent_message": urgent_message,
    }

    saved = insert_daily_log(log_record)
    return DailyLogResponse(**saved)


@app.get(
    "/patients/{patient_id}/logs",
    response_model=List[DailyLogResponse],
    summary="Get Patient Daily Telemetry Logs",
)
def get_patient_logs(patient_id: str) -> List[DailyLogResponse]:
    """Retrieve chronological history of daily telemetry logs for a patient."""
    patient = get_patient_by_id(patient_id)
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found.",
        )

    logs = get_daily_logs_by_patient(patient_id)
    return [DailyLogResponse(**l) for l in logs]


# =========================================================================
# 5. Care Coordination Referrals
# =========================================================================

@app.post(
    "/referrals",
    response_model=ReferralResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Care Coordination Referral",
)
def create_referral_endpoint(payload: ReferralCreate) -> ReferralResponse:
    """Submit a high-risk patient to the multidisciplinary care referral queue.

    Staff set priority as 'Routine' or 'Urgent'.
    The model progression tier is stored separately as a suggestion.
    """
    patient = get_patient_by_id(payload.patient_id)
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{payload.patient_id}' not found.",
        )

    # Suggestion comes from model tier if not explicitly specified
    suggested = payload.suggested_tier or patient.get("tier") or patient.get("risk_tier") or "Medium"

    record_data = {
        "patient_id": payload.patient_id,
        "reason": payload.reason,
        "priority": payload.priority,
        "suggested_tier": suggested,
        "status": payload.status,
        "note": payload.note,
    }

    saved = insert_referral(record_data)
    return ReferralResponse(**saved)


@app.get(
    "/referrals",
    response_model=List[ReferralResponse],
    summary="List Care Coordination Referrals",
)
def list_referrals_endpoint(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: Pending, In Review, Reviewed, Completed"),
    priority_filter: Optional[str] = Query(None, alias="priority", description="Filter by staff priority: Routine, Urgent"),
    patient_id: Optional[str] = Query(None, description="Filter by patient_id"),
) -> List[ReferralResponse]:
    """Retrieve active care coordination referrals from SQLite database."""
    items = get_referrals(status=status_filter, priority=priority_filter, patient_id=patient_id)
    return [ReferralResponse(**r) for r in items]


@app.patch(
    "/referrals/{referral_id}",
    response_model=ReferralResponse,
    summary="Update Referral Status & Staff Priority",
)
def update_referral_endpoint(referral_id: str, payload: ReferralUpdate) -> ReferralResponse:
    """Update referral workflow status, staff priority ('Routine' or 'Urgent'), and notes."""
    updated = update_referral(
        referral_id=referral_id,
        status=payload.status,
        priority=payload.priority,
        note=payload.note,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Referral with ID '{referral_id}' not found.",
        )
    return ReferralResponse(**updated)


# =========================================================================
# 6. Generic Care Team Follow-Ups
# =========================================================================

@app.post(
    "/follow-ups",
    response_model=FollowUpResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Schedule Care Team Follow-Up",
)
@app.post(
    "/followups",
    response_model=FollowUpResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def create_follow_up_endpoint(payload: FollowUpCreate) -> FollowUpResponse:
    """Schedule a generic care team appointment (e.g. 'Repeat blood test', 'Blood pressure check')."""
    patient = get_patient_by_id(payload.patient_id)
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{payload.patient_id}' not found.",
        )

    saved = insert_follow_up(payload.model_dump())
    return FollowUpResponse(**saved)


@app.get(
    "/follow-ups",
    response_model=List[FollowUpResponse],
    summary="List Care Team Follow-Ups",
)
@app.get(
    "/followups",
    response_model=List[FollowUpResponse],
    include_in_schema=False,
)
def list_follow_ups_endpoint(
    patient_id: Optional[str] = Query(None, description="Filter by patient_id"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: Scheduled, Completed, Cancelled"),
    due_this_week: Optional[bool] = Query(None, description="Filter follow-ups due in the current week"),
) -> List[FollowUpResponse]:
    """Retrieve scheduled follow-ups from SQLite database."""
    items = get_follow_ups(patient_id=patient_id, status=status_filter, due_this_week=due_this_week)
    return [FollowUpResponse(**f) for f in items]


@app.patch(
    "/follow-ups/{follow_up_id}",
    response_model=FollowUpResponse,
    summary="Update Follow-Up Appointment",
)
@app.patch(
    "/followups/{follow_up_id}",
    response_model=FollowUpResponse,
    include_in_schema=False,
)
def update_follow_up_endpoint(follow_up_id: str, payload: FollowUpUpdate) -> FollowUpResponse:
    """Update follow-up appointment details, purpose, date, or status."""
    updated = update_follow_up(
        follow_up_id=follow_up_id,
        purpose=payload.purpose,
        date=payload.date,
        status=payload.status,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Follow-up with ID '{follow_up_id}' not found.",
        )
    return FollowUpResponse(**updated)


# =========================================================================
# 7. Aggregate Statistics
# =========================================================================

@app.get("/stats", response_model=StatsResponse, summary="Get Platform Summary Statistics")
def get_stats_endpoint() -> StatsResponse:
    """Retrieve totals, risk tier distribution, referrals by status, and follow-ups due this week."""
    db_stats = get_db_stats()
    risk_distribution = get_cohort_risk_tier_distribution()

    # Total patients is synthetic cohort (500) + added intake patients
    total_patients = 500 + db_stats["added_patients_count"]

    totals = {
        "patients": total_patients,
        "assessments": db_stats["assessments_count"],
        "daily_logs": db_stats["logs_count"],
        "referrals": db_stats["referrals_count"],
        "follow_ups": db_stats["follow_ups_count"],
    }

    return StatsResponse(
        totals=totals,
        risk_tier_distribution=risk_distribution,
        referrals_by_status=db_stats["referrals_by_status"],
        follow_ups_due_this_week=db_stats["follow_ups_due_this_week_count"],
    )


# =========================================================================
# 8. Progression Assessment (Backwards Compatibility)
# =========================================================================

@app.post(
    "/assess-patient",
    response_model=AssessPatientResponse,
    summary="Assess CKD Progression Risk",
)
def assess_patient(payload: AssessPatientRequest) -> AssessPatientResponse:
    """Evaluate patient data and longitudinal telemetry to forecast rapid eGFR decline risk."""
    if not is_trend_model_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                f"Risk model artifact was not found at '{MODEL_PATH.resolve()}'. "
                "Please run 'python ml/train.py' to train and persist the model first."
            ),
        )

    from ml.predict import predict_risk

    patient_dict = payload.patient.model_dump()
    readings_list = [r.model_dump() for r in payload.readings]

    try:
        risk_result = predict_risk(
            patient=patient_dict,
            readings=readings_list,
            model_path=MODEL_PATH,
            baseline_model_path=BASELINE_MODEL_PATH,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error during patient assessment: {str(e)}",
        )

    prob = risk_result["probability"]
    tier = risk_result["tier"]
    basis = risk_result["basis"]
    top_feats = risk_result["top_features"]
    feature_contribs = risk_result.get("feature_contributions")

    trend = estimate_3m_egfr_trend(
        baseline_egfr=payload.patient.baseline_egfr or 60.0,
        readings=readings_list,
        probability=prob,
        tier=tier,
        basis=basis,
    )

    return AssessPatientResponse(
        probability=prob,
        tier=tier,
        basis=basis,
        top_features=top_feats,
        estimated_3m_egfr_trend=trend,
        feature_contributions=feature_contribs,
    )
