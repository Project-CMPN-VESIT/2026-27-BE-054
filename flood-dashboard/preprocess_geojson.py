"""Preprocess and simplify the India districts GeoJSON for the frontend.

Reduces file size by simplifying geometries and matching district names
between the GeoJSON and the CSV dataset.
"""

import json
import pandas as pd
import re
import sys


def simplify_coords(coords, tolerance=0.01):
    """Crude Douglas-Peucker-like simplification via point skipping."""
    if len(coords) <= 4:
        return coords
    step = max(1, len(coords) // 80)  # Keep ~80 points per ring
    simplified = coords[::step]
    # Always include the last point to close the ring
    if simplified[-1] != coords[-1]:
        simplified.append(coords[-1])
    return simplified


def simplify_geometry(geometry):
    """Simplify polygon/multipolygon geometries."""
    if geometry["type"] == "Polygon":
        return {
            "type": "Polygon",
            "coordinates": [simplify_coords(ring) for ring in geometry["coordinates"]],
        }
    elif geometry["type"] == "MultiPolygon":
        return {
            "type": "MultiPolygon",
            "coordinates": [
                [simplify_coords(ring) for ring in polygon]
                for polygon in geometry["coordinates"]
            ],
        }
    return geometry


def normalize_name(name):
    """Normalize district/state name for matching."""
    if not name:
        return ""
    n = name.upper().strip()
    # Common substitutions
    n = re.sub(r"\s+", " ", n)
    n = n.replace("*", "").replace("'", "")
    return n


def build_name_variants(name):
    """Generate multiple name variants for fuzzy matching."""
    n = normalize_name(name)
    variants = {n}
    # Remove parenthetical suffixes
    variants.add(re.sub(r"\s*\(.*\)", "", n))
    # Common spelling alternates
    replacements = {
        "PUR": "PORE", "PORE": "PUR",
        "NAGAR": "NAGARA",
        "GARH": "GAR",
        "BASTI": "BASTIA",
        "EAST ": "E ", "WEST ": "W ", "NORTH ": "N ", "SOUTH ": "S ",
    }
    for old, new in replacements.items():
        if old in n:
            variants.add(n.replace(old, new))
    return variants


def main():
    geo_path = r"frontend\public\india_districts.geojson"
    csv_path = r"backend\data\national_unified_dataset.csv"
    out_path = r"frontend\public\india_districts_simplified.geojson"
    out_path_backend = r"backend\data\india_districts_simplified.geojson"

    print("Loading GeoJSON...")
    with open(geo_path, "r") as f:
        geo = json.load(f)

    print("Loading CSV...")
    df = pd.read_csv(csv_path)
    df["District_Norm"] = df["District"].apply(normalize_name)
    df["State_Norm"] = df["State"].apply(normalize_name)

    # Build lookup: (state_norm, district_norm) -> row
    csv_lookup = {}
    for _, row in df.iterrows():
        csv_lookup[(row["State_Norm"], row["District_Norm"])] = row

    # Also build district-only lookup for broader matching
    district_lookup = {}
    for _, row in df.iterrows():
        dn = row["District_Norm"]
        if dn not in district_lookup:
            district_lookup[dn] = row

    # State name mapping (GeoJSON -> CSV)
    state_map = {
        "ANDAMAN AND NICOBAR": "ANDAMAN & NICOBAR",
        "ANDHRA PRADESH": "ANDHRA PRADESH",
        "ARUNACHAL PRADESH": "ARUNACHAL PRADESH",
        "ASSAM": "ASSAM",
        "BIHAR": "BIHAR",
        "CHANDIGARH": "CHANDIGARH",
        "CHHATTISGARH": "CHHATTISGARH",
        "DADRA AND NAGAR HAVELI": "DADRA & NAGAR HAVE",
        "DAMAN AND DIU": "DAMAN & DIU",
        "NCT OF DELHI": "DELHI",
        "GOA": "GOA",
        "GUJARAT": "GUJARAT",
        "HARYANA": "HARYANA",
        "HIMACHAL PRADESH": "HIMACHAL PRADESH",
        "JAMMU AND KASHMIR": "JAMMU & KASHMIR",
        "JHARKHAND": "JHARKHAND",
        "KARNATAKA": "KARNATAKA",
        "KERALA": "KERALA",
        "LAKSHADWEEP": "LAKSHADWEEP",
        "MADHYA PRADESH": "MADHYA PRADESH",
        "MAHARASHTRA": "MAHARASHTRA",
        "MANIPUR": "MANIPUR",
        "MEGHALAYA": "MEGHALAYA",
        "MIZORAM": "MIZORAM",
        "NAGALAND": "NAGALAND",
        "ORISSA": "ODISHA",
        "ODISHA": "ODISHA",
        "PUDUCHERRY": "PUDUCHERRY",
        "PONDICHERRY": "PUDUCHERRY",
        "PUNJAB": "PUNJAB",
        "RAJASTHAN": "RAJASTHAN",
        "SIKKIM": "SIKKIM",
        "TAMIL NADU": "TAMIL NADU",
        "TELANGANA": "TELANGANA",
        "TRIPURA": "TRIPURA",
        "UTTARANCHAL": "UTTARAKHAND",
        "UTTARAKHAND": "UTTARAKHAND",
        "UTTAR PRADESH": "UTTAR PRADESH",
        "WEST BENGAL": "WEST BENGAL",
    }

    # Explicit district name overrides: GeoJSON NAME_2 -> CSV District
    DISTRICT_NAME_MAP = {
        # Maharashtra
        "GREATER BOMBAY": "MUMBAI",
        "BOMBAY": "MUMBAI",
        "GARHCHIROLI": "GADCHIROLI",
        "AHMEDNAGAR": "AHMADNAGAR",
        # Other states as needed
        "BALESHWAR": "BALASORE",
        "HAORA": "HOWRAH",
        "HUGLI": "HOOGHLY",
        "KOCH BIHAR": "COOCH BEHAR",
        "DARJILING": "DARJEELING",
    }

    features_out = []
    matched = 0
    unmatched_geo = []

    for feat in geo["features"]:
        props = feat["properties"]
        geo_state = normalize_name(props.get("NAME_1", ""))
        geo_district = normalize_name(props.get("NAME_2", ""))

        csv_state = state_map.get(geo_state, geo_state)

        # Apply explicit name override first
        mapped_district = DISTRICT_NAME_MAP.get(geo_district, geo_district)

        # Try exact match with mapped name
        row = csv_lookup.get((csv_state, mapped_district))

        # Try original name if mapped didn't work
        if row is None and mapped_district != geo_district:
            row = csv_lookup.get((csv_state, geo_district))

        # Try district-only match
        if row is None:
            row = district_lookup.get(mapped_district)
        if row is None and mapped_district != geo_district:
            row = district_lookup.get(geo_district)

        # Try variant matching
        if row is None:
            all_names = {geo_district, mapped_district}
            for name in all_names:
                variants = build_name_variants(name)
                for v in variants:
                    row = csv_lookup.get((csv_state, v))
                    if row is not None:
                        break
                    row = district_lookup.get(v)
                    if row is not None:
                        break
                if row is not None:
                    break

        if row is not None:
            matched += 1
            severity = float(row.get("Severity_Score", 0)) if pd.notna(row.get("Severity_Score")) else 0
            severity_class = row.get("Severity_Class", "LOW")
            if pd.isna(severity_class):
                severity_class = "LOW"

            new_feat = {
                "type": "Feature",
                "properties": {
                    "district": str(row.get("District", geo_district)),
                    "state": csv_state,
                    "severity": round(severity, 2),
                    "severity_class": severity_class,
                },
                "geometry": simplify_geometry(feat["geometry"]),
            }
            features_out.append(new_feat)
        else:
            unmatched_geo.append(f"{geo_district} ({geo_state})")

    output = {"type": "FeatureCollection", "features": features_out}

    with open(out_path, "w") as f:
        json.dump(output, f, separators=(",", ":"))

    with open(out_path_backend, "w") as f:
        json.dump(output, f, separators=(",", ":"))

    size_mb = len(json.dumps(output, separators=(",", ":"))) / 1_000_000
    print(f"\nMatched: {matched} / {len(geo['features'])} GeoJSON features")
    print(f"Unmatched: {len(unmatched_geo)}")
    print(f"Output size: {size_mb:.1f} MB")
    print(f"Saved to: {out_path}")

    if unmatched_geo[:10]:
        print(f"\nFirst 10 unmatched GeoJSON districts:")
        for u in unmatched_geo[:10]:
            print(f"  {u}")


if __name__ == "__main__":
    main()
