"""Flood prediction model — XGBoost pipeline with training and inference."""

import math
import random
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from xgboost import XGBRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from config import DATA_PATH, MODEL_PATH, SEVERITY_THRESHOLDS, RISK_LABELS

FEATURES = [
    "Monsoon_Normal_Rain_mm",
    "Annual_Normal_Rain_mm",
    "Flood_Freq_Per_Year",
    "Pct_Flooded_Area",
    "Avg_Duration_Days",
    "DFSI_Score",
    "Population",
    "Urban_Rural_Ratio",
    "current_rainfall_mm",
    "forecast_24hr_rain_mm",
    "rainfall_anomaly_ratio",
    "consecutive_rain_days",
]

TARGET = "Severity_Score"

_pipeline = None


def _sigmoid(x: float) -> float:
    return 1 / (1 + math.exp(-x))


def _prepare_training_data(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """Build feature matrix from historical data + synthesised weather cols."""
    data = df.copy()

    # Synthesise weather features from historical averages
    data["current_rainfall_mm"] = data["Monsoon_Avg_Daily_Rain_mm"].fillna(5.0)
    data["forecast_24hr_rain_mm"] = data["Monsoon_Max_Daily_Rain_mm"].fillna(30.0) * 0.7
    annual_daily = data["Annual_Avg_Daily_Rain_mm"].replace(0, 1.0).fillna(1.0)
    data["rainfall_anomaly_ratio"] = data["current_rainfall_mm"] / annual_daily
    data["consecutive_rain_days"] = data["Flood_Freq_Per_Year"].fillna(0.5) * 5

    # Data augmentation: Gaussian noise on weather features (±20 %)
    for col in ["current_rainfall_mm", "forecast_24hr_rain_mm", "rainfall_anomaly_ratio"]:
        noise = np.random.normal(1.0, 0.2, size=len(data))
        data[col] = data[col] * noise

    # Fill remaining NaN
    for f in FEATURES:
        if f in data.columns:
            data[f] = data[f].fillna(data[f].median() if data[f].median() == data[f].median() else 0)

    X = data[FEATURES].fillna(0)
    # Replace inf/-inf and clip extreme values
    X = X.replace([np.inf, -np.inf], np.nan).fillna(0)
    X = X.clip(-1e9, 1e9)
    y = data[TARGET].fillna(data[TARGET].median())
    return X, y


def train_and_save():
    """Train XGBoost model from CSV and persist to disk."""
    global _pipeline
    print("[FloodPredictor] Loading data...")
    df = pd.read_csv(DATA_PATH)
    df.columns = df.columns.str.strip()

    # Fill numeric NaN
    numeric = df.select_dtypes(include=[np.number]).columns
    df[numeric] = df[numeric].fillna(df[numeric].median())

    X, y = _prepare_training_data(df)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    _pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("model", XGBRegressor(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            verbosity=0,
        )),
    ])
    _pipeline.fit(X_train, y_train)

    score = _pipeline.score(X_test, y_test)
    print(f"[FloodPredictor] R2 on test set: {score:.4f}")

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(_pipeline, MODEL_PATH)
    print(f"[FloodPredictor] Model saved -> {MODEL_PATH}")
    return _pipeline


def load_model():
    """Load persisted model or train on the fly."""
    global _pipeline
    if MODEL_PATH.exists():
        _pipeline = joblib.load(MODEL_PATH)
        print("[FloodPredictor] Model loaded from disk.")
    else:
        print("[FloodPredictor] No saved model found -- training now...")
        train_and_save()


def predict(district_data: dict, current_rainfall_mm: float, forecast_24hr_rain_mm: float) -> dict:
    """Run inference for a single district. Returns prediction dict."""
    global _pipeline
    if _pipeline is None:
        load_model()

    annual_daily = district_data.get("annual_avg_daily_rain_mm", 1.0) or 1.0
    anomaly_ratio = current_rainfall_mm / max(annual_daily, 0.01)
    consec_days = max(1, int(forecast_24hr_rain_mm / max(current_rainfall_mm, 0.01) * 2))

    features = {
        "Monsoon_Normal_Rain_mm": district_data.get("monsoon_rain_mm", 0),
        "Annual_Normal_Rain_mm": district_data.get("annual_rain_mm", 0),
        "Flood_Freq_Per_Year": district_data.get("flood_freq_per_year", 0),
        "Pct_Flooded_Area": district_data.get("pct_flooded_area", 0),
        "Avg_Duration_Days": district_data.get("avg_duration_days", 0),
        "DFSI_Score": district_data.get("dfsi_score", 0),
        "Population": district_data.get("population", 0),
        "Urban_Rural_Ratio": district_data.get("urban_rural_ratio", 0),
        "current_rainfall_mm": current_rainfall_mm,
        "forecast_24hr_rain_mm": forecast_24hr_rain_mm,
        "rainfall_anomaly_ratio": anomaly_ratio,
        "consecutive_rain_days": consec_days,
    }

    X = pd.DataFrame([features])[FEATURES]
    pred_score = float(_pipeline.predict(X)[0])
    pred_score = max(0.0, min(10.0, pred_score))  # clamp 0–10

    historical = district_data.get("severity_score", 0)
    delta = round(pred_score - historical, 2)

    # Risk classification
    if pred_score >= SEVERITY_THRESHOLDS["CRITICAL"]:
        risk_level = "CRITICAL"
    elif pred_score >= SEVERITY_THRESHOLDS["HIGH"]:
        risk_level = "HIGH"
    elif pred_score >= SEVERITY_THRESHOLDS["MEDIUM"]:
        risk_level = "MEDIUM"
    elif pred_score >= SEVERITY_THRESHOLDS["LOW"]:
        risk_level = "LOW"
    else:
        risk_level = "MINIMAL"

    flood_prob = round(_sigmoid((pred_score - 4.5) * 0.8), 3)

    # Classify forecast intensity
    if forecast_24hr_rain_mm > 150:
        forecast_intensity = "EXTREME"
    elif forecast_24hr_rain_mm > 100:
        forecast_intensity = "VERY HIGH"
    elif forecast_24hr_rain_mm > 60:
        forecast_intensity = "HIGH"
    elif forecast_24hr_rain_mm > 30:
        forecast_intensity = "MODERATE"
    else:
        forecast_intensity = "LOW"

    # Population exposure
    pop = district_data.get("population", 0)
    if pop > 5_000_000:
        pop_exposure = "VERY HIGH"
    elif pop > 2_000_000:
        pop_exposure = "HIGH"
    elif pop > 500_000:
        pop_exposure = "MODERATE"
    else:
        pop_exposure = "LOW"

    hist_vuln = "HIGH" if historical >= 6 else ("MEDIUM" if historical >= 4 else "LOW")

    return {
        "district": district_data.get("district", "Unknown"),
        "state": district_data.get("state", "Unknown"),
        "predicted_severity_score": round(pred_score, 2),
        "historical_severity_score": round(historical, 2),
        "severity_delta": delta,
        "severity_class": risk_level if risk_level != "MINIMAL" else "LOW",
        "flood_probability": flood_prob,
        "risk_level": risk_level,
        "contributing_factors": {
            "rainfall_anomaly": f"{anomaly_ratio:.1f}x above normal",
            "forecast_intensity": forecast_intensity,
            "historical_vulnerability": hist_vuln,
            "population_exposure": pop_exposure,
        },
        "recommendation": RISK_LABELS.get(risk_level, "Monitor"),
        "confidence_score": round(min(0.95, 0.6 + pred_score * 0.04), 2),
    }


# Allow running as script: python -m models.flood_predictor
if __name__ == "__main__":
    train_and_save()
