"""
Tests for RENALIS FastAPI Backend API
Digital Twin Challenge 2026
"""

from pathlib import Path
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure root directory is on sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.app.main import app, REFERRALS_DB


@pytest.fixture
def client():
    """Create FastAPI test client fixture."""
    return TestClient(app)


@pytest.fixture(autouse=True)
def clean_referrals():
    """Clear in-memory referral database before each test."""
    REFERRALS_DB.clear()
    yield
    REFERRALS_DB.clear()


def test_health_endpoint(client):
    """Test GET /health returns 200, status healthy, and model availability."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "model_loaded" in data
    assert "model_file_exists" in data
    assert "model_path" in data


def test_assess_patient_valid(client):
    """Test POST /assess-patient with valid clinical payload returns 200 with forecast."""
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
            {
                "month": 1,
                "egfr": 104.2,
                "systolic_bp": 138,
                "diastolic_bp": 86,
                "adherence_pct": 92.0,
                "daily_steps": 6200,
            },
            {
                "month": 2,
                "egfr": 102.5,
                "systolic_bp": 140,
                "diastolic_bp": 88,
                "adherence_pct": 89.0,
                "daily_steps": 5900,
            },
            {
                "month": 9,
                "egfr": 89.7,
                "systolic_bp": 158,
                "diastolic_bp": 96,
                "adherence_pct": 54.0,
                "daily_steps": 3800,
            },
        ],
    }

    response = client.post("/assess-patient", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "probability" in data
    assert 0.0 <= data["probability"] <= 1.0
    assert data["tier"] in ("Low", "Medium", "High")
    assert isinstance(data["top_features"], list)
    assert len(data["top_features"]) == 3

    # Check 3-month estimated trend projection
    trend = data["estimated_3m_egfr_trend"]
    assert "projected_slope" in trend
    assert "projected_3m_change_pct" in trend
    assert "projected_readings" in trend
    assert len(trend["projected_readings"]) == 3
    months = [p["month"] for p in trend["projected_readings"]]
    assert months == [10, 11, 12]
    assert "summary" in trend


def test_assess_patient_validation_errors_422(client):
    """Test POST /assess-patient returns 422 for invalid patient demographics & labs."""
    # 1. Invalid age < 18
    bad_payload_age_low = {
        "patient": {
            "patient_id": "SYN-TEST",
            "age": 12,  # Too young
            "sex": "M",
            "diabetes": 0,
            "hypertension": 0,
            "bmi": 24.0,
            "baseline_creatinine": 1.0,
            "baseline_egfr": 80.0,
            "urine_protein": "negative",
        },
        "readings": [
            {"month": 1, "egfr": 80.0, "systolic_bp": 120, "diastolic_bp": 80, "adherence_pct": 95.0, "daily_steps": 6000}
        ],
    }
    resp = client.post("/assess-patient", json=bad_payload_age_low)
    assert resp.status_code == 422

    # 2. Invalid age > 100
    bad_payload_age_high = dict(bad_payload_age_low)
    bad_payload_age_high["patient"] = dict(bad_payload_age_low["patient"], age=105)
    resp = client.post("/assess-patient", json=bad_payload_age_high)
    assert resp.status_code == 422

    # 3. Implausible serum creatinine (e.g. 25.0 mg/dL, max allowed is 15.0)
    bad_payload_creat = dict(bad_payload_age_low)
    bad_payload_creat["patient"] = dict(bad_payload_age_low["patient"], age=55, baseline_creatinine=25.0)
    resp = client.post("/assess-patient", json=bad_payload_creat)
    assert resp.status_code == 422

    # 4. Implausible systolic blood pressure (e.g. 300 mmHg)
    bad_payload_bp = dict(bad_payload_age_low)
    bad_payload_bp["patient"] = dict(bad_payload_age_low["patient"], age=55)
    bad_payload_bp["readings"] = [
        {"month": 1, "egfr": 80.0, "systolic_bp": 300, "diastolic_bp": 80, "adherence_pct": 95.0, "daily_steps": 6000}
    ]
    resp = client.post("/assess-patient", json=bad_payload_bp)
    assert resp.status_code == 422

    # 5. Empty readings list
    bad_payload_empty_readings = dict(bad_payload_age_low)
    bad_payload_empty_readings["patient"] = dict(bad_payload_age_low["patient"], age=55)
    bad_payload_empty_readings["readings"] = []
    resp = client.post("/assess-patient", json=bad_payload_empty_readings)
    assert resp.status_code == 422


def test_patients_endpoints(client):
    """Test GET /patients and GET /patients/{id}."""
    # List patients
    resp = client.get("/patients?limit=5&offset=0")
    assert resp.status_code == 200
    data = resp.json()
    assert "patients" in data
    assert data["count"] == 5
    assert data["total"] >= 20

    # Get specific patient
    first_pid = data["patients"][0]["patient_id"]
    single_resp = client.get(f"/patients/{first_pid}")
    assert single_resp.status_code == 200
    single_data = single_resp.json()
    assert single_data["patient_id"] == first_pid
    assert "baseline_egfr" in single_data
    assert "readings" in single_data

    # Unknown patient ID returns 404
    missing_resp = client.get("/patients/NON_EXISTENT_ID_99999")
    assert missing_resp.status_code == 404


def test_referrals_crud(client):
    """Test POST /referrals and GET /referrals queue management."""
    # Queue initially empty
    resp = client.get("/referrals")
    assert resp.status_code == 200
    assert resp.json() == []

    # Create referral
    payload = {
        "patient_id": "SYN-001",
        "reason": "Rapid eGFR decline (>15% projected drop) with elevated SBP",
        "priority": "Urgent",
        "status": "Pending",
    }
    create_resp = client.post("/referrals", json=payload)
    assert create_resp.status_code == 201
    created_data = create_resp.json()
    assert created_data["patient_id"] == "SYN-001"
    assert created_data["priority"] == "Urgent"
    assert created_data["status"] == "Pending"
    assert "id" in created_data
    assert "created_at" in created_data

    # Fetch queue
    list_resp = client.get("/referrals")
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert len(items) == 1
    assert items[0]["id"] == created_data["id"]

    # Filter by status
    pending_resp = client.get("/referrals?status_filter=Pending")
    assert len(pending_resp.json()) == 1

    reviewed_resp = client.get("/referrals?status_filter=Reviewed")
    assert len(reviewed_resp.json()) == 0


def test_missing_model_error_handling(client, monkeypatch):
    """Test clear 503 error message directing user to run ml/train.py when model is missing."""
    import backend.app.main as main_mod

    # Mock is_model_available to return False
    monkeypatch.setattr(main_mod, "is_model_available", lambda: False)

    # 1. Check /health reports model_loaded=False
    health_resp = client.get("/health")
    assert health_resp.status_code == 200
    assert health_resp.json()["model_loaded"] is False
    assert "ml/train.py" in health_resp.json()["message"]

    # 2. Check /assess-patient returns 503 with clear instructions
    payload = {
        "patient": {
            "patient_id": "SYN-001",
            "age": 60,
            "sex": "M",
            "diabetes": 0,
            "hypertension": 1,
            "bmi": 28.0,
            "baseline_creatinine": 1.2,
            "baseline_egfr": 65.0,
            "urine_protein": "trace",
        },
        "readings": [
            {"month": 1, "egfr": 65.0, "systolic_bp": 130, "diastolic_bp": 80, "adherence_pct": 90.0, "daily_steps": 5000}
        ],
    }
    assess_resp = client.post("/assess-patient", json=payload)
    assert assess_resp.status_code == 503
    assert "ml/train.py" in assess_resp.json()["detail"]

