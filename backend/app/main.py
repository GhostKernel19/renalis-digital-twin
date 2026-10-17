#!/usr/bin/env python3
"""
RENALIS Digital Twin FastAPI Backend
Digital Twin Challenge 2026

Main application entrypoint providing REST endpoints for:
- System Health & Model Status (/health)
- Patient Progression Risk Assessment (/assess-patient)
- Synthetic Cohort Ingestion (/patients, /patients/{id})
- Multidisciplinary Care Referral Queue (/referrals)
"""

from datetime import datetime, timezone
from pathlib import Path
import sys
from typing import Any, Dict, List, Optional
import uuid

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware

# Ensure root directory is in sys.path for cross-module imports (ml.predict)
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.app.data_loader import (
    get_all_patients,
    get_patient_by_id,
    get_patients_file_path,
)
from backend.app.schemas import (
    AssessPatientRequest,
    AssessPatientResponse,
    ReferralCreate,
    ReferralResponse,
)
from backend.app.trend_estimator import estimate_3m_egfr_trend

MODEL_PATH = ROOT_DIR / "ml" / "models" / "risk_model.joblib"

app = FastAPI(
    title="RENALIS CKD Digital Twin API",
    version="0.1.0",
    description=(
        "Computational digital twin and care coordination REST API for Chronic "
        "Kidney Disease (CKD) patient simulation and risk stratification."
    ),
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
# In-Memory Care Coordination Referral Queue
# TODO: Replace in-memory referral store with Google Cloud Firestore in production
# =========================================================================
REFERRALS_DB: List[Dict[str, Any]] = []


def is_model_available() -> bool:
    """Check if the trained risk model artifact exists."""
    return MODEL_PATH.exists()


@app.get("/health", summary="System Health & Model Status")
def get_health() -> Dict[str, Any]:
    """Check service health and whether the trained risk model file is present."""
    model_exists = is_model_available()

    try:
        patients_path = str(get_patients_file_path().resolve())
        data_available = True
    except FileNotFoundError:
        patients_path = "Not found"
        data_available = False

    message = (
        "Service is healthy and risk model is ready."
        if model_exists
        else "Service running, but risk model artifact missing. Please run 'python ml/train.py' first."
    )

    return {
        "status": "healthy",
        "service": "RENALIS Digital Twin Backend",
        "model_loaded": model_exists,
        "model_file_exists": model_exists,
        "model_path": str(MODEL_PATH.resolve()),
        "data_available": data_available,
        "patients_data_path": patients_path,
        "message": message,
    }


@app.post(
    "/assess-patient",
    response_model=AssessPatientResponse,
    summary="Assess CKD Progression Risk",
)
def assess_patient(payload: AssessPatientRequest) -> AssessPatientResponse:
    """Evaluate patient data and longitudinal telemetry to forecast rapid eGFR decline risk.

    - Validates demographic and physiological inputs with Pydantic.
    - Uses strictly Months 1 to 9 telemetry (zero leakage of Months 10 to 12).
    - Returns progression probability, clinical risk tier, top 3 contributing factors,
      and an estimated 3-month eGFR trajectory.
    """
    if not is_model_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                f"Risk model artifact was not found at '{MODEL_PATH.resolve()}'. "
                "Please run 'python ml/train.py' to train and persist the model first."
            ),
        )

    # Import ML prediction module dynamically
    try:
        from ml.predict import predict_risk
    except ImportError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import ML prediction engine: {str(e)}",
        )

    # Convert Pydantic models to dicts
    patient_dict = payload.patient.model_dump()
    readings_list = [r.model_dump() for r in payload.readings]

    try:
        # Predict risk probability, tier, and top features
        risk_result = predict_risk(
            patient=patient_dict,
            readings=readings_list,
            model_path=MODEL_PATH,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error during patient assessment: {str(e)}",
        )

    prob = risk_result["probability"]
    tier = risk_result["tier"]
    top_feats = risk_result["top_features"]
    feature_contribs = risk_result.get("feature_contributions")

    # Estimate 3-month future eGFR trend for Months 10, 11, and 12
    trend = estimate_3m_egfr_trend(
        baseline_egfr=payload.patient.baseline_egfr,
        readings=readings_list,
        probability=prob,
        tier=tier,
    )

    return AssessPatientResponse(
        probability=prob,
        tier=tier,
        top_features=top_feats,
        estimated_3m_egfr_trend=trend,
        feature_contributions=feature_contribs,
    )


@app.get("/patients", summary="List Synthetic Patient Cohort")
def list_patients(
    limit: Optional[int] = Query(None, ge=1, le=1000, description="Max patient records to return"),
    offset: int = Query(0, ge=0, description="Record pagination offset"),
) -> Dict[str, Any]:
    """Retrieve synthetic patient profiles loaded from synthetic dataset."""
    try:
        return get_all_patients(limit=limit, offset=offset)
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@app.get("/patients/{patient_id}", summary="Get Patient Details & Telemetry")
def get_patient(patient_id: str) -> Dict[str, Any]:
    """Retrieve single patient record with full longitudinal monthly readings."""
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


@app.post(
    "/referrals",
    response_model=ReferralResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Care Coordination Referral",
)
def create_referral(payload: ReferralCreate) -> ReferralResponse:
    """Submit a high-risk patient to the multidisciplinary care referral queue."""
    ref_id = f"REF-{uuid.uuid4().hex[:8].upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()

    referral_record = {
        "id": ref_id,
        "patient_id": payload.patient_id,
        "reason": payload.reason,
        "priority": payload.priority,
        "status": payload.status,
        "created_at": now_iso,
    }

    # Store in-memory
    REFERRALS_DB.append(referral_record)

    return ReferralResponse(**referral_record)


@app.get(
    "/referrals",
    response_model=List[ReferralResponse],
    summary="List Care Coordination Referrals",
)
def list_referrals(
    status_filter: Optional[str] = Query(None, description="Filter by status: Pending, In Review, Reviewed"),
    patient_id: Optional[str] = Query(None, description="Filter by patient_id"),
) -> List[ReferralResponse]:
    """Retrieve active care coordination referrals from queue."""
    results = REFERRALS_DB

    if status_filter:
        results = [r for r in results if r["status"].lower() == status_filter.lower()]
    if patient_id:
        results = [r for r in results if r["patient_id"] == patient_id]

    return [ReferralResponse(**r) for r in results]
