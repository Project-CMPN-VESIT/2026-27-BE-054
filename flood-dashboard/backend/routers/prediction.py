"""Prediction router — POST /api/predict endpoint."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from routers.states import get_df
from models.flood_predictor import predict
from services.weather_service import simulate_weather_for_district

router = APIRouter(prefix="/api", tags=["prediction"])


class PredictionRequest(BaseModel):
    state: str
    district: str
    current_rainfall_mm: Optional[float] = None
    forecast_24hr_rain_mm: Optional[float] = None
    use_live_weather: bool = False


@router.post("/predict")
async def predict_flood(req: PredictionRequest):
    """Run flood prediction for a single district."""
    df = get_df()
    state_upper = req.state.strip().upper()
    row = df[(df["State"] == state_upper) & (df["District"].str.lower() == req.district.strip().lower())]

    if row.empty:
        raise HTTPException(status_code=404, detail=f"District '{req.district}' not found in state '{req.state}'")

    r = row.iloc[0]
    district_data = {
        "district": r["District"],
        "state": state_upper,
        "severity_score": float(r.get("Severity_Score", 0)),
        "monsoon_rain_mm": float(r.get("Monsoon_Normal_Rain_mm", 0)),
        "annual_rain_mm": float(r.get("Annual_Normal_Rain_mm", 0)),
        "flood_freq_per_year": float(r.get("Flood_Freq_Per_Year", 0)),
        "pct_flooded_area": float(r.get("Pct_Flooded_Area", 0)),
        "avg_duration_days": float(r.get("Avg_Duration_Days", 0)),
        "dfsi_score": float(r.get("DFSI_Score", 0)),
        "population": int(r.get("Population", 0)),
        "urban_rural_ratio": float(r.get("Urban_Rural_Ratio", 0)),
        "impact_population": int(r.get("Impact_Population", 0)),
        "annual_avg_daily_rain_mm": float(r.get("Annual_Avg_Daily_Rain_mm", 1)),
        "monsoon_avg_daily_rain_mm": float(r.get("Monsoon_Avg_Daily_Rain_mm", 5)),
    }

    # Determine rainfall inputs
    current_rain = req.current_rainfall_mm
    forecast_rain = req.forecast_24hr_rain_mm

    if current_rain is None or forecast_rain is None:
        sim = simulate_weather_for_district(district_data)
        if current_rain is None:
            current_rain = sim["current"]["rainfall_1hr_mm"]
        if forecast_rain is None:
            forecast_rain = sim["forecast"]["next_24hr_rain_mm"]

    result = predict(district_data, current_rain, forecast_rain)
    return result
