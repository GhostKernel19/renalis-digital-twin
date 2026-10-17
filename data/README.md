# RENALIS - Data & Synthetic Generators

This directory contains synthetic dataset artifacts, generator scripts, and documentation for the RENALIS digital twin data pipeline.

---

## Environment Setup

To run the synthetic data generator, set up an isolated Python virtual environment:

### 1. Create Virtual Environment
```bash
# Navigate to the repository root
cd renalis-digital-twin

# Create virtual environment
python -m venv venv
```

### 2. Activate Virtual Environment
- **Windows (PowerShell):**
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
- **Windows (Command Prompt):**
  ```cmd
  .\venv\Scripts\activate.bat
  ```
- **macOS / Linux:**
  ```bash
  source venv/bin/activate
  ```

### 3. Install Dependencies
```bash
pip install -r data/requirements.txt
```
> Dependencies are strictly limited to `numpy` and `pandas`.

---

## Running the Synthetic Generator

Run the generator from the repository root:

```bash
# Default run (500 patients, seed 42)
python data/generate_synthetic.py

# Custom patient count and seed
python data/generate_synthetic.py --num-patients 1000 --seed 123
```

### CLI Options

| Flag | Short | Default | Description |
| :--- | :--- | :--- | :--- |
| `--num-patients` | `-n` | `500` | Number of synthetic patients to generate |
| `--seed` | `-s` | `42` | Random seed for deterministic reproducibility |
| `--output-dir` | `-o` | `data/synthetic` | Target directory for generated CSV files |
| `--sample-dir` | | `data/sample` | Target directory for sample patient CSV |
| `--sample-size` | | `20` | Number of rows in `patients_sample.csv` |

---

## File Formats & Schemas

### 1. `data/synthetic/patients.csv` (and `data/sample/patients_sample.csv`)
One row per synthetic patient:

| Column | Type | Example | Description |
| :--- | :--- | :--- | :--- |
| `patient_id` | String | `SYN-001` | Synthetic patient identifier |
| `age` | Integer | `62` | Age in years (range: 30–85) |
| `sex` | String | `M` | Biological sex (`M` or `F`) |
| `diabetes` | Integer | `1` | Type 2 diabetes indicator (`1` = yes, `0` = no) |
| `hypertension` | Integer | `1` | Essential hypertension indicator (`1` = yes, `0` = no) |
| `bmi` | Float | `28.4` | Body Mass Index (kg/m²) |
| `baseline_creatinine` | Float | `1.42` | Serum creatinine in mg/dL (range: 0.65–3.80) |
| `baseline_egfr` | Float | `56.2` | Estimated Glomerular Filtration Rate (mL/min/1.73m²) calculated via the **2021 CKD-EPI Creatinine equation** (without race) |
| `urine_protein` | String | `+1` | Proteinuria qualitative dipstick tier (`negative`, `trace`, `+1`, `+2`, `+3`) |

### 2. `data/synthetic/readings.csv`
12 monthly longitudinal readings per patient (6,000 rows for 500 patients):

| Column | Type | Example | Description |
| :--- | :--- | :--- | :--- |
| `patient_id` | String | `SYN-001` | Synthetic patient identifier |
| `month` | Integer | `1` | Timeline month (range: 1–12) |
| `egfr` | Float | `55.8` | Current monthly eGFR (mL/min/1.73m²) |
| `systolic_bp` | Integer | `138` | Systolic blood pressure (mmHg), incorporating circadian noise and hypertension progression |
| `diastolic_bp` | Integer | `86` | Diastolic blood pressure (mmHg) |
| `adherence_pct` | Float | `88.5` | Medication adherence percentage (0–100%) |
| `daily_steps` | Integer | `6450` | Average daily step count |

> **Deterioration Model:** Roughly 30% of synthetic patients are injected with progressive CKD decline (accelerating eGFR loss, climbing systolic/diastolic blood pressure, dropping medication adherence, and reduced physical activity). The remaining ~70% remain stable with expected biological variance.

### 3. `data/synthetic/labels.csv`
Progression label reflecting rapid late-stage deterioration:

| Column | Type | Example | Description |
| :--- | :--- | :--- | :--- |
| `patient_id` | String | `SYN-001` | Synthetic patient identifier |
| `label` | Integer | `1` | Binary progression flag: **`1`** if eGFR falls **> 10%** from Month 9 to Month 12; **`0`** otherwise. |

---

## Limitations & Ethical Notice

> [!CAUTION]
> **All data in this directory is entirely fabricated and synthetic.**
>
> 1. **Artificial Generation:** No real human data, electronic health records (EHR), or Protected Health Information (PHI) were collected, accessed, or utilized.
> 2. **Rule-Based Labels:** The outcome labels are generated purely by mathematical rules and synthetic decline injection programmed into the generator script. They do not reflect genuine clinical prognoses.
> 3. **Non-Clinical Validation:** Any machine learning model, risk score, digital twin trajectory, or care workflow trained or evaluated on this synthetic data demonstrates **only software pipeline feasibility and technical execution**.
> 4. **No Medical Use:** These outputs are **NOT clinically validated** and must not be used for diagnosis, clinical management, treatment selection, or patient counseling.
