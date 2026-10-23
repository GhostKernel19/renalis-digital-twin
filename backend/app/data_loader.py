"""
Synthetic Patient & Telemetry Data Loader with ML Precomputation
Digital Twin Challenge 2026

Loads synthetic patients strictly from data/synthetic/ (500 patients, seed 42).
Integrates with SQLite persistence to include user-added intake patients.
Precomputes and caches model risk probabilities and tiers for all synthetic patients.
"""

from pathlib import Path
import sys
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.app.database import (
    get_added_patient_by_id,
    get_added_patient_readings,
    get_all_added_patients,
)

SYNTHETIC_PATIENTS_FILE = ROOT_DIR / "data" / "synthetic" / "patients.csv"
SYNTHETIC_READINGS_FILE = ROOT_DIR / "data" / "synthetic" / "readings.csv"

# Global in-memory cache for synthetic cohort and precomputed risk scores
_SYNTHETIC_PATIENTS_CACHE: Optional[List[Dict[str, Any]]] = None
_SYNTHETIC_READINGS_BY_PID: Optional[Dict[str, List[Dict[str, Any]]]] = None


def check_synthetic_files() -> Tuple[bool, str]:
    """Check whether the synthetic dataset files exist."""
    missing = []
    if not SYNTHETIC_PATIENTS_FILE.exists():
        missing.append("data/synthetic/patients.csv")
    if not SYNTHETIC_READINGS_FILE.exists():
        missing.append("data/synthetic/readings.csv")

    if missing:
        msg = (
            f"Synthetic data missing ({', '.join(missing)}). "
            "Please generate the synthetic cohort first with: "
            "'python data/generate_synthetic.py --num-patients 500 --seed 42'"
        )
        return False, msg

    return True, "Synthetic cohort ready (500 patients, seed 42)."


def get_patients_file_path() -> Path:
    """Return path to synthetic cohort file or raise FileNotFoundError with instructions."""
    ok, msg = check_synthetic_files()
    if not ok:
        raise FileNotFoundError(msg)
    return SYNTHETIC_PATIENTS_FILE


def _load_and_cache_synthetic_cohort() -> None:
    """Load the synthetic cohort and precompute model risk predictions once."""
    global _SYNTHETIC_PATIENTS_CACHE, _SYNTHETIC_READINGS_BY_PID

    if _SYNTHETIC_PATIENTS_CACHE is not None and _SYNTHETIC_READINGS_BY_PID is not None:
        return

    ok, msg = check_synthetic_files()
    if not ok:
        raise FileNotFoundError(msg)

    patients_df = pd.read_csv(SYNTHETIC_PATIENTS_FILE)
    readings_df = pd.read_csv(SYNTHETIC_READINGS_FILE)

    # Group readings by patient_id
    grouped_readings: Dict[str, List[Dict[str, Any]]] = {}
    for pid, group in readings_df.groupby("patient_id"):
        grouped_readings[str(pid)] = group.sort_values("month").to_dict(orient="records")

    _SYNTHETIC_READINGS_BY_PID = grouped_readings

    # Precompute risk scores using model for every synthetic patient
    from ml.predict import predict_risk

    patients_list = []
    for row in patients_df.to_dict(orient="records"):
        pid = str(row["patient_id"])
        pt_readings = grouped_readings.get(pid, [])

        try:
            inference = predict_risk(row, pt_readings)
            prob = inference["probability"]
            tier = inference["tier"]
            basis = inference["basis"]
        except Exception:
            prob = 0.5
            tier = "Medium"
            basis = "trend model"

        pt_dict = dict(row)
        pt_dict["risk_tier"] = tier
        pt_dict["tier"] = tier
        pt_dict["risk_probability"] = prob
        pt_dict["probability"] = prob
        pt_dict["basis"] = basis
        patients_list.append(pt_dict)

    _SYNTHETIC_PATIENTS_CACHE = patients_list


def get_all_patients(
    search: Optional[str] = None,
    risk_tier: Optional[str] = None,
    limit: Optional[int] = 50,
    offset: int = 0,
) -> Dict[str, Any]:
    """Retrieve all patients (synthetic + DB added) with search, filter, and pagination."""
    _load_and_cache_synthetic_cohort()
    assert _SYNTHETIC_PATIENTS_CACHE is not None

    # 1. Added patients from DB
    added_pts = get_all_added_patients()
    for ap in added_pts:
        ap["tier"] = ap.get("risk_tier", "Low")
        ap["probability"] = ap.get("risk_probability", 0.0)

    # Combined list: added patients first, then synthetic cohort
    all_pts = added_pts + _SYNTHETIC_PATIENTS_CACHE

    # 2. Filter by search term
    if search:
        s_lower = search.strip().lower()
        all_pts = [
            p for p in all_pts
            if s_lower in str(p.get("patient_id", "")).lower()
        ]

    # 3. Filter by risk tier
    if risk_tier:
        tier_lower = risk_tier.strip().lower()
        all_pts = [
            p for p in all_pts
            if str(p.get("tier", "")).lower() == tier_lower or str(p.get("risk_tier", "")).lower() == tier_lower
        ]

    total = len(all_pts)

    # 4. Pagination
    if offset > 0:
        all_pts = all_pts[offset:]
    if limit is not None and limit > 0:
        all_pts = all_pts[:limit]

    return {
        "total": total,
        "count": len(all_pts),
        "offset": offset,
        "patients": all_pts,
    }


def get_patient_by_id(patient_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve single patient by ID with full readings attached."""
    pid_str = str(patient_id).strip()

    # 1. Check added patients in DB
    added = get_added_patient_by_id(pid_str)
    if added:
        pt_dict = dict(added)
        pt_dict["tier"] = pt_dict.get("risk_tier", "Low")
        pt_dict["probability"] = pt_dict.get("risk_probability", 0.0)
        pt_dict["readings"] = get_added_patient_readings(pid_str)
        return pt_dict

    # 2. Check synthetic cohort
    _load_and_cache_synthetic_cohort()
    assert _SYNTHETIC_PATIENTS_CACHE is not None
    assert _SYNTHETIC_READINGS_BY_PID is not None

    for pt in _SYNTHETIC_PATIENTS_CACHE:
        if str(pt.get("patient_id")) == pid_str:
            pt_dict = dict(pt)
            pt_dict["readings"] = _SYNTHETIC_READINGS_BY_PID.get(pid_str, [])
            return pt_dict

    return None


def get_patient_readings(patient_id: str) -> Optional[List[Dict[str, Any]]]:
    """Retrieve readings for patient ID. Returns None if patient does not exist."""
    pid_str = str(patient_id).strip()

    # 1. Check added patients in DB
    added = get_added_patient_by_id(pid_str)
    if added:
        return get_added_patient_readings(pid_str)

    # 2. Check synthetic cohort
    _load_and_cache_synthetic_cohort()
    assert _SYNTHETIC_PATIENTS_CACHE is not None
    assert _SYNTHETIC_READINGS_BY_PID is not None

    for pt in _SYNTHETIC_PATIENTS_CACHE:
        if str(pt.get("patient_id")) == pid_str:
            return _SYNTHETIC_READINGS_BY_PID.get(pid_str, [])

    return None


def get_cohort_risk_tier_distribution() -> Dict[str, int]:
    """Calculate the distribution of risk tiers across the entire active cohort."""
    _load_and_cache_synthetic_cohort()
    assert _SYNTHETIC_PATIENTS_CACHE is not None

    counts = {"Low": 0, "Medium": 0, "High": 0}

    # Count added patients
    for ap in get_all_added_patients():
        tier = ap.get("risk_tier") or ap.get("tier") or "Low"
        counts[tier] = counts.get(tier, 0) + 1

    # Count synthetic cohort
    for sp in _SYNTHETIC_PATIENTS_CACHE:
        tier = sp.get("tier") or sp.get("risk_tier") or "Low"
        counts[tier] = counts.get(tier, 0) + 1

    return counts
