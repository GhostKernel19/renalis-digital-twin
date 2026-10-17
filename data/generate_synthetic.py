#!/usr/bin/env python3
"""
RENALIS Synthetic Cohort & Longitudinal CKD Generator
Digital Twin Challenge 2026

Generates realistic, fully synthetic CKD-risk patient profiles, 12-month
longitudinal readings (eGFR, BP, adherence, activity), and deterioration labels
based on CKD-EPI 2021 equations and physiological progression heuristics.

Notice: All generated data is 100% synthetic for software pipeline demonstration
and is NOT clinically validated.
"""

import argparse
import csv
from pathlib import Path
import sys

import numpy as np

try:
    import pandas as pd
except ImportError:
    pd = None


def calculate_ckd_epi_2021(
    scr: np.ndarray, age: np.ndarray, sex: np.ndarray
) -> np.ndarray:
    """Calculate baseline eGFR using the 2021 CKD-EPI Creatinine equation (without race).

    Reference: Inker LA, Eneanya ND, Coresh J, et al. NEJM 2021; 385:1737-1749.

    eGFR = 142 * min(Scr/kappa, 1)**alpha * max(Scr/kappa, 1)**-1.200 *
    0.9938**age * gender_factor
    - Female: kappa = 0.7, alpha = -0.241, gender_factor = 1.012
    - Male:   kappa = 0.9, alpha = -0.302, gender_factor = 1.000
    """
    scr = np.asarray(scr, dtype=float)
    age = np.asarray(age, dtype=float)
    is_female = np.asarray([s == "F" for s in sex])

    kappa = np.where(is_female, 0.7, 0.9)
    alpha = np.where(is_female, -0.241, -0.302)
    gender_factor = np.where(is_female, 1.012, 1.0)

    ratio = scr / kappa
    egfr = (
        142.0
        * (np.minimum(ratio, 1.0) ** alpha)
        * (np.maximum(ratio, 1.0) ** -1.200)
        * (0.9938**age)
        * gender_factor
    )
    return np.round(np.clip(egfr, 5.0, 110.0), 1)


def generate_cohort(num_patients: int = 500, seed: int = 42):
    """Generate synthetic patient demographics, baseline labs, 12-month longitudinal readings,

    and late-stage rapid progression outcome labels.
    """
    rng = np.random.default_rng(seed)

    patient_ids = [f"SYN-{i+1:03d}" for i in range(num_patients)]

    # 1. Demographics & Comorbidities
    # Age clipped between 30 and 85 (median around 60)
    ages = np.clip(
        rng.normal(loc=59.0, scale=11.5, size=num_patients).astype(int), 30, 85
    )
    sexes = rng.choice(["M", "F"], size=num_patients, p=[0.52, 0.48])

    # Diabetes (~42% prevalence in high-risk CKD cohorts)
    diabetes = rng.binomial(1, 0.42, size=num_patients)

    # Hypertension (~68% base, higher with diabetes & advanced age)
    hyp_prob = 0.52 + 0.25 * diabetes + 0.14 * (ages > 62)
    hyp_prob = np.clip(hyp_prob, 0.35, 0.95)
    hypertension = rng.binomial(1, hyp_prob)

    # BMI (mean ~28.5, higher in diabetes)
    bmi_mean = 27.5 + 2.4 * diabetes + 0.8 * hypertension
    bmi = np.round(
        np.clip(
            rng.normal(loc=bmi_mean, scale=4.2, size=num_patients), 19.0, 46.0
        ),
        1,
    )

    # Baseline Serum Creatinine (mg/dL)
    # Higher baseline creatinine for diabetic, hypertensive, and older individuals
    scr_center = (
        0.92 + 0.38 * diabetes + 0.28 * hypertension + 0.012 * (ages - 50)
    )
    scr_center = np.clip(scr_center, 0.75, 2.3)
    baseline_creatinine = np.round(
        np.clip(
            rng.gamma(shape=scr_center * 4.2, scale=0.24, size=num_patients),
            0.65,
            3.80,
        ),
        2,
    )

    # Baseline eGFR via CKD-EPI 2021
    baseline_egfr = calculate_ckd_epi_2021(baseline_creatinine, ages, sexes)

    # Baseline Urine Protein (negative, trace, +1, +2, +3)
    protein_categories = ["negative", "trace", "+1", "+2", "+3"]
    urine_protein = []
    for d, h in zip(diabetes, hypertension):
        if d == 1 and h == 1:
            p_dist = [0.12, 0.22, 0.36, 0.22, 0.08]
        elif d == 1 or h == 1:
            p_dist = [0.38, 0.32, 0.20, 0.08, 0.02]
        else:
            p_dist = [0.68, 0.22, 0.08, 0.02, 0.00]
        urine_protein.append(rng.choice(protein_categories, p=p_dist))

    # 2. Deterioration Injection (~30% of cohort)
    is_deteriorating = rng.random(num_patients) < 0.30

    # 3. Monthly Readings (12 months per patient)
    readings_list = []
    m9_egfr_vals = np.zeros(num_patients)
    m12_egfr_vals = np.zeros(num_patients)

    for i in range(num_patients):
        p_id = patient_ids[i]
        b_egfr = baseline_egfr[i]
        b_hyp = hypertension[i]
        b_age = ages[i]
        b_bmi = bmi[i]
        det = is_deteriorating[i]

        # Base vitals and behaviors
        base_sys = 122.0 + 18.0 * b_hyp + rng.normal(0, 3.5)
        base_dia = 76.0 + 10.0 * b_hyp + rng.normal(0, 2.5)
        base_adh = rng.uniform(84.0, 96.0)
        base_steps = int(
            np.clip(
                rng.normal(
                    6800 - 28 * (b_age - 50) - 35 * (b_bmi - 25), scale=600
                ),
                3000,
                11000,
            )
        )

        curr_egfr = b_egfr

        # Individualized decline slopes for deteriorating patients
        late_decay_rate = rng.uniform(0.038, 0.058) if det else 0.002
        sys_creep = rng.uniform(1.8, 2.8) if det else rng.normal(0, 0.2)
        dia_creep = rng.uniform(0.9, 1.5) if det else rng.normal(0, 0.1)
        adh_drop = rng.uniform(3.6, 4.8) if det else rng.normal(0, 0.25)
        step_drop = rng.uniform(220, 320) if det else rng.normal(0, 20)
        # eGFR upper bound: cannot exceed 110.0 mL/min/1.73 m² and monthly noise cannot exceed 5% above baseline
        max_allowed_egfr = min(110.0, b_egfr * 1.05)

        for m in range(1, 13):
            # Diurnal & monthly physiological variation
            diurnal_bp_noise = rng.normal(0, 3.2)
            dia_noise = rng.normal(0, 2.2)

            if det:
                # Progressive loss: mild early (months 1-6), accelerated late (months 7-12)
                if m <= 6:
                    curr_egfr = np.clip(
                        curr_egfr
                        - rng.uniform(0.3, 0.8)
                        + rng.normal(0.0, 0.4),
                        5.0,
                        max_allowed_egfr,
                    )
                else:
                    curr_egfr = np.clip(
                        curr_egfr * (1.0 - late_decay_rate)
                        + rng.normal(0.0, 0.4),
                        5.0,
                        max_allowed_egfr,
                    )

                m_sys = int(
                    np.clip(
                        base_sys + sys_creep * (m - 1) + diurnal_bp_noise,
                        90,
                        210,
                    )
                )
                m_dia = int(
                    np.clip(
                        base_dia + dia_creep * (m - 1) + dia_noise, 55, 125
                    )
                )
                m_adh = round(
                    float(
                        np.clip(
                            base_adh
                            - adh_drop * (m - 1)
                            + rng.normal(0.0, 1.8),
                            20.0,
                            100.0,
                        )
                    ),
                    1,
                )
                m_steps = int(
                    np.clip(
                        base_steps
                        - step_drop * (m - 1)
                        + rng.normal(0.0, 200),
                        1200,
                        15000,
                    )
                )
            else:
                # Stable patients: slight age-related drift with standard biological noise
                curr_egfr = np.clip(
                    b_egfr - 0.04 * (m - 1) + rng.normal(0.0, 0.85),
                    5.0,
                    max_allowed_egfr,
                )
                m_sys = int(
                    np.clip(base_sys + diurnal_bp_noise + rng.normal(0, 2.0), 90, 185)
                )
                m_dia = int(
                    np.clip(base_dia + dia_noise + rng.normal(0, 1.5), 55, 115)
                )
                m_adh = round(
                    float(
                        np.clip(
                            base_adh + rng.normal(0.0, 1.8), 65.0, 100.0
                        )
                    ),
                    1,
                )
                m_steps = int(
                    np.clip(base_steps + rng.normal(0.0, 250), 2000, 15000)
                )

            m_egfr = round(float(curr_egfr), 1)

            if m == 9:
                m9_egfr_vals[i] = m_egfr
            if m == 12:
                m12_egfr_vals[i] = m_egfr

            readings_list.append(
                {
                    "patient_id": p_id,
                    "month": m,
                    "egfr": m_egfr,
                    "systolic_bp": m_sys,
                    "diastolic_bp": m_dia,
                    "adherence_pct": m_adh,
                    "daily_steps": m_steps,
                }
            )

    # 4. Progression Labels
    # label = 1 if eGFR falls more than 10% from month 9 to month 12, else 0
    drop_pct = (m9_egfr_vals - m12_egfr_vals) / np.maximum(m9_egfr_vals, 1.0)
    labels = np.where(drop_pct > 0.10, 1, 0)

    # Assemble patients dict list
    patients_list = []
    for i in range(num_patients):
        patients_list.append(
            {
                "patient_id": patient_ids[i],
                "age": int(ages[i]),
                "sex": sexes[i],
                "diabetes": int(diabetes[i]),
                "hypertension": int(hypertension[i]),
                "bmi": float(bmi[i]),
                "baseline_creatinine": float(baseline_creatinine[i]),
                "baseline_egfr": float(baseline_egfr[i]),
                "urine_protein": urine_protein[i],
            }
        )

    labels_list = [
        {"patient_id": patient_ids[i], "label": int(labels[i])}
        for i in range(num_patients)
    ]

    metadata = {
        "num_patients": num_patients,
        "seed": seed,
        "is_deteriorating": is_deteriorating,
        "baseline_egfr": baseline_egfr,
        "m9_egfr": m9_egfr_vals,
        "m12_egfr": m12_egfr_vals,
        "labels": labels,
        "ages": ages,
        "sexes": sexes,
        "diabetes": diabetes,
        "hypertension": hypertension,
        "creatinine": baseline_creatinine,
    }

    return patients_list, readings_list, labels_list, metadata


def save_csv(records: list, filepath: Path, fieldnames: list = None):
    """Write list of dicts to CSV using pandas if installed, else csv.DictWriter."""
    filepath.parent.mkdir(parents=True, exist_ok=True)
    if pd is not None:
        df = pd.DataFrame(records)
        df.to_csv(filepath, index=False)
    else:
        if fieldnames is None and records:
            fieldnames = list(records[0].keys())
        with open(filepath, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(records)


def print_summary_stats(metadata: dict):
    """Print comprehensive summary statistics for generated cohort."""
    n = metadata["num_patients"]
    labels = metadata["labels"]
    is_det = metadata["is_deteriorating"]
    b_egfr = metadata["baseline_egfr"]
    m12_egfr = metadata["m12_egfr"]
    scr = metadata["creatinine"]
    ages = metadata["ages"]
    sexes = metadata["sexes"]
    diab = metadata["diabetes"]
    hyp = metadata["hypertension"]

    label_1_count = int(np.sum(labels))
    label_0_count = n - label_1_count
    det_count = int(np.sum(is_det))

    print("\n" + "=" * 72)
    print("  RENALIS: Synthetic CKD Cohort & Readings Summary Statistics")
    print("=" * 72)
    print(f"Total Patients:       {n}")
    print(f"Random Seed:          {metadata['seed']}")
    print(
        f"Demographics:         Age: {np.mean(ages):.1f} +/- {np.std(ages):.1f} (range [{np.min(ages)}, {np.max(ages)}])"
    )
    print(
        f"Sex:                  {np.sum(sexes == 'M')} M ({np.mean(sexes == 'M')*100:.1f}%) | {np.sum(sexes == 'F')} F ({np.mean(sexes == 'F')*100:.1f}%)"
    )
    print(
        f"Comorbidities:        Diabetes: {np.sum(diab)} ({np.mean(diab)*100:.1f}%) | Hypertension: {np.sum(hyp)} ({np.mean(hyp)*100:.1f}%)"
    )
    print(
        f"Creatinine (mg/dL):   Mean: {np.mean(scr):.2f} | Median: {np.median(scr):.2f} | Range: [{np.min(scr):.2f}, {np.max(scr):.2f}]"
    )
    print(
        f"Baseline eGFR:        Mean: {np.mean(b_egfr):.1f} | Median: {np.median(b_egfr):.1f} | Range: [{np.min(b_egfr):.1f}, {np.max(b_egfr):.1f}]"
    )
    print("-" * 72)
    print(
        f"Injected Progression: {det_count} deteriorating patients ({det_count / n * 100:.1f}%)"
    )
    print(
        f"Outcome Class Balance (eGFR fall > 10% from Month 9 to Month 12):"
    )
    print(
        f"  - Label 0 (Stable / Slow decline): {label_0_count:4d} ({label_0_count / n * 100:.1f}%)"
    )
    print(
        f"  - Label 1 (Rapid decline):         {label_1_count:4d} ({label_1_count / n * 100:.1f}%)"
    )
    print(
        f"Label 1 Capture Rate: {np.sum(labels[is_det])}/{det_count} deteriorating patients ({np.mean(labels[is_det])*100:.1f}%)"
    )
    print("-" * 72)
    print("Month 12 eGFR Breakdown:")
    print(
        f"  - Overall Cohort:     Mean: {np.mean(m12_egfr):.1f} | Range: [{np.min(m12_egfr):.1f}, {np.max(m12_egfr):.1f}]"
    )
    print(
        f"  - Stable Group:       Mean: {np.mean(m12_egfr[~is_det]):.1f}"
    )
    print(
        f"  - Deteriorating Group:Mean: {np.mean(m12_egfr[is_det]):.1f}"
    )
    print("=" * 72 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description="Generate synthetic CKD patient records and 12-month readings for RENALIS."
    )
    parser.add_argument(
        "--num-patients",
        "-n",
        type=int,
        default=500,
        help="Number of synthetic patients to generate (default: 500).",
    )
    parser.add_argument(
        "--seed",
        "-s",
        type=int,
        default=42,
        help="Random seed for deterministic generation (default: 42).",
    )
    parser.add_argument(
        "--output-dir",
        "-o",
        type=Path,
        default=Path(__file__).resolve().parent / "synthetic",
        help="Directory to save generated synthetic CSV files.",
    )
    parser.add_argument(
        "--sample-dir",
        type=Path,
        default=Path(__file__).resolve().parent / "sample",
        help="Directory to save sample patient CSV file.",
    )
    parser.add_argument(
        "--sample-size",
        type=int,
        default=20,
        help="Number of rows for sample patients CSV (default: 20).",
    )

    args = parser.parse_args()

    # Generate data
    patients, readings, labels, metadata = generate_cohort(
        num_patients=args.num_patients, seed=args.seed
    )

    # File targets
    patients_file = args.output_dir / "patients.csv"
    readings_file = args.output_dir / "readings.csv"
    labels_file = args.output_dir / "labels.csv"
    sample_file = args.sample_dir / "patients_sample.csv"

    # Save outputs
    save_csv(patients, patients_file)
    save_csv(readings, readings_file)
    save_csv(labels, labels_file)
    save_csv(patients[: args.sample_size], sample_file)

    # Print summary
    print_summary_stats(metadata)
    print(f"Generated artifacts successfully written:")
    print(f"  - Patients: {patients_file} ({len(patients)} rows)")
    print(f"  - Readings: {readings_file} ({len(readings)} rows)")
    print(f"  - Labels:   {labels_file} ({len(labels)} rows)")
    print(f"  - Sample:   {sample_file} ({min(args.sample_size, len(patients))} rows)")


if __name__ == "__main__":
    main()
