"""Resources router — GET /api/resources/{state_name}."""

from fastapi import APIRouter, HTTPException
from routers.states import get_df
from models.resource_optimizer import optimize_allocation
from services.weather_service import simulate_weather_for_district

router = APIRouter(prefix="/api", tags=["resources"])


@router.get("/resources/{state_name}")
async def get_resource_allocation(state_name: str):
    """Return optimised resource allocation plan for a state."""
    df = get_df()
    state_upper = state_name.strip().upper()
    subset = df[df["State"] == state_upper]
    if subset.empty:
        raise HTTPException(status_code=404, detail=f"State '{state_name}' not found")

    districts = []
    predictions = {}

    for _, row in subset.iterrows():
        d = _row_to_dict(row)
        districts.append(d)

        # Use simulated weather to adjust severity prediction
        sim = simulate_weather_for_district(d)
        rain = sim["current"]["rainfall_1hr_mm"]
        annual_daily = d.get("annual_avg_daily_rain_mm", 1)
        anomaly = rain / max(annual_daily, 0.01)
        adjusted_sev = min(10.0, d["severity_score"] * (0.7 + 0.3 * min(anomaly, 3.0)))
        predictions[d["district"]] = adjusted_sev

    result = optimize_allocation(districts, predictions, state_upper)
    result["state"] = state_upper
    return result


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
