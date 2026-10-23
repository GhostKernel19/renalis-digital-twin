"""
Comprehensive Automated Test Suite for RENALIS FastAPI Backend
Digital Twin Challenge 2026

Tests cover:
1. System health, synthetic cohort verification & actionable instructions (/health)
2. Synthetic cohort listing, search, risk tier filtering, and pagination (/patients)
3. Individual patient details and longitudinal monthly readings (/patients/{id}, /patients/{id}/readings)
4. Digital twin progression assessment with explainable plain-word drivers and 3-month projection bounds (/patients/{id}/twin)
5. Patient intake with CKD-EPI 2021 eGFR calculation and SQLite persistence (POST /patients)
6. Daily telemetry logging and automated demonstration urgent safety alerts (POST & GET /patients/{id}/logs)
7. Care coordination referrals with staff priority ('Routine'/'Urgent') and suggested model tier (POST, GET, PATCH /referrals)
8. Generic care team follow-ups and enforcement of Rule 5 prohibiting medications/advice (POST, GET, PATCH /follow-ups)
9. Platform summary statistics (/stats)
10. Strict Pydantic input bounds validation (HTTP 422 errors)
"""

from datetime import datetime, timezone, timedelta
from pathlib import Path
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure root directory is on sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.app.database import get_db, init_db
from backend.app.main import app


@pytest.fixture
def client():
    """Create FastAPI TestClient fixture."""
    return TestClient(app)


@pytest.fixture(autouse=True)
def clean_db():
    """Ensure database tables exist and clear test records before each test."""
    init_db()
    with get_db() as conn:
        conn.execute("DELETE FROM added_patients;")
        conn.execute("DELETE FROM patient_readings;")
        conn.execute("DELETE FROM assessments;")
        conn.execute("DELETE FROM daily_logs;")
        conn.execute("DELETE FROM referrals;")
        conn.execute("DELETE FROM follow_ups;")
    yield


# =========================================================================
# 1. System Health & Diagnostics
# =========================================================================

def test_health_endpoint_healthy(client):
    """Test GET /health reports healthy status, synthetic data presence, and models."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["synthetic_data_available"] is True
    assert data["model_loaded"] is True
    assert data["baseline_model_loaded"] is True
    assert "data/synthetic/patients.csv" in data["patients_data_path"].replace("\\", "/")


def test_health_endpoint_missing_synthetic_data(client, monkeypatch):
    """Test GET /health provides actionable generation command when synthetic cohort is missing."""
    import backend.app.main as main_mod

    monkeypatch.setattr(
        main_mod,
        "check_synthetic_files",
        lambda: (False, "Synthetic data missing. Please generate the synthetic cohort first with: 'python data/generate_synthetic.py --num-patients 500 --seed 42'"),
    )

    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "degraded"
    assert data["synthetic_data_available"] is False
    assert "data/generate_synthetic.py" in data["message"]
    assert "--seed 42" in data["message"]


def test_health_endpoint_missing_models(client, monkeypatch):
    """Test GET /health provides instructions to train models if artifacts are missing."""
    import backend.app.main as main_mod

    monkeypatch.setattr(main_mod, "is_trend_model_available", lambda: False)
    monkeypatch.setattr(main_mod, "is_baseline_model_available", lambda: False)

    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "degraded"
    assert "ml/train.py" in data["message"]
    assert "ml/train_static.py" in data["message"]


# =========================================================================
# 2. Patient Cohort & Filtering Endpoints
# =========================================================================

def test_patients_list_with_model_tier_and_prob(client):
    """Test GET /patients returns 500 synthetic cohort with precomputed model tier and probability."""
    resp = client.get("/patients?limit=10&offset=0")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 500
    assert data["count"] == 10
    assert len(data["patients"]) == 10

    # Verify first patient has demographics, risk tier, probability, and basis
    first_pt = data["patients"][0]
    assert first_pt["patient_id"] == "SYN-001"
    assert "age" in first_pt
    assert "sex" in first_pt
    assert "baseline_egfr" in first_pt
    assert first_pt["risk_tier"] in ("Low", "Medium", "High")
    assert 0.0 <= first_pt["risk_probability"] <= 1.0
    assert first_pt["basis"] in ("trend model", "baseline only")


def test_patients_search_and_tier_filter(client):
    """Test GET /patients search query and risk tier filter."""
    # Search by exact or partial patient ID
    search_resp = client.get("/patients?search=SYN-005")
    assert search_resp.status_code == 200
    results = search_resp.json()["patients"]
    assert len(results) >= 1
    assert any(p["patient_id"] == "SYN-005" for p in results)

    # Filter by risk tier
    high_resp = client.get("/patients?risk_tier=High&limit=100")
    assert high_resp.status_code == 200
    high_pts = high_resp.json()["patients"]
    for p in high_pts:
        assert p["risk_tier"] == "High" or p["tier"] == "High"

    low_resp = client.get("/patients?risk_tier=Low&limit=100")
    assert low_resp.status_code == 200
    low_pts = low_resp.json()["patients"]
    for p in low_pts:
        assert p["risk_tier"] == "Low" or p["tier"] == "Low"


def test_patient_details_and_readings(client):
    """Test GET /patients/{id} and GET /patients/{id}/readings."""
    # Valid patient
    resp = client.get("/patients/SYN-001")
    assert resp.status_code == 200
    pt = resp.json()
    assert pt["patient_id"] == "SYN-001"
    assert "readings" in pt
    assert len(pt["readings"]) == 12

    # Readings standalone endpoint
    rds_resp = client.get("/patients/SYN-001/readings")
    assert rds_resp.status_code == 200
    rds = rds_resp.json()
    assert len(rds) == 12
    assert rds[0]["month"] == 1
    assert "egfr" in rds[0]

    # Non-existent patient
    missing_resp = client.get("/patients/NON_EXISTENT_ID")
    assert missing_resp.status_code == 404

    missing_rds = client.get("/patients/NON_EXISTENT_ID/readings")
    assert missing_rds.status_code == 404


# =========================================================================
# 3. Digital Twin Progression Forecast & Intake
# =========================================================================

def test_patient_twin_endpoint_trend_model(client):
    """Test GET /patients/{id}/twin on patient with full history returns trend model forecast."""
    resp = client.get("/patients/SYN-001/twin")
    assert resp.status_code == 200
    twin = resp.json()

    assert twin["patient_id"] == "SYN-001"
    assert "latest_kidney_score" in twin
    assert "ckd_stage" in twin
    assert 0.0 <= twin["probability"] <= 1.0
    assert twin["tier"] in ("Low", "Medium", "High")
    assert twin["basis"] == "trend model"  # 12 readings >= 6

    # Top 3 drivers in plain words
    assert isinstance(twin["top_drivers"], list)
    assert len(twin["top_drivers"]) == 3
    # Check that plain drivers are human readable phrases, not code variables
    for driver in twin["top_drivers"]:
        assert "_" not in driver

    # 3-month estimate with lower and upper bounds & stated method
    trend = twin["estimated_3m_egfr_trend"]
    assert "method" in trend
    assert "linear trend" in trend["method"].lower() or "ordinary least squares" in trend["method"].lower()
    assert "projected_slope" in trend
    assert "projected_3m_egfr" in trend
    assert "lower_bound" in trend
    assert "upper_bound" in trend
    assert trend["lower_bound"] <= trend["upper_bound"]
    assert len(trend["projected_readings"]) == 3


def test_patient_intake_calculates_ckd_epi_and_stores_in_sqlite(client):
    """Test POST /patients intake calculates eGFR via 2021 CKD-EPI and returns twin with baseline only."""
    intake_payload = {
        "age": 55,
        "sex": "F",
        "diabetes": 1,
        "hypertension": 1,
        "bmi": 29.5,
        "baseline_creatinine": 1.4,
        "urine_protein": "+1",
    }

    resp = client.post("/patients", json=intake_payload)
    assert resp.status_code == 201
    twin = resp.json()

    pid = twin["patient_id"]
    assert pid.startswith("SYN-USR")
    # Verify calculated eGFR using 2021 CKD-EPI formula
    # Female, age 55, scr 1.4:
    # kappa=0.7, alpha=-0.241, gender_factor=1.012
    # ratio = 1.4 / 0.7 = 2.0
    # egfr = 142 * (2.0 ** -1.200) * (0.9938 ** 55) * 1.012 = ~43.6 mL/min/1.73m²
    assert 40.0 <= twin["latest_kidney_score"] <= 46.0
    assert "Stage 3" in twin["ckd_stage"] or "G3" in twin["ckd_stage"]
    assert twin["basis"] == "baseline only"  # 0 earlier readings < 6
    assert len(twin["top_drivers"]) == 3
    assert "method" in twin["estimated_3m_egfr_trend"]

    # Verify patient is persisted and retrievable via GET /patients/{id}
    persisted_resp = client.get(f"/patients/{pid}")
    assert persisted_resp.status_code == 200
    pt_data = persisted_resp.json()
    assert pt_data["age"] == 55
    assert pt_data["sex"] == "F"

    # Verify patient appears in GET /patients listing
    list_resp = client.get(f"/patients?search={pid}")
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] >= 1


def test_patient_intake_validation_errors_422(client):
    """Test POST /patients returns clear 422 for invalid clinical bounds."""
    # 1. Invalid age < 18
    bad_age = {
        "age": 16,
        "sex": "M",
        "diabetes": 0,
        "hypertension": 0,
        "bmi": 22.0,
        "baseline_creatinine": 1.0,
    }
    assert client.post("/patients", json=bad_age).status_code == 422

    # 2. Invalid creatinine > 15.0
    bad_creat = {
        "age": 50,
        "sex": "M",
        "diabetes": 0,
        "hypertension": 0,
        "bmi": 24.0,
        "baseline_creatinine": 20.0,
    }
    assert client.post("/patients", json=bad_creat).status_code == 422

    # 3. Invalid sex
    bad_sex = {
        "age": 50,
        "sex": "UNKNOWN",
        "diabetes": 0,
        "hypertension": 0,
        "bmi": 24.0,
        "baseline_creatinine": 1.0,
    }
    assert client.post("/patients", json=bad_sex).status_code == 422


# =========================================================================
# 4. Daily Logs & Demonstration Urgent Rules
# =========================================================================

def test_patient_logs_normal(client):
    """Test POST and GET /patients/{id}/logs with normal parameters (urgent=False)."""
    payload = {
        "systolic": 124,
        "diastolic": 82,
        "steps": 6500,
        "medicines_taken": True,
        "symptoms": ["mild fatigue"],
    }

    create_resp = client.post("/patients/SYN-001/logs", json=payload)
    assert create_resp.status_code == 201
    log_data = create_resp.json()
    assert log_data["patient_id"] == "SYN-001"
    assert log_data["urgent"] is False
    assert "urgent_message" in log_data
    assert "demo" in log_data["urgent_message"].lower()

    # GET logs history
    history_resp = client.get("/patients/SYN-001/logs")
    assert history_resp.status_code == 200
    logs = history_resp.json()
    assert len(logs) == 1
    assert logs[0]["id"] == log_data["id"]


def test_patient_logs_urgent_short_of_breath(client):
    """Test POST /patients/{id}/logs triggers urgent=True and 112 advisory on shortness of breath."""
    payload = {
        "systolic": 130,
        "diastolic": 85,
        "steps": 2100,
        "medicines_taken": True,
        "symptoms": ["short of breath", "chest heaviness"],
    }

    resp = client.post("/patients/SYN-001/logs", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["urgent"] is True
    assert "112" in data["urgent_message"]
    assert "urgent" in data["urgent_message"].lower()
    assert "demo" in data["urgent_message"].lower() or "prototype" in data["urgent_message"].lower()


def test_patient_logs_urgent_high_systolic(client):
    """Test POST /patients/{id}/logs triggers urgent=True on systolic >= 180 mmHg."""
    payload = {
        "systolic": 185,
        "diastolic": 105,
        "steps": 3000,
        "medicines_taken": True,
        "symptoms": [],
    }

    resp = client.post("/patients/SYN-001/logs", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["urgent"] is True
    assert "112" in data["urgent_message"]


def test_patient_logs_non_existent_patient_404(client):
    """Test logging for non-existent patient returns 404."""
    payload = {
        "systolic": 120,
        "diastolic": 80,
        "steps": 5000,
        "medicines_taken": True,
        "symptoms": [],
    }
    assert client.post("/patients/NON_EXISTENT_ID/logs", json=payload).status_code == 404
    assert client.get("/patients/NON_EXISTENT_ID/logs").status_code == 404


# =========================================================================
# 5. Care Coordination Referrals
# =========================================================================

def test_referrals_crud_and_patch(client):
    """Test care coordination referral lifecycle: POST, GET, PATCH with staff priority & suggested tier."""
    # 1. Create referral
    payload = {
        "patient_id": "SYN-001",
        "reason": "Rapid eGFR decline trajectory and elevated blood pressure",
        "priority": "Routine",  # Staff priority
        "note": "Initial multidisciplinary review requested",
    }
    create_resp = client.post("/referrals", json=payload)
    assert create_resp.status_code == 201
    ref = create_resp.json()
    ref_id = ref["id"]
    assert ref["patient_id"] == "SYN-001"
    assert ref["priority"] == "Routine"
    assert ref["suggested_tier"] in ("Low", "Medium", "High")  # Stored separately as suggestion
    assert ref["status"] == "Pending"

    # 2. List and filter referrals
    list_resp = client.get("/referrals?status=Pending&priority=Routine")
    assert list_resp.status_code == 200
    refs = list_resp.json()
    assert len(refs) == 1
    assert refs[0]["id"] == ref_id

    # 3. Staff updates priority to Urgent and status to In Review
    patch_resp = client.patch(f"/referrals/{ref_id}", json={
        "priority": "Urgent",
        "status": "In Review",
        "note": "Escalated for immediate review",
    })
    assert patch_resp.status_code == 200
    updated = patch_resp.json()
    assert updated["priority"] == "Urgent"
    assert updated["status"] == "In Review"
    assert updated["note"] == "Escalated for immediate review"

    # 4. Unknown referral returns 404
    assert client.patch("/referrals/REF-NONEXISTENT", json={"status": "Reviewed"}).status_code == 404


# =========================================================================
# 6. Generic Care Team Follow-Ups & Rule 5 Enforcement
# =========================================================================

def test_follow_ups_crud_generic_purposes(client):
    """Test follow-up lifecycle with generic non-prescriptive purposes."""
    tomorrow = (datetime.now(timezone.utc).date() + timedelta(days=1)).isoformat()

    # 1. Schedule generic follow-up
    payload = {
        "patient_id": "SYN-001",
        "purpose": "Repeat blood test",
        "date": tomorrow,
        "status": "Scheduled",
    }
    create_resp = client.post("/follow-ups", json=payload)
    assert create_resp.status_code == 201
    follow_up = create_resp.json()
    fid = follow_up["id"]
    assert follow_up["purpose"] == "Repeat blood test"
    assert follow_up["status"] == "Scheduled"

    # 2. Query follow-ups
    get_resp = client.get(f"/follow-ups?patient_id=SYN-001")
    assert get_resp.status_code == 200
    items = get_resp.json()
    assert len(items) == 1
    assert items[0]["id"] == fid

    # 3. Update status to Completed
    patch_resp = client.patch(f"/follow-ups/{fid}", json={
        "status": "Completed",
        "purpose": "Blood pressure check",
    })
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "Completed"
    assert patch_resp.json()["purpose"] == "Blood pressure check"


def test_follow_ups_prohibits_drugs_and_treatment_advice_rule5(client):
    """Test Rule 5: Reject follow-up purposes with medication names, doses, or treatment advice."""
    bad_purposes = [
        "Prescribe 10mg Lisinopril",
        "Titrate SGLT2i dose",
        "Start Metformin 500mg daily",
        "Adjust medication dosage",
    ]
    tomorrow = (datetime.now(timezone.utc).date() + timedelta(days=1)).isoformat()

    for bad in bad_purposes:
        payload = {
            "patient_id": "SYN-001",
            "purpose": bad,
            "date": tomorrow,
        }
        resp = client.post("/follow-ups", json=payload)
        assert resp.status_code == 422
        assert "prohibited" in resp.json()["detail"][0]["msg"].lower() or "generic" in resp.json()["detail"][0]["msg"].lower()


# =========================================================================
# 7. Aggregate Statistics
# =========================================================================

def test_stats_endpoint(client):
    """Test GET /stats returns totals, risk distribution, referrals, and follow-ups due this week."""
    # Seed one referral and one follow-up due tomorrow
    client.post("/referrals", json={
        "patient_id": "SYN-001",
        "reason": "Care review",
        "priority": "Routine",
    })

    today = datetime.now(timezone.utc).date()
    # Find a weekday date for this week
    start_of_week = today - timedelta(days=today.weekday())
    date_this_week = (start_of_week + timedelta(days=2)).isoformat()

    client.post("/follow-ups", json={
        "patient_id": "SYN-001",
        "purpose": "Repeat blood test",
        "date": date_this_week,
    })

    resp = client.get("/stats")
    assert resp.status_code == 200
    data = resp.json()

    assert "totals" in data
    assert data["totals"]["patients"] >= 500
    assert data["totals"]["referrals"] >= 1
    assert data["totals"]["follow_ups"] >= 1

    assert "risk_tier_distribution" in data
    assert "Low" in data["risk_tier_distribution"]
    assert "Medium" in data["risk_tier_distribution"]
    assert "High" in data["risk_tier_distribution"]

    assert "referrals_by_status" in data
    assert "Pending" in data["referrals_by_status"]

    assert "follow_ups_due_this_week" in data
    assert data["follow_ups_due_this_week"] >= 1


# =========================================================================
# 8. Legacy Assessment Endpoint
# =========================================================================

def test_assess_patient_legacy(client):
    """Test POST /assess-patient maintains backwards compatibility."""
    payload = {
        "patient": {
            "patient_id": "SYN-001",
            "age": 62,
            "sex": "M",
            "diabetes": 1,
            "hypertension": 1,
            "bmi": 22.7,
            "baseline_creatinine": 0.68,
            "baseline_egfr": 105.1,
            "urine_protein": "+1",
        },
        "readings": [
            {"month": 1, "egfr": 104.2, "systolic_bp": 138, "diastolic_bp": 86, "adherence_pct": 92.0, "daily_steps": 6200},
            {"month": 9, "egfr": 89.7, "systolic_bp": 158, "diastolic_bp": 96, "adherence_pct": 54.0, "daily_steps": 3800},
        ],
    }

    resp = client.post("/assess-patient", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert 0.0 <= data["probability"] <= 1.0
    assert data["tier"] in ("Low", "Medium", "High")
    assert "estimated_3m_egfr_trend" in data
    assert len(data["top_features"]) == 3
