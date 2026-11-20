"""DRMS Flood Dashboard — FastAPI Application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import CORS_ORIGINS
from routers.states import load_data
from routers.geojson import load_geojson
from models.flood_predictor import load_model
from services.weather_service import verify_api_key


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: load CSV data + ML model + GeoJSON boundaries + verify API keys."""
    load_data()
    load_model()
    load_geojson()
    # Verify weather API key (runs retry loop in background if needed)
    import asyncio
    asyncio.create_task(verify_api_key())
    yield


app = FastAPI(
    title="Disaster Relief Management System (DRMS)",
    description="Real-Time Flood Forecasting + Severity Mapping + Resource Optimization API",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# Register routers
from routers.states import router as states_router
from routers.weather import router as weather_router
from routers.prediction import router as prediction_router
from routers.priority import router as priority_router
from routers.resources import router as resources_router
from routers.routing import router as routing_router
from routers.alerts import router as alerts_router
from routers.geojson import router as geojson_router
from routers.reports import router as reports_router
from routers.dashboard import router as dashboard_router
from routers.alert_detail import router as alert_detail_router

app.include_router(states_router)
app.include_router(weather_router)
app.include_router(prediction_router)
app.include_router(priority_router)
app.include_router(resources_router)
app.include_router(routing_router)
app.include_router(alerts_router)
app.include_router(geojson_router)
app.include_router(reports_router)
app.include_router(dashboard_router)
app.include_router(alert_detail_router)


@app.get("/")
def root():
    return {
        "service": "DRMS Flood Dashboard API",
        "version": "2.0.0",
        "docs": "/docs",
        "endpoints": [
            "GET /api/states",
            "GET /api/states/{state}/districts",
            "GET /api/states/{state}/summary",
            "GET /api/dashboard/{state}",
            "GET /api/weather/status",
            "GET /api/weather/bulk?state=",
            "GET /api/weather/{district}?lat=&lon=",
            "POST /api/predict",
            "GET /api/priority/{state}",
            "GET /api/resources/{state}",
            "POST /api/route",
            "GET /api/alerts?state=",
            "GET /api/geojson/{state}",
            "GET /api/geojson",
            "GET /api/reports/csv?state=",
        ],
    }


@app.get("/health")
def health():
    return {"status": "ok"}
