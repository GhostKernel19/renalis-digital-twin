#!/usr/bin/env python3
"""
RENALIS ML Training Pipeline
Digital Twin Challenge 2026

Trains and evaluates supervised machine learning models to predict rapid eGFR
progression (>10% drop between months 9 and 12) using longitudinal readings
from months 1 to 9 only (strictly zero data leakage).

Models:
1. Logistic Regression (standardized via StandardScaler)
2. Random Forest Classifier

Evaluation:
- Stratified 80/20 train/test split with fixed random seed
- ROC-AUC, Precision, Recall, F1-Score, and Confusion Matrix on test set
- Automatic persistence of the superior model (by test ROC-AUC) to ml/models/risk_model.joblib
"""

import argparse
from pathlib import Path
import sys
from typing import Any, Dict, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
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

from ml.features import FEATURE_NAMES, build_feature_matrix


def train_and_evaluate_model(
    name: str,
    model: Any,
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_test: pd.DataFrame,
    y_test: pd.Series,
) -> Dict[str, Any]:
    """Train a model and compute comprehensive evaluation metrics on the test set."""
    model.fit(X_train, y_train)

    # Predict probabilities and binary labels
    y_prob = model.predict_proba(X_test)[:, 1]
    y_pred = model.predict(X_test)

    roc_auc = float(roc_auc_score(y_test, y_prob))
    precision = float(precision_score(y_test, y_pred, zero_division=0))
    recall = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    cm = confusion_matrix(y_test, y_pred)

    return {
        "name": name,
        "model": model,
        "roc_auc": roc_auc,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "confusion_matrix": cm,
    }


def print_evaluation_report(results: Dict[str, Any]) -> None:
    """Format and print model evaluation performance metrics."""
    name = results["name"]
    cm = results["confusion_matrix"]
    tn, fp, fn, tp = cm.ravel()

    print("\n" + "=" * 65)
    print(f"  MODEL EVALUATION: {name}")
    print("=" * 65)
    print(f"  ROC-AUC Score:    {results['roc_auc']:.4f}")
    print(f"  Precision:        {results['precision']:.4f}")
    print(f"  Recall:           {results['recall']:.4f}")
    print(f"  F1 Score:         {results['f1']:.4f}")
    print("-" * 65)
    print("  Confusion Matrix (Test Set):")
    print(f"                    Predicted 0 (Stable)   Predicted 1 (Decline)")
    print(f"  Actual 0 (Stable)         TN: {tn:<4d}                 FP: {fp:<4d}")
    print(f"  Actual 1 (Decline)        FN: {fn:<4d}                 TP: {tp:<4d}")
    print("=" * 65)


def train_models(
    patients_path: Path,
    readings_path: Path,
    labels_path: Path,
    output_model_path: Path,
    seed: int = 42,
    test_size: float = 0.2,
) -> Dict[str, Any]:
    """Execute complete training and model selection pipeline."""
    print("\n" + "#" * 65)
    print("  RENALIS: Progression Risk Model Training Pipeline")
    print("#" * 65)
    print(f"Loading cohorts from:\n  - Patients: {patients_path}\n  - Readings: {readings_path}\n  - Labels:   {labels_path}")

    # Load synthetic dataset
    patients_df = pd.read_csv(patients_path)
    readings_df = pd.read_csv(readings_path)
    labels_df = pd.read_csv(labels_path)

    # Feature extraction (months 1-9 strictly)
    print("\nExtracting static and longitudinal features (Months 1-9 only)...")
    X, y = build_feature_matrix(patients_df, readings_df, labels_df)
    print(f"Cohort matrix built: {X.shape[0]} patients, {X.shape[1]} features.")
    print(f"Outcome balance: {np.sum(y == 0)} Stable (0) | {np.sum(y == 1)} Rapid Decline (1)")

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

    # Model 1: Logistic Regression (scaled)
    lr_pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", LogisticRegression(random_state=seed, max_iter=1000)),
    ])

    # Model 2: Random Forest
    rf_classifier = RandomForestClassifier(
        n_estimators=100,
        random_state=seed,
        max_depth=6,
        min_samples_split=4,
    )

    models_to_train = [
        ("Logistic Regression (scaled)", lr_pipeline),
        ("Random Forest", rf_classifier),
    ]

    all_results = []
    for name, model in models_to_train:
        res = train_and_evaluate_model(name, model, X_train, y_train, X_test, y_test)
        print_evaluation_report(res)
        all_results.append(res)

    # Select best model by ROC-AUC
    best_result = max(all_results, key=lambda r: r["roc_auc"])
    best_name = best_result["name"]
    best_model = best_result["model"]
    best_auc = best_result["roc_auc"]

    print("\n" + "*" * 65)
    print(f"  MODEL SELECTION WINNER: {best_name}")
    print(f"  Selection Criterion: Highest Test ROC-AUC ({best_auc:.4f})")
    print("*" * 65)

    # Prepare bundle with model, features, metrics, and training normalization reference
    output_model_path.parent.mkdir(parents=True, exist_ok=True)
    bundle = {
        "model": best_model,
        "model_name": best_name,
        "feature_names": FEATURE_NAMES,
        "features": FEATURE_NAMES,
        "metrics": {
            "roc_auc": best_result["roc_auc"],
            "precision": best_result["precision"],
            "recall": best_result["recall"],
            "f1": best_result["f1"],
            "confusion_matrix": best_result["confusion_matrix"].tolist(),
        },
        "feature_means": X_train.mean().to_dict(),
        "feature_stds": X_train.std().replace(0, 1.0).to_dict(),
        "seed": seed,
        "test_size": test_size,
    }

    joblib.dump(bundle, output_model_path)
    print(f"\nBest model successfully persisted to:\n  -> {output_model_path.resolve()}\n")

    return bundle


def main():
    parser = argparse.ArgumentParser(
        description="Train RENALIS progression risk models on synthetic CKD cohort."
    )
    parser.add_argument(
        "--patients",
        type=Path,
        default=ROOT_DIR / "data" / "synthetic" / "patients.csv",
        help="Path to patients.csv file.",
    )
    parser.add_argument(
        "--readings",
        type=Path,
        default=ROOT_DIR / "data" / "synthetic" / "readings.csv",
        help="Path to readings.csv file.",
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
        default=Path(__file__).resolve().parent / "models" / "risk_model.joblib",
        help="Path to save the best trained model artifact.",
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

    train_models(
        patients_path=args.patients,
        readings_path=args.readings,
        labels_path=args.labels,
        output_model_path=args.output,
        seed=args.seed,
        test_size=args.test_size,
    )


if __name__ == "__main__":
    main()
