import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.disaster import Disaster
from app.models.shelter import Shelter
from app.models.warehouse import Warehouse
from app.models.population import PopulationPoint
from app.security import hash_password, create_access_token
from app.services.gis import validate_coordinates, get_nearby_shelters_spatial, get_nearby_warehouses_spatial


@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module")
def auth_headers(db_session: Session):
    user = db_session.query(User).filter(User.email == "gis_tester@example.com").first()
    if not user:
        user = User(
            username="gis_tester",
            email="gis_tester@example.com",
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
# 1. UNIT TESTS: COORDINATE VALIDATION
# ============================================================

def test_coordinate_validation_valid():
    valid, err = validate_coordinates(13.0827, 80.2707)
    assert valid is True
    assert err is None

    valid, err = validate_coordinates(-90.0, 180.0)
    assert valid is True
    assert err is None

    valid, err = validate_coordinates(0.0, 0.0)
    assert valid is True


def test_coordinate_validation_invalid():
    # Latitude out of bounds
    valid, err = validate_coordinates(91.0, 80.0)
    assert valid is False
    assert "Invalid latitude" in err

    valid, err = validate_coordinates(-90.1, 80.0)
    assert valid is False

    # Longitude out of bounds
    valid, err = validate_coordinates(13.0, 180.1)
    assert valid is False
    assert "Invalid longitude" in err

    valid, err = validate_coordinates(13.0, -180.1)
    assert valid is False

    # Non-numeric
    valid, err = validate_coordinates("invalid", 80.0)
    assert valid is False


# ============================================================
# 2. SPATIAL DATABASE TESTS: SHELTERS AND WAREHOUSES
# ============================================================

def test_nearby_shelters_spatial_selection(db_session: Session, auth_headers):
    client = TestClient(app)

    # Reference center: Chennai (13.0827, 80.2707)
    center_lat = 13.0827
    center_lon = 80.2707

    # Create close shelter (~2 km away)
    s1 = Shelter(
        name="Close Shelter A",
        latitude=13.0900,
        longitude=80.2800,
        capacity=200,
        occupancy=50,
        is_active=True
    )
    # Create moderate shelter (~10 km away)
    s2 = Shelter(
        name="Moderate Shelter B",
        latitude=13.1500,
        longitude=80.2700,
        capacity=300,
        occupancy=100,
        is_active=True
    )
    # Create distant shelter (~150 km away)
    s3 = Shelter(
        name="Distant Shelter C",
        latitude=12.0000,
        longitude=79.5000,
        capacity=500,
        occupancy=0,
        is_active=True
    )
    # Create inactive shelter nearby
    s4 = Shelter(
        name="Inactive Close Shelter D",
        latitude=13.0850,
        longitude=80.2750,
        capacity=100,
        occupancy=0,
        is_active=False
    )

    db_session.add_all([s1, s2, s3, s4])
    db_session.commit()

    # Query shelters within 25 km radius
    resp = client.get(
        f"/gis/shelters/nearby?latitude={center_lat}&longitude={center_lon}&radius_km=25.0&limit=100",
        headers=auth_headers
    )
    assert resp.status_code == 200
    results = resp.json()

    # Verify active close and moderate shelters are returned, inactive and distant are excluded
    names = [r["name"] for r in results]
    assert "Close Shelter A" in names
    assert "Moderate Shelter B" in names
    assert "Distant Shelter C" not in names
    assert "Inactive Close Shelter D" not in names

    # Verify results are sorted by distance ascending
    distances = [r["distance_km"] for r in results]
    assert distances == sorted(distances)


def test_nearby_warehouses_spatial_selection(db_session: Session, auth_headers):
    client = TestClient(app)

    center_lat = 13.0827
    center_lon = 80.2707

    w1 = Warehouse(
        name="Regional Hub Alpha",
        latitude=13.0700,
        longitude=80.2600,
        capacity=5000
    )
    w2 = Warehouse(
        name="Central Hub Beta",
        latitude=13.2000,
        longitude=80.2000,
        capacity=10000
    )
    w3 = Warehouse(
        name="Remote Warehouse Gamma",
        latitude=15.0000,
        longitude=78.0000,
        capacity=2000
    )
    db_session.add_all([w1, w2, w3])
    db_session.commit()

    # Query warehouses within 30 km radius
    resp = client.get(
        f"/gis/warehouses/nearby?latitude={center_lat}&longitude={center_lon}&radius_km=30.0&limit=100",
        headers=auth_headers
    )
    assert resp.status_code == 200
    results = resp.json()

    names = [r["name"] for r in results]
    assert "Regional Hub Alpha" in names
    assert "Central Hub Beta" in names
    assert "Remote Warehouse Gamma" not in names

    # Distances sorted
    distances = [r["distance_km"] for r in results]
    assert distances == sorted(distances)


def test_affected_population_spatial_geojson(db_session: Session, auth_headers):
    client = TestClient(app)

    # Create disaster with radius 10 km
    disaster = Disaster(
        name="Day 12 Spatial Flood",
        severity=7,
        latitude=13.0000,
        longitude=80.2000,
        radius_km=10.0
    )
    db_session.add(disaster)
    db_session.commit()
    db_session.refresh(disaster)

    # Point 1: inside radius (~3 km away)
    p1 = PopulationPoint(
        latitude=13.0200,
        longitude=80.2100,
        population=1200,
        vulnerable_population=150
    )
    # Point 2: outside radius (~25 km away)
    p2 = PopulationPoint(
        latitude=13.2200,
        longitude=80.2000,
        population=5000,
        vulnerable_population=600
    )
    db_session.add_all([p1, p2])
    db_session.commit()

    resp = client.get(
        f"/gis/population/affected?disaster_id={disaster.id}",
        headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["disaster_id"] == disaster.id
    assert data["total_affected_population"] >= 1200
    assert "geojson" in data
    assert data["geojson"]["type"] == "FeatureCollection"
    assert len(data["geojson"]["features"]) >= 1

    feature = data["geojson"]["features"][0]
    assert feature["type"] == "Feature"
    assert "coordinates" in feature["geometry"]
    assert "distance_km" in feature["properties"]


def test_gis_invalid_coordinates_api(auth_headers):
    client = TestClient(app)

    # Latitude out of bounds (95.0)
    resp = client.get(
        "/gis/shelters/nearby?latitude=95.0&longitude=80.0&radius_km=20.0",
        headers=auth_headers
    )
    assert resp.status_code == 422

    # Longitude out of bounds (-195.0)
    resp = client.get(
        "/gis/warehouses/nearby?latitude=13.0&longitude=-195.0&radius_km=20.0",
        headers=auth_headers
    )
    assert resp.status_code == 422


def test_gis_missing_disaster(auth_headers):
    client = TestClient(app)
    resp = client.get("/gis/population/affected?disaster_id=999999", headers=auth_headers)
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Disaster not found"


def test_gis_unauthorized():
    client = TestClient(app)
    resp = client.get("/gis/shelters/nearby?latitude=13.0&longitude=80.0")
    assert resp.status_code in [401, 403]
