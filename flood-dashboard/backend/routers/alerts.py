"""Alerts router — GET /api/alerts."""

from fastapi import APIRouter, Query
from routers.states import get_df
from services.alert_service import generate_alerts
from services.weather_service import simulate_weather_for_district

router = APIRouter(prefix="/api", tags=["alerts"])


@router.get("/alerts")
async def get_alerts(state: str = Query(..., description="State name")):
    """Return triggered alerts for all districts in a state."""
    df = get_df()
    state_upper = state.strip().upper()
    subset = df[df["State"] == state_upper]

    if subset.empty:
        return {"state": state_upper, "alert_count": 0, "critical_count": 0, "alerts": []}

    districts = []
    predictions = {}
    rain_data = {}
    forecast_data = {}

    for _, row in subset.iterrows():
        d = _row_to_dict(row)
        districts.append(d)

        sim = simulate_weather_for_district(d)
        rain = sim["current"]["rainfall_1hr_mm"]
        fc24 = sim["forecast"]["next_24hr_rain_mm"]

        annual_daily = d.get("monsoon_avg_daily_rain_mm", 1)
        anomaly = rain / max(annual_daily, 0.01)
        adjusted_sev = min(10.0, d["severity_score"] * (0.7 + 0.3 * min(anomaly, 3.0)))

        predictions[d["district"]] = adjusted_sev
        rain_data[d["district"]] = rain
        forecast_data[d["district"]] = fc24

    return generate_alerts(districts, predictions, rain_data, forecast_data, state_upper)


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
    }
