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

from ml.features import FEATURE_NAMES, extract_patient_features

DEFAULT_MODEL_PATH = Path(__file__).resolve().parent / "models" / "risk_model.joblib"

# In-memory artifact cache for high-throughput API serving
_MODEL_CACHE: Dict[str, Any] = {}


def load_model_bundle(model_path: Optional[Union[str, Path]] = None) -> Dict[str, Any]:
    """Load and cache the trained risk model bundle."""
    target_path = Path(model_path) if model_path is not None else DEFAULT_MODEL_PATH
    resolved_path = str(target_path.resolve())

    if resolved_path not in _MODEL_CACHE:
        if not target_path.exists():
            raise FileNotFoundError(
                f"Model file not found at {target_path}. "
                "Please run 'python ml/train.py' first to train and persist the risk model."
            )
        loaded = joblib.load(target_path)
        if isinstance(loaded, dict) and "model" in loaded:
            _MODEL_CACHE[resolved_path] = loaded
        else:
            # Fallback wrapper if a raw estimator was loaded
            _MODEL_CACHE[resolved_path] = {
                "model": loaded,
                "model_name": type(loaded).__name__,
                "feature_names": FEATURE_NAMES,
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

    # Fallback: Default to clinically most established CKD progression markers
    default_top = ["egfr_slope", "last_egfr", "systolic_bp_slope"]
    return default_top, [{"feature": f, "value": feature_vals.get(f, 0.0)} for f in default_top]


def predict_risk(
    patient: Dict[str, Any],
    readings: List[Dict[str, Any]],
    model_path: Optional[Union[str, Path]] = None,
) -> Dict[str, Any]:
    """Predict risk of rapid eGFR decline (>10% drop from month 9 to 12).

    Uses strictly readings from months 1 to 9 (zero leakage of months 10 to 12).

    Args:
        patient: Dictionary of static demographics (age, sex, diabetes, hypertension,
                 bmi, baseline_creatinine, baseline_egfr, urine_protein).
        readings: List of monthly telemetry dictionaries (egfr, systolic_bp,
                  diastolic_bp, adherence_pct, daily_steps).
        model_path: Optional custom path to serialized joblib model.

    Returns:
        Dictionary containing:
        - probability: float (0.0 to 1.0)
        - tier: "Low", "Medium", or "High"
        - top_features: list of top 3 contributing feature names [str, str, str]
        - feature_contributions: detailed list of feature contributions
    """
    bundle = load_model_bundle(model_path)
    model = bundle["model"]
    feature_names = bundle.get("feature_names", FEATURE_NAMES)

    # Extract features with strict months 1-9 filtering
    feature_dict = extract_patient_features(patient, readings)
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
        "top_features": top_3_features,
        # Additional aliases for backend consumer convenience
        "risk_probability": proba_rounded,
        "risk_tier": tier,
        "top_contributing_features": top_3_features,
        "feature_contributions": top_3_details,
    }


def main():
    """Demo CLI run for predict_risk using sample patients."""
    sample_patients_file = ROOT_DIR / "data" / "sample" / "patients_sample.csv"
    readings_file = ROOT_DIR / "data" / "synthetic" / "readings.csv"

    if not sample_patients_file.exists() or not readings_file.exists():
        print("Sample data not found. Run data/generate_synthetic.py first.")
        return

    patients_df = pd.read_csv(sample_patients_file)
    readings_df = pd.read_csv(readings_file)

    print("\n" + "=" * 65)
    print("  RENALIS Progression Risk Inference Demonstration")
    print("=" * 65)

    # Test first 3 sample patients
    for idx in range(min(3, len(patients_df))):
        patient = patients_df.iloc[idx].to_dict()
        pid = patient["patient_id"]
        p_readings = readings_df[readings_df["patient_id"] == pid].to_dict(orient="records")

        result = predict_risk(patient, p_readings)

        print(f"\nPatient ID:    {pid}")
        print(f"Demographics:  Age {patient.get('age')}, Sex {patient.get('sex')}, Baseline eGFR {patient.get('baseline_egfr')}")
        print(f"Probability:   {result['probability']:.4f}")
        print(f"Risk Tier:     {result['tier']}")
        print(f"Top Features:  {', '.join(result['top_features'])}")
        print("Feature Contributions:")
        for fc in result["feature_contributions"]:
            print(f"  - {fc['feature']:18s} (val: {fc.get('value')}, contrib: {fc.get('contribution', fc.get('importance_score'))})")

    print("\n" + "=" * 65)


if __name__ == "__main__":
    main()
