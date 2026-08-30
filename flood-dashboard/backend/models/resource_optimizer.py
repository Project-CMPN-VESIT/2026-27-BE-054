"""Resource optimizer — greedy allocation with gap analysis."""

import math
from config import get_dispatch_centers


def _haversine(lat1, lon1, lat2, lon2) -> float:
    """Haversine distance in km."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def compute_available_resources(district: dict) -> dict:
    urban_factor = 1.5 if district.get("urban_rural_ratio", 0) > 0.5 else 1.0
    base = district.get("population", 100000) * 0.001
    available = base * urban_factor
    return {
        "rescue_teams": max(1, int(available / 50)),
        "boats": max(1, int(available / 200)),
        "medical_units": max(1, int(available / 100)),
        "relief_camps": max(1, int(available / 500)),
        "helicopters": max(1, int(available / 2000)),
        "total_units": max(1, int(available)),
    }


def compute_required_resources(district: dict, predicted_severity: float) -> dict:
    affected_pop = district.get("impact_population", 100000) * (predicted_severity / 10.0)
    return {
        "rescue_teams": max(1, int(affected_pop / 1000)),
        "boats": max(1, int(affected_pop / 5000)),
        "medical_units": max(1, int(affected_pop / 2000)),
        "relief_camps": max(1, int(affected_pop / 10000)),
        "helicopters": max(2, int(affected_pop / 50000)),
        "total_units": max(1, int(affected_pop / 100)),
    }


def compute_transport(from_lat, from_lon, to_lat, to_lon) -> tuple[float, float]:
    distance_km = _haversine(from_lat, from_lon, to_lat, to_lon) * 1.3  # road factor
    time_hrs = distance_km / 40  # 40 km/h avg
    return round(distance_km, 1), round(time_hrs, 2)


def compute_cost(distance_km: float, team_size: int, affected_pop: int) -> int:
    transport = distance_km * 10
    labor = team_size * 500
    relief = affected_pop * 2
    return int(transport + labor + relief)


def find_nearest_dispatch(lat: float, lon: float, state: str) -> dict:
    """Find nearest dispatch center for a district."""
    centers = get_dispatch_centers(state)
    best = centers[0]
    best_dist = float("inf")
    for c in centers:
        d = _haversine(lat, lon, c["lat"], c["lon"])
        if d < best_dist:
            best_dist = d
            best = c
    return best


def optimize_allocation(districts: list[dict], predictions: dict[str, float], state: str) -> dict:
    """Greedy priority-queue allocation across all districts in a state.

    Returns allocation plan with per-district breakdown, totals, and coverage.
    """
    # State-level resource pool = sum of all district resources × 1.5
    pool = {"rescue_teams": 0, "boats": 0, "medical_units": 0, "relief_camps": 0, "helicopters": 0}
    for d in districts:
        avail = compute_available_resources(d)
        for k in pool:
            pool[k] += avail.get(k, 0)
    # Expand pool (state-level reserves)
    pool = {k: int(v * 1.5) for k, v in pool.items()}
    remaining = dict(pool)

    # Sort by predicted severity DESC
    sorted_districts = sorted(
        districts,
        key=lambda d: predictions.get(d.get("district", ""), d.get("severity_score", 0)),
        reverse=True,
    )

    plan = []
    total_cost = 0
    met_count = 0
    unmet = []

    for rank, d in enumerate(sorted_districts, 1):
        name = d.get("district", "Unknown")
        sev = predictions.get(name, d.get("severity_score", 0))
        required = compute_required_resources(d, sev)
        available = compute_available_resources(d)

        # Compute gap and allocate from pool
        allocated = {}
        gap_total = 0
        req_total = 0
        for res_key in ["rescue_teams", "boats", "medical_units", "relief_camps", "helicopters"]:
            gap = max(0, required[res_key] - available[res_key])
            alloc = min(gap, remaining.get(res_key, 0))
            allocated[res_key] = alloc
            remaining[res_key] = max(0, remaining.get(res_key, 0) - alloc)
            gap_total += max(0, gap - alloc)
            req_total += required[res_key]

        gap_pct = round(gap_total / max(req_total, 1) * 100, 1)

        # Transport
        dispatch_center = find_nearest_dispatch(d.get("latitude", 0), d.get("longitude", 0), state)
        dist_km, eta_hrs = compute_transport(dispatch_center["lat"], dispatch_center["lon"], d.get("latitude", 0), d.get("longitude", 0))

        affected_pop = int(d.get("impact_population", 0) * sev / 10)
        cost = compute_cost(dist_km, sum(allocated.values()), affected_pop)
        total_cost += cost

        status = "DISPATCH_READY" if gap_pct < 20 else ("PARTIAL" if gap_pct < 50 else "INSUFFICIENT")
        if gap_pct >= 50:
            unmet.append(name)
        else:
            met_count += 1

        plan.append({
            "district": name,
            "priority_rank": rank,
            "predicted_severity": round(sev, 2),
            "required": required,
            "available": available,
            "allocated_from_pool": allocated,
            "resource_gap_pct": gap_pct,
            "estimated_cost_inr": cost,
            "dispatch_eta_hrs": eta_hrs,
            "dispatch_distance_km": dist_km,
            "dispatch_from": dispatch_center["name"],
            "dispatch_lat": dispatch_center["lat"],
            "dispatch_lon": dispatch_center["lon"],
            "status": status,
        })

    coverage = round(met_count / max(len(districts), 1) * 100, 1)

    return {
        "total_pool": pool,
        "allocation_plan": plan,
        "total_cost_inr": total_cost,
        "coverage_pct": coverage,
        "unmet_districts": unmet,
    }
