"""GeoJSON router — serves district boundary polygons filtered by state."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import json
from pathlib import Path

router = APIRouter(prefix="/api", tags=["geojson"])

_geo_data = None
_state_index = {}  # state_name -> list of feature indices


def load_geojson():
    """Load the simplified GeoJSON at startup."""
    global _geo_data, _state_index
    geo_path = Path(__file__).resolve().parent.parent / "data" / "india_districts_simplified.geojson"
    if not geo_path.exists():
        print(f"[GeoJSON] Warning: {geo_path} not found")
        return
    with open(geo_path, "r") as f:
        _geo_data = json.load(f)
    # Build state index
    for i, feat in enumerate(_geo_data["features"]):
        state = feat["properties"].get("state", "").upper().strip()
        _state_index.setdefault(state, []).append(i)
    print(f"[GeoJSON] Loaded {len(_geo_data['features'])} district boundaries, {len(_state_index)} states")


@router.get("/geojson/{state_name}")
def get_state_geojson(state_name: str):
    """Return GeoJSON FeatureCollection for a single state."""
    if _geo_data is None:
        raise HTTPException(status_code=503, detail="GeoJSON data not loaded")

    state_upper = state_name.strip().upper()
    indices = _state_index.get(state_upper, [])

    features = [_geo_data["features"][i] for i in indices]
    return JSONResponse(
        content={"type": "FeatureCollection", "features": features},
        media_type="application/geo+json",
    )


@router.get("/geojson")
def get_all_geojson():
    """Return the full GeoJSON (all districts)."""
    if _geo_data is None:
        raise HTTPException(status_code=503, detail="GeoJSON data not loaded")
    return JSONResponse(content=_geo_data, media_type="application/geo+json")
