"""
RENALIS ML Feature Engineering Pipeline
Digital Twin Challenge 2026

Extracts static baseline demographics and longitudinal telemetry trend features
from synthetic patient profiles and monthly readings (strictly months 1 to 9)
to predict rapid eGFR deterioration (>10% drop between months 9 and 12).

IMPORTANT - Zero Data Leakage:
Readings from months 10 to 12 are NEVER used in feature extraction.
"""

from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd

# Standard qualitative dipstick proteinuria ordinal tiers
URINE_PROTEIN_MAP: Dict[str, int] = {
    "negative": 0,
    "trace": 1,
    "+1": 2,
    "+2": 3,
    "+3": 4,
}

# The canonical static baseline feature list
STATIC_FEATURE_NAMES: List[str] = [
    "age",
    "sex",
    "diabetes",
    "hypertension",
    "bmi",
    "baseline_creatinine",
    "baseline_egfr",
    "urine_protein",
]

# The canonical feature column list
FEATURE_NAMES: List[str] = [
    # Static baseline features
    "age",
    "sex",
    "diabetes",
    "hypertension",
    "bmi",
    "baseline_creatinine",
    "baseline_egfr",
    "urine_protein",
    # Longitudinal trend features (months 1-9 only)
    "egfr_slope",
    "last_egfr",
    "systolic_bp_slope",
    "systolic_bp_std",
    "mean_adherence",
    "adherence_slope",
    "mean_daily_steps",
    "steps_slope",
]

# Plain-language descriptions for explainable twin risk drivers (no drugs or advice)
FEATURE_PLAIN_NAMES: Dict[str, str] = {
    "age": "Older age",
    "sex": "Biological sex factor",
    "diabetes": "Type 2 diabetes diagnosis",
    "hypertension": "High blood pressure history",
    "bmi": "Body mass index (BMI)",
    "baseline_creatinine": "Elevated baseline serum creatinine",
    "baseline_egfr": "Reduced baseline kidney filtration rate",
    "urine_protein": "Protein in urine (proteinuria)",
    "egfr_slope": "Rate of kidney function decline (eGFR slope)",
    "last_egfr": "Recent low kidney function level",
    "systolic_bp_slope": "Rising systolic blood pressure trend",
    "systolic_bp_std": "Blood pressure variability over time",
    "mean_adherence": "Medication adherence consistency",
    "adherence_slope": "Declining medication adherence pattern",
    "mean_daily_steps": "Reduced daily physical activity",
    "steps_slope": "Downward trend in daily step count",
}


def compute_linear_slope(x: np.ndarray, y: np.ndarray) -> float:
    """Calculate the ordinary least squares slope of y over x.

    Returns 0.0 if fewer than 2 distinct points exist.
    """
    if len(x) < 2 or len(y) < 2:
        return 0.0
    x_arr = np.asarray(x, dtype=float)
    y_arr = np.asarray(y, dtype=float)
    x_var = float(np.var(x_arr))
    if x_var <= 1e-9:
        return 0.0
    slope, _ = np.polyfit(x_arr, y_arr, 1)
    return float(slope)


def encode_sex(sex: Any) -> int:
    """Encode biological sex: 'M' -> 1, 'F' -> 0."""
    return 1 if str(sex).strip().upper() == "M" else 0


def encode_urine_protein(protein_val: Any) -> int:
    """Encode qualitative urine protein dipstick tier into an ordinal scale 0..4."""
    if isinstance(protein_val, (int, float)) and not np.isnan(protein_val):
        return int(np.clip(protein_val, 0, 4))
    key = str(protein_val).strip().lower()
    return URINE_PROTEIN_MAP.get(key, 0)


def extract_patient_static_features(patient: Dict[str, Any]) -> Dict[str, float]:
    """Extract static baseline demographic and laboratory features."""
    return {
        "age": float(patient.get("age", 50.0)),
        "sex": float(encode_sex(patient.get("sex", "M"))),
        "diabetes": float(patient.get("diabetes", 0)),
        "hypertension": float(patient.get("hypertension", 0)),
        "bmi": float(patient.get("bmi", 27.0)),
        "baseline_creatinine": float(patient.get("baseline_creatinine", 1.2)),
        "baseline_egfr": float(patient.get("baseline_egfr", 60.0)),
        "urine_protein": float(encode_urine_protein(patient.get("urine_protein", "negative"))),
    }


def extract_patient_features(
    patient: Dict[str, Any],
    readings: List[Dict[str, Any]],
) -> Dict[str, float]:
    """Extract a single feature dictionary for an individual patient.

    Ensures strict leakage prevention: only readings from month <= 9 are considered.

    Args:
        patient: Dictionary containing static demographic & lab attributes.
        readings: List of monthly reading dictionaries.

    Returns:
        Dict mapping each feature in FEATURE_NAMES to its scalar float value.
    """
    # 1. Static features
    static_feats = extract_patient_static_features(patient)
    baseline_egfr = static_feats["baseline_egfr"]

    # 2. Filter readings strictly to months 1 to 9 (Leakage prevention)
    m9_readings = [
        r for r in readings
        if int(r.get("month", 0)) in range(1, 10)
    ]
    # Sort chronologically by month
    m9_readings.sort(key=lambda r: int(r.get("month", 0)))

    if m9_readings:
        months = np.array([float(r.get("month", 0)) for r in m9_readings])
        egfr_vals = np.array([float(r.get("egfr", baseline_egfr)) for r in m9_readings])
        sys_vals = np.array([float(r.get("systolic_bp", 120.0)) for r in m9_readings])
        adh_vals = np.array([float(r.get("adherence_pct", 90.0)) for r in m9_readings])
        steps_vals = np.array([float(r.get("daily_steps", 6000.0)) for r in m9_readings])

        egfr_slope = compute_linear_slope(months, egfr_vals)
        last_egfr = float(egfr_vals[-1])
        systolic_bp_slope = compute_linear_slope(months, sys_vals)
        systolic_bp_std = float(np.std(sys_vals, ddof=1)) if len(sys_vals) > 1 else 0.0
        mean_adherence = float(np.mean(adh_vals))
        adherence_slope = compute_linear_slope(months, adh_vals)
        mean_daily_steps = float(np.mean(steps_vals))
        steps_slope = compute_linear_slope(months, steps_vals)
    else:
        # Fallback if no longitudinal telemetry provided
        egfr_slope = 0.0
        last_egfr = baseline_egfr
        systolic_bp_slope = 0.0
        systolic_bp_std = 0.0
        mean_adherence = 90.0
        adherence_slope = 0.0
        mean_daily_steps = 6000.0
        steps_slope = 0.0

    result = dict(static_feats)
    result.update({
        "egfr_slope": egfr_slope,
        "last_egfr": last_egfr,
        "systolic_bp_slope": systolic_bp_slope,
        "systolic_bp_std": systolic_bp_std,
        "mean_adherence": mean_adherence,
        "adherence_slope": adherence_slope,
        "mean_daily_steps": mean_daily_steps,
        "steps_slope": steps_slope,
    })
    return result


def build_feature_matrix(
    patients_df: pd.DataFrame,
    readings_df: pd.DataFrame,
    labels_df: Optional[pd.DataFrame] = None,
) -> Tuple[pd.DataFrame, Optional[pd.Series]]:
    """Build the feature matrix X and target vector y for a cohort.

    Only uses readings where month <= 9.

    Args:
        patients_df: DataFrame with patient demographics and baseline labs.
        readings_df: DataFrame with longitudinal monthly telemetry.
        labels_df: Optional DataFrame with rapid decline labels (0 or 1).

    Returns:
        (X, y) where X is a DataFrame with columns matching FEATURE_NAMES,
        indexed by patient_id, and y is the target Series if labels_df is provided.
    """
    # Strict filter: months 1 to 9 only
    valid_readings = readings_df[
        (readings_df["month"] >= 1) & (readings_df["month"] <= 9)
    ].copy()

    # Group readings by patient_id
    readings_by_patient: Dict[str, List[Dict[str, Any]]] = {}
    for p_id, group in valid_readings.groupby("patient_id"):
        readings_by_patient[str(p_id)] = group.to_dict(orient="records")

    feature_rows = []
    patient_ids = []

    for _, row in patients_df.iterrows():
        p_dict = row.to_dict()
        p_id = str(p_dict.get("patient_id", ""))
        p_readings = readings_by_patient.get(p_id, [])
        feats = extract_patient_features(p_dict, p_readings)
        feature_rows.append(feats)
        patient_ids.append(p_id)

    X = pd.DataFrame(feature_rows, index=patient_ids, columns=FEATURE_NAMES)

    y = None
    if labels_df is not None:
        labels_map = dict(zip(labels_df["patient_id"].astype(str), labels_df["label"].astype(int)))
        y = pd.Series([labels_map[pid] for pid in patient_ids], index=patient_ids, name="label")

    return X, y


def build_static_feature_matrix(
    patients_df: pd.DataFrame,
    labels_df: Optional[pd.DataFrame] = None,
) -> Tuple[pd.DataFrame, Optional[pd.Series]]:
    """Build the static baseline feature matrix X and target vector y.

    Uses strictly static baseline demographic and laboratory parameters
    (age, sex, diabetes, hypertension, bmi, baseline_creatinine, baseline_egfr, urine_protein).

    Args:
        patients_df: DataFrame with patient demographics and baseline labs.
        labels_df: Optional DataFrame with rapid decline labels (0 or 1).

    Returns:
        (X, y) where X is a DataFrame with columns matching STATIC_FEATURE_NAMES,
        indexed by patient_id, and y is the target Series if labels_df is provided.
    """
    feature_rows = []
    patient_ids = []

    for _, row in patients_df.iterrows():
        p_dict = row.to_dict()
        p_id = str(p_dict.get("patient_id", ""))
        feats = extract_patient_static_features(p_dict)
        feature_rows.append(feats)
        patient_ids.append(p_id)

    X = pd.DataFrame(feature_rows, index=patient_ids, columns=STATIC_FEATURE_NAMES)

    y = None
    if labels_df is not None:
        labels_map = dict(zip(labels_df["patient_id"].astype(str), labels_df["label"].astype(int)))
        y = pd.Series([labels_map[pid] for pid in patient_ids], index=patient_ids, name="label")

    return X, y

