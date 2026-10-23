#!/usr/bin/env python3
"""
RENALIS Static Baseline ML Training Pipeline
Digital Twin Challenge 2026

Trains and evaluates a Logistic Regression baseline model on static features only:
- age, sex, diabetes, hypertension, bmi, baseline_creatinine, baseline_egfr, urine_protein
Uses the same rapid progression label (>10% eGFR decline between months 9 and 12)
with an 80/20 stratified train/test split (seed=42).

Persists the trained model to ml/models/baseline_model.joblib for evaluating
new patients who have no or fewer than 6 longitudinal monthly readings.
"""

import argparse
from pathlib import Path
import sys
from typing import Any, Dict

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

# Support relative or absolute execution
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from ml.features import STATIC_FEATURE_NAMES, build_static_feature_matrix


def train_static_baseline(
    patients_path: Path,
    labels_path: Path,
    output_model_path: Path,
    seed: int = 42,
    test_size: float = 0.2,
) -> Dict[str, Any]:
    """Train static Logistic Regression model and save baseline_model.joblib."""
    print("\n" + "#" * 65)
    print("  RENALIS: Static Baseline Model Training Pipeline")
    print("#" * 65)
    print(f"Loading cohorts from:\n  - Patients: {patients_path}\n  - Labels:   {labels_path}")

    if not patients_path.exists():
        raise FileNotFoundError(
            f"Patients file not found at {patients_path}. "
            "Please generate the synthetic cohort first with: "
            "'python data/generate_synthetic.py --num-patients 500 --seed 42'"
        )

    if not labels_path.exists():
        raise FileNotFoundError(
            f"Labels file not found at {labels_path}. "
            "Please generate the synthetic cohort first with: "
            "'python data/generate_synthetic.py --num-patients 500 --seed 42'"
        )

    patients_df = pd.read_csv(patients_path)
    labels_df = pd.read_csv(labels_path)

    # Build static feature matrix
    print(f"\nExtracting {len(STATIC_FEATURE_NAMES)} static baseline features...")
    X, y = build_static_feature_matrix(patients_df, labels_df)
    print(f"Static matrix shape: {X.shape[0]} patients, {X.shape[1]} features.")
    print(f"Features: {', '.join(STATIC_FEATURE_NAMES)}")
    print(f"Class distribution: {np.sum(y == 0)} Stable (0) | {np.sum(y == 1)} Decline (1)")

    # Stratified 80/20 train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=seed,
        stratify=y,
    )
    print(f"\nStratified split ({int((1-test_size)*100)}/{int(test_size*100)}):")
    print(f"  - Train set: {len(X_train)} samples ({np.sum(y_train == 1)} positive)")
    print(f"  - Test set:  {len(X_test)} samples ({np.sum(y_test == 1)} positive)")

    # Train standardized Logistic Regression
    lr_pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", LogisticRegression(random_state=seed, max_iter=1000)),
    ])

    lr_pipeline.fit(X_train, y_train)

    # Predictions
    y_prob = lr_pipeline.predict_proba(X_test)[:, 1]
    y_pred = lr_pipeline.predict(X_test)

    roc_auc = float(roc_auc_score(y_test, y_prob))
    precision = float(precision_score(y_test, y_pred, zero_division=0))
    recall = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()

    # Print evaluation report
    print("\n" + "=" * 65)
    print("  MODEL EVALUATION: Logistic Regression (Static Baseline)")
    print("=" * 65)
    print(f"  ROC-AUC Score:    {roc_auc:.4f}")
    print(f"  Precision:        {precision:.4f}")
    print(f"  Recall:           {recall:.4f}")
    print(f"  F1 Score:         {f1:.4f}")
    print("-" * 65)
    print("  Confusion Matrix (Test Set):")
    print(f"                    Predicted 0 (Stable)   Predicted 1 (Decline)")
    print(f"  Actual 0 (Stable)         TN: {tn:<4d}                 FP: {fp:<4d}")
    print(f"  Actual 1 (Decline)        FN: {fn:<4d}                 TP: {tp:<4d}")
    print("=" * 65)

    # Persist bundle
    output_model_path.parent.mkdir(parents=True, exist_ok=True)
    bundle = {
        "model": lr_pipeline,
        "model_name": "Logistic Regression (static baseline)",
        "feature_names": STATIC_FEATURE_NAMES,
        "features": STATIC_FEATURE_NAMES,
        "metrics": {
            "roc_auc": roc_auc,
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "confusion_matrix": cm.tolist(),
        },
        "feature_means": X_train.mean().to_dict(),
        "feature_stds": X_train.std().replace(0, 1.0).to_dict(),
        "seed": seed,
        "test_size": test_size,
    }

    joblib.dump(bundle, output_model_path)
    print(f"\nBaseline model successfully persisted to:\n  -> {output_model_path.resolve()}\n")

    return bundle


def main():
    parser = argparse.ArgumentParser(
        description="Train RENALIS static baseline progression risk model."
    )
    parser.add_argument(
        "--patients",
        type=Path,
        default=ROOT_DIR / "data" / "synthetic" / "patients.csv",
        help="Path to patients.csv file.",
    )
    parser.add_argument(
        "--labels",
        type=Path,
        default=ROOT_DIR / "data" / "synthetic" / "labels.csv",
        help="Path to labels.csv file.",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=Path(__file__).resolve().parent / "models" / "baseline_model.joblib",
        help="Path to save the trained baseline model artifact.",
    )
    parser.add_argument(
        "--seed",
        "-s",
        type=int,
        default=42,
        help="Random seed for deterministic split and training.",
    )
    parser.add_argument(
        "--test-size",
        type=float,
        default=0.2,
        help="Test split fraction (default: 0.2 for 80/20 split).",
    )

    args = parser.parse_args()

    train_static_baseline(
        patients_path=args.patients,
        labels_path=args.labels,
        output_model_path=args.output,
        seed=args.seed,
        test_size=args.test_size,
    )


if __name__ == "__main__":
    main()
