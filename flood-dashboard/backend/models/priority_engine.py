"""Priority engine — dynamic priority ranking with weighted scoring."""

from config import SEVERITY_THRESHOLDS


def compute_priority(district: dict, predicted_severity: float, current_rain_mm: float, max_pop: float) -> dict:
    """Compute weighted priority score for a single district."""
    severity_norm = min(predicted_severity / 10.0, 1.0)
    pop_norm = district.get("population", 0) / max(max_pop, 1)
    gap_norm = district.get("resource_gap_score", 0)
    rain_norm = min(current_rain_mm / 200.0, 1.0)
    freq_norm = min(district.get("flood_freq_per_year", 0) / 3.0, 1.0)

    priority_score = (
        severity_norm * 0.35
        + pop_norm * 0.25
        + gap_norm * 0.20
        + rain_norm * 0.12
        + freq_norm * 0.08
    )
    priority_score = round(priority_score * 100, 2)

    # Action label + time window
    if predicted_severity >= SEVERITY_THRESHOLDS["CRITICAL"]:
        action = "IMMEDIATE"
        time_hrs = 2
    elif predicted_severity >= SEVERITY_THRESHOLDS["HIGH"]:
        action = "DEPLOY_6HR"
        time_hrs = 6
    elif predicted_severity >= SEVERITY_THRESHOLDS["MEDIUM"]:
        action = "MONITOR"
        time_hrs = 12
    else:
        action = "STANDBY"
        time_hrs = 24

    return {
        "district": district.get("district", "Unknown"),
        "priority_score": priority_score,
        "predicted_severity": round(predicted_severity, 2),
        "population": district.get("population", 0),
        "resource_gap": round(gap_norm, 3),
        "action_required": action,
        "time_to_action_hrs": time_hrs,
    }


def rank_districts(districts: list[dict], predictions: dict[str, float], rain_data: dict[str, float]) -> dict:
    """Rank all districts in a state by priority score.

    Args:
        districts: list of district dicts from the states router
        predictions: {district_name: predicted_severity_score}
        rain_data: {district_name: current_rainfall_mm}

    Returns:
        Ranked result with state-level emergency classification.
    """
    max_pop = max((d.get("population", 0) for d in districts), default=1)
    ranked = []

    for d in districts:
        name = d.get("district", "")
        sev = predictions.get(name, d.get("severity_score", 0))
        rain = rain_data.get(name, 0)
        entry = compute_priority(d, sev, rain, max_pop)
        ranked.append(entry)

    ranked.sort(key=lambda x: x["priority_score"], reverse=True)

    # Assign ranks
    for i, r in enumerate(ranked, 1):
        r["rank"] = i

    critical = sum(1 for r in ranked if r["predicted_severity"] >= SEVERITY_THRESHOLDS["CRITICAL"])
    high = sum(1 for r in ranked if SEVERITY_THRESHOLDS["HIGH"] <= r["predicted_severity"] < SEVERITY_THRESHOLDS["CRITICAL"])

    if critical >= 3:
        emergency = "RED"
    elif critical >= 1 or high >= 5:
        emergency = "ORANGE"
    elif high >= 2:
        emergency = "YELLOW"
    else:
        emergency = "GREEN"

    return {
        "ranked_districts": ranked,
        "state_emergency_level": emergency,
        "critical_count": critical,
        "high_count": high,
    }
