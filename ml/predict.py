#!/usr/bin/env python3
"""
RENALIS Progression Risk Inference Engine
Digital Twin Challenge 2026

Provides the core inference function `predict_risk(patient, readings)` to forecast
the risk of rapid eGFR deterioration (>10% drop between months 9 and 12) from
patient baseline demographics and months 1-9 longitudinal telemetry.

Tiers:
- Low:    probability < 0.33
- Medium: 0.33 <= probability <= 0.66
- High:   probability > 0.66

Designed for direct integration into the FastAPI backend service.
"""

from pathlib import Path
import sys
from typing import Any, Dict, List, Optional, Union

import joblib
import numpy as np
import pandas as pd

# Support relative or absolute execution
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from ml.features import (
    FEATURE_NAMES,
    STATIC_FEATURE_NAMES,
    extract_patient_features,
    extract_patient_static_features,
)

DEFAULT_MODEL_PATH = Path(__file__).resolve().parent / "models" / "risk_model.joblib"
DEFAULT_BASELINE_MODEL_PATH = Path(__file__).resolve().parent / "models" / "baseline_model.joblib"

# In-memory artifact cache for high-throughput API serving
_MODEL_CACHE: Dict[str, Any] = {}


def load_model_bundle(model_path: Optional[Union[str, Path]] = None) -> Dict[str, Any]:
    """Load and cache a trained risk model bundle."""
    target_path = Path(model_path) if model_path is not None else DEFAULT_MODEL_PATH
    resolved_path = str(target_path.resolve())

    if resolved_path not in _MODEL_CACHE:
        if not target_path.exists():
            train_cmd = "python ml/train_static.py" if "baseline" in target_path.name else "python ml/train.py"
            raise FileNotFoundError(
                f"Model file not found at {target_path}. "
                f"Please run '{train_cmd}' first to train and persist the model."
            )
        loaded = joblib.load(target_path)
        if isinstance(loaded, dict) and "model" in loaded:
            _MODEL_CACHE[resolved_path] = loaded
        else:
            # Fallback wrapper if a raw estimator was loaded
            _MODEL_CACHE[resolved_path] = {
                "model": loaded,
                "model_name": type(loaded).__name__,
                "feature_names": STATIC_FEATURE_NAMES if "baseline" in target_path.name else FEATURE_NAMES,
            }

    return _MODEL_CACHE[resolved_path]


def determine_risk_tier(probability: float) -> str:
    """Classify risk probability into standard RENALIS clinical action tiers.

    - Low:    below 0.33
    - Medium: 0.33 to 0.66
    - High:   above 0.66
    """
    if probability < 0.33:
        return "Low"
    elif probability <= 0.66:
        return "Medium"
    else:
        return "High"


def calculate_top_contributing_features(
    model: Any,
    feature_names: List[str],
    X_df: pd.DataFrame,
    bundle: Dict[str, Any],
) -> Tuple[List[str], List[Dict[str, Any]]]:
    """Identify the top 3 features contributing to the patient's progression risk."""
    feature_vals = X_df.iloc[0].to_dict()

    # Case A: Pipeline with StandardScaler and Logistic Regression
    if hasattr(model, "named_steps") and "classifier" in model.named_steps:
        scaler = model.named_steps.get("scaler")
        clf = model.named_steps.get("classifier")

        if hasattr(clf, "coef_"):
            coefs = clf.coef_[0]
            if scaler is not None and hasattr(scaler, "transform"):
                x_scaled = scaler.transform(X_df)[0]
            else:
                x_scaled = X_df.values[0]

            # Logit contributions: z_j * beta_j
            contributions = x_scaled * coefs

            # Rank by absolute magnitude of contribution
            ranked_indices = np.argsort(np.abs(contributions))[::-1][:3]
            top_feature_names = [feature_names[i] for i in ranked_indices]
            top_details = [
                {
                    "feature": feature_names[i],
                    "contribution": float(np.round(contributions[i], 4)),
                    "value": float(np.round(feature_vals[feature_names[i]], 2)),
                }
                for i in ranked_indices
            ]
            return top_feature_names, top_details

    # Case B: Tree-based model (e.g. Random Forest) with feature_importances_
    estimator = model
    if hasattr(model, "named_steps"):
        estimator = list(model.named_steps.values())[-1]

    if hasattr(estimator, "feature_importances_"):
        importances = estimator.feature_importances_
        means = bundle.get("feature_means", {})
        stds = bundle.get("feature_stds", {})

        scores = []
        for i, fname in enumerate(feature_names):
            val = feature_vals.get(fname, 0.0)
            mean = means.get(fname, 0.0)
            std = stds.get(fname, 1.0)
            z = abs((val - mean) / std) if std > 1e-9 else 0.0
            impact = float(importances[i] * z)
            scores.append((impact, fname, val))

        scores.sort(key=lambda s: s[0], reverse=True)
        top_feature_names = [s[1] for s in scores[:3]]
        top_details = [
            {
                "feature": s[1],
                "importance_score": float(np.round(s[0], 4)),
                "value": float(np.round(s[2], 2)),
            }
            for s in scores[:3]
        ]
        return top_feature_names, top_details

    # Fallback: Default to most established features
    default_top = feature_names[:3] if len(feature_names) >= 3 else feature_names
    return default_top, [{"feature": f, "value": feature_vals.get(f, 0.0)} for f in default_top]


def predict_risk(
    patient: Dict[str, Any],
    readings: Optional[List[Dict[str, Any]]] = None,
    model_path: Optional[Union[str, Path]] = None,
    baseline_model_path: Optional[Union[str, Path]] = None,
) -> Dict[str, Any]:
    """Predict risk of rapid eGFR decline (>10% drop from month 9 to 12).

    When a patient has fewer than 6 monthly readings (months 1 to 9),
    uses the static baseline model (ml/models/baseline_model.joblib).
    Otherwise, uses the full longitudinal trend model (ml/models/risk_model.joblib).

    Args:
        patient: Dictionary of static demographics (age, sex, diabetes, hypertension,
                 bmi, baseline_creatinine, baseline_egfr, urine_protein).
        readings: List of monthly telemetry dictionaries (egfr, systolic_bp,
                  diastolic_bp, adherence_pct, daily_steps). Can be None or empty.
        model_path: Optional custom path to serialized trend model.
        baseline_model_path: Optional custom path to serialized baseline model.

    Returns:
        Dictionary containing:
        - probability: float (0.0 to 1.0)
        - tier: "Low", "Medium", or "High"
        - basis: "trend model" or "baseline only"
        - top_features: list of top 3 contributing feature names [str, str, str]
        - feature_contributions: detailed list of feature contributions
    """
    raw_readings = readings or []
    # Count valid monthly readings up to month 9
    m9_readings = [
        r for r in raw_readings
        if int(r.get("month", 0)) in range(1, 10)
    ]

    if len(m9_readings) < 6:
        basis = "baseline only"
        target_model_path = baseline_model_path or DEFAULT_BASELINE_MODEL_PATH
        bundle = load_model_bundle(target_model_path)
        feature_names = bundle.get("feature_names", STATIC_FEATURE_NAMES)
        feature_dict = extract_patient_static_features(patient)
    else:
        basis = "trend model"
        target_model_path = model_path or DEFAULT_MODEL_PATH
        bundle = load_model_bundle(target_model_path)
        feature_names = bundle.get("feature_names", FEATURE_NAMES)
        feature_dict = extract_patient_features(patient, m9_readings)

    model = bundle["model"]
    X_df = pd.DataFrame([feature_dict], columns=feature_names)

    # Model inference
    proba = float(model.predict_proba(X_df)[0, 1])
    proba_rounded = float(np.round(proba, 4))
    tier = determine_risk_tier(proba_rounded)

    # Top contributing features
    top_3_features, top_3_details = calculate_top_contributing_features(
        model, feature_names, X_df, bundle
    )

    return {
        "probability": proba_rounded,
        "tier": tier,
        "basis": basis,
        "top_features": top_3_features,
        # Additional aliases for backend consumer convenience
        "risk_probability": proba_rounded,
        "risk_tier": tier,
        "top_contributing_features": top_3_features,
        "feature_contributions": top_3_details,
    }


def main():
    """Demo CLI run for predict_risk using synthetic cohort."""
    patients_file = ROOT_DIR / "data" / "synthetic" / "patients.csv"
    readings_file = ROOT_DIR / "data" / "synthetic" / "readings.csv"

    if not patients_file.exists() or not readings_file.exists():
        print("Synthetic cohort data not found. Run 'python data/generate_synthetic.py --num-patients 500 --seed 42' first.")
        return

    patients_df = pd.read_csv(patients_file)
    readings_df = pd.read_csv(readings_file)

    print("\n" + "=" * 65)
    print("  RENALIS Progression Risk Inference Demonstration")
    print("=" * 65)

    # Demo 1: Full longitudinal history (trend model)
    pt1 = patients_df.iloc[0].to_dict()
    pid1 = pt1["patient_id"]
    rds1 = readings_df[readings_df["patient_id"] == pid1].to_dict(orient="records")
    res1 = predict_risk(pt1, rds1)
    print(f"\n[Case 1: Full History (>=6 readings)] Patient {pid1}")
    print(f"  Basis:       {res1['basis']}")
    print(f"  Probability: {res1['probability']:.4f} ({res1['tier']})")
    print(f"  Top Drivers: {', '.join(res1['top_features'])}")

    # Demo 2: Incomplete history (<6 readings -> baseline model)
    rds_short = rds1[:3]
    res2 = predict_risk(pt1, rds_short)
    print(f"\n[Case 2: Partial History (3 readings < 6)] Patient {pid1}")
    print(f"  Basis:       {res2['basis']}")
    print(f"  Probability: {res2['probability']:.4f} ({res2['tier']})")
    print(f"  Top Drivers: {', '.join(res2['top_features'])}")

    # Demo 3: New patient with 0 readings (baseline model)
    res3 = predict_risk(pt1, [])
    print(f"\n[Case 3: Intake / Zero History] Patient {pid1}")
    print(f"  Basis:       {res3['basis']}")
    print(f"  Probability: {res3['probability']:.4f} ({res3['tier']})")
    print(f"  Top Drivers: {', '.join(res3['top_features'])}")

    print("\n" + "=" * 65)


if __name__ == "__main__":
    main()

