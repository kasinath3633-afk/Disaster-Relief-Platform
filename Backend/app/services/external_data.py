import os
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import httpx
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class NormalizedWeatherData(BaseModel):
    temperature_c: float
    rainfall_mm: float
    wind_speed_kmh: float
    visibility_km: float
    weather_condition: str
    weather_risk: float = Field(ge=0.0, le=1.0)
    source: str
    warnings: List[str] = Field(default_factory=list)


def compute_weather_risk(
    rainfall_mm: float,
    wind_speed_kmh: float,
    visibility_km: float
) -> tuple[float, List[str]]:
    """
    Compute normalized weather risk score (0.0 - 1.0) and generate warnings.
    """
    rain_factor = min(1.0, max(0.0, rainfall_mm) / 100.0)
    wind_factor = min(1.0, max(0.0, wind_speed_kmh) / 120.0)
    vis_factor = min(1.0, max(0.0, 10.0 - visibility_km) / 10.0)

    risk = round(0.50 * rain_factor + 0.30 * wind_factor + 0.20 * vis_factor, 2)
    risk = min(1.0, max(0.0, risk))

    warnings = []
    if rainfall_mm >= 50.0:
        warnings.append(f"Severe Precipitation Alert: Heavy rainfall of {rainfall_mm} mm increases flash flood risk.")
    if wind_speed_kmh >= 65.0:
        warnings.append(f"Gale-Force Wind Alert: Wind speeds of {wind_speed_kmh} km/h endanger airborne and road transit.")
    if visibility_km <= 2.0:
        warnings.append(f"Low Visibility Hazard: Visibility reduced to {visibility_km} km; logistics delays anticipated.")

    return risk, warnings


class ExternalDataProvider(ABC):
    @abstractmethod
    def fetch_weather(self, latitude: float, longitude: float) -> NormalizedWeatherData:
        pass


class MockWeatherProvider(ExternalDataProvider):
    """
    Deterministic mock provider for reliable testing and offline development.
    Generates realistic, explainable weather parameters derived from coordinates.
    """
    def __init__(self, override_data: Optional[Dict[str, Any]] = None):
        self.override_data = override_data or {}

    def fetch_weather(self, latitude: float, longitude: float) -> NormalizedWeatherData:
        if self.override_data:
            risk, warnings = compute_weather_risk(
                self.override_data.get("rainfall_mm", 0.0),
                self.override_data.get("wind_speed_kmh", 0.0),
                self.override_data.get("visibility_km", 10.0)
            )
            return NormalizedWeatherData(
                temperature_c=self.override_data.get("temperature_c", 28.0),
                rainfall_mm=self.override_data.get("rainfall_mm", 0.0),
                wind_speed_kmh=self.override_data.get("wind_speed_kmh", 15.0),
                visibility_km=self.override_data.get("visibility_km", 10.0),
                weather_condition=self.override_data.get("weather_condition", "Simulated Normal"),
                weather_risk=risk,
                source="Deterministic Mock Provider (Configured)",
                warnings=warnings
            )

        # Coordinate-based deterministic simulation
        temp = round(25.0 + (abs(latitude) % 10), 1)
        rain = round((abs(latitude * longitude) % 80), 1)
        wind = round(20.0 + (abs(latitude + longitude) % 50), 1)
        vis = round(max(1.0, 10.0 - (rain / 12.0)), 1)
        cond = "Overcast & Heavy Rain" if rain > 40 else "Moderate Cloud Cover"

        risk, warnings = compute_weather_risk(rain, wind, vis)

        return NormalizedWeatherData(
            temperature_c=temp,
            rainfall_mm=rain,
            wind_speed_kmh=wind,
            visibility_km=vis,
            weather_condition=cond,
            weather_risk=risk,
            source="Deterministic Mock Provider (Algorithmic)",
            warnings=warnings
        )


class OpenMeteoWeatherProvider(ExternalDataProvider):
    """
    Live real-world weather adapter using Open-Meteo public API (keyless, non-commercial allowed).
    """
    def __init__(self, timeout_seconds: float = 3.0):
        self.timeout_seconds = timeout_seconds
        self.base_url = "https://api.open-meteo.com/v1/forecast"

    def fetch_weather(self, latitude: float, longitude: float) -> NormalizedWeatherData:
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": "temperature_2m,precipitation,wind_speed_10m,visibility",
            "timezone": "auto"
        }
        with httpx.Client(timeout=self.timeout_seconds) as client:
            resp = client.get(self.base_url, params=params)
            resp.raise_for_status()
            data = resp.json()

            current = data.get("current", {})
            temp = float(current.get("temperature_2m", 25.0))
            rain = float(current.get("precipitation", 0.0))
            wind = float(current.get("wind_speed_10m", 10.0))
            vis_m = float(current.get("visibility", 10000.0))
            vis_km = round(vis_m / 1000.0, 1)

            risk, warnings = compute_weather_risk(rain, wind, vis_km)

            cond = "Rain Showers" if rain > 0 else "Clear / Mild"

            return NormalizedWeatherData(
                temperature_c=temp,
                rainfall_mm=rain,
                wind_speed_kmh=wind,
                visibility_km=vis_km,
                weather_condition=cond,
                weather_risk=risk,
                source="Open-Meteo Live API",
                warnings=warnings
            )


class ResilientWeatherService:
    """
    Adapter and fallback service.
    Guarantees that network timeouts or external API outages never break application execution.
    """
    def __init__(self):
        self.provider_mode = os.getenv("WEATHER_PROVIDER", "mock").lower()
        self.live_provider = OpenMeteoWeatherProvider(timeout_seconds=2.5)
        self.mock_provider = MockWeatherProvider()

    def get_weather(self, latitude: float, longitude: float) -> NormalizedWeatherData:
        if self.provider_mode == "live":
            try:
                return self.live_provider.fetch_weather(latitude, longitude)
            except Exception as e:
                logger.warning(f"Live weather provider unavailable ({e}). Falling back to deterministic mock provider.")
                mock_data = self.mock_provider.fetch_weather(latitude, longitude)
                mock_data.warnings.append("Note: Live weather feed timed out; data served by fallback simulation provider.")
                return mock_data

        return self.mock_provider.fetch_weather(latitude, longitude)


def get_weather_adjusted_impact_score(
    base_impact_score: float,
    weather_risk: float
) -> float:
    """
    Adjust disaster impact score considering atmospheric hazard multipliers.
    Severe weather (cyclonic winds, torrential rain) exacerbates disaster severity up to +25%.
    """
    multiplier = 1.0 + (0.25 * max(0.0, min(1.0, weather_risk)))
    adjusted = round(min(100.0, base_impact_score * multiplier), 2)
    return adjusted
