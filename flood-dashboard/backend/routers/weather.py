"""Weather router — serves current + forecast weather per district."""

import asyncio
from fastapi import APIRouter, Query
from services.weather_service import get_current_weather, get_forecast_72hr, get_api_status, simulate_weather_for_district
from routers.states import get_df

router = APIRouter(prefix="/api/weather", tags=["weather"])


@router.get("/status")
async def weather_status():
    """Return current OpenWeather API status."""
    return get_api_status()


@router.get("/bulk")
async def weather_bulk(state: str = Query(..., description="State name")):
    """Return weather data for all districts in a state (simulated or live)."""
    df = get_df()
    state_upper = state.strip().upper()
    subset = df[df["State"] == state_upper]

    status = get_api_status()

    # Keep bulk endpoint responsive: cap live API calls and fall back quickly.
    max_live_districts = 8
    per_call_timeout_s = 3.0

    # Build list of tasks to execute concurrently
    async def get_district_weather(row, use_live: bool):
        district_name = row["District"]
        lat = float(row.get("Latitude", 0))
        lon = float(row.get("Longitude", 0))

        current = None
        forecast = None

        if use_live and status["active"] and lat and lon:
            try:
                current, forecast = await asyncio.wait_for(
                    asyncio.gather(
                        get_current_weather(lat, lon),
                        get_forecast_72hr(lat, lon),
                    ),
                    timeout=per_call_timeout_s,
                )
            except Exception:
                current = None
                forecast = None

        if current is None or forecast is None:
            d = {
                "monsoon_rain_mm": float(row.get("Monsoon_Normal_Rain_mm", 610)),
                "monsoon_avg_daily_rain_mm": float(row.get("Monsoon_Avg_Daily_Rain_mm", 5)),
                "annual_avg_daily_rain_mm": float(row.get("Annual_Avg_Daily_Rain_mm", 1)),
            }
            sim = simulate_weather_for_district(d)
            current = sim["current"]
            forecast = sim["forecast"]

        return {
            "district": district_name,
            "lat": lat,
            "lon": lon,
            "current": current,
            "forecast": forecast,
            "monsoon_avg_daily_rain_mm": float(row.get("Monsoon_Avg_Daily_Rain_mm", 5)),
        }

    # Execute all requests concurrently
    tasks = [
        get_district_weather(row, idx < max_live_districts)
        for idx, (_, row) in enumerate(subset.iterrows())
    ]
    results = await asyncio.gather(*tasks)

    return {
        "state": state_upper,
        "weather_status": status["status"],
        "district_count": len(results),
        "districts": results,
    }


@router.get("/district/{district_name}")
async def weather_for_district(
    district_name: str,
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
):
    """Get current weather + 72-hour forecast for a district coordinate."""
    current = await get_current_weather(lat, lon)
    forecast = await get_forecast_72hr(lat, lon)

    return {
        "district": district_name,
        "lat": lat,
        "lon": lon,
        "current": current,
        "forecast": forecast,
    }
