# DRMS Flood Dashboard

A full-stack disaster relief management system for real-time flood forecasting, risk severity mapping, infrastructure prioritization, and resource planning across Indian districts.

## Overview

This project combines:

- A FastAPI backend for flood prediction and analytics
- A React + Vite frontend dashboard
- GeoJSON district-level map data
- ML-based risk prediction and resource optimization logic
- State-wise alert and routing insights

The system is designed to help decision-makers monitor flood risks, identify high-priority districts, and plan emergency response using actionable intelligence.

## Project Structure

```text
final-project/
├── README.md
├── .gitignore
├── extract_coords.py
├── extract_geojson.py
├── india_districts_drms.geojson
├── maharashtra.json
├── national_unified_dataset.csv
├── test_report.csv
├── walkthrough.md
└── flood-dashboard/
    ├── README.md
    ├── docker-compose.yml
    ├── backend/
    │   ├── app.py
    │   ├── config.py
    │   ├── requirements.txt
    │   ├── .env.example
    │   ├── data/
    │   ├── models/
    │   ├── routers/
    │   └── services/
    └── frontend/
        ├── package.json
        ├── vite.config.js
        ├── index.html
        └── src/
```

## Tech Stack

### Backend
- Python
- FastAPI
- Pandas / NumPy
- scikit-learn
- XGBoost
- PuLP
- Joblib

### Frontend
- React
- Vite
- Leaflet / react-leaflet
- Recharts
- Zustand

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ajaylakshawani1605/final-project.git
cd final-project
```

### 2. Start the backend

```bash
cd flood-dashboard/backend
pip install -r requirements.txt
python -c "from models.flood_predictor import train_and_save; train_and_save()"
uvicorn app:app --reload --port 8000
```

The API will be available at:

- http://localhost:8000
- http://localhost:8000/docs

### 3. Start the frontend

Open a new terminal and run:

```bash
cd flood-dashboard/frontend
npm install
npm run dev
```

The dashboard will run at:

- http://localhost:5173

### 4. Run with Docker (optional)

From the project root:

```bash
docker compose -f flood-dashboard/docker-compose.yml up --build
```

## Configuration

The backend uses environment variables for external services.

Copy the sample file if needed:

```bash
cp flood-dashboard/backend/.env.example flood-dashboard/backend/.env
```

Set values such as:

```env
OPENWEATHER_API_KEY=your_key_here
ORS_API_KEY=your_key_here
```

If keys are not available, the app can still run with fallback/simulated behavior depending on the module configuration.

## Features

- Flood risk prediction for districts and states
- Severity classification and alert generation
- Priority-based resource allocation
- Routing and logistics recommendations
- District map visualization
- Dashboard analytics for operational planning
- CSV report export

## Notes

This project is intended for research, demo, and disaster-response planning workflows. It can be adapted for production deployment with real-time weather feeds, authentication, cloud hosting, and persistent storage.

## License

This project is provided for academic/demo use and is not currently published under a formal license.
