"""Weather service — OpenWeather API client with startup validation and simulation fallback."""

import random
import asyncio
import httpx
from datetime import datetime, timezone
from config import OPENWEATHER_API_KEY

# ── Global API state ────────────────────────────────────────────
_api_active = False
_api_status = "pending"  # "active", "pending", "failed"
_last_check = None


async def verify_api_key():
    """Verify the OpenWeather API key at startup with retry logic.
    
    Retries up to 5 times with 2-minute intervals on 401 responses.
    """
    global _api_active, _api_status, _last_check

    if not OPENWEATHER_API_KEY or OPENWEATHER_API_KEY == "your_key_here":
        print("[Weather] No API key configured — using simulation mode")
        _api_status = "no_key"
        return

    max_retries = 5
    for attempt in range(1, max_retries + 1):
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    "https://api.openweathermap.org/data/2.5/weather",
                    params={
                        "lat": 25.61, "lon": 85.14,
                        "appid": OPENWEATHER_API_KEY, "units": "metric",
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    temp = data.get("main", {}).get("temp", "?")
                    city = data.get("name", "Patna")
                    print(f"[Weather] [OK] API key verified! {city}: {temp}C")
                    _api_active = True
                    _api_status = "active"
                    _last_check = datetime.now(timezone.utc).isoformat()
                    return
                elif resp.status_code == 401:
                    print(
                        f"[Weather] [WAIT] API key not yet active (attempt {attempt}/{max_retries}).\n"
                        f"   OpenWeather keys take up to 15 minutes to activate after signup.\n"
                        f"   Retrying automatically in 2 minutes..."
                    )
                    _api_status = "pending"
                    if attempt < max_retries:
                        await asyncio.sleep(120)  # 2 minutes
                else:
                    print(f"[Weather] Unexpected status {resp.status_code} — using simulation")
                    _api_status = "failed"
                    return
        except Exception as e:
            print(f"[Weather] Connection error (attempt {attempt}): {e}")
            if attempt < max_retries:
                await asyncio.sleep(120)

    print("[Weather] [FAILED] API key failed after 5 retries -- using simulation mode")
    _api_status = "failed"


def get_api_status() -> dict:
    """Return current API status for the health endpoint."""
    return {
        "status": _api_status,
        "active": _api_active,
        "last_check": _last_check,
        "key_configured": bool(OPENWEATHER_API_KEY and OPENWEATHER_API_KEY != "your_key_here"),
    }


async def get_current_weather(lat: float, lon: float) -> dict:
    """Fetch current weather from OpenWeather API; simulate on failure."""
    if _api_active:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    "https://api.openweathermap.org/data/2.5/weather",
                    params={"lat": lat, "lon": lon, "appid": OPENWEATHER_API_KEY, "units": "metric"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    rain = data.get("rain", {})
                    return {
                        "temp_c": data["main"]["temp"],
                        "rainfall_1hr_mm": rain.get("1h", 0),
                        "rainfall_3hr_mm": rain.get("3h", 0),
                        "humidity_pct": data["main"]["humidity"],
                        "wind_speed_ms": data["wind"]["speed"],
                        "description": data["weather"][0]["description"] if data.get("weather") else "N/A",
                        "cloud_cover_pct": data.get("clouds", {}).get("all", 0),
                        "condition_code": data["weather"][0]["id"] if data.get("weather") else 800,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "source": "openweather",
                    }
        except Exception:
            pass
    # Fallback: simulated data
    return _simulate_current()


async def get_forecast_72hr(lat: float, lon: float) -> dict:
    """Fetch 5-day / 3-hour forecast; aggregate to 6/12/24hr buckets."""
    if _api_active:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    "https://api.openweathermap.org/data/2.5/forecast",
                    params={"lat": lat, "lon": lon, "appid": OPENWEATHER_API_KEY, "units": "metric"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    entries = data.get("list", [])[:24]  # 72 hrs = 24 × 3hr
                    rain_vals = [e.get("rain", {}).get("3h", 0) for e in entries]
                    return {
                        "next_6hr_rain_mm": round(sum(rain_vals[:2]), 2),
                        "next_12hr_rain_mm": round(sum(rain_vals[:4]), 2),
                        "next_24hr_rain_mm": round(sum(rain_vals[:8]), 2),
                        "hourly": [{"rain_mm": r, "idx": i} for i, r in enumerate(rain_vals)],
                        "source": "openweather",
                    }
        except Exception:
            pass
    return _simulate_forecast()


def simulate_weather_for_district(district_data: dict) -> dict:
    """Generate realistic simulated weather from historical averages."""
    monsoon_rain = district_data.get("monsoon_rain_mm", 0) or district_data.get("Monsoon_Normal_Rain_mm", 610)

    simulated_rain = (monsoon_rain / 122) * random.uniform(0.8, 2.2)
    simulated_humidity = random.randint(70, 95)
    simulated_temp = round(random.uniform(26, 38), 1)

    current = {
        "temp_c": simulated_temp,
        "rainfall_1hr_mm": round(simulated_rain, 2),
        "rainfall_3hr_mm": round(simulated_rain * 3, 2),
        "humidity_pct": simulated_humidity,
        "wind_speed_ms": round(random.uniform(1.5, 8.5), 1),
        "description": "⏳ Live data activating — showing estimated values",
        "cloud_cover_pct": random.randint(60, 100),
        "condition_code": 800,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "simulated_pending_api",
    }

    forecast_base = simulated_rain * 24
    forecast = {
        "next_6hr_rain_mm": round(forecast_base * random.uniform(0.2, 0.3), 2),
        "next_12hr_rain_mm": round(forecast_base * random.uniform(0.4, 0.6), 2),
        "next_24hr_rain_mm": round(forecast_base, 2),
        "hourly": [],
        "source": "simulated_pending_api",
    }

    return {"current": current, "forecast": forecast}


# ── Private helpers ──────────────────────────────────────────────

def _simulate_current() -> dict:
    return {
        "temp_c": round(random.uniform(26, 38), 1),
        "rainfall_1hr_mm": round(random.uniform(0, 35), 2),
        "rainfall_3hr_mm": round(random.uniform(0, 80), 2),
        "humidity_pct": random.randint(65, 98),
        "wind_speed_ms": round(random.uniform(1, 10), 1),
        "description": random.choice(["moderate rain", "heavy rain", "light shower", "thunderstorm"]),
        "cloud_cover_pct": random.randint(40, 100),
        "condition_code": random.choice([500, 501, 502, 300]),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "simulated",
    }


def _simulate_forecast() -> dict:
    return {
        "next_6hr_rain_mm": round(random.uniform(5, 60), 2),
        "next_12hr_rain_mm": round(random.uniform(15, 100), 2),
        "next_24hr_rain_mm": round(random.uniform(30, 180), 2),
        "hourly": [],
        "source": "simulated",
    }
