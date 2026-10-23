"""
Estimated 3-Month eGFR Trajectory Forecaster
Digital Twin Challenge 2026

Calculates a 3-month linear trend extrapolation with lower and upper prediction bounds (95% CI).
States the estimation method in every response.
Notice: Experimental research prototype for Digital Twin Challenge 2026; not clinically validated.
No drug names, doses, or treatment advice are ever emitted.
"""

from typing import Any, Dict, List, Optional
import numpy as np


def estimate_3m_egfr_trend(
    baseline_egfr: float,
    readings: Optional[List[Dict[str, Any]]] = None,
    probability: float = 0.5,
    tier: str = "Medium",
    basis: str = "trend model",
) -> Dict[str, Any]:
    """Calculate 3-month projected eGFR trajectory with lower and upper bounds.

    Args:
        baseline_egfr: Baseline filtration rate (mL/min/1.73m²).
        readings: List of longitudinal monthly readings (months 1-9).
        probability: Model predicted risk probability (0.0 to 1.0).
        tier: "Low", "Medium", or "High".
        basis: "trend model" or "baseline only".

    Returns:
        Dict containing:
        - method: Explanation of linear trend methodology
        - projected_slope: Monthly slope (mL/min/1.73m²/mo)
        - projected_3m_egfr: Projected eGFR at month + 3
        - lower_bound: Lower 95% prediction interval bound
        - upper_bound: Upper 95% prediction interval bound
        - projected_3m_change_pct: Projected 3-month change percentage
        - projected_readings: List of monthly points with lower and upper bounds
        - summary: Plain explanatory statement
    """
    raw_readings = readings or []
    # Filter to months 1 to 9 (zero leakage)
    m9_readings = [
        r for r in raw_readings
        if int(r.get("month", 0)) in range(1, 10)
    ]
    m9_readings.sort(key=lambda r: int(r.get("month", 0)))

    if len(m9_readings) >= 2:
        # Longitudinal linear regression
        months = np.array([float(r.get("month", 0)) for r in m9_readings])
        egfrs = np.array([float(r.get("egfr", baseline_egfr)) for r in m9_readings])
        last_m = int(months[-1])
        last_val = float(egfrs[-1])

        # Ordinary least squares
        slope, intercept = np.polyfit(months, egfrs, 1)
        slope = float(slope)

        # Residual standard error
        fitted = slope * months + intercept
        residuals = egfrs - fitted
        dof = max(len(months) - 2, 1)
        s_err = float(np.sqrt(np.sum(residuals**2) / dof))
        s_err = max(s_err, 1.2)  # Minimum physiological baseline variance

        x_mean = float(np.mean(months))
        ss_x = float(np.sum((months - x_mean) ** 2))
        if ss_x < 1e-6:
            ss_x = 1.0

        method = (
            "Ordinary least squares linear trend regression over observed monthly eGFR readings "
            "(Months 1 to 9) projected 3 months forward with 95% prediction interval bounds. "
            "Experimental prototype; not clinically validated."
        )

        projected_points = []
        target_months = [last_m + 1, last_m + 2, last_m + 3]
        for tm in target_months:
            delta = tm - last_m
            pred_y = last_val + slope * delta
            # Prediction standard error for point at tm
            se_pred = s_err * np.sqrt(1.0 + (1.0 / len(months)) + ((tm - x_mean) ** 2 / ss_x))
            low_b = float(np.clip(pred_y - 1.96 * se_pred, 5.0, 140.0))
            high_b = float(np.clip(pred_y + 1.96 * se_pred, 5.0, 140.0))
            pred_y_clipped = float(np.clip(pred_y, 5.0, 140.0))

            projected_points.append({
                "month": tm,
                "projected_egfr": round(pred_y_clipped, 1),
                "lower_bound": round(low_b, 1),
                "upper_bound": round(high_b, 1),
            })

    else:
        # Static baseline projection
        last_m = int(m9_readings[0].get("month", 0)) if m9_readings else 0
        last_val = float(m9_readings[0].get("egfr", baseline_egfr)) if m9_readings else float(baseline_egfr)

        # Risk-calibrated expected monthly slope
        if tier == "High":
            slope = -1.8
            base_uncertainty = 3.5
        elif tier == "Medium":
            slope = -0.7
            base_uncertainty = 2.5
        else:
            slope = -0.15
            base_uncertainty = 1.8

        method = (
            "Static baseline linear projection calibrated from logistic regression risk tier "
            "with standard 95% error bounds. Experimental prototype; not clinically validated."
        )

        projected_points = []
        target_months = [last_m + 1, last_m + 2, last_m + 3]
        for idx, tm in enumerate(target_months, start=1):
            pred_y = last_val + slope * idx
            se_pred = base_uncertainty * np.sqrt(1.0 + 0.3 * idx)
            low_b = float(np.clip(pred_y - 1.96 * se_pred, 5.0, 140.0))
            high_b = float(np.clip(pred_y + 1.96 * se_pred, 5.0, 140.0))
            pred_y_clipped = float(np.clip(pred_y, 5.0, 140.0))

            projected_points.append({
                "month": tm,
                "projected_egfr": round(pred_y_clipped, 1),
                "lower_bound": round(low_b, 1),
                "upper_bound": round(high_b, 1),
            })

    final_point = projected_points[-1]
    final_egfr = final_point["projected_egfr"]
    lower_bound = final_point["lower_bound"]
    upper_bound = final_point["upper_bound"]

    change_pct = round(((final_egfr - last_val) / max(last_val, 1.0)) * 100.0, 1)

    if tier == "High":
        summary = (
            f"Projected trajectory indicates accelerated kidney function decline: "
            f"eGFR estimated to change by {change_pct:+.1f}% from {last_val:.1f} to {final_egfr:.1f} "
            f"mL/min/1.73m² over 3 months (95% bound: {lower_bound:.1f} to {upper_bound:.1f})."
        )
    elif tier == "Medium":
        summary = (
            f"Projected trajectory indicates moderate progression rate: "
            f"eGFR estimated to change by {change_pct:+.1f}% from {last_val:.1f} to {final_egfr:.1f} "
            f"mL/min/1.73m² over 3 months (95% bound: {lower_bound:.1f} to {upper_bound:.1f})."
        )
    else:
        summary = (
            f"Projected trajectory indicates stable kidney filtration rate: "
            f"eGFR estimated at {final_egfr:.1f} mL/min/1.73m² over 3 months "
            f"(95% bound: {lower_bound:.1f} to {upper_bound:.1f})."
        )

    return {
        "method": method,
        "projected_slope": round(slope, 2),
        "projected_3m_egfr": final_egfr,
        "lower_bound": lower_bound,
        "upper_bound": upper_bound,
        "projected_3m_change_pct": change_pct,
        "projected_readings": projected_points,
        "summary": summary,
    }
