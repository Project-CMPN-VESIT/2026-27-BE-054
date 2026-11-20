"""Routing service — ORS POST API with haversine fallback."""

import math
import httpx
from config import ORS_API_KEY


def _haversine(lat1, lon1, lat2, lon2) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


async def compute_route(
    from_lat: float, from_lon: float,
    to_lat: float, to_lon: float,
    vehicle_type: str = "truck",
    team_size: int = 5,
    affected_pop: int = 10000,
) -> dict:
    """Compute route using ORS POST API or haversine fallback."""

    # Try ORS first
    if ORS_API_KEY and ORS_API_KEY != "your_key_here":
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                profile = "driving-car"
                resp = await client.post(
                    f"https://api.openrouteservice.org/v2/directions/{profile}",
                    headers={
                        "Authorization": ORS_API_KEY,
                        "Content-Type": "application/json",
                    },
                    json={
                        "coordinates": [
                            [from_lon, from_lat],  # ORS uses [lon, lat]
                            [to_lon, to_lat],
                        ]
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    summary = data["routes"][0]["summary"]
                    geometry = data["routes"][0].get("geometry", "")
                    distance_km = round(summary["distance"] / 1000, 1)
                    duration_hrs = round(summary["duration"] / 3600, 2)
                    cost_inr = int((distance_km * 10) + (team_size * 500) + (affected_pop * 2))
                    return {
                        "distance_km": distance_km,
                        "duration_hrs": duration_hrs,
                        "cost_inr": cost_inr,
                        "geometry": geometry,  # encoded polyline
                        "source": "openrouteservice",
                        "message": "✅ Live route from OpenRouteService",
                    }
                else:
                    print(f"[Routing] ORS returned {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            print(f"[Routing] ORS error: {e}")

    # Fallback: haversine × road factor
    straight = _haversine(from_lat, from_lon, to_lat, to_lon)
    distance_km = round(straight * 1.35, 1)
    duration_hrs = round(distance_km / 40, 2)
    cost_inr = int((distance_km * 10) + (team_size * 500) + (affected_pop * 2))

    # Generate simple straight-line geometry (6 points)
    geometry = []
    for i in range(6):
        t = i / 5
        lat = from_lat + (to_lat - from_lat) * t
        lon = from_lon + (to_lon - from_lon) * t
        geometry.append([round(lat, 4), round(lon, 4)])

    return {
        "distance_km": distance_km,
        "duration_hrs": duration_hrs,
        "cost_inr": cost_inr,
        "geometry": geometry,
        "source": "haversine_fallback",
        "message": "⚠ Route estimated — Connect OpenRouteService for exact paths",
    }
