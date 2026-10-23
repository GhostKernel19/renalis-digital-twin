# RENALIS - FastAPI Backend

This directory contains the core REST API microservice and digital twin simulation backend for RENALIS (**Digital Twin Challenge 2026**).

The service exposes endpoints for synthetic patient data ingestion, real-time Chronic Kidney Disease (CKD) progression risk assessment using our scikit-learn model, trajectory forecasting with lower/upper bounds, telemetry logging with demonstration safety triggers, care coordination referral queues, generic follow-ups, and SQLite persistence.

---

## Architecture & Responsibilities

```
┌────────────────────────────────────────────────────────┐
│            Frontend (React + Vite + TS)                │
│                 http://localhost:5173                  │
└───────────────────────────▲────────────────────────────┘
                            │ REST / JSON (CORS Enabled)
┌───────────────────────────▼────────────────────────────┐
│              FastAPI Backend (backend/app)             │
│  - GET  /health          (Health & model diagnostics)  │
│  - GET  /patients        (Cohort search & tier filter) │
│  - GET  /patients/{id}   (Profile & telemetry history) │
│  - GET  /patients/{id}/readings (Monthly telemetry)    │
│  - GET  /patients/{id}/twin     (Twin state & bounds)  │
│  - POST /patients        (Intake & CKD-EPI 2021 eGFR)  │
│  - POST /patients/{id}/logs     (Daily logs & safety)  │
│  - GET  /patients/{id}/logs     (Daily log history)    │
│  - POST/GET/PATCH /referrals    (Care queue management)│
│  - POST/GET/PATCH /follow-ups   (Generic appointments) │
│  - GET  /stats           (Cohort & operations summary) │
└─────────────▲────────────────────────────▲─────────────┘
              │                            │
┌─────────────▼─────────────┐┌─────────────▼─────────────┐
│  ML Models (ml/models/)   ││  Persistence & Synthetic  │
│  - risk_model.joblib      ││  - data/synthetic/ (500)  │
│  - baseline_model.joblib  ││  - backend/data/renalis.db│
└───────────────────────────┘└───────────────────────────┘
```

---

## Environment Setup

### 1. Create Virtual Environment
```bash
# Navigate to the backend directory
cd backend

# Create dedicated virtual environment
python -m venv .venv
```

### 2. Activate Virtual Environment
- **Windows (PowerShell):**
  ```powershell
  .\.venv\Scripts\Activate.ps1
  ```
- **Windows (Command Prompt):**
  ```cmd
  .\.venv\Scripts\activate.bat
  ```
- **macOS / Linux:**
  ```bash
  source .venv/bin/activate
  ```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

> **Core Dependencies:** `fastapi`, `uvicorn`, `pydantic`, `pandas`, `scikit-learn`, `joblib`, `pytest`, `httpx`.
> Uses Python's built-in `sqlite3` for persistence with **zero additional database dependencies**.

---

## Running the Server

Start the FastAPI application with live hot-reloading:

```bash
# From within the backend directory:
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Once running:
- **Interactive OpenAPI Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Alternative ReDoc UI:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check Endpoint:** [http://localhost:8000/health](http://localhost:8000/health)

---

## Running the Automated Tests

Execute the automated pytest suite from the repository root:

```bash
pytest backend/tests/test_api.py -v
```

The test suite validates:
- System health, synthetic cohort verification, and missing artifact instructions (`/health`).
- Cohort listing with search, risk tier filtering, and pagination (`/patients`).
- Individual profile and longitudinal telemetry history retrieval (`/patients/{id}`, `/patients/{id}/readings`).
- Digital twin progression state, explainable plain-word drivers, and 3-month projection with prediction bounds (`/patients/{id}/twin`).
- Patient intake with 2021 CKD-EPI eGFR calculation and SQLite persistence (`POST /patients`).
- Daily telemetry logging and demonstration urgent alerts (calling 112 on short of breath or SBP >= 180) (`/patients/{id}/logs`).
- Care coordination referral queue with staff priority ('Routine'/'Urgent') and suggested model tier (`/referrals`).
- Generic care team follow-ups and strict Rule 5 enforcement blocking medication prescribing (`/follow-ups`).
- Cohort aggregate statistics (`/stats`).
- Strict Pydantic input bounds validation (HTTP 422 errors).

---

## REST Endpoints Overview

### 1. System Health (`GET /health`)
Verifies service availability, synthetic dataset presence (`data/synthetic/patients.csv`), and model artifact status (`risk_model.joblib` and `baseline_model.joblib`).

```bash
curl -X GET http://localhost:8000/health
```

If files or models are missing, `/health` provides actionable command-line instructions:
- Generate synthetic cohort: `python data/generate_synthetic.py --num-patients 500 --seed 42`
- Train longitudinal risk model: `python ml/train.py`
- Train static baseline model: `python ml/train_static.py`

---

### 2. Patient Cohort & Telemetry (`GET /patients`, `GET /patients/{id}`, `GET /patients/{id}/readings`)
- `GET /patients?search=SYN-001&risk_tier=High&limit=50&offset=0`: Retrieves patients from the synthetic cohort (500 patients, seed 42) plus newly onboarded intake patients. Every record includes precomputed model `risk_tier` and `risk_probability`.
- `GET /patients/{id}`: Returns patient demographic profile and complete longitudinal readings.
- `GET /patients/{id}/readings`: Returns monthly telemetry list.

---

### 3. Digital Twin Progression Profile (`GET /patients/{id}/twin`)
Calculates the interactive digital twin state:
- Latest kidney score (eGFR) and KDIGO CKD Stage (G1 to G5).
- Model probability and risk action tier (Low, Medium, High).
- Basis: `"trend model"` (if $\ge 6$ monthly readings) or `"baseline only"` ($< 6$ readings).
- Top 3 progression drivers translated into clear plain-word terms (e.g., *"Rate of kidney function decline (eGFR slope)"*, *"Blood pressure variability over time"*).
- 3-month eGFR trajectory with lower and upper bounds (95% prediction interval) and explicitly stated estimation methodology.

```json
{
  "patient_id": "SYN-001",
  "latest_kidney_score": 89.7,
  "ckd_stage": "Stage 2 (G2, Mildly decreased)",
  "probability": 0.9967,
  "tier": "High",
  "basis": "trend model",
  "top_drivers": [
    "Rate of kidney function decline (eGFR slope)",
    "Declining adherence pattern",
    "Downward trend in daily step count"
  ],
  "top_features": ["egfr_slope", "adherence_slope", "steps_slope"],
  "estimated_3m_egfr_trend": {
    "method": "Ordinary least squares linear trend regression over observed monthly eGFR readings (Months 1 to 9) projected 3 months forward with 95% prediction interval bounds. Experimental prototype; not clinically validated.",
    "projected_slope": -3.77,
    "projected_3m_egfr": 78.4,
    "lower_bound": 74.2,
    "upper_bound": 82.6,
    "projected_3m_change_pct": -12.6,
    "projected_readings": [
      {"month": 10, "projected_egfr": 85.9, "lower_bound": 82.1, "upper_bound": 89.7},
      {"month": 11, "projected_egfr": 82.2, "lower_bound": 78.2, "upper_bound": 86.2},
      {"month": 12, "projected_egfr": 78.4, "lower_bound": 74.2, "upper_bound": 82.6}
    ],
    "summary": "Projected trajectory indicates accelerated kidney function decline: eGFR estimated to change by -12.6% from 89.7 to 78.4 mL/min/1.73m² over 3 months (95% bound: 74.2 to 82.6)."
  }
}
```

---

### 4. Patient Intake (`POST /patients`)
Onboards a new patient:
1. Calculates baseline eGFR from serum creatinine using the **2021 CKD-EPI Creatinine equation** (without race):
   $$eGFR = 142 \times \min(S_{cr}/\kappa, 1)^\alpha \times \max(S_{cr}/\kappa, 1)^{-1.200} \times 0.9938^{\text{age}} \times \text{gender\_factor}$$
2. Persists the patient to SQLite database (`backend/data/renalis.db`).
3. Executes baseline progression model inference (`basis: "baseline only"` if $< 6$ earlier readings).
4. Records digital twin assessment and returns the full twin profile.

---

### 5. Daily Telemetry & Demonstration Safety Alerts (`POST` & `GET /patients/{id}/logs`)
Accepts daily vitals: `systolic`, `diastolic`, `steps`, `medicines_taken`, and `symptoms`.

**Demonstration Safety Rule:**
If symptoms include `short of breath` (or variants) OR `systolic >= 180`, the endpoint returns `urgent=True` with an emergency message directing the user to seek urgent medical evaluation and call **112**. The message is explicitly designated as an automated demonstration rule, NOT clinical guidance.

---

### 6. Care Coordination Referrals (`POST`, `GET`, `PATCH /referrals`)
- `POST /referrals`: Creates referral. Staff assign priority (`Routine` or `Urgent`). The model risk tier is saved separately as a recommendation.
- `GET /referrals`: Lists referrals with optional `status` (`Pending`, `In Review`, `Reviewed`, `Completed`) and `priority` filters.
- `PATCH /referrals/{id}`: Staff updates priority, workflow status, and clinical notes.

---

### 7. Generic Care Team Follow-Ups (`POST`, `GET`, `PATCH /follow-ups`)
Manages generic care team appointments:
- Allowed purposes are generic only (e.g. *"Repeat blood test"*, *"Blood pressure check"*, *"Urinalysis review"*).
- Enforces Rule 5 via Pydantic validators: Any drug name, dosage, or treatment advice is strictly rejected with HTTP 422.

---

### 8. Platform Statistics (`GET /stats`)
Returns:
- `totals`: Patient count (500 synthetic + added intake patients), assessments, logs, referrals, and follow-ups.
- `risk_tier_distribution`: Count across Low, Medium, High risk tiers.
- `referrals_by_status`: Grouped count of referrals.
- `follow_ups_due_this_week`: Number of follow-ups scheduled in the current calendar week.

---

## Limitations & Ethical Notice

> [!CAUTION]
> ### Prototype Notice & Clinical Limitations
>
> 1. **Synthetic Cohort Only:** All patient records, telemetry, and laboratory parameters served by this API are 100% synthetic (generated by `data/generate_synthetic.py` with seed 42). No real human subjects or Protected Health Information (PHI) were utilized.
> 2. **Rule-Based Ground Truth:** The progression risk labels are mathematical consequences of synthetic decline injection heuristics programmed into the generator. High model performance verifies software pipeline integration, NOT clinical diagnostic efficacy.
> 3. **Non-Clinically Validated:** The risk probabilities, 3-month projected eGFR trends, and safety alerts are research prototypes developed exclusively for the **Digital Twin Challenge 2026**.
> 4. **No Medical Use:** This software is not an approved medical device and must **never be used for clinical diagnosis, patient triage, prognosis, medication selection, or therapeutic decision-making.**
> 5. **Zero Prescriptive Content (Rule 5):** The system strictly avoids emitting drug names, dosages, or treatment advice.
