"""
RENALIS SQLite Persistence Layer
Digital Twin Challenge 2026

Uses Python's built-in sqlite3 to persist:
- added_patients (patients added via intake)
- patient_readings (earlier scores / readings for added patients)
- assessments (twin assessments and progression scores)
- daily_logs (patient daily telemetry and urgent rule triggers)
- referrals (care coordination queue with staff priority & model suggestion)
- follow_ups (generic care team appointments)

Database file: backend/data/renalis.db (gitignored)
"""

from contextlib import contextmanager
from datetime import datetime, timezone, timedelta
import json
from pathlib import Path
import sqlite3
from typing import Any, Dict, List, Optional
import uuid

# Root repo path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DB_DIR = ROOT_DIR / "backend" / "data"
DB_PATH = DB_DIR / "renalis.db"


def get_db_connection() -> sqlite3.Connection:
    """Create or connect to the SQLite database."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH.resolve()), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


@contextmanager
def get_db():
    """Context manager for SQLite database transactions."""
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    """Initialize SQLite database tables and indexes."""
    with get_db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS added_patients (
            patient_id TEXT PRIMARY KEY,
            age INTEGER NOT NULL,
            sex TEXT NOT NULL,
            diabetes INTEGER NOT NULL DEFAULT 0,
            hypertension INTEGER NOT NULL DEFAULT 0,
            bmi REAL NOT NULL,
            baseline_creatinine REAL NOT NULL,
            baseline_egfr REAL NOT NULL,
            urine_protein TEXT NOT NULL DEFAULT 'negative',
            risk_tier TEXT,
            risk_probability REAL,
            basis TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS patient_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT NOT NULL,
            month INTEGER NOT NULL,
            egfr REAL NOT NULL,
            systolic_bp INTEGER,
            diastolic_bp INTEGER,
            adherence_pct REAL,
            daily_steps INTEGER,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS assessments (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            kidney_score REAL NOT NULL,
            ckd_stage TEXT NOT NULL,
            probability REAL NOT NULL,
            tier TEXT NOT NULL,
            basis TEXT NOT NULL,
            top_features TEXT NOT NULL,
            top_drivers TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS daily_logs (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            systolic INTEGER NOT NULL,
            diastolic INTEGER NOT NULL,
            steps INTEGER NOT NULL,
            medicines_taken INTEGER NOT NULL DEFAULT 1,
            symptoms TEXT NOT NULL,
            urgent INTEGER NOT NULL DEFAULT 0,
            urgent_message TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS referrals (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            reason TEXT NOT NULL,
            priority TEXT NOT NULL DEFAULT 'Routine',
            suggested_tier TEXT,
            status TEXT NOT NULL DEFAULT 'Pending',
            note TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS follow_ups (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            purpose TEXT NOT NULL,
            date TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Scheduled',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_readings_pid ON patient_readings(patient_id);
        CREATE INDEX IF NOT EXISTS idx_assessments_pid ON assessments(patient_id);
        CREATE INDEX IF NOT EXISTS idx_logs_pid ON daily_logs(patient_id);
        CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
        CREATE INDEX IF NOT EXISTS idx_referrals_pid ON referrals(patient_id);
        CREATE INDEX IF NOT EXISTS idx_follow_ups_pid ON follow_ups(patient_id);
        CREATE INDEX IF NOT EXISTS idx_follow_ups_date ON follow_ups(date);
        """)


# =========================================================================
# Patient CRUD & Readings
# =========================================================================

def insert_added_patient(patient: Dict[str, Any]) -> Dict[str, Any]:
    """Store newly onboarded patient in SQLite database."""
    now_iso = datetime.now(timezone.utc).isoformat()
    record = {
        "patient_id": patient["patient_id"],
        "age": int(patient["age"]),
        "sex": str(patient["sex"]),
        "diabetes": int(patient.get("diabetes", 0)),
        "hypertension": int(patient.get("hypertension", 0)),
        "bmi": float(patient["bmi"]),
        "baseline_creatinine": float(patient["baseline_creatinine"]),
        "baseline_egfr": float(patient["baseline_egfr"]),
        "urine_protein": str(patient.get("urine_protein", "negative")),
        "risk_tier": patient.get("risk_tier") or patient.get("tier"),
        "risk_probability": patient.get("risk_probability") or patient.get("probability"),
        "basis": patient.get("basis", "baseline only"),
        "created_at": patient.get("created_at", now_iso),
    }

    with get_db() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO added_patients (
                patient_id, age, sex, diabetes, hypertension, bmi,
                baseline_creatinine, baseline_egfr, urine_protein,
                risk_tier, risk_probability, basis, created_at
            ) VALUES (
                :patient_id, :age, :sex, :diabetes, :hypertension, :bmi,
                :baseline_creatinine, :baseline_egfr, :urine_protein,
                :risk_tier, :risk_probability, :basis, :created_at
            )
        """, record)

    return record


def get_added_patient_by_id(patient_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve an added patient by identifier from SQLite."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM added_patients WHERE patient_id = ?", (str(patient_id),)
        ).fetchone()
        if row:
            return dict(row)
    return None


def get_all_added_patients() -> List[Dict[str, Any]]:
    """Retrieve all added patients from SQLite."""
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM added_patients ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows]


def insert_patient_readings(patient_id: str, readings: List[Dict[str, Any]]) -> None:
    """Store earlier scores or longitudinal monthly readings in SQLite."""
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        for r in readings:
            conn.execute("""
                INSERT INTO patient_readings (
                    patient_id, month, egfr, systolic_bp, diastolic_bp, adherence_pct, daily_steps, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(patient_id),
                int(r["month"]),
                float(r["egfr"]),
                r.get("systolic_bp"),
                r.get("diastolic_bp"),
                r.get("adherence_pct"),
                r.get("daily_steps"),
                now_iso,
            ))


def get_added_patient_readings(patient_id: str) -> List[Dict[str, Any]]:
    """Retrieve readings for an added patient ordered by month."""
    with get_db() as conn:
        rows = conn.execute("""
            SELECT month, egfr, systolic_bp, diastolic_bp, adherence_pct, daily_steps
            FROM patient_readings
            WHERE patient_id = ?
            ORDER BY month ASC
        """, (str(patient_id),)).fetchall()
        return [dict(r) for r in rows]


# =========================================================================
# Assessments
# =========================================================================

def insert_assessment(assessment: Dict[str, Any]) -> Dict[str, Any]:
    """Store twin assessment output in SQLite."""
    aid = assessment.get("id") or f"ASM-{uuid.uuid4().hex[:8].upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()

    top_features = assessment.get("top_features", [])
    top_drivers = assessment.get("top_drivers", [])

    record = {
        "id": aid,
        "patient_id": str(assessment["patient_id"]),
        "kidney_score": float(assessment.get("kidney_score") or assessment.get("latest_kidney_score", 0.0)),
        "ckd_stage": str(assessment["ckd_stage"]),
        "probability": float(assessment["probability"]),
        "tier": str(assessment["tier"]),
        "basis": str(assessment["basis"]),
        "top_features": json.dumps(top_features),
        "top_drivers": json.dumps(top_drivers),
        "created_at": assessment.get("created_at", now_iso),
    }

    with get_db() as conn:
        conn.execute("""
            INSERT INTO assessments (
                id, patient_id, kidney_score, ckd_stage, probability, tier, basis, top_features, top_drivers, created_at
            ) VALUES (
                :id, :patient_id, :kidney_score, :ckd_stage, :probability, :tier, :basis, :top_features, :top_drivers, :created_at
            )
        """, record)

    return record


def get_latest_assessment(patient_id: str) -> Optional[Dict[str, Any]]:
    """Get the latest recorded assessment for a patient."""
    with get_db() as conn:
        row = conn.execute("""
            SELECT * FROM assessments WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1
        """, (str(patient_id),)).fetchone()
        if row:
            d = dict(row)
            d["top_features"] = json.loads(d["top_features"])
            d["top_drivers"] = json.loads(d["top_drivers"])
            return d
    return None


# =========================================================================
# Daily Logs
# =========================================================================

def insert_daily_log(log_data: Dict[str, Any]) -> Dict[str, Any]:
    """Store patient daily telemetry log in SQLite."""
    lid = log_data.get("id") or f"LOG-{uuid.uuid4().hex[:8].upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()

    symptoms_val = log_data.get("symptoms", [])
    if isinstance(symptoms_val, list):
        symptoms_str = json.dumps(symptoms_val)
    else:
        symptoms_str = json.dumps([str(symptoms_val)])

    record = {
        "id": lid,
        "patient_id": str(log_data["patient_id"]),
        "systolic": int(log_data["systolic"]),
        "diastolic": int(log_data["diastolic"]),
        "steps": int(log_data["steps"]),
        "medicines_taken": 1 if log_data.get("medicines_taken", True) else 0,
        "symptoms": symptoms_str,
        "urgent": 1 if log_data.get("urgent", False) else 0,
        "urgent_message": log_data.get("urgent_message"),
        "created_at": log_data.get("created_at", now_iso),
    }

    with get_db() as conn:
        conn.execute("""
            INSERT INTO daily_logs (
                id, patient_id, systolic, diastolic, steps, medicines_taken, symptoms, urgent, urgent_message, created_at
            ) VALUES (
                :id, :patient_id, :systolic, :diastolic, :steps, :medicines_taken, :symptoms, :urgent, :urgent_message, :created_at
            )
        """, record)

    # Return parsed object
    res = dict(record)
    res["symptoms"] = json.loads(record["symptoms"])
    res["medicines_taken"] = bool(record["medicines_taken"])
    res["urgent"] = bool(record["urgent"])
    return res


def get_daily_logs_by_patient(patient_id: str) -> List[Dict[str, Any]]:
    """Retrieve all daily telemetry logs for a patient."""
    with get_db() as conn:
        rows = conn.execute("""
            SELECT * FROM daily_logs WHERE patient_id = ? ORDER BY created_at DESC
        """, (str(patient_id),)).fetchall()
        results = []
        for r in rows:
            d = dict(r)
            d["symptoms"] = json.loads(d["symptoms"])
            d["medicines_taken"] = bool(d["medicines_taken"])
            d["urgent"] = bool(d["urgent"])
            results.append(d)
        return results


# =========================================================================
# Referrals
# =========================================================================

def insert_referral(referral_data: Dict[str, Any]) -> Dict[str, Any]:
    """Store multidisciplinary care referral in SQLite."""
    rid = referral_data.get("id") or f"REF-{uuid.uuid4().hex[:8].upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()

    record = {
        "id": rid,
        "patient_id": str(referral_data["patient_id"]),
        "reason": str(referral_data["reason"]),
        "priority": str(referral_data.get("priority", "Routine")),
        "suggested_tier": referral_data.get("suggested_tier"),
        "status": str(referral_data.get("status", "Pending")),
        "note": referral_data.get("note"),
        "created_at": referral_data.get("created_at", now_iso),
        "updated_at": referral_data.get("updated_at", now_iso),
    }

    with get_db() as conn:
        conn.execute("""
            INSERT INTO referrals (
                id, patient_id, reason, priority, suggested_tier, status, note, created_at, updated_at
            ) VALUES (
                :id, :patient_id, :reason, :priority, :suggested_tier, :status, :note, :created_at, :updated_at
            )
        """, record)

    return record


def get_referrals(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    patient_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Query care coordination referrals with optional filters."""
    query = "SELECT * FROM referrals WHERE 1=1"
    params: List[Any] = []

    if status:
        query += " AND LOWER(status) = LOWER(?)"
        params.append(status)
    if priority:
        query += " AND LOWER(priority) = LOWER(?)"
        params.append(priority)
    if patient_id:
        query += " AND patient_id = ?"
        params.append(patient_id)

    query += " ORDER BY created_at DESC"

    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()
        return [dict(r) for r in rows]


def get_referral_by_id(referral_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve a single referral by ID."""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM referrals WHERE id = ?", (referral_id,)).fetchone()
        if row:
            return dict(row)
    return None


def update_referral(
    referral_id: str,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    note: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Update referral workflow status, staff priority ('Routine' or 'Urgent'), and note."""
    existing = get_referral_by_id(referral_id)
    if not existing:
        return None

    now_iso = datetime.now(timezone.utc).isoformat()
    new_status = status if status is not None else existing["status"]
    new_priority = priority if priority is not None else existing["priority"]
    new_note = note if note is not None else existing["note"]

    with get_db() as conn:
        conn.execute("""
            UPDATE referrals
            SET status = ?, priority = ?, note = ?, updated_at = ?
            WHERE id = ?
        """, (new_status, new_priority, new_note, now_iso, referral_id))

    return get_referral_by_id(referral_id)


# =========================================================================
# Follow-Ups
# =========================================================================

def insert_follow_up(follow_up_data: Dict[str, Any]) -> Dict[str, Any]:
    """Schedule generic care team follow-up in SQLite."""
    fid = follow_up_data.get("id") or f"FOL-{uuid.uuid4().hex[:8].upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()

    record = {
        "id": fid,
        "patient_id": str(follow_up_data["patient_id"]),
        "purpose": str(follow_up_data["purpose"]),
        "date": str(follow_up_data["date"]),
        "status": str(follow_up_data.get("status", "Scheduled")),
        "created_at": follow_up_data.get("created_at", now_iso),
        "updated_at": follow_up_data.get("updated_at", now_iso),
    }

    with get_db() as conn:
        conn.execute("""
            INSERT INTO follow_ups (
                id, patient_id, purpose, date, status, created_at, updated_at
            ) VALUES (
                :id, :patient_id, :purpose, :date, :status, :created_at, :updated_at
            )
        """, record)

    return record


def get_follow_ups(
    patient_id: Optional[str] = None,
    status: Optional[str] = None,
    due_this_week: Optional[bool] = None,
) -> List[Dict[str, Any]]:
    """Query follow-ups with optional filters."""
    query = "SELECT * FROM follow_ups WHERE 1=1"
    params: List[Any] = []

    if patient_id:
        query += " AND patient_id = ?"
        params.append(patient_id)
    if status:
        query += " AND LOWER(status) = LOWER(?)"
        params.append(status)

    if due_this_week:
        # Determine current week start (Monday) and end (Sunday)
        today = datetime.now(timezone.utc).date()
        start_of_week = today - timedelta(days=today.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        query += " AND date >= ? AND date <= ?"
        params.extend([start_of_week.isoformat(), end_of_week.isoformat()])

    query += " ORDER BY date ASC, created_at ASC"

    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()
        return [dict(r) for r in rows]


def get_follow_up_by_id(follow_up_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve single follow-up by ID."""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM follow_ups WHERE id = ?", (follow_up_id,)).fetchone()
        if row:
            return dict(row)
    return None


def update_follow_up(
    follow_up_id: str,
    purpose: Optional[str] = None,
    date: Optional[str] = None,
    status: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Update follow-up appointment details."""
    existing = get_follow_up_by_id(follow_up_id)
    if not existing:
        return None

    now_iso = datetime.now(timezone.utc).isoformat()
    new_purpose = purpose if purpose is not None else existing["purpose"]
    new_date = date if date is not None else existing["date"]
    new_status = status if status is not None else existing["status"]

    with get_db() as conn:
        conn.execute("""
            UPDATE follow_ups
            SET purpose = ?, date = ?, status = ?, updated_at = ?
            WHERE id = ?
        """, (new_purpose, new_date, new_status, now_iso, follow_up_id))

    return get_follow_up_by_id(follow_up_id)


# =========================================================================
# Statistics
# =========================================================================

def get_db_stats() -> Dict[str, Any]:
    """Retrieve summary counts and distributions from SQLite."""
    with get_db() as conn:
        added_pts_count = conn.execute("SELECT COUNT(*) FROM added_patients").fetchone()[0]
        assessments_count = conn.execute("SELECT COUNT(*) FROM assessments").fetchone()[0]
        logs_count = conn.execute("SELECT COUNT(*) FROM daily_logs").fetchone()[0]
        referrals_count = conn.execute("SELECT COUNT(*) FROM referrals").fetchone()[0]
        follow_ups_count = conn.execute("SELECT COUNT(*) FROM follow_ups").fetchone()[0]

        # Referrals grouped by status
        ref_status_rows = conn.execute("""
            SELECT status, COUNT(*) as count FROM referrals GROUP BY status
        """).fetchall()
        referrals_by_status = {r["status"]: r["count"] for r in ref_status_rows}

        # Follow-ups due this week
        today = datetime.now(timezone.utc).date()
        start_of_week = today - timedelta(days=today.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        due_this_week_count = conn.execute("""
            SELECT COUNT(*) FROM follow_ups WHERE date >= ? AND date <= ?
        """, (start_of_week.isoformat(), end_of_week.isoformat())).fetchone()[0]

        return {
            "added_patients_count": added_pts_count,
            "assessments_count": assessments_count,
            "logs_count": logs_count,
            "referrals_count": referrals_count,
            "follow_ups_count": follow_ups_count,
            "referrals_by_status": referrals_by_status,
            "follow_ups_due_this_week_count": due_this_week_count,
        }
