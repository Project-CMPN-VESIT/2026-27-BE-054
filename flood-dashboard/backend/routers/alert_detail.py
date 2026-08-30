"""Alert detail router for district-level alert reports."""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from routers.states import get_df
from services.weather_service import simulate_weather_for_district
from models.resource_optimizer import (
    compute_required_resources,
    compute_available_resources,
    compute_cost,
    find_nearest_dispatch,
    compute_transport,
)

router = APIRouter(prefix="/api", tags=["alert-detail"])


# ── Helpers ──────────────────────────────────────────────────────

def _safe_float(v, default=0.0):
    import numpy as np
    try:
        f = float(v)
        return round(f, 4) if not (np.isnan(f) or np.isinf(f)) else default
    except (TypeError, ValueError):
        return default


def _safe_int(v, default=0):
    import numpy as np
    try:
        f = float(v)
        return int(f) if not (np.isnan(f) or np.isinf(f)) else default
    except (TypeError, ValueError):
        return default


def _row_to_full_dict(row) -> dict:
    """Convert a CSV row to a comprehensive dict (all fields)."""
    return {
        "district": row["District"],
        "state": row["State"],
        "latitude": _safe_float(row.get("Latitude")),
        "longitude": _safe_float(row.get("Longitude")),
        "severity_score": _safe_float(row.get("Severity_Score")),
        "severity_class": row.get("Severity_Class", "LOW"),
        "national_priority_rank": _safe_int(row.get("National_Priority_Rank", 999)),
        "resource_gap_score": _safe_float(row.get("Resource_Gap_Score")),
        "population": _safe_int(row.get("Population")),
        "impact_population": min(_safe_int(row.get("Impact_Population")), _safe_int(row.get("Population"))),
        "monsoon_rain_mm": _safe_float(row.get("Monsoon_Normal_Rain_mm")),
        "annual_rain_mm": _safe_float(row.get("Annual_Normal_Rain_mm")),
        "flood_freq_per_year": _safe_float(row.get("Flood_Freq_Per_Year")),
        "pct_flooded_area": _safe_float(row.get("Pct_Flooded_Area")),
        "total_deaths": _safe_int(row.get("District_Deaths")),
        "total_injured": _safe_int(row.get("District_Injured")),
        "avg_duration_days": _safe_float(row.get("Avg_Duration_Days")),
        "dfsi_score": _safe_float(row.get("DFSI_Score")),
        "flood_prone": bool(row.get("Flood_Prone_State", 0)),
        "total_flood_events": _safe_int(row.get("Total_Flood_Events")),
        "urban_rural_ratio": _safe_float(row.get("Urban_Rural_Ratio")),
        "literacy_rate": _safe_float(row.get("Literacy_Rate")),
        "monsoon_avg_daily_rain_mm": _safe_float(row.get("Monsoon_Avg_Daily_Rain_mm")),
        "monsoon_max_daily_rain_mm": _safe_float(row.get("Monsoon_Max_Daily_Rain_mm")),
        "annual_avg_daily_rain_mm": _safe_float(row.get("Annual_Avg_Daily_Rain_mm")),
        "avg_deaths_per_event": _safe_float(row.get("Avg_Deaths_Per_Event")),
        "total_displaced": _safe_int(row.get("Total_Displaced")),
        "households": _safe_int(row.get("Households")),
        "avg_household_size": _safe_float(row.get("Avg_Household_Size")),
    }


# ── Prediction explanation ───────────────────────────────────────

def generate_prediction_explanation(district: dict, prediction: dict) -> list[str]:
    """Generate human-readable explanation of why an alert was triggered."""
    factors = []

    # Factor 1: Rainfall anomaly
    anomaly = prediction.get("rainfall_anomaly_ratio", 0)
    current_rain = prediction.get("current_rainfall_mm", 0)
    hist_avg = district.get("monsoon_avg_daily_rain_mm", 0)
    if anomaly >= 1.0:
        direction = "above" if anomaly > 1 else "at"
        hist_hourly = hist_avg / 24 if hist_avg else 0
        factors.append(
            f"Current rainfall ({current_rain:.1f}mm/hr) is {anomaly:.1f}× "
            f"{direction} historical monsoon average ({hist_hourly:.1f}mm/hr)"
        )

    # Factor 2: Historical flood frequency
    freq = district.get("flood_freq_per_year", 0)
    if freq > 0:
        factors.append(
            f"District experiences {freq:.2f} flood events per year historically"
        )

    # Factor 3: Flood prone area
    pct = district.get("pct_flooded_area", 0)
    if pct > 0:
        factors.append(
            f"{pct:.1f}% of district area is classified as flood-prone zone"
        )

    # Factor 4: Severity band
    score = prediction.get("predicted_severity_score", 0)
    sev_class = prediction.get("severity_class", "LOW")
    factors.append(
        f"ML model severity score of {score:.1f}/10 places district "
        f"in {sev_class} risk band"
    )

    # Factor 5: Resource gap
    gap = district.get("resource_gap_score", 0) * 100
    if gap >= 50:
        factors.append(
            f"Resource gap of {gap:.1f}% means insufficient local "
            f"capacity to handle a major flood event independently"
        )

    # Factor 6: 24hr forecast
    forecast = prediction.get("forecast_24hr_mm", 0)
    if forecast >= 50:
        factors.append(
            f"24-hour rainfall forecast of {forecast:.0f}mm exceeds "
            f"flood trigger threshold for this district"
        )

    # ML model note
    baseline = district.get("severity_score", 0)
    delta = score - baseline
    factors.append(
        f"XGBoost predicted severity {score:.1f}/10 "
        f"(historical baseline: {baseline:.1f}/10, delta: {'+' if delta >= 0 else ''}{delta:.1f})"
    )

    return factors


# ── Recommended actions ──────────────────────────────────────────

def generate_recommended_actions(district: dict, resources: dict, prediction: dict) -> list[str]:
    """Generate actionable recommendations based on gaps and severity."""
    actions = []
    required = resources.get("required", {})
    available = resources.get("available", {})

    # 1. Rescue teams
    rescue_gap = required.get("rescue_teams", 0) - available.get("rescue_teams", 0)
    if rescue_gap > 0:
        actions.append(f"Deploy {rescue_gap} additional rescue teams within 6 hours")

    # 2. Boats
    boat_gap = required.get("boats", 0) - available.get("boats", 0)
    if boat_gap > 0:
        actions.append(f"Request inter-district boat transfer — {boat_gap} boats needed")

    # 3. Medical units
    med_gap = required.get("medical_units", 0) - available.get("medical_units", 0)
    if med_gap > 0:
        actions.append(f"Mobilise {med_gap} additional medical units for emergency triage")

    # 4. Relief camps
    camp_gap = required.get("relief_camps", 0) - available.get("relief_camps", 0)
    if camp_gap > 0:
        actions.append(f"Set up {camp_gap} additional relief camps at high ground locations")

    # 5. Severity-specific actions
    sev = prediction.get("predicted_severity_score", 0)
    if sev >= 8.0:
        actions.append("IMMEDIATE: Alert district collector, SDRF, and NDRF immediately")
        actions.append("IMMEDIATE: Initiate civilian evacuation from low-lying areas")
    elif sev >= 6.0:
        actions.append("Alert district collector and SDRF for potential deployment")
    else:
        actions.append("Continue monitoring weather data and river gauge levels")

    # 6. Helicopters
    heli_gap = required.get("helicopters", 0) - available.get("helicopters", 0)
    if heli_gap > 0:
        actions.append(f"Request {heli_gap} helicopter(s) from state/central reserves for aerial rescue")

    # 7. Population alert
    pop = district.get("impact_population", 0)
    if pop > 500000:
        pop_lakhs = pop / 100000
        actions.append(f"Issue mass SMS/siren alert to {pop_lakhs:.1f} lakh affected residents")

    return actions


# ── Static water infrastructure (no external API) ───────────────

WATER_BODIES_DB = {
    "Amravati": [
        {"name": "Upper Wardha Dam", "type": "Dam", "lat": 20.65, "lon": 78.19, "distance_from_center_km": 45, "risk_level": "LOW"},
        {"name": "Wan Reservoir", "type": "Reservoir", "lat": 20.80, "lon": 77.45, "distance_from_center_km": 28, "risk_level": "MEDIUM"},
        {"name": "Wardha River", "type": "River", "lat": 20.75, "lon": 78.35, "distance_from_center_km": 12, "risk_level": "HIGH"},
        {"name": "Penganga River", "type": "River", "lat": 20.35, "lon": 77.95, "distance_from_center_km": 38, "risk_level": "LOW"},
    ],
    "Nashik": [
        {"name": "Gangapur Dam", "type": "Dam", "lat": 20.02, "lon": 73.77, "distance_from_center_km": 8, "risk_level": "HIGH"},
        {"name": "Godavari River", "type": "River", "lat": 19.95, "lon": 73.82, "distance_from_center_km": 5, "risk_level": "HIGH"},
        {"name": "Darna Dam", "type": "Dam", "lat": 20.10, "lon": 73.50, "distance_from_center_km": 32, "risk_level": "LOW"},
        {"name": "Palkhed Dam", "type": "Dam", "lat": 20.40, "lon": 74.05, "distance_from_center_km": 45, "risk_level": "LOW"},
    ],
    "Kolhapur": [
        {"name": "Panchganga River", "type": "River", "lat": 16.70, "lon": 74.22, "distance_from_center_km": 4, "risk_level": "HIGH"},
        {"name": "Radhanagari Dam", "type": "Dam", "lat": 16.42, "lon": 73.97, "distance_from_center_km": 35, "risk_level": "LOW"},
        {"name": "Warna River", "type": "River", "lat": 16.85, "lon": 74.10, "distance_from_center_km": 20, "risk_level": "MEDIUM"},
        {"name": "Tulshi Reservoir", "type": "Reservoir", "lat": 16.64, "lon": 73.99, "distance_from_center_km": 42, "risk_level": "LOW"},
    ],
    "Pune": [
        {"name": "Khadakwasla Dam", "type": "Dam", "distance_from_center_km": 20, "risk_level": "MEDIUM"},
        {"name": "Mutha River", "type": "River", "distance_from_center_km": 3, "risk_level": "HIGH"},
        {"name": "Mula River", "type": "River", "distance_from_center_km": 5, "risk_level": "HIGH"},
        {"name": "Pavna Dam", "type": "Dam", "distance_from_center_km": 38, "risk_level": "LOW"},
    ],
    "Mumbai": [
        {"name": "Mithi River", "type": "River", "lat": 19.08, "lon": 72.87, "distance_from_center_km": 5, "risk_level": "HIGH"},
        {"name": "Vihar Lake", "type": "Reservoir", "lat": 19.12, "lon": 72.93, "distance_from_center_km": 12, "risk_level": "HIGH"},
        {"name": "Ulhas River", "type": "River", "lat": 19.22, "lon": 73.05, "distance_from_center_km": 18, "risk_level": "MEDIUM"},
        {"name": "Tulsi Lake", "type": "Reservoir", "lat": 19.14, "lon": 72.91, "distance_from_center_km": 14, "risk_level": "HIGH"},
    ],
    "Nagpur": [
        {"name": "Kanhan River", "type": "River", "distance_from_center_km": 8, "risk_level": "HIGH"},
        {"name": "Pench Reservoir", "type": "Reservoir", "distance_from_center_km": 35, "risk_level": "LOW"},
        {"name": "Wardha River", "type": "River", "distance_from_center_km": 22, "risk_level": "MEDIUM"},
        {"name": "Navegaon Dam", "type": "Dam", "distance_from_center_km": 48, "risk_level": "LOW"},
    ],
    "Patna": [
        {"name": "Ganga River", "type": "River", "lat": 25.61, "lon": 85.14, "distance_from_center_km": 3, "risk_level": "HIGH"},
        {"name": "Gandak River", "type": "River", "lat": 25.68, "lon": 84.45, "distance_from_center_km": 8, "risk_level": "HIGH"},
        {"name": "Sone River", "type": "River", "lat": 25.35, "lon": 84.90, "distance_from_center_km": 22, "risk_level": "MEDIUM"},
        {"name": "Punpun River", "type": "River", "lat": 25.50, "lon": 85.35, "distance_from_center_km": 15, "risk_level": "HIGH"},
    ],
    "Muzaffarpur": [
        {"name": "Gandak River", "type": "River", "distance_from_center_km": 6, "risk_level": "HIGH"},
        {"name": "Bagmati River", "type": "River", "distance_from_center_km": 10, "risk_level": "HIGH"},
        {"name": "Burhi Gandak", "type": "River", "distance_from_center_km": 4, "risk_level": "HIGH"},
        {"name": "Lakhandei River", "type": "River", "distance_from_center_km": 18, "risk_level": "MEDIUM"},
    ],
    "Darbhanga": [
        {"name": "Kamla River", "type": "River", "distance_from_center_km": 5, "risk_level": "HIGH"},
        {"name": "Bagmati River", "type": "River", "distance_from_center_km": 8, "risk_level": "HIGH"},
        {"name": "Balan River", "type": "River", "distance_from_center_km": 12, "risk_level": "HIGH"},
        {"name": "Kareh River", "type": "River", "distance_from_center_km": 20, "risk_level": "MEDIUM"},
    ],
    "Guwahati": [
        {"name": "Brahmaputra River", "type": "River", "lat": 26.18, "lon": 91.75, "distance_from_center_km": 2, "risk_level": "HIGH"},
        {"name": "Deepor Beel", "type": "Wetland", "lat": 26.12, "lon": 91.62, "distance_from_center_km": 8, "risk_level": "HIGH"},
        {"name": "Basistha River", "type": "River", "lat": 26.10, "lon": 91.80, "distance_from_center_km": 10, "risk_level": "HIGH"},
        {"name": "Kalmoni River", "type": "River", "lat": 26.15, "lon": 91.88, "distance_from_center_km": 15, "risk_level": "MEDIUM"},
    ],
    "Dibrugarh": [
        {"name": "Brahmaputra River", "type": "River", "distance_from_center_km": 4, "risk_level": "HIGH"},
        {"name": "Burhidihing River", "type": "River", "distance_from_center_km": 6, "risk_level": "HIGH"},
        {"name": "Dibru River", "type": "River", "distance_from_center_km": 9, "risk_level": "HIGH"},
        {"name": "Desang River", "type": "River", "distance_from_center_km": 18, "risk_level": "MEDIUM"},
    ],
    "Kolkata": [
        {"name": "Hooghly River", "type": "River", "distance_from_center_km": 2, "risk_level": "HIGH"},
        {"name": "Tolly Nullah", "type": "Canal", "distance_from_center_km": 6, "risk_level": "HIGH"},
        {"name": "Bagjola Canal", "type": "Canal", "distance_from_center_km": 10, "risk_level": "MEDIUM"},
        {"name": "East Kolkata Wetlands", "type": "Wetland", "distance_from_center_km": 12, "risk_level": "HIGH"},
    ],
    "Varanasi": [
        {"name": "Ganga River", "type": "River", "lat": 25.32, "lon": 83.00, "distance_from_center_km": 1, "risk_level": "HIGH"},
        {"name": "Varuna River", "type": "River", "lat": 25.38, "lon": 82.97, "distance_from_center_km": 8, "risk_level": "HIGH"},
        {"name": "Assi River", "type": "River", "lat": 25.28, "lon": 83.00, "distance_from_center_km": 5, "risk_level": "HIGH"},
        {"name": "Rajghat Barrage", "type": "Dam", "distance_from_center_km": 15, "risk_level": "MEDIUM"},
    ],
    "Lucknow": [
        {"name": "Gomti River", "type": "River", "lat": 26.88, "lon": 80.98, "distance_from_center_km": 3, "risk_level": "HIGH"},
        {"name": "Kukrail River", "type": "River", "lat": 26.92, "lon": 81.05, "distance_from_center_km": 8, "risk_level": "HIGH"},
        {"name": "Sai River", "type": "River", "distance_from_center_km": 25, "risk_level": "MEDIUM"},
        {"name": "Sharda Canal", "type": "Canal", "lat": 27.05, "lon": 80.75, "distance_from_center_km": 18, "risk_level": "MEDIUM"},
    ],
    "Ahmedabad": [
        {"name": "Sabarmati River", "type": "River", "distance_from_center_km": 3, "risk_level": "HIGH"},
        {"name": "Kharicut Canal", "type": "Canal", "distance_from_center_km": 10, "risk_level": "MEDIUM"},
        {"name": "Vatrak River", "type": "River", "distance_from_center_km": 28, "risk_level": "LOW"},
        {"name": "Dharoi Dam", "type": "Dam", "distance_from_center_km": 95, "risk_level": "LOW"},
    ],
    "Ernakulam": [
        {"name": "Periyar River", "type": "River", "distance_from_center_km": 8, "risk_level": "HIGH"},
        {"name": "Idamalayar Reservoir", "type": "Reservoir", "distance_from_center_km": 42, "risk_level": "LOW"},
        {"name": "Vembanad Lake", "type": "Lake", "distance_from_center_km": 5, "risk_level": "HIGH"},
        {"name": "Muvattupuzha River", "type": "River", "distance_from_center_km": 15, "risk_level": "MEDIUM"},
    ],
    "Thrissur": [
        {"name": "Bharathapuzha River", "type": "River", "distance_from_center_km": 5, "risk_level": "HIGH"},
        {"name": "Chalakudy River", "type": "River", "distance_from_center_km": 10, "risk_level": "HIGH"},
        {"name": "Peechi Dam", "type": "Dam", "distance_from_center_km": 20, "risk_level": "MEDIUM"},
        {"name": "Karuvannur River", "type": "River", "distance_from_center_km": 8, "risk_level": "HIGH"},
    ],
    "Cuttack": [
        {"name": "Mahanadi River", "type": "River", "lat": 20.46, "lon": 85.88, "distance_from_center_km": 2, "risk_level": "HIGH"},
        {"name": "Kathajodi River", "type": "River", "lat": 20.48, "lon": 85.90, "distance_from_center_km": 4, "risk_level": "HIGH"},
        {"name": "Hirakud Reservoir", "type": "Reservoir", "distance_from_center_km": 120, "risk_level": "LOW"},
        {"name": "Birupa River", "type": "River", "lat": 20.55, "lon": 86.10, "distance_from_center_km": 18, "risk_level": "MEDIUM"},
    ],
}

DEFAULT_WATER_BODIES = [
    {"name": "District River System", "type": "River", "distance_from_center_km": 10, "risk_level": "MEDIUM", "lat": None, "lon": None},
    {"name": "Local Irrigation Canal", "type": "Canal", "distance_from_center_km": 15, "risk_level": "LOW", "lat": None, "lon": None},
    {"name": "Regional Reservoir", "type": "Reservoir", "distance_from_center_km": 30, "risk_level": "LOW", "lat": None, "lon": None},
]


def get_water_infrastructure(district: str, state: str, district_lat: float, district_lon: float) -> dict:
    """Returns static water infrastructure data with no external API calls."""
    base = WATER_BODIES_DB.get(district, DEFAULT_WATER_BODIES)
    features = []
    for idx, row in enumerate(base):
        lat = row.get("lat")
        lon = row.get("lon")
        if lat is None or lon is None:
            lat = round((district_lat or 0) + 0.1 + (idx * 0.02), 4)
            lon = round((district_lon or 0) + 0.15 + (idx * 0.02), 4)
        features.append({**row, "lat": lat, "lon": lon})
    return {
        "available": True,
        "source": "static_reference_db",
        "district": district,
        "state": state,
        "features": features,
    }


# ── Main endpoint ────────────────────────────────────────────────

def _build_alert_detail_payload(state_name: str, district_name: str) -> dict:
    """Build alert detail payload without external water infrastructure call."""
    df = get_df()
    state_upper = state_name.strip().upper()
    district_key = district_name.strip()

    # Find district row (case-insensitive match)
    mask = (df["State"] == state_upper) & (
        df["District"].str.upper() == district_key.upper()
    )
    subset = df[mask]

    if subset.empty:
        raise HTTPException(
            status_code=404,
            detail=f"District '{district_name}' not found in state '{state_name}'",
        )

    row = subset.iloc[0]
    district = _row_to_full_dict(row)

    # ── Weather simulation → prediction ──
    sim = simulate_weather_for_district(district)
    rain = sim["current"]["rainfall_1hr_mm"]
    fc24 = sim["forecast"]["next_24hr_rain_mm"]
    hist_avg_daily = district.get("monsoon_avg_daily_rain_mm", 1)
    anomaly = rain / max(hist_avg_daily, 0.01)
    adjusted_sev = min(10.0, district["severity_score"] * (0.7 + 0.3 * min(anomaly, 3.0)))

    sev_class = "CRITICAL" if adjusted_sev >= 8 else "HIGH" if adjusted_sev >= 6 else "MEDIUM" if adjusted_sev >= 4 else "LOW"

    prediction = {
        "predicted_severity_score": round(adjusted_sev, 2),
        "severity_class": sev_class,
        "current_rainfall_mm": round(rain, 1),
        "rainfall_anomaly_ratio": round(anomaly, 2),
        "forecast_24hr_mm": round(fc24, 1),
    }

    # ── Alert object ──
    alert = {
        "level": sev_class,
        "title": f"{'EXTREME FLOOD RISK' if adjusted_sev >= 8 else 'HIGH FLOOD ALERT' if adjusted_sev >= 6 else 'MODERATE FLOOD RISK' if adjusted_sev >= 4 else 'LOW RISK'}",
        "severity_score": round(adjusted_sev, 2),
        "rainfall_mm": round(rain, 1),
        "forecast_24hr_mm": round(fc24, 1),
        "triggered_at": datetime.now(timezone.utc).isoformat(),
        "flood_probability": round(min(100, adjusted_sev * 11 + anomaly * 5), 1),
    }

    # ── Resources ──
    required = compute_required_resources(district, adjusted_sev)
    available = compute_available_resources(district)

    total_req = sum(required.get(k, 0) for k in ["rescue_teams", "boats", "medical_units", "relief_camps", "helicopters"])
    total_avail = sum(available.get(k, 0) for k in ["rescue_teams", "boats", "medical_units", "relief_camps", "helicopters"])
    gap_pct = round(max(0, (total_req - total_avail)) / max(total_req, 1) * 100, 1)

    status = "DISPATCH_READY" if gap_pct < 20 else ("PARTIAL" if gap_pct < 50 else "INSUFFICIENT")

    resources = {
        "required": required,
        "available": available,
        "gap_pct": gap_pct,
        "status": status,
    }

    # ── Cost breakdown ──
    dispatch_center = find_nearest_dispatch(
        district.get("latitude", 0), district.get("longitude", 0), state_upper
    )
    dist_km, eta_hrs = compute_transport(
        dispatch_center["lat"], dispatch_center["lon"],
        district.get("latitude", 0), district.get("longitude", 0),
    )
    affected_pop = int(district.get("impact_population", 0) * adjusted_sev / 10)
    total_teams = sum(max(0, required.get(k, 0) - available.get(k, 0))
                      for k in ["rescue_teams", "boats", "medical_units", "relief_camps", "helicopters"])

    transport_cost = int(dist_km * 10)
    labor_cost = int(total_teams * 500)
    relief_cost = int(affected_pop * 2)
    total_cost = transport_cost + labor_cost + relief_cost

    cost_breakdown = {
        "transport_cost": transport_cost,
        "labor_cost": labor_cost,
        "relief_cost": relief_cost,
        "total": total_cost,
        "dispatch_from": dispatch_center["name"],
        "dispatch_distance_km": dist_km,
        "dispatch_eta_hrs": eta_hrs,
    }

    # ── Prediction explanation ──
    explanation = generate_prediction_explanation(district, prediction)

    # ── Recommended actions ──
    actions = generate_recommended_actions(district, resources, prediction)
    water_data = get_water_infrastructure(
        district["district"],
        state_upper,
        district.get("latitude", 0),
        district.get("longitude", 0),
    )

    return {
        "district": district["district"],
        "state": state_upper,
        "latitude": district.get("latitude", 0),
        "longitude": district.get("longitude", 0),
        "alert": alert,
        "historical": district,
        "prediction": prediction,
        "resources": resources,
        "cost_breakdown": cost_breakdown,
        "prediction_explanation": explanation,
        "recommended_actions": actions,
        "water_infrastructure": water_data,
    }


@router.get("/alert-detail/{state_name}/{district_name}")
def get_alert_detail(state_name: str, district_name: str):
    """Return core district alert detail payload quickly."""
    return _build_alert_detail_payload(state_name, district_name)
