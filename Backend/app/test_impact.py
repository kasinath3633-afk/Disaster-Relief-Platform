import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import get_db, SessionLocal
from app.models.user import User
from app.models.disaster import Disaster
from app.models.simulation import SimulationResult
from app.models.population import PopulationPoint
from app.models.impact import ImpactAssessment
from app.security import hash_password, create_access_token
from app.services.impact import (
    estimate_building_impact,
    estimate_road_impact,
    calculate_impact_score,
    determine_impact_level,
    run_impact_assessment_calculation,
)


@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module")
def auth_headers(db_session: Session):
    # Ensure test user exists
    user = db_session.query(User).filter(User.email == "impact_tester@example.com").first()
    if not user:
        user = User(
            username="impact_tester",
            email="impact_tester@example.com",
            phone_number="1234567890",
            password_hash=hash_password("secret123"),
            role="coordinator"
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def test_disaster(db_session: Session):
    disaster = Disaster(
        name="Day 11 Test Cyclone",
        severity=8,
        latitude=13.0827,
        longitude=80.2707,
        radius_km=15.0
    )
    db_session.add(disaster)
    db_session.commit()
    db_session.refresh(disaster)
    return disaster


# ============================================================
# 1. UNIT TESTS: IMPACT ASSESSMENT LOGIC & SEVERITY
# ============================================================

def test_building_impact_estimation():
    # 0 population -> 0 buildings
    assert estimate_building_impact(0, 8) == 0
    # 0 severity -> 0 buildings
    assert estimate_building_impact(1000, 0) == 0
    # 900 people, severity 10 -> 900 / 4.5 * 1.0 = 200 buildings
    assert estimate_building_impact(900, 10) == 200
    # 900 people, severity 5 -> 900 / 4.5 * 0.5 = 100 buildings
    assert estimate_building_impact(900, 5) == 100


def test_road_impact_estimation():
    # 0 radius -> 0 roads
    assert estimate_road_impact(0, 8) == 0
    # 0 severity -> 0 roads
    assert estimate_road_impact(10.0, 0) == 0
    # 10 km radius, severity 10 -> 2.5 * 10 * 1.0 = 25 road segments
    assert estimate_road_impact(10.0, 10) == 25
    # 20 km radius, severity 4 -> 2.5 * 20 * 0.4 = 20 road segments
    assert estimate_road_impact(20.0, 4) == 20


def test_impact_score_weighting_and_bounds():
    # Minimal exposure (0 pop, 0 bld, 0 road, severity 1)
    # pop=0, bld=0, road=0, sev=10 -> score = 0.25 * 10 = 2.5
    score_min = calculate_impact_score(0, 0, 0, 1)
    assert score_min == 2.5
    assert determine_impact_level(score_min) == "LOW"

    # Extreme exposure (capped at 100.0)
    score_max = calculate_impact_score(20000, 5000, 500, 10)
    assert score_max == 100.0
    assert determine_impact_level(score_max) == "CRITICAL"


def test_severity_classification_thresholds():
    assert determine_impact_level(0.0) == "LOW"
    assert determine_impact_level(25.0) == "LOW"
    assert determine_impact_level(25.1) == "MODERATE"
    assert determine_impact_level(50.0) == "MODERATE"
    assert determine_impact_level(50.1) == "HIGH"
    assert determine_impact_level(75.0) == "HIGH"
    assert determine_impact_level(75.1) == "CRITICAL"
    assert determine_impact_level(100.0) == "CRITICAL"


# ============================================================
# 2. INTEGRATION TESTS: API & DATABASE PERSISTENCE
# ============================================================

def test_impact_run_and_retrieval(auth_headers, test_disaster, db_session: Session):
    client = TestClient(app)

    # 1. Run impact assessment
    response = client.post(
        f"/impact/run/{test_disaster.id}",
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()

    assert data["disaster_id"] == test_disaster.id
    assert "affected_population" in data
    assert "affected_buildings" in data
    assert "affected_roads" in data
    assert "affected_area_km2" in data
    assert "impact_score" in data
    assert "impact_level" in data
    assert data["impact_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]

    # 2. Verify persistence in DB
    assessment = db_session.query(ImpactAssessment).filter(
        ImpactAssessment.disaster_id == test_disaster.id
    ).order_by(ImpactAssessment.id.desc()).first()
    assert assessment is not None
    assert assessment.id == data["id"]
    assert assessment.impact_score == data["impact_score"]

    # 3. Retrieve assessment via GET endpoint
    get_resp = client.get(
        f"/impact/{test_disaster.id}",
        headers=auth_headers
    )
    assert get_resp.status_code == 200
    get_data = get_resp.json()
    assert get_data["id"] == assessment.id
    assert get_data["impact_score"] == assessment.impact_score
    assert get_data["impact_level"] == assessment.impact_level


def test_impact_missing_disaster(auth_headers):
    client = TestClient(app)

    # Missing disaster for run
    resp_run = client.post("/impact/run/999999", headers=auth_headers)
    assert resp_run.status_code == 404
    assert resp_run.json()["detail"] == "Disaster not found"

    # Missing disaster for get
    resp_get = client.get("/impact/999999", headers=auth_headers)
    assert resp_get.status_code == 404
    assert resp_get.json()["detail"] == "Disaster not found"


def test_impact_unauthorized():
    client = TestClient(app)

    # No token provided
    resp = client.post("/impact/run/1")
    assert resp.status_code in [401, 403]

    resp2 = client.get("/impact/1")
    assert resp2.status_code in [401, 403]
