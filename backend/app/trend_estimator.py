"""
Estimated 3-Month eGFR Trajectory Forecaster
Digital Twin Challenge 2026
"""

from typing import Any, Dict, List
import numpy as np

from backend.app.schemas import EstimatedTrend, TrendProjectionPoint


def estimate_3m_egfr_trend(
    baseline_egfr: float,
    readings: List[Dict[str, Any]],
    probability: float,
    tier: str,
) -> EstimatedTrend:
    """Calculate projected 3-month eGFR trajectory for months 10, 11, and 12.

    Uses observed slope up to month 9 combined with the calibrated risk probability.
    """
    # Filter to months 1 to 9
    m9_readings = [
        r for r in readings
        if int(r.get("month", 0)) in range(1, 10)
    ]
    m9_readings.sort(key=lambda r: int(r.get("month", 0)))

    if m9_readings:
        last_month = int(m9_readings[-1].get("month", 9))
        last_egfr = float(m9_readings[-1].get("egfr", baseline_egfr))
        months = np.array([float(r.get("month", 0)) for r in m9_readings])
        egfrs = np.array([float(r.get("egfr", baseline_egfr)) for r in m9_readings])

        if len(months) >= 2 and np.var(months) > 1e-6:
            observed_slope = float(np.polyfit(months, egfrs, 1)[0])
        else:
            observed_slope = 0.0
    else:
        last_month = 9
        last_egfr = float(baseline_egfr)
        observed_slope = 0.0

    # In synthetic progression model, rapid decliners lose ~4.2% per month
    rapid_decline_monthly_loss = -0.042 * last_egfr
    stable_monthly_loss = -0.04  # standard age-related drift

    # Blend observed slope with risk probability expectation
    blended_slope = (
        (1.0 - probability) * max(observed_slope, stable_monthly_loss * 3)
        + probability * min(observed_slope, rapid_decline_monthly_loss)
    )

    # Generate points for months 10, 11, 12
    projected_points = []
    for target_m in (10, 11, 12):
        delta = target_m - last_month
        proj_val = last_egfr + blended_slope * delta
        proj_val = float(np.clip(proj_val, 5.0, 110.0))
        projected_points.append(
            TrendProjectionPoint(
                month=target_m,
                projected_egfr=float(np.round(proj_val, 1)),
            )
        )

    m12_val = projected_points[-1].projected_egfr
    drop_pct = float(np.round(((m12_val - last_egfr) / max(last_egfr, 1.0)) * 100.0, 1))

    if tier == "High":
        summary = (
            f"High risk of rapid deterioration: projected drop of {abs(drop_pct):.1f}% "
            f"from {last_egfr:.1f} to {m12_val:.1f} mL/min/1.73m² by Month 12 "
            f"(projected slope: {blended_slope:.2f} mL/min/1.73m²/mo)."
        )
    elif tier == "Medium":
        summary = (
            f"Moderate risk of progression: projected eGFR change of {drop_pct:+.1f}% "
            f"from {last_egfr:.1f} to {m12_val:.1f} mL/min/1.73m² by Month 12 "
            f"(projected slope: {blended_slope:.2f} mL/min/1.73m²/mo)."
        )
    else:
        summary = (
            f"Stable trajectory forecast: minimal projected change of {drop_pct:+.1f}% "
            f"from {last_egfr:.1f} to {m12_val:.1f} mL/min/1.73m² by Month 12."
        )

    return EstimatedTrend(
        projected_slope=float(np.round(blended_slope, 2)),
        projected_3m_change_pct=drop_pct,
        projected_readings=projected_points,
        summary=summary,
    )
