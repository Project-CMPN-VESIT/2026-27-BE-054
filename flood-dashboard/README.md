# 🌊 DRMS — Disaster Relief Management System

Real-Time Flood Forecasting + Severity Mapping + Resource Optimization Dashboard

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
# Train the ML model (first run only)
python -c "from models.flood_predictor import train_and_save; train_and_save()"
# Start the API server
uvicorn app:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Dashboard opens at **http://localhost:5173**  
API docs at **http://localhost:8000/docs**

## Configuration

Edit `backend/.env`:
```
OPENWEATHER_API_KEY=your_key_here
ORS_API_KEY=your_key_here
```

> The system works without API keys using simulated weather data.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, XGBoost, Pandas, PuLP |
| Frontend | React 18, Vite, Tailwind CSS v4 |
| Maps | Leaflet.js + react-leaflet |
| Charts | Recharts |
| State | Zustand |
| Data | 816 districts across 34 states |
