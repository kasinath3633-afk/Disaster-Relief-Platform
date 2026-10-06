import pytest
from unittest.mock import patch
from io import BytesIO
import httpx
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.disaster import Disaster
from app.models.simulation import SimulationResult
from app.models.impact import ImpactAssessment
from app.models.relief import ReliefRequirement
from app.security import hash_password, create_access_token
from app.services.external_data import (
    MockWeatherProvider,
    ResilientWeatherService,
    compute_weather_risk,
    get_weather_adjusted_impact_score
)
from app.services.report import generate_disaster_report, generate_comprehensive_disaster_report


@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module")
def auth_headers(db_session: Session):
    user = db_session.query(User).filter(User.email == "external_tester@example.com").first()
    if not user:
        user = User(
            username="external_tester",
            email="external_tester@example.com",
            phone_number="1234567890",
            password_hash=hash_password("secret123"),
            role="coordinator"
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


# ============================================================
# 1. UNIT TESTS: ADAPTERS, RESILIENCE & WEATHER RISK
# ============================================================

def test_weather_risk_calculation():
    # Calm weather
    risk_low, warnings_low = compute_weather_risk(rainfall_mm=5.0, wind_speed_kmh=15.0, visibility_km=10.0)
    assert 0.0 <= risk_low <= 0.25
    assert len(warnings_low) == 0

    # Severe storm weather
    risk_high, warnings_high = compute_weather_risk(rainfall_mm=85.0, wind_speed_kmh=80.0, visibility_km=1.5)
    assert risk_high >= 0.60
    assert len(warnings_high) >= 2
    assert any("Severe Precipitation" in w for w in warnings_high)
    assert any("Low Visibility" in w for w in warnings_high)


def test_mock_weather_provider():
    provider = MockWeatherProvider()
    data = provider.fetch_weather(latitude=13.0827, longitude=80.2707)
    assert data.temperature_c > 0
    assert 0.0 <= data.weather_risk <= 1.0
    assert "Mock Provider" in data.source


def test_resilient_weather_fallback_on_network_failure():
    service = ResilientWeatherService()
    service.provider_mode = "live"

    # Simulate live API failure (e.g. connection timeout)
    with patch.object(service.live_provider, "fetch_weather", side_effect=httpx.ConnectTimeout("Network timed out")):
        weather = service.get_weather(13.0827, 80.2707)
        assert weather is not None
        assert "fallback" in weather.warnings[-1].lower()


def test_weather_adjusted_impact_score():
    base_score = 50.0
    # Zero weather risk -> no change
    assert get_weather_adjusted_impact_score(base_score, weather_risk=0.0) == 50.0
    # 0.50 weather risk -> 50 * (1 + 0.125) = 56.25
    assert get_weather_adjusted_impact_score(base_score, weather_risk=0.5) == 56.25
    # Max weather risk 1.0 -> 50 * 1.25 = 62.5
    assert get_weather_adjusted_impact_score(base_score, weather_risk=1.0) == 62.5


# ============================================================
# 2. PDF REPORT GENERATION TESTS
# ============================================================

def test_original_report_generation(db_session: Session):
    disaster = Disaster(name="Report Disaster", severity=6, latitude=13.0, longitude=80.0, radius_km=10.0)
    pdf_buffer = generate_disaster_report(
        disaster=disaster,
        simulation=None,
        relief=None,
        allocations=[],
        resources=[],
        shelters=[],
        population_points=[]
    )
    assert isinstance(pdf_buffer, BytesIO)
    content = pdf_buffer.getvalue()
    assert content.startswith(b"%PDF")
    assert len(content) > 500


def test_comprehensive_report_generation(db_session: Session):
    disaster = Disaster(name="Comprehensive Report Disaster", severity=8, latitude=13.0827, longitude=80.2707, radius_km=15.0)
    impact = ImpactAssessment(
        disaster_id=1,
        affected_population=12000,
        affected_buildings=800,
        affected_roads=40,
        affected_area_km2=706.86,
        impact_score=78.5,
        impact_level="CRITICAL"
    )
    weather = {
        "source": "Open-Meteo & Radar",
        "temperature_c": 31.5,
        "rainfall_mm": 65.0,
        "wind_speed_kmh": 72.0,
        "visibility_km": 1.8,
        "weather_risk": 0.82,
        "weather_condition": "Monsoon Gale",
        "warnings": ["Torrential rainfall warning"]
    }
    unmet = [
        {"resource": "medical_kits", "required": 1000, "allocated": 400, "unmet": 600}
    ]

    pdf_buffer = generate_comprehensive_disaster_report(
        disaster=disaster,
        simulation=None,
        impact=impact,
        relief=None,
        allocations=[],
        resources=[],
        shelters=[],
        population_points=[],
        weather=weather,
        unmet_demands=unmet
    )
    assert isinstance(pdf_buffer, BytesIO)
    content = pdf_buffer.getvalue()
    assert content.startswith(b"%PDF")
    assert len(content) > 1000


# ============================================================
# 3. API INTEGRATION TESTS
# ============================================================

def test_get_external_weather_api(auth_headers):
    client = TestClient(app)
    resp = client.get("/external/weather?latitude=13.0827&longitude=80.2707", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "temperature_c" in data
    assert "rainfall_mm" in data
    assert "wind_speed_kmh" in data
    assert "weather_risk" in data
    assert "source" in data


def test_get_comprehensive_report_api(auth_headers, db_session: Session):
    client = TestClient(app)
    disaster = Disaster(
        name="Day 15 Report Test",
        severity=7,
        latitude=13.0827,
        longitude=80.2707,
        radius_km=12.0
    )
    db_session.add(disaster)
    db_session.commit()
    db_session.refresh(disaster)

    resp = client.get(f"/reports/{disaster.id}/comprehensive", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content.startswith(b"%PDF")


def test_get_comprehensive_report_missing_disaster(auth_headers):
    client = TestClient(app)
    resp = client.get("/reports/999999/comprehensive", headers=auth_headers)
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Disaster not found"
