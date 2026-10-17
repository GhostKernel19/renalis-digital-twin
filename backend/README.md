# RENALIS - FastAPI Backend

This directory contains the core REST API microservice and digital twin simulation backend for RENALIS (**Digital Twin Challenge 2026**).

The service exposes endpoints for synthetic patient data ingestion, real-time Chronic Kidney Disease (CKD) progression risk assessment using our scikit-learn model, trajectory forecasting, and care coordination referral queue management.

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
│  - GET  /health          (System health & model status)│
│  - POST /assess-patient  (Pydantic validation + risk)  │
│  - GET  /patients        (Synthetic cohort list)       │
│  - GET  /patients/{id}   (Profile + telemetry history) │
│  - POST /referrals       (Care coordination queue)     │
│  - GET  /referrals       (List active referrals)       │
└─────────────▲────────────────────────────▲─────────────┘
              │                            │
┌─────────────▼─────────────┐┌─────────────▼─────────────┐
│  ml/models/risk_model     ││   data/synthetic/         │
│  - Logistic Regression    ││  - patients.csv (500 pts) │
│  - Scaled, M1-9 features  ││  - readings.csv (6000 rds)│
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

Tests cover:
- System health and risk model discovery verification (`/health`).
- Risk assessment inference and 3-month forecast generation (`/assess-patient`).
- Input bounds validation and 422 Unprocessable Entity error responses.
- Synthetic patient cohort listing and individual profile retrieval with readings (`/patients`).
- Multidisciplinary care referral creation and filtering (`/referrals`).
- Missing model graceful 503 error handling.

---

## REST Endpoints Overview

### 1. System Health (`GET /health`)
Verifies service availability, synthetic dataset presence, and model artifact status (`ml/models/risk_model.joblib`).

```bash
curl -X GET http://localhost:8000/health
```

**Response Example:**
```json
{
  "status": "healthy",
  "service": "RENALIS Digital Twin Backend",
  "model_loaded": true,
  "model_file_exists": true,
  "model_path": "D:/.../ml/models/risk_model.joblib",
  "message": "Service is healthy and risk model is ready."
}
```

If the model artifact is missing, `/health` returns `"model_loaded": false` with actionable guidance to run `python ml/train.py`.

---

### 2. Progression Risk Assessment (`POST /assess-patient`)
Takes patient demographics and longitudinal telemetry (strictly Months 1–9) and outputs progression probability, clinical risk tier, top 3 contributing factors, and a 3-month projected eGFR trajectory.

```bash
curl -X POST http://localhost:8000/assess-patient \
  -H "Content-Type: application/json" \
  -d '{
    "patient": {
      "patient_id": "SYN-001",
      "age": 62,
      "sex": "M",
      "diabetes": 1,
      "hypertension": 1,
      "bmi": 22.7,
      "baseline_creatinine": 0.68,
      "baseline_egfr": 105.1,
      "urine_protein": "+1"
    },
    "readings": [
      {"month": 1, "egfr": 104.2, "systolic_bp": 138, "diastolic_bp": 86, "adherence_pct": 92.0, "daily_steps": 6200},
      {"month": 9, "egfr": 89.7, "systolic_bp": 158, "diastolic_bp": 96, "adherence_pct": 54.0, "daily_steps": 3800}
    ]
  }'
```

**Response Example:**
```json
{
  "probability": 0.9967,
  "tier": "High",
  "top_features": [
    "egfr_slope",
    "adherence_slope",
    "steps_slope"
  ],
  "estimated_3m_egfr_trend": {
    "projected_slope": -3.77,
    "projected_3m_change_pct": -12.6,
    "projected_readings": [
      {"month": 10, "projected_egfr": 85.9},
      {"month": 11, "projected_egfr": 82.2},
      {"month": 12, "projected_egfr": 78.4}
    ],
    "summary": "High risk of rapid deterioration: projected drop of 12.6% from 89.7 to 78.4 mL/min/1.73m² by Month 12 (projected slope: -3.77 mL/min/1.73m²/mo)."
  }
}
```

#### Validation & Error Handling (HTTP 422)
Inputs are strictly validated using Pydantic:
- `age`: 18 to 100 years.
- `systolic_bp`: 70 to 240 mmHg.
- `diastolic_bp`: 40 to 150 mmHg.
- `baseline_creatinine`: 0.3 to 15.0 mg/dL.
- `readings`: Must contain at least 1 reading.
Any out-of-range value returns a structured HTTP 422 Unprocessable Entity error detailing the offending field.

---

### 3. Patient Ingestion (`GET /patients` & `GET /patients/{id}`)
- `GET /patients?limit=50&offset=0`: Returns paginated synthetic patients loaded from `data/synthetic/patients.csv` (or fallback sample `data/sample/patients_sample.csv`).
- `GET /patients/{id}`: Returns individual patient demographics together with all 12 monthly biometric readings for digital twin longitudinal timeline visualization.

---

### 4. Referral Queue (`POST /referrals` & `GET /referrals`)
Manages care team coordination referrals for high-risk patients.
- `POST /referrals`: Submits a patient with `reason`, `priority` (`Low`, `Medium`, `High`, `Urgent`), and `status` (`Pending`, `In Review`, `Reviewed`).
- `GET /referrals`: Lists active referrals with optional `status_filter` and `patient_id` query parameters.

> **Storage Notice:** Currently stored in-memory.
> `// TODO: Replace in-memory referral store with Google Cloud Firestore in production.`

---

## Limitations & Ethical Notice

> [!CAUTION]
> ### Prototype Notice & Clinical Limitations
>
> 1. **Synthetic Cohort Only:** All patient records, telemetry, and laboratory parameters served by this API are 100% synthetic (generated by `data/generate_synthetic.py`). No real human subjects or Protected Health Information (PHI) were utilized.
> 2. **Rule-Based Ground Truth:** The progression risk labels are mathematical consequences of synthetic decline injection algorithms programmed into the generator. High model performance verifies software pipeline integration, NOT clinical diagnostic efficacy.
> 3. **Non-Clinically Validated:** The risk probabilities and 3-month projected eGFR trends are research prototypes developed exclusively for the **Digital Twin Challenge 2026**.
> 4. **No Medical Use:** This software is not an approved medical device and must **never be used for clinical diagnosis, patient triage, prognosis, medication selection, or therapeutic decision-making.**
