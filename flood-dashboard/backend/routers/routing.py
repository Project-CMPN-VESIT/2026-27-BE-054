"""Routing router — POST /api/route."""

from fastapi import APIRouter
from pydantic import BaseModel
from services.routing_service import compute_route

router = APIRouter(prefix="/api", tags=["routing"])


class RoutePoint(BaseModel):
    name: str = ""
    lat: float
    lon: float


class RouteRequest(BaseModel):
    from_point: RoutePoint
    to_point: RoutePoint
    vehicle_type: str = "truck"
    team_size: int = 5
    affected_pop: int = 10000


@router.post("/route")
async def get_route(req: RouteRequest):
    """Compute route between two points."""
    result = await compute_route(
        req.from_point.lat, req.from_point.lon,
        req.to_point.lat, req.to_point.lon,
        req.vehicle_type,
        req.team_size,
        req.affected_pop,
    )
    result["from"] = {"name": req.from_point.name, "lat": req.from_point.lat, "lon": req.from_point.lon}
    result["to"] = {"name": req.to_point.name, "lat": req.to_point.lat, "lon": req.to_point.lon}
    return {"route": result}
