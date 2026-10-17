"""
Synthetic Patient & Telemetry Data Loader
Digital Twin Challenge 2026
"""

from pathlib import Path
from typing import Any, Dict, List, Optional
import pandas as pd

# Root repo path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent

SYNTHETIC_PATIENTS_FILE = ROOT_DIR / "data" / "synthetic" / "patients.csv"
SAMPLE_PATIENTS_FILE = ROOT_DIR / "data" / "sample" / "patients_sample.csv"
SYNTHETIC_READINGS_FILE = ROOT_DIR / "data" / "synthetic" / "readings.csv"


def get_patients_file_path() -> Path:
    """Locate full synthetic cohort file, with sample cohort as fallback."""
    if SYNTHETIC_PATIENTS_FILE.exists():
        return SYNTHETIC_PATIENTS_FILE
    elif SAMPLE_PATIENTS_FILE.exists():
        return SAMPLE_PATIENTS_FILE
    else:
        raise FileNotFoundError(
            f"Neither {SYNTHETIC_PATIENTS_FILE} nor {SAMPLE_PATIENTS_FILE} was found. "
            "Please run 'python data/generate_synthetic.py' first."
        )


def load_patients_dataframe() -> pd.DataFrame:
    """Load patient cohort DataFrame."""
    filepath = get_patients_file_path()
    return pd.read_csv(filepath)


def load_readings_dataframe() -> Optional[pd.DataFrame]:
    """Load longitudinal readings DataFrame if present."""
    if SYNTHETIC_READINGS_FILE.exists():
        return pd.read_csv(SYNTHETIC_READINGS_FILE)
    return None


def get_all_patients(
    limit: Optional[int] = None,
    offset: int = 0,
) -> Dict[str, Any]:
    """Return all synthetic patients with pagination support."""
    df = load_patients_dataframe()
    total = len(df)

    if offset > 0:
        df = df.iloc[offset:]
    if limit is not None and limit > 0:
        df = df.iloc[:limit]

    records = df.to_dict(orient="records")
    return {
        "total": total,
        "count": len(records),
        "offset": offset,
        "patients": records,
    }


def get_patient_by_id(patient_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve an individual patient profile and their longitudinal readings."""
    df = load_patients_dataframe()
    matches = df[df["patient_id"].astype(str) == str(patient_id)]
    if matches.empty:
        return None

    patient_dict = matches.iloc[0].to_dict()

    # Attach historical readings if available
    readings_df = load_readings_dataframe()
    if readings_df is not None:
        p_readings = readings_df[readings_df["patient_id"].astype(str) == str(patient_id)]
        readings_list = p_readings.sort_values("month").to_dict(orient="records")
    else:
        readings_list = []

    patient_dict["readings"] = readings_list
    return patient_dict
