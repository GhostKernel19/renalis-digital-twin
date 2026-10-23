"""
Pydantic Schemas for RENALIS FastAPI Backend
Digital Twin Challenge 2026

Strict schema validation for:
- Synthetic patient cohort & intake endpoints
- Digital twin progression forecasting & explainable drivers
- Telemetry daily logging & urgent safety alerts
- Care coordination referrals & generic follow-up appointments
- Cohort aggregate statistics
"""

import re
from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field, field_validator


# Disallowed prescription/treatment phrases to strictly enforce Rule 5
_DISALLOWED_TERMS = [
    r"\bmg\b", r"\bmcg\b", r"\bml\b", r"\bdose\b", r"\bdosage\b", r"\btitrat\w*",
    r"\bprescri\w*", r"\blisinopril\b", r"\bmetformin\b", r"\blosartan\b",
    r"\bempagliflozin\b", r"\bdapagliflozin\b", r"\bamlodipine\b", r"\bfurosemide\b",
    r"\binsulin\b", r"\batorvastatin\b", r"\bsglt2\w*", r"\brasi\b", r"\bacei\b",
    r"\barb\b", r"\bmedication\s+advice\b", r"\btreatment\s+advice\b",
]
_DISALLOWED_PATTERN = re.compile("|".join(_DISALLOWED_TERMS), re.IGNORECASE)


class ReadingInput(BaseModel):
    """Monthly longitudinal biometric reading."""
    month: int = Field(..., ge=1, le=12, description="Timeline month (1 to 12)")
    egfr: float = Field(..., ge=5.0, le=140.0, description="eGFR reading (5.0-140.0 mL/min/1.73m²)")
    systolic_bp: Optional[int] = Field(None, ge=70, le=240, description="Systolic blood pressure (70-240 mmHg)")
    diastolic_bp: Optional[int] = Field(None, ge=40, le=150, description="Diastolic blood pressure (40-150 mmHg)")
    adherence_pct: Optional[float] = Field(None, ge=0.0, le=100.0, description="Adherence percentage (0-100%)")
    daily_steps: Optional[int] = Field(None, ge=0, le=40000, description="Average daily steps count")


class PatientInput(BaseModel):
    """Patient demographics and baseline laboratory measurements."""
    patient_id: Optional[str] = Field("SYN-USER", description="Patient identifier")
    age: int = Field(..., ge=18, le=100, description="Patient age in years (18-100)")
    sex: str = Field(..., description="Biological sex ('M' or 'F')")
    diabetes: int = Field(0, ge=0, le=1, description="Type 2 diabetes indicator (0 or 1)")
    hypertension: int = Field(0, ge=0, le=1, description="Hypertension indicator (0 or 1)")
    bmi: float = Field(..., ge=12.0, le=65.0, description="Body Mass Index in kg/m²")
    baseline_creatinine: float = Field(..., ge=0.3, le=15.0, description="Serum creatinine in mg/dL (0.3-15.0)")
    baseline_egfr: Optional[float] = Field(None, ge=5.0, le=140.0, description="Baseline eGFR (5.0-140.0 mL/min/1.73m²)")
    urine_protein: str = Field("negative", description="Qualitative dipstick proteinuria tier")

    @field_validator("sex")
    @classmethod
    def validate_sex(cls, v: str) -> str:
        clean = v.strip().upper()
        if clean not in ("M", "F", "MALE", "FEMALE"):
            raise ValueError("Sex must be 'M' or 'F'")
        return "M" if clean in ("M", "MALE") else "F"

    @field_validator("urine_protein")
    @classmethod
    def validate_urine_protein(cls, v: str) -> str:
        clean = v.strip().lower()
        valid_tiers = ("negative", "trace", "+1", "+2", "+3", "+4")
        if clean not in valid_tiers:
            raise ValueError(f"Urine protein must be one of {valid_tiers}")
        return clean


class PatientIntakeRequest(BaseModel):
    """Payload for patient intake: demographics, current measurements, and optional earlier scores."""
    patient_id: Optional[str] = Field(None, description="Optional custom patient ID (e.g. SYN-USR-001)")
    age: int = Field(..., ge=18, le=100, description="Patient age in years (18-100)")
    sex: str = Field(..., description="Biological sex ('M' or 'F')")
    diabetes: int = Field(0, ge=0, le=1, description="Type 2 diabetes indicator (0 or 1)")
    hypertension: int = Field(0, ge=0, le=1, description="Hypertension indicator (0 or 1)")
    bmi: float = Field(..., ge=12.0, le=65.0, description="Body Mass Index in kg/m²")
    baseline_creatinine: float = Field(..., ge=0.3, le=15.0, description="Serum creatinine in mg/dL (0.3-15.0)")
    urine_protein: str = Field("negative", description="Qualitative dipstick proteinuria tier")
    earlier_scores: Optional[List[ReadingInput]] = Field(None, description="Optional historical longitudinal readings")

    @field_validator("sex")
    @classmethod
    def validate_sex(cls, v: str) -> str:
        clean = v.strip().upper()
        if clean not in ("M", "F", "MALE", "FEMALE"):
            raise ValueError("Sex must be 'M' or 'F'")
        return "M" if clean in ("M", "MALE") else "F"

    @field_validator("urine_protein")
    @classmethod
    def validate_urine_protein(cls, v: str) -> str:
        clean = v.strip().lower()
        valid_tiers = ("negative", "trace", "+1", "+2", "+3", "+4")
        if clean not in valid_tiers:
            raise ValueError(f"Urine protein must be one of {valid_tiers}")
        return clean


class AssessPatientRequest(BaseModel):
    """Request payload for patient progression assessment."""
    patient: PatientInput
    readings: List[ReadingInput] = Field(..., min_length=1, description="List of monthly readings")


class TrendProjectionPoint(BaseModel):
    """Monthly projected eGFR value with prediction bounds."""
    month: int
    projected_egfr: float
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None


class EstimatedTrend(BaseModel):
    """Estimated 3-month eGFR trajectory and clinical progression forecast."""
    method: str = Field(..., description="Description of the trend estimation methodology")
    projected_slope: float = Field(..., description="Estimated monthly eGFR change (mL/min/1.73m²/month)")
    projected_3m_egfr: Optional[float] = Field(None, description="Projected eGFR after 3 months")
    lower_bound: Optional[float] = Field(None, description="Lower 95% prediction interval bound")
    upper_bound: Optional[float] = Field(None, description="Upper 95% prediction interval bound")
    projected_3m_change_pct: float = Field(..., description="Estimated 3-month percentage eGFR change")
    projected_readings: List[TrendProjectionPoint] = Field(..., description="Projected monthly points with bounds")
    summary: str = Field(..., description="Explanatory statement of the projected trajectory")


class TwinResultResponse(BaseModel):
    """Digital twin result payload with explainable drivers and 3-month projection."""
    patient_id: str
    latest_kidney_score: float = Field(..., description="Latest observed or calculated eGFR value")
    ckd_stage: str = Field(..., description="KDIGO CKD stage (G1 to G5)")
    probability: float = Field(..., description="Model progression risk probability (0.0 to 1.0)")
    tier: Literal["Low", "Medium", "High"] = Field(..., description="Clinical risk action tier")
    basis: Literal["trend model", "baseline only"] = Field(..., description="Inference basis")
    top_drivers: List[str] = Field(..., description="Top 3 progression drivers in plain words")
    top_features: List[str] = Field(..., description="Raw top 3 feature identifiers")
    estimated_3m_egfr_trend: EstimatedTrend = Field(..., description="3-month linear trend projection with bounds")
    feature_contributions: Optional[List[Dict[str, Any]]] = Field(None, description="Detailed feature contributions")


class AssessPatientResponse(BaseModel):
    """Backwards-compatible response payload for assess-patient endpoint."""
    probability: float
    tier: Literal["Low", "Medium", "High"]
    basis: Optional[str] = "trend model"
    top_features: List[str]
    estimated_3m_egfr_trend: EstimatedTrend
    feature_contributions: Optional[List[Dict[str, Any]]] = None


class DailyLogCreate(BaseModel):
    """Patient daily telemetry log submission."""
    systolic: int = Field(..., ge=70, le=240, description="Systolic blood pressure (70-240 mmHg)")
    diastolic: int = Field(..., ge=40, le=150, description="Diastolic blood pressure (40-150 mmHg)")
    steps: int = Field(..., ge=0, le=50000, description="Daily step count")
    medicines_taken: bool = Field(True, description="Whether prescribed daily regimen was taken")
    symptoms: Union[List[str], str] = Field(default_factory=list, description="Reported symptoms list or text")

    @field_validator("symptoms")
    @classmethod
    def clean_symptoms(cls, v: Union[List[str], str]) -> List[str]:
        if isinstance(v, str):
            parts = [s.strip() for s in v.split(",") if s.strip()]
            return parts if parts else ([v.strip()] if v.strip() else [])
        return [str(s).strip() for s in v if str(s).strip()]


class DailyLogResponse(BaseModel):
    """Daily log record with automated demonstration safety flags."""
    id: str
    patient_id: str
    systolic: int
    diastolic: int
    steps: int
    medicines_taken: bool
    symptoms: List[str]
    urgent: bool = Field(..., description="True if short of breath or systolic >= 180 mmHg")
    urgent_message: Optional[str] = Field(None, description="Urgent action message or demo advisory")
    created_at: str


class ReferralCreate(BaseModel):
    """Payload for submitting a care coordination referral."""
    patient_id: str = Field(..., min_length=1, description="Patient identifier")
    reason: str = Field(..., min_length=3, description="Clinical reason for referral")
    priority: Literal["Routine", "Urgent"] = Field("Routine", description="Staff-assigned priority ('Routine' or 'Urgent')")
    suggested_tier: Optional[str] = Field(None, description="Model risk tier suggestion ('Low', 'Medium', 'High')")
    status: Literal["Pending", "In Review", "Reviewed", "Completed"] = Field("Pending", description="Workflow status")
    note: Optional[str] = Field(None, description="Optional care coordinator note")

    @field_validator("reason", "note")
    @classmethod
    def prevent_treatment_advice(cls, v: Optional[str]) -> Optional[str]:
        if v and _DISALLOWED_PATTERN.search(v):
            raise ValueError("Referral cannot contain medication names, dosages, or treatment prescribing advice.")
        return v


class ReferralUpdate(BaseModel):
    """Payload for updating referral status, staff priority, and notes."""
    status: Optional[Literal["Pending", "In Review", "Reviewed", "Completed"]] = None
    priority: Optional[Literal["Routine", "Urgent"]] = None
    note: Optional[str] = None

    @field_validator("note")
    @classmethod
    def prevent_treatment_advice(cls, v: Optional[str]) -> Optional[str]:
        if v and _DISALLOWED_PATTERN.search(v):
            raise ValueError("Notes cannot contain medication names, dosages, or treatment prescribing advice.")
        return v


class ReferralResponse(BaseModel):
    """Referral record in the care coordination queue."""
    id: str
    patient_id: str
    reason: str
    priority: Literal["Routine", "Urgent"]
    suggested_tier: Optional[str] = None
    status: Literal["Pending", "In Review", "Reviewed", "Completed"]
    note: Optional[str] = None
    created_at: str
    updated_at: str


class FollowUpCreate(BaseModel):
    """Payload for scheduling a generic care team follow-up."""
    patient_id: str = Field(..., min_length=1, description="Patient identifier")
    purpose: str = Field(..., min_length=3, description="Generic appointment purpose (e.g. 'Repeat blood test', 'Blood pressure check')")
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Appointment date in YYYY-MM-DD format")
    status: Literal["Scheduled", "Completed", "Cancelled"] = Field("Scheduled", description="Follow-up status")

    @field_validator("purpose")
    @classmethod
    def validate_generic_purpose(cls, v: str) -> str:
        clean = v.strip()
        if _DISALLOWED_PATTERN.search(clean):
            raise ValueError(
                "Follow-up purpose must be generic (e.g. 'Repeat blood test', 'Blood pressure check'). "
                "Drug names, doses, or treatment advice are strictly prohibited."
            )
        return clean


class FollowUpUpdate(BaseModel):
    """Payload for updating follow-up appointment details."""
    purpose: Optional[str] = Field(None, min_length=3)
    date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    status: Optional[Literal["Scheduled", "Completed", "Cancelled"]] = None

    @field_validator("purpose")
    @classmethod
    def validate_generic_purpose(cls, v: Optional[str]) -> Optional[str]:
        if v:
            clean = v.strip()
            if _DISALLOWED_PATTERN.search(clean):
                raise ValueError(
                    "Follow-up purpose must be generic (e.g. 'Repeat blood test', 'Blood pressure check'). "
                    "Drug names, doses, or treatment advice are strictly prohibited."
                )
            return clean
        return v


class FollowUpResponse(BaseModel):
    """Follow-up appointment record."""
    id: str
    patient_id: str
    purpose: str
    date: str
    status: Literal["Scheduled", "Completed", "Cancelled"]
    created_at: str
    updated_at: str


class StatsResponse(BaseModel):
    """Summary statistics for RENALIS cohort and coordination workflows."""
    totals: Dict[str, int]
    risk_tier_distribution: Dict[str, int]
    referrals_by_status: Dict[str, int]
    follow_ups_due_this_week: int
