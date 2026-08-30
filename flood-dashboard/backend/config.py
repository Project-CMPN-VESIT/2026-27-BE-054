"""Configuration module — loads env vars and defines constants."""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── Paths ────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / os.getenv("DATA_PATH", "data/national_unified_dataset.csv")
MODEL_PATH = BASE_DIR / "models" / "flood_model.joblib"

# ── API Keys ─────────────────────────────────────────────────────
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
ORS_API_KEY = os.getenv("ORS_API_KEY", "")

# ── Server ───────────────────────────────────────────────────────
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

# ── Constants ────────────────────────────────────────────────────
SEVERITY_THRESHOLDS = {
    "CRITICAL": 8.0,
    "HIGH": 6.0,
    "MEDIUM": 4.0,
    "LOW": 2.0,
    "MINIMAL": 0.0,
}

RISK_LABELS = {
    "CRITICAL": "IMMEDIATE DEPLOYMENT REQUIRED",
    "HIGH": "Deploy within 6 hours",
    "MEDIUM": "Monitor + pre-position resources",
    "LOW": "Alert issued — standby",
    "MINIMAL": "No action required",
}

# ── Dispatch Centers (state capital + major cities) ──────────────
DISPATCH_CENTERS = {
    "BIHAR": [
        {"name": "Patna HQ", "lat": 25.6100, "lon": 85.1400},
        {"name": "Muzaffarpur", "lat": 26.1200, "lon": 85.3700},
        {"name": "Gaya", "lat": 24.7800, "lon": 85.0000},
        {"name": "Bhagalpur", "lat": 25.2500, "lon": 86.9800},
        {"name": "Darbhanga", "lat": 26.1500, "lon": 85.9000},
    ],
    "ASSAM": [
        {"name": "Guwahati HQ", "lat": 26.1445, "lon": 91.7362},
        {"name": "Dibrugarh", "lat": 27.4728, "lon": 94.9120},
        {"name": "Silchar", "lat": 24.8333, "lon": 92.7789},
        {"name": "Jorhat", "lat": 26.7509, "lon": 94.2037},
        {"name": "Tezpur", "lat": 26.6338, "lon": 92.8006},
    ],
    "UTTAR PRADESH": [
        {"name": "Lucknow HQ", "lat": 26.8467, "lon": 80.9462},
        {"name": "Varanasi", "lat": 25.3176, "lon": 82.9739},
        {"name": "Gorakhpur", "lat": 26.7606, "lon": 83.3732},
        {"name": "Allahabad", "lat": 25.4358, "lon": 81.8463},
        {"name": "Agra", "lat": 27.1767, "lon": 78.0081},
    ],
    "WEST BENGAL": [
        {"name": "Kolkata HQ", "lat": 22.5726, "lon": 88.3639},
        {"name": "Siliguri", "lat": 26.7271, "lon": 88.3953},
        {"name": "Durgapur", "lat": 23.5204, "lon": 87.3119},
        {"name": "Malda", "lat": 25.0108, "lon": 88.1411},
        {"name": "Howrah", "lat": 22.5958, "lon": 88.2636},
    ],
    "ODISHA": [
        {"name": "Bhubaneswar HQ", "lat": 20.2961, "lon": 85.8245},
        {"name": "Cuttack", "lat": 20.4625, "lon": 85.8830},
        {"name": "Berhampur", "lat": 19.3150, "lon": 84.7941},
        {"name": "Sambalpur", "lat": 21.4669, "lon": 83.9812},
        {"name": "Rourkela", "lat": 22.2604, "lon": 84.8536},
    ],
}

# Fallback: state capital coordinates for states not in DISPATCH_CENTERS
STATE_CAPITALS = {
    "GUJARAT": {"lat": 23.0225, "lon": 72.5714},
    "RAJASTHAN": {"lat": 26.9124, "lon": 75.7873},
    "MADHYA PRADESH": {"lat": 23.2599, "lon": 77.4126},
    "ANDHRA PRADESH": {"lat": 16.5062, "lon": 80.6480},
    "TELANGANA": {"lat": 17.3850, "lon": 78.4867},
    "MAHARASHTRA": {"lat": 19.0760, "lon": 72.8777},
    "PUNJAB": {"lat": 30.7333, "lon": 76.7794},
    "HARYANA": {"lat": 30.7333, "lon": 76.7794},
    "HIMACHAL PRADESH": {"lat": 31.1048, "lon": 77.1734},
    "JAMMU & KASHMIR": {"lat": 34.0837, "lon": 74.7973},
    "UTTARAKHAND": {"lat": 30.3165, "lon": 78.0322},
    "JHARKHAND": {"lat": 23.3441, "lon": 85.3096},
    "CHHATTISGARH": {"lat": 21.2514, "lon": 81.6296},
    "KERALA": {"lat": 8.5241, "lon": 76.9366},
    "TAMIL NADU": {"lat": 13.0827, "lon": 80.2707},
    "KARNATAKA": {"lat": 12.9716, "lon": 77.5946},
    "GOA": {"lat": 15.4909, "lon": 73.8278},
    "DELHI": {"lat": 28.7041, "lon": 77.1025},
    "MANIPUR": {"lat": 24.8170, "lon": 93.9368},
    "NAGALAND": {"lat": 25.6751, "lon": 94.1086},
    "MEGHALAYA": {"lat": 25.5788, "lon": 91.8933},
    "TRIPURA": {"lat": 23.9408, "lon": 91.9882},
    "MIZORAM": {"lat": 23.1645, "lon": 92.9376},
    "ARUNACHAL PRADESH": {"lat": 27.0844, "lon": 93.6053},
    "SIKKIM": {"lat": 27.3389, "lon": 88.6065},
    "PUDUCHERRY": {"lat": 11.9416, "lon": 79.8083},
    "ANDAMAN & NICOBAR": {"lat": 11.7401, "lon": 92.6586},
    "LAKSHADWEEP": {"lat": 10.5667, "lon": 72.6417},
    "DAMAN & DIU": {"lat": 20.3974, "lon": 72.8328},
    "BIHAR": {"lat": 25.6100, "lon": 85.1400},
    "ASSAM": {"lat": 26.1445, "lon": 91.7362},
    "UTTAR PRADESH": {"lat": 26.8467, "lon": 80.9462},
    "WEST BENGAL": {"lat": 22.5726, "lon": 88.3639},
    "ODISHA": {"lat": 20.2961, "lon": 85.8245},
}


def get_dispatch_centers(state: str) -> list:
    """Return dispatch centers for a state; auto-generate from capital if missing."""
    state_upper = state.upper().strip()
    if state_upper in DISPATCH_CENTERS:
        return DISPATCH_CENTERS[state_upper]
    cap = STATE_CAPITALS.get(state_upper, {"lat": 22.0, "lon": 78.0})
    return [{"name": f"{state.title()} State HQ", "lat": cap["lat"], "lon": cap["lon"]}]
