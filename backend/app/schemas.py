"""
Pydantic Schemas for RENALIS FastAPI Backend
Digital Twin Challenge 2026
"""

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, field_validator


class PatientInput(BaseModel):
    """Patient demographics and baseline laboratory measurements."""
    patient_id: Optional[str] = Field("SYN-USER", description="Synthetic patient identifier")
    age: int = Field(..., ge=18, le=100, description="Patient age in years (18-100)")
    sex: str = Field(..., description="Biological sex ('M' or 'F')")
    diabetes: int = Field(0, ge=0, le=1, description="Type 2 diabetes indicator (0 or 1)")
    hypertension: int = Field(0, ge=0, le=1, description="Hypertension indicator (0 or 1)")
    bmi: float = Field(..., ge=12.0, le=65.0, description="Body Mass Index in kg/m²")
    baseline_creatinine: float = Field(..., ge=0.3, le=15.0, description="Serum creatinine in mg/dL (0.3-15.0)")
    baseline_egfr: float = Field(..., ge=5.0, le=140.0, description="Baseline eGFR (5.0-140.0 mL/min/1.73m²)")
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


class ReadingInput(BaseModel):
    """Monthly longitudinal biometric reading."""
    month: int = Field(..., ge=1, le=12, description="Timeline month (1 to 12)")
    egfr: float = Field(..., ge=5.0, le=140.0, description="eGFR reading (5.0-140.0 mL/min/1.73m²)")
    systolic_bp: int = Field(..., ge=70, le=240, description="Systolic blood pressure (70-240 mmHg)")
    diastolic_bp: int = Field(..., ge=40, le=150, description="Diastolic blood pressure (40-150 mmHg)")
    adherence_pct: float = Field(..., ge=0.0, le=100.0, description="Medication adherence percentage (0-100%)")
    daily_steps: int = Field(..., ge=0, le=40000, description="Average daily steps count")


class AssessPatientRequest(BaseModel):
    """Request payload for patient progression assessment."""
    patient: PatientInput
    readings: List[ReadingInput] = Field(..., min_length=1, description="List of monthly readings")


class TrendProjectionPoint(BaseModel):
    """Monthly projected eGFR value."""
    month: int
    projected_egfr: float


class EstimatedTrend(BaseModel):
    """Estimated 3-month eGFR trajectory and clinical progression forecast."""
    projected_slope: float = Field(..., description="Estimated monthly eGFR change (mL/min/1.73m²/month)")
    projected_3m_change_pct: float = Field(..., description="Estimated 3-month percentage eGFR drop")
    projected_readings: List[TrendProjectionPoint] = Field(..., description="Projected eGFR for months 10, 11, and 12")
    summary: str = Field(..., description="Clinical summary statement of the projected trajectory")


class AssessPatientResponse(BaseModel):
    """Response payload for patient progression assessment."""
    probability: float = Field(..., description="Predicted probability of >10% eGFR decline")
    tier: Literal["Low", "Medium", "High"] = Field(..., description="Clinical risk action tier")
    top_features: List[str] = Field(..., description="Top 3 contributing risk features")
    estimated_3m_egfr_trend: EstimatedTrend = Field(..., description="Estimated 3-month eGFR trend projection")
    feature_contributions: Optional[List[Dict[str, Any]]] = Field(None, description="Detailed feature contributions")


class ReferralCreate(BaseModel):
    """Payload for submitting a patient to the care coordination referral queue."""
    patient_id: str = Field(..., min_length=1, description="Patient identifier")
    reason: str = Field(..., min_length=3, description="Clinical reason for multidisciplinary referral")
    priority: Literal["Low", "Medium", "High", "Urgent"] = Field("Medium", description="Referral priority tier")
    status: Literal["Pending", "In Review", "Reviewed"] = Field("Pending", description="Current workflow status")


class ReferralResponse(BaseModel):
    """Referral record in the care coordination queue."""
    id: str = Field(..., description="Unique referral identifier")
    patient_id: str
    reason: str
    priority: Literal["Low", "Medium", "High", "Urgent"]
    status: Literal["Pending", "In Review", "Reviewed"]
    created_at: str
