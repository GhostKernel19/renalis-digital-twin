# RENALIS - Machine Learning Progression Pipeline

This directory contains the machine learning feature extraction, model training, evaluation, and real-time risk inference pipelines for RENALIS (**Digital Twin Challenge 2026**).

The ML engine predicts rapid late-stage Chronic Kidney Disease (CKD) deterioration—defined as an **eGFR decline greater than 10% between Month 9 and Month 12**—using strictly baseline patient profiles and longitudinal readings from **Months 1 to 9**.

---

## Architecture & Data Flow

```
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│     data/synthetic/patients.csv │     │     data/synthetic/readings.csv │
│  - Static demographics & labs   │     │  - Longitudinal telemetry (M1-9)│
└────────────────┬────────────────┘     └────────────────┬────────────────┘
                 │                                       │
                 └───────────────────┬───────────────────┘
                                     │
                                     ▼
                       ┌───────────────────────────┐
                       │      ml/features.py       │
                       │  - 8 static features      │
                       │  - 8 trend features (M1-9)│
                       │  - ZERO LEAKAGE of M10-12 │
                       └─────────────┬─────────────┘
                                     │
                      ┌──────────────┴──────────────┐
                      ▼                             ▼
        ┌───────────────────────────┐ ┌───────────────────────────┐
        │        ml/train.py        │ │       ml/predict.py       │
        │ - Stratified 80/20 split  │ │ - predict_risk(pt, rds)   │
        │ - Logistic Regression     │ │ - Risk probability        │
        │ - Random Forest           │ │ - Risk tier (Low/Med/High)│
        │ - Model selection by AUC  │ │ - Top 3 features          │
        └─────────────┬─────────────┘ └─────────────▲─────────────┘
                      │                             │
                      ▼                             │
        ┌───────────────────────────┐               │
        │ ml/models/risk_model.joblib─────────────────┘
        │ (Serialized model bundle) │
        └───────────────────────────┘
```

---

## Environment Setup

Set up an isolated virtual environment inside `ml/` (or use the repository workspace venv):

### 1. Create Virtual Environment
```bash
# From repository root
python -m venv ml/.venv
```

### 2. Activate Virtual Environment
- **Windows (PowerShell):**
  ```powershell
  .\ml\.venv\Scripts\Activate.ps1
  ```
- **Windows (Command Prompt):**
  ```cmd
  .\ml\.venv\Scripts\activate.bat
  ```
- **macOS / Linux:**
  ```bash
  source ml/.venv/bin/activate
  ```

### 3. Install Dependencies
```bash
pip install -r ml/requirements.txt
```

> **Requirements:** `numpy`, `pandas`, `scikit-learn`, `joblib`.

---

## 1. Feature Engineering (`ml/features.py`)

Extracts 16 tabular features (8 static demographics + 8 longitudinal trend features).

### Feature Inventory

| # | Feature Name | Type | Description |
|---|:---|:---|:---|
| 1 | `age` | Static | Patient age in years (30–85) |
| 2 | `sex` | Static | Binary biological sex (`1` = Male, `0` = Female) |
| 3 | `diabetes` | Static | Type 2 diabetes indicator (`1` = Yes, `0` = No) |
| 4 | `hypertension` | Static | Essential hypertension indicator (`1` = Yes, `0` = No) |
| 5 | `bmi` | Static | Body Mass Index in kg/m² |
| 6 | `baseline_creatinine` | Static | Serum creatinine in mg/dL |
| 7 | `baseline_egfr` | Static | Baseline eGFR (mL/min/1.73m²) via 2021 CKD-EPI |
| 8 | `urine_protein` | Static | Qualitative dipstick ordinal tier (`negative`: 0, `trace`: 1, `+1`: 2, `+2`: 3, `+3`: 4) |
| 9 | `egfr_slope` | Trend | Rate of change in eGFR over Months 1–9 (OLS slope) |
| 10 | `last_egfr` | Trend | Latest observed eGFR value within Month 9 |
| 11 | `systolic_bp_slope` | Trend | Linear slope of systolic blood pressure over Months 1–9 |
| 12 | `systolic_bp_std` | Trend | Standard deviation of systolic blood pressure over Months 1–9 |
| 13 | `mean_adherence` | Trend | Mean medication adherence percentage across Months 1–9 |
| 14 | `adherence_slope` | Trend | Linear slope of medication adherence across Months 1–9 |
| 15 | `mean_daily_steps` | Trend | Average daily step count across Months 1–9 |
| 16 | `steps_slope` | Trend | Linear slope of daily step count across Months 1–9 |

> [!IMPORTANT]
> **Strict Leakage Prevention:** Features are computed exclusively using readings from **Months 1 to 9**. Telemetry from Months 10 to 12 is never accessed or provided as input to the feature extraction or model inference pipelines.

---

## 2. Model Training & Evaluation (`ml/train.py`)

Train competitive models on the synthetic cohort with a stratified 80/20 train/test split (fixed random seed = 42):

```bash
python ml/train.py
```

### Options
```bash
python ml/train.py --seed 42 --test-size 0.2 --output ml/models/risk_model.joblib
```

### Evaluation Benchmark (Test Set, N = 100)

```
=================================================================
  MODEL EVALUATION: Logistic Regression (scaled)
=================================================================
  ROC-AUC Score:    0.9729
  Precision:        0.8929
  Recall:           0.8333
  F1 Score:         0.8621
-----------------------------------------------------------------
  Confusion Matrix (Test Set):
                    Predicted 0 (Stable)   Predicted 1 (Decline)
  Actual 0 (Stable)         TN: 67                   FP: 3   
  Actual 1 (Decline)        FN: 5                    TP: 25  
=================================================================

=================================================================
  MODEL EVALUATION: Random Forest
=================================================================
  ROC-AUC Score:    0.9667
  Precision:        0.9000
  Recall:           0.9000
  F1 Score:         0.9000
-----------------------------------------------------------------
  Confusion Matrix (Test Set):
                    Predicted 0 (Stable)   Predicted 1 (Decline)
  Actual 0 (Stable)         TN: 67                   FP: 3   
  Actual 1 (Decline)        FN: 3                    TP: 27  
=================================================================
```

The pipeline automatically identifies the model with the highest test ROC-AUC (Logistic Regression, ROC-AUC = 0.9729) and serializes it along with feature metadata to `ml/models/risk_model.joblib`.

---

## 3. Real-Time Risk Inference (`ml/predict.py`)

The primary integration endpoint for the FastAPI backend service:

```python
from ml.predict import predict_risk

patient = {
    "patient_id": "SYN-001",
    "age": 62,
    "sex": "M",
    "diabetes": 1,
    "hypertension": 1,
    "bmi": 22.7,
    "baseline_creatinine": 0.68,
    "baseline_egfr": 105.1,
    "urine_protein": "+1",
}

readings = [
    {"month": 1, "egfr": 104.2, "systolic_bp": 138, "adherence_pct": 92.0, "daily_steps": 6200},
    {"month": 2, "egfr": 102.5, "systolic_bp": 140, "adherence_pct": 89.0, "daily_steps": 5900},
    # ... up to month 9
    {"month": 9, "egfr": 89.7,  "systolic_bp": 158, "adherence_pct": 54.0, "daily_steps": 3800},
]

result = predict_risk(patient, readings)
print(result)
```

### Output Schema

```json
{
  "probability": 0.9967,
  "tier": "High",
  "top_features": [
    "egfr_slope",
    "adherence_slope",
    "steps_slope"
  ],
  "feature_contributions": [
    {"feature": "egfr_slope", "contribution": 5.006, "value": -1.76},
    {"feature": "adherence_slope", "contribution": 1.7483, "value": -4.62},
    {"feature": "steps_slope", "contribution": 1.3419, "value": -302.2}
  ]
}
```

### Risk Stratification Tiers

| Tier | Probability Range | Care Team Clinical Implication |
|:---|:---|:---|
| **Low** | `< 0.33` | Standard annual primary care follow-up; reinforce lifestyle & adherence |
| **Medium** | `0.33` to `0.66` | Nephrology care coordinator check-in; medication reconciliation; lab in 90 days |
| **High** | `> 0.66` | Urgent multidisciplinary consultation; SGLT2i / RASi titration review; BP optimization |

---

## Limitations & Ethical Disclaimer

> [!CAUTION]
> ### Honest Clinical Limitations Notice
>
> 1. **Rule-Derived Ground Truth:** The progression outcome labels (`1` vs `0`) are mathematically computed from synthetic deterioration heuristics injected by our generator script (`data/generate_synthetic.py`). 
> 2. **Pipeline Demonstration Only:** The high evaluation scores (ROC-AUC > 0.96) reflect successful software engineering, correct feature extraction, and mathematical alignment with the synthetic generator rules. **They demonstrate technical pipeline execution, NOT clinical predictive accuracy.**
> 3. **Non-Validated Research Prototype:** This system has **NOT been clinically validated** on real-world patient cohorts (such as CRIC, UK Biobank, or real EHR registries).
> 4. **No Medical Decision-Making:** This prototype must **never be used for clinical diagnosis, patient triage, prognosis, medication prescribing, or therapeutic decision-making.**
