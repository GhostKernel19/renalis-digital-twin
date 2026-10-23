# RENALIS - Machine Learning Progression Pipeline

This directory contains the machine learning feature extraction, model training, evaluation, and real-time risk inference pipelines for RENALIS (**Digital Twin Challenge 2026**).

The ML engine predicts rapid late-stage Chronic Kidney Disease (CKD) deterioration—defined as an **eGFR decline greater than 10% between Month 9 and Month 12**—using longitudinal readings from **Months 1 to 9** when available, or a static baseline model for newly onboarded patients with fewer than 6 monthly readings.

---

## Architecture & Data Flow

```
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│     data/synthetic/patients.csv │     │     data/synthetic/readings.csv │
│  - Static demographics & labs   │     │  - Longitudinal telemetry (M1-9)│
└────────────────┬────────────────┘     └────────────────┬────────────────┘
                 │                                       │
                 ├───────────────────┬───────────────────┘
                 │                   │
                 ▼                   ▼
     ┌───────────────────────┐ ┌───────────────────────────┐
     │  ml/train_static.py   │ │      ml/features.py       │
     │  - 8 static features  │ │  - 8 static features      │
     │  - Logistic Regression│ │  - 8 trend features (M1-9)│
     │  - 80/20 stratified   │ │  - ZERO LEAKAGE of M10-12 │
     └───────────┬───────────┘ └─────────────┬─────────────┘
                 │                           │
                 ▼                           ▼
     ┌───────────────────────┐ ┌───────────────────────────┐
     │ ml/models/            │ │        ml/train.py        │
     │  baseline_model.joblib│ │ - Stratified 80/20 split  │
     └───────────┬───────────┘ │ - Logistic Regression     │
                 │             │ - Random Forest           │
                 │             └─────────────┬─────────────┘
                 │                           │
                 │                           ▼
                 │             ┌───────────────────────────┐
                 │             │ ml/models/risk_model.joblib│
                 │             └─────────────┬─────────────┘
                 │                           │
                 ▼                           ▼
       ┌───────────────────────────────────────────┐
       │               ml/predict.py               │
       │ - If < 6 monthly readings: baseline only  │
       │ - If >= 6 monthly readings: trend model   │
       │ - Returns probability, tier, and basis    │
       └───────────────────────────────────────────┘
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
| 13 | `mean_adherence` | Trend | Mean adherence percentage across Months 1–9 |
| 14 | `adherence_slope` | Trend | Linear slope of adherence across Months 1–9 |
| 15 | `mean_daily_steps` | Trend | Average daily step count across Months 1–9 |
| 16 | `steps_slope` | Trend | Linear slope of daily step count across Months 1–9 |

> [!IMPORTANT]
> **Strict Leakage Prevention:** Longitudinal trend features are computed exclusively using readings from **Months 1 to 9**. Telemetry from Months 10 to 12 is never accessed or provided as input to the feature extraction or model inference pipelines.

---

## 2. Model Training Pipelines

### A. Full Longitudinal Trend Model (`ml/train.py`)

Trains supervised models on the synthetic cohort (500 patients) with a stratified 80/20 train/test split (`seed=42`):

```bash
python ml/train.py
```

The pipeline trains standardized Logistic Regression and Random Forest models, selects the superior model by test ROC-AUC (Logistic Regression, ROC-AUC = 0.9729), and serializes it to `ml/models/risk_model.joblib`.

### B. Static Baseline Model (`ml/train_static.py`)

For new patients with no history or fewer than 6 monthly readings, RENALIS trains a baseline Logistic Regression model on **static features only** (`age`, `sex`, `diabetes`, `hypertension`, `bmi`, `baseline_creatinine`, `baseline_egfr`, `urine_protein`):

```bash
python ml/train_static.py
```

#### Evaluation Benchmark (Test Set, N = 100)
```
=================================================================
  MODEL EVALUATION: Logistic Regression (Static Baseline)
=================================================================
  ROC-AUC Score:    0.4124
  Precision:        0.0000
  Recall:           0.0000
  F1 Score:         0.0000
-----------------------------------------------------------------
  Confusion Matrix (Test Set):
                    Predicted 0 (Stable)   Predicted 1 (Decline)
  Actual 0 (Stable)         TN: 70                   FP: 0   
  Actual 1 (Decline)        FN: 30                   TP: 0   
=================================================================
```

The baseline model is saved to `ml/models/baseline_model.joblib`. Without longitudinal trajectory features, static features alone provide baseline prior risk estimation.

---

## 3. Real-Time Risk Inference (`ml/predict.py`)

The primary prediction interface for the FastAPI backend service. Automatically branches between the trend model and baseline model based on reading count:

```python
from ml.predict import predict_risk

# Case 1: Longitudinal history (>= 6 readings) -> uses trend model
result_trend = predict_risk(patient, readings_9_months)
# Returns basis: "trend model"

# Case 2: Incomplete or zero history (< 6 readings) -> uses baseline model
result_baseline = predict_risk(patient, readings_3_months)
# Returns basis: "baseline only"
```

### Output Schema

```json
{
  "probability": 0.9967,
  "tier": "High",
  "basis": "trend model",
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

| Tier | Probability Range | Clinical Action Priority |
|:---|:---|:---|
| **Low** | `< 0.33` | Standard annual primary care follow-up; lifestyle and health habit reinforcement |
| **Medium** | `0.33` to `0.66` | Care coordinator review; repeat lab evaluation in 90 days |
| **High** | `> 0.66` | Urgent multidisciplinary consultation; care plan review; blood pressure monitoring |

---

## Limitations & Ethical Disclaimer

> [!CAUTION]
> ### Honest Clinical Limitations Notice
>
> 1. **Rule-Derived Ground Truth:** The progression outcome labels (`1` vs `0`) are mathematically generated by synthetic decline injection algorithms programmed into the generator script (`data/generate_synthetic.py`).
> 2. **Pipeline Demonstration Only:** High evaluation scores on longitudinal data reflect successful software engineering, correct feature extraction, and mathematical alignment with the generator rules. **They demonstrate technical pipeline execution, NOT clinical predictive accuracy.**
> 3. **Non-Validated Research Prototype:** This system has **NOT been clinically validated** on real-world patient cohorts (such as CRIC, UK Biobank, or real EHR registries).
> 4. **No Medical Decision-Making:** This prototype must **never be used for clinical diagnosis, patient triage, prognosis, medication selection, or therapeutic decision-making.**
> 5. **Zero Prescriptive Output (Rule 5):** The system strictly refrains from outputting drug names, dosages, or medical treatment advice.
