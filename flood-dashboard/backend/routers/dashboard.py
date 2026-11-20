"""Dashboard router — unified endpoint returning all data for a state."""

from fastapi import APIRouter, HTTPException
from routers.states import get_df
from models.flood_predictor import predict
from models.priority_engine import rank_districts
from models.resource_optimizer import optimize_allocation
from services.alert_service import generate_alerts
from services.weather_service import simulate_weather_for_district, get_api_status

router = APIRouter(prefix="/api", tags=["dashboard"])

def _modeled_affected_ratio(severity_score: float) -> float:
    """Conservative exposure caps to avoid overestimation."""
    if severity_score >= 8.0:
        return 0.65
    if severity_score >= 6.0:
        return 0.45
    if severity_score >= 4.0:
        return 0.25
    return 0.12


@router.get("/dashboard/{state_name}")
async def get_dashboard_data(state_name: str):
    """Return everything needed for the dashboard in a single call.
    
    Combines: districts, summary, predictions, priorities, resources, alerts.
    """
    df = get_df()
    state_upper = state_name.strip().upper()
    subset = df[df["State"] == state_upper]

    if subset.empty:
        raise HTTPException(status_code=404, detail=f"State '{state_name}' not found")

    # ── Build district list + summary ──
    districts = []
    predictions = {}
    rain_data = {}
    forecast_data = {}

    import numpy as np

    for _, row in subset.iterrows():
        d = _row_to_dict(row)
        districts.append(d)

        # Simulate weather for prediction adjustment
        sim = simulate_weather_for_district(d)
        rain = sim["current"]["rainfall_1hr_mm"]
        fc24 = sim["forecast"]["next_24hr_rain_mm"]
        annual_daily = d.get("annual_avg_daily_rain_mm", 1)
        anomaly = rain / max(annual_daily, 0.01)
        adjusted_sev = min(10.0, d["severity_score"] * (0.7 + 0.3 * min(anomaly, 3.0)))
        modeled_affected = int(d.get("population", 0) * _modeled_affected_ratio(adjusted_sev))
        d["modeled_affected_population"] = min(
            modeled_affected,
            d.get("population", 0),
            d.get("impact_population", d.get("population", 0)),
        )

        predictions[d["district"]] = adjusted_sev
        rain_data[d["district"]] = rain
        forecast_data[d["district"]] = fc24

    # ── Summary stats ──
    sev_scores = [d["severity_score"] for d in districts]
    total_pop = sum(d.get("population", 0) for d in districts)
    total_affected = sum(d.get("modeled_affected_population", 0) for d in districts)
    high_count = sum(1 for s in sev_scores if s >= 6.0)
    medium_count = sum(1 for s in sev_scores if 4.0 <= s < 6.0)
    low_count = sum(1 for s in sev_scores if s < 4.0)
    avg_sev = round(sum(sev_scores) / max(len(sev_scores), 1), 2)
    max_sev = round(max(sev_scores) if sev_scores else 0, 2)
    total_gap = round(sum(d.get("resource_gap_score", 0) for d in districts), 2)
    avg_freq = round(sum(d.get("flood_freq_per_year", 0) for d in districts) / max(len(districts), 1), 3)
    total_deaths = sum(d.get("total_deaths", 0) for d in districts)

    summary = {
        "state": state_upper,
        "total_districts": len(districts),
        "high_risk_count": high_count,
        "medium_risk_count": medium_count,
        "low_risk_count": low_count,
        "total_population": total_pop,
        "total_affected_population": total_affected,
        "avg_severity_score": avg_sev,
        "max_severity_score": max_sev,
        "total_resource_gap": total_gap,
        "avg_flood_freq": avg_freq,
        "total_deaths": total_deaths,
    }

    # ── Priority ranking ──
    priority_result = rank_districts(districts, predictions, rain_data)
    priority_result["state"] = state_upper

    # ── Resource allocation ──
    resource_result = optimize_allocation(districts, predictions, state_upper)
    resource_result["state"] = state_upper

    # ── Alerts ──
    alert_result = generate_alerts(districts, predictions, rain_data, forecast_data, state_upper)

    # ── Weather API status ──
    weather_status = get_api_status()

    return {
        "state": state_upper,
        "summary": summary,
        "districts": districts,
        "priorities": priority_result,
        "resources": resource_result,
        "alerts": alert_result,
        "weather_status": weather_status["status"],
    }


def _row_to_dict(row) -> dict:
    import numpy as np

    def _sf(v, default=0.0):
        try:
            f = float(v)
            return round(f, 4) if not (np.isnan(f) or np.isinf(f)) else default
        except (TypeError, ValueError):
            return default

    def _si(v, default=0):
        try:
            f = float(v)
            return int(f) if not (np.isnan(f) or np.isinf(f)) else default
        except (TypeError, ValueError):
            return default

    return {
        "district": row["District"],
        "latitude": _sf(row.get("Latitude")),
        "longitude": _sf(row.get("Longitude")),
        "severity_score": _sf(row.get("Severity_Score")),
        "severity_class": row.get("Severity_Class", "LOW"),
        "national_priority_rank": int(row.get("National_Priority_Rank", 999)),
        "resource_gap_score": _sf(row.get("Resource_Gap_Score")),
        "population": _si(row.get("Population")),
        "impact_population": min(_si(row.get("Impact_Population")), _si(row.get("Population"))),
        "monsoon_rain_mm": _sf(row.get("Monsoon_Normal_Rain_mm")),
        "annual_rain_mm": _sf(row.get("Annual_Normal_Rain_mm")),
        "flood_freq_per_year": _sf(row.get("Flood_Freq_Per_Year")),
        "pct_flooded_area": _sf(row.get("Pct_Flooded_Area")),
        "total_deaths": _si(row.get("District_Deaths")),
        "avg_duration_days": _sf(row.get("Avg_Duration_Days")),
        "dfsi_score": _sf(row.get("DFSI_Score")),
        "flood_prone": bool(row.get("Flood_Prone_State", 0)),
        "total_flood_events": _si(row.get("Total_Flood_Events")),
        "urban_rural_ratio": _sf(row.get("Urban_Rural_Ratio")),
        "literacy_rate": _sf(row.get("Literacy_Rate")),
        "monsoon_avg_daily_rain_mm": _sf(row.get("Monsoon_Avg_Daily_Rain_mm")),
        "monsoon_max_daily_rain_mm": _sf(row.get("Monsoon_Max_Daily_Rain_mm")),
        "annual_avg_daily_rain_mm": _sf(row.get("Annual_Avg_Daily_Rain_mm")),
    }
