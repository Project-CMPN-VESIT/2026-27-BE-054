"""States router — state listing, district listing, state summary."""

from fastapi import APIRouter, HTTPException
import pandas as pd
import numpy as np
from config import DATA_PATH

router = APIRouter(prefix="/api", tags=["states"])

# ── Global data store ────────────────────────────────────────────
_df: pd.DataFrame = pd.DataFrame()
_states_cache: list[str] = []

# ── Known invalid coordinates that need fixing (longitude > 180 or weird values) ────────
COORDINATE_FIXES = {
    ('MUMBAI', 'MAHARASHTRA'): (19.0760, 72.8777),
    ('MUMBAI SUBURBAN', 'MAHARASHTRA'): (19.2183, 73.1305),
    ('AURANGABAD', 'MAHARASHTRA'): (19.8762, 75.3433),
    ('AHMADNAGAR', 'MAHARASHTRA'): (19.0968, 74.8851),
    ('RAIGARH', 'MAHARASHTRA'): (21.7906, 75.5273),
    ('PRATAPGARH', 'UTTAR PRADESH'): (25.7104, 81.8050),
}


def clean_district_name(name: str) -> str:
    """Clean district name - handle common issues."""
    if not name:
        return name
    return name.strip().replace('*', '').strip()


def fix_invalid_coordinates(df: pd.DataFrame) -> pd.DataFrame:
    """Fix rows with invalid coordinates (longitude > 180 or < -180)."""
    df = df.copy()
    
    invalid_mask = (df['Longitude'].abs() > 180) | (df['Longitude'].isna())
    if invalid_mask.any():
        print(f"[Data] Found {invalid_mask.sum()} rows with invalid coordinates")
        
        # Apply manual fixes
        for (district, state), (lat, lon) in COORDINATE_FIXES.items():
            mask = (df['District'].str.strip() == district) & (df['State'].str.upper() == state.upper())
            if mask.any():
                df.loc[mask, 'Latitude'] = lat
                df.loc[mask, 'Longitude'] = lon
                print(f"[Data] Fixed {district}, {state}: ({lat}, {lon})")
        
        # Final validation - any still invalid, drop
        still_invalid = (df['Longitude'].abs() > 180) | (df['Longitude'].isna())
        if still_invalid.any():
            print(f"[Data] Dropping {still_invalid.sum()} rows with still-invalid coordinates")
            df = df[~still_invalid]
    
    return df


def deduplicate_districts(df: pd.DataFrame) -> pd.DataFrame:
    """Remove duplicate district entries; keep row with highest population."""
    df = df.copy()
    
    # Group by district + state
    duplicates = df.groupby(['District', 'State']).size()
    has_dups = duplicates[duplicates > 1]
    
    if len(has_dups) > 0:
        print(f"[Data] Found {len(has_dups)} duplicated districts")
        
        # Keep row with highest population for each district+state combo
        df = df.sort_values(['District', 'State', 'Population'], ascending=[True, True, False])
        df = df.drop_duplicates(['District', 'State'], keep='first')
        print(f"[Data] After deduplication: {len(df)} unique districts")
    
    return df


def load_data():
    """Load CSV once at startup; fill NaN with column medians."""
    global _df, _states_cache
    _df = pd.read_csv(DATA_PATH)

    # Normalize names
    _df["State"] = _df["State"].str.strip().str.upper()
    _df["District"] = _df["District"].apply(clean_district_name)

    # Fix invalid coordinates
    _df = fix_invalid_coordinates(_df)
    
    # Deduplicate districts
    _df = deduplicate_districts(_df)

    # Fill numeric NaN with column medians
    numeric_cols = _df.select_dtypes(include=[np.number]).columns
    _df[numeric_cols] = _df[numeric_cols].fillna(_df[numeric_cols].median())

    # Cache sorted state list
    _states_cache = sorted(_df["State"].unique().tolist())
    print(f"[Data] Loaded {len(_df)} unique districts across {len(_states_cache)} states")


def get_df() -> pd.DataFrame:
    return _df


def get_states_list() -> list[str]:
    return _states_cache


# ── Endpoints ────────────────────────────────────────────────────

@router.get("/states")
def list_states():
    """Return sorted list of all unique states."""
    return {"states": get_states_list()}


@router.get("/states/{state_name}/districts")
def get_state_districts(state_name: str):
    """Return all districts in a state with their full data."""
    state_upper = state_name.strip().upper()
    subset = _df[_df["State"] == state_upper]
    if subset.empty:
        raise HTTPException(status_code=404, detail=f"State '{state_name}' not found")

    districts = []
    for _, row in subset.iterrows():
        districts.append({
            "district": row["District"],
            "latitude": _safe_float(row.get("Latitude")),
            "longitude": _safe_float(row.get("Longitude")),
            "severity_score": _safe_float(row.get("Severity_Score")),
            "severity_class": row.get("Severity_Class", "LOW"),
            "national_priority_rank": int(row.get("National_Priority_Rank", 999)),
            "resource_gap_score": _safe_float(row.get("Resource_Gap_Score")),
            "population": _safe_int(row.get("Population")),
            "impact_population": min(_safe_int(row.get("Impact_Population")), _safe_int(row.get("Population"))),
            "monsoon_rain_mm": _safe_float(row.get("Monsoon_Normal_Rain_mm")),
            "annual_rain_mm": _safe_float(row.get("Annual_Normal_Rain_mm")),
            "flood_freq_per_year": _safe_float(row.get("Flood_Freq_Per_Year")),
            "pct_flooded_area": _safe_float(row.get("Pct_Flooded_Area")),
            "total_deaths": _safe_int(row.get("District_Deaths")),
            "avg_duration_days": _safe_float(row.get("Avg_Duration_Days")),
            "dfsi_score": _safe_float(row.get("DFSI_Score")),
            "flood_prone": bool(row.get("Flood_Prone_State", 0)),
            "total_flood_events": _safe_int(row.get("Total_Flood_Events")),
            "urban_rural_ratio": _safe_float(row.get("Urban_Rural_Ratio")),
            "literacy_rate": _safe_float(row.get("Literacy_Rate")),
            "monsoon_avg_daily_rain_mm": _safe_float(row.get("Monsoon_Avg_Daily_Rain_mm")),
            "monsoon_max_daily_rain_mm": _safe_float(row.get("Monsoon_Max_Daily_Rain_mm")),
            "annual_avg_daily_rain_mm": _safe_float(row.get("Annual_Avg_Daily_Rain_mm")),
        })

    return {
        "state": state_upper,
        "district_count": len(districts),
        "districts": districts,
    }


@router.get("/states/{state_name}/summary")
def get_state_summary(state_name: str):
    """Return aggregate statistics for a state."""
    state_upper = state_name.strip().upper()
    subset = _df[_df["State"] == state_upper]
    if subset.empty:
        raise HTTPException(status_code=404, detail=f"State '{state_name}' not found")

    sev = subset["Severity_Score"]
    high_count = int((sev >= 6.0).sum())
    medium_count = int(((sev >= 4.0) & (sev < 6.0)).sum())
    low_count = int((sev < 4.0).sum())

    return {
        "state": state_upper,
        "total_districts": len(subset),
        "high_risk_count": high_count,
        "medium_risk_count": medium_count,
        "low_risk_count": low_count,
        "total_population": _safe_int(subset["Population"].sum()),
        "total_affected_population": _safe_int(
            subset[["Impact_Population", "Population"]].min(axis=1).sum()
        ),
        "avg_severity_score": round(float(sev.mean()), 2),
        "max_severity_score": round(float(sev.max()), 2),
        "total_resource_gap": round(float(subset["Resource_Gap_Score"].sum()), 2),
        "avg_flood_freq": round(float(subset["Flood_Freq_Per_Year"].mean()), 3),
        "state_priority_rank": round(float(subset["National_Priority_Rank"].mean()), 1),
        "total_deaths": _safe_int(subset["District_Deaths"].sum()),
    }


# ── Helpers ──────────────────────────────────────────────────────

def _safe_float(v, default=0.0) -> float:
    try:
        f = float(v)
        return round(f, 4) if not (np.isnan(f) or np.isinf(f)) else default
    except (TypeError, ValueError):
        return default


def _safe_int(v, default=0) -> int:
    try:
        f = float(v)
        return int(f) if not (np.isnan(f) or np.isinf(f)) else default
    except (TypeError, ValueError):
        return default
