"""Reports router — CSV download for state-level flood data."""

import csv
import io
from datetime import datetime, timezone
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from routers.states import get_df
from models.flood_predictor import predict
from models.priority_engine import compute_priority
from models.resource_optimizer import compute_required_resources, compute_available_resources
from services.weather_service import simulate_weather_for_district, get_api_status
from services.alert_service import generate_alerts

router = APIRouter(prefix="/api", tags=["reports"])


CSV_COLUMNS = [
    "District", "State", "Severity_Score", "Severity_Class",
    "Predicted_Severity", "Flood_Probability", "Risk_Level",
    "Population", "Affected_Population", "Deaths_Historical",
    "Flood_Freq_Per_Year", "Monsoon_Rain_mm", "Resource_Gap_Score",
    "Required_Teams", "Available_Teams", "Allocated_Teams",
    "Est_Cost_INR", "Priority_Score", "Priority_Rank",
    "Current_Rainfall_mm", "Forecast_24hr_mm", "Rainfall_Anomaly",
    "Alert_Level", "Recommendation", "Generated_At",
]


@router.get("/reports/csv")
async def download_csv_report(state: str = Query(..., description="State name")):
    """Generate and download a CSV report for all districts in a state."""
    df = get_df()
    state_upper = state.strip().upper()
    subset = df[df["State"] == state_upper]

    if subset.empty:
        return StreamingResponse(
            io.BytesIO(b"No data found for this state"),
            media_type="text/plain",
        )

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    api_status = get_api_status()

    districts = []
    predictions = {}
    rain_data = {}
    forecast_data = {}
    priority_scores = {}

    # Collect data for all districts
    for _, row in subset.iterrows():
        d = _row_to_dict(row)
        districts.append(d)

        # Simulate weather
        sim = simulate_weather_for_district(d)
        rain = sim["current"]["rainfall_1hr_mm"]
        fc24 = sim["forecast"]["next_24hr_rain_mm"]
        annual_daily = d.get("annual_avg_daily_rain_mm", 1)
        anomaly = rain / max(annual_daily, 0.01)
        adjusted_sev = min(10.0, d["severity_score"] * (0.7 + 0.3 * min(anomaly, 3.0)))

        predictions[d["district"]] = adjusted_sev
        rain_data[d["district"]] = rain
        forecast_data[d["district"]] = fc24

    # Compute priorities
    max_pop = max((d.get("population", 0) for d in districts), default=1)
    ranked = []
    for d in districts:
        name = d["district"]
        sev = predictions.get(name, d.get("severity_score", 0))
        rain = rain_data.get(name, 0)
        p = compute_priority(d, sev, rain, max_pop)
        ranked.append(p)
    ranked.sort(key=lambda x: x["priority_score"], reverse=True)
    for i, r in enumerate(ranked, 1):
        r["rank"] = i
        priority_scores[r["district"]] = r

    # Generate alerts
    alert_result = generate_alerts(districts, predictions, rain_data, forecast_data, state_upper)
    alert_map = {}
    for a in alert_result.get("alerts", []):
        if a["district"] not in alert_map:
            alert_map[a["district"]] = a["level"]

    # Build CSV rows
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=CSV_COLUMNS)
    writer.writeheader()

    for d in districts:
        name = d["district"]
        sev = predictions.get(name, d["severity_score"])
        rain_mm = rain_data.get(name, 0)
        fc24 = forecast_data.get(name, 0)
        annual_daily = d.get("annual_avg_daily_rain_mm", 1)
        anomaly = rain_mm / max(annual_daily, 0.01)

        required = compute_required_resources(d, sev)
        available = compute_available_resources(d)
        p = priority_scores.get(name, {})

        # Risk level
        if sev >= 8.0:
            risk_level = "CRITICAL"
            sev_class = "CRITICAL"
        elif sev >= 6.0:
            risk_level = "HIGH"
            sev_class = "HIGH"
        elif sev >= 4.0:
            risk_level = "MEDIUM"
            sev_class = "MEDIUM"
        else:
            risk_level = "LOW"
            sev_class = "LOW"

        import math
        flood_prob = round(1 / (1 + math.exp(-(sev - 4.5) * 0.8)), 3)

        recommendation = {
            "CRITICAL": "IMMEDIATE DEPLOYMENT REQUIRED",
            "HIGH": "Deploy within 6 hours",
            "MEDIUM": "Monitor + pre-position resources",
            "LOW": "Alert issued — standby",
        }.get(risk_level, "No action required")

        writer.writerow({
            "District": name,
            "State": state_upper,
            "Severity_Score": round(d["severity_score"], 2),
            "Severity_Class": sev_class,
            "Predicted_Severity": round(sev, 2),
            "Flood_Probability": flood_prob,
            "Risk_Level": risk_level,
            "Population": d.get("population", 0),
            "Affected_Population": d.get("impact_population", 0),
            "Deaths_Historical": d.get("total_deaths", 0),
            "Flood_Freq_Per_Year": round(d.get("flood_freq_per_year", 0), 3),
            "Monsoon_Rain_mm": round(d.get("monsoon_rain_mm", 0), 1),
            "Resource_Gap_Score": round(d.get("resource_gap_score", 0), 3),
            "Required_Teams": required.get("rescue_teams", 0),
            "Available_Teams": available.get("rescue_teams", 0),
            "Allocated_Teams": p.get("priority_score", 0),
            "Est_Cost_INR": p.get("priority_score", 0),
            "Priority_Score": round(p.get("priority_score", 0), 2),
            "Priority_Rank": p.get("rank", 0),
            "Current_Rainfall_mm": round(rain_mm, 2),
            "Forecast_24hr_mm": round(fc24, 2),
            "Rainfall_Anomaly": round(anomaly, 2),
            "Alert_Level": alert_map.get(name, "NONE"),
            "Recommendation": recommendation,
            "Generated_At": now,
        })

    csv_bytes = output.getvalue().encode("utf-8")
    filename = f"DRMS_{state_upper}_Report_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"

    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


def _row_to_dict(row) -> dict:
    return {
        "district": row["District"],
        "severity_score": float(row.get("Severity_Score", 0)),
        "population": int(row.get("Population", 0)),
        "impact_population": int(row.get("Impact_Population", 0)),
        "resource_gap_score": float(row.get("Resource_Gap_Score", 0)),
        "flood_freq_per_year": float(row.get("Flood_Freq_Per_Year", 0)),
        "latitude": float(row.get("Latitude", 0)),
        "longitude": float(row.get("Longitude", 0)),
        "urban_rural_ratio": float(row.get("Urban_Rural_Ratio", 0)),
        "monsoon_rain_mm": float(row.get("Monsoon_Normal_Rain_mm", 0)),
        "annual_rain_mm": float(row.get("Annual_Normal_Rain_mm", 0)),
        "monsoon_avg_daily_rain_mm": float(row.get("Monsoon_Avg_Daily_Rain_mm", 5)),
        "annual_avg_daily_rain_mm": float(row.get("Annual_Avg_Daily_Rain_mm", 1)),
        "total_deaths": int(row.get("District_Deaths", 0)),
    }
