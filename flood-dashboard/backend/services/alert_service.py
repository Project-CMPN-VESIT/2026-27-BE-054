"""Alert service — generates alerts based on severity, rainfall, and resource gaps."""

from datetime import datetime, timezone, timedelta
import hashlib


ALERT_RULES = [
    {
        "id": "extreme_flood",
        "condition": lambda sev, rain, hist_avg, gap, freq, fc24: sev >= 8.0,
        "level": "CRITICAL",
        "title": "EXTREME FLOOD RISK — IMMEDIATE ACTION REQUIRED",
        "action": "Immediate evacuation + resource deployment",
        "color": "#FF1744",
    },
    {
        "id": "high_flood",
        "condition": lambda sev, rain, hist_avg, gap, freq, fc24: sev >= 6.5,
        "level": "HIGH",
        "title": "HIGH FLOOD ALERT",
        "action": "Pre-position resources, alert local teams",
        "color": "#FF6B00",
    },
    {
        "id": "extreme_rainfall",
        "condition": lambda sev, rain, hist_avg, gap, freq, fc24: hist_avg > 0 and rain > 2.5 * hist_avg,
        "level": "HIGH",
        "title": "EXTREME RAINFALL ANOMALY",
        "action": "Monitor river levels, standby deployment",
        "color": "#FF6B00",
    },
    {
        "id": "resource_deficit",
        "condition": lambda sev, rain, hist_avg, gap, freq, fc24: gap >= 0.85,
        "level": "MEDIUM",
        "title": "CRITICAL RESOURCE DEFICIT",
        "action": "Inter-district resource transfer needed",
        "color": "#FFA500",
    },
    {
        "id": "high_freq_heavy_forecast",
        "condition": lambda sev, rain, hist_avg, gap, freq, fc24: freq > 1.5 and fc24 > 80,
        "level": "HIGH",
        "title": "HIGH FREQUENCY ZONE — HEAVY FORECAST",
        "action": "Activate emergency protocols",
        "color": "#FF6B00",
    },
]


def generate_alerts(
    districts: list[dict],
    predictions: dict[str, float],
    rain_data: dict[str, float],
    forecast_data: dict[str, float],
    state: str,
) -> dict:
    """Evaluate all alert rules for every district; return triggered alerts."""
    alerts = []
    now = datetime.now(timezone.utc)

    for d in districts:
        name = d.get("district", "")
        sev = predictions.get(name, d.get("severity_score", 0))
        rain = rain_data.get(name, 0)
        hist_avg = d.get("monsoon_avg_daily_rain_mm", 0) or d.get("monsoon_rain_mm", 0) / 122  # 122 monsoon days
        gap = d.get("resource_gap_score", 0)
        freq = d.get("flood_freq_per_year", 0)
        fc24 = forecast_data.get(name, 0)

        for rule in ALERT_RULES:
            try:
                if rule["condition"](sev, rain, hist_avg, gap, freq, fc24):
                    alert_id = hashlib.md5(f"{name}-{rule['id']}-{now.date()}".encode()).hexdigest()[:12]
                    pop = d.get("population", 0)
                    anomaly = round(rain / max(hist_avg, 0.01), 1) if hist_avg > 0 else 0

                    message = (
                        f"Predicted severity {sev:.1f}/10. "
                        f"Current rainfall {rain:.0f}mm/hr is {anomaly}x above historical avg. "
                        f"{_format_pop(pop)} population at risk."
                    )

                    alerts.append({
                        "id": f"ALT-{alert_id}",
                        "district": name,
                        "state": state,
                        "level": rule["level"],
                        "title": rule["title"],
                        "message": message,
                        "action_required": rule["action"],
                        "color": rule["color"],
                        "triggered_at": now.isoformat(),
                        "expires_at": (now + timedelta(hours=6)).isoformat(),
                        "lat": d.get("latitude", 0),
                        "lon": d.get("longitude", 0),
                        "severity_score": round(sev, 2),
                        "rainfall_mm": round(rain, 1),
                    })
            except Exception:
                continue

    # Sort: CRITICAL first, then HIGH, then MEDIUM
    level_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    alerts.sort(key=lambda a: level_order.get(a["level"], 9))

    critical_count = sum(1 for a in alerts if a["level"] == "CRITICAL")

    return {
        "state": state,
        "alert_count": len(alerts),
        "critical_count": critical_count,
        "alerts": alerts,
    }


def _format_pop(pop: int) -> str:
    if pop >= 10_000_000:
        return f"{pop / 10_000_000:.1f}Cr"
    if pop >= 100_000:
        return f"{pop / 100_000:.1f}L"
    if pop >= 1_000:
        return f"{pop / 1_000:.1f}K"
    return str(pop)
