import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.disaster import Disaster
from app.models.shelter import Shelter
from app.models.warehouse import Warehouse
from app.models.resource import Resource
from app.models.relief import ReliefRequirement
from app.security import hash_password, create_access_token
from app.services.intelligent_allocation import (
    calculate_destination_priority,
    rank_candidate_warehouses,
    run_intelligent_allocation_heuristic
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
    user = db_session.query(User).filter(User.email == "intel_alloc_tester@example.com").first()
    if not user:
        user = User(
            username="intel_alloc_tester",
            email="intel_alloc_tester@example.com",
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
# 1. UNIT TESTS: HEURISTICS & RANKING
# ============================================================

def test_destination_priority_calculation():
    # High pressure shelter (90% capacity, high occupancy, high severity)
    s_high = Shelter(capacity=500, occupancy=450)
    score_high = calculate_destination_priority(s_high, disaster_severity=9)

    # Low pressure shelter (10% capacity, low occupancy, low severity)
    s_low = Shelter(capacity=500, occupancy=50)
    score_low = calculate_destination_priority(s_low, disaster_severity=3)

    assert 0.0 <= score_high <= 100.0
    assert 0.0 <= score_low <= 100.0
    assert score_high > score_low


def test_warehouse_ranking_proximity_and_risk():
    shelter_lat, shelter_lon = 13.0827, 80.2707

    # Close warehouse (2 km)
    w_close = Warehouse(name="Close Hub", latitude=13.0900, longitude=80.2800)
    # Far warehouse (80 km)
    w_far = Warehouse(name="Far Hub", latitude=13.8000, longitude=80.2700)

    res1 = Resource(name="water_liters", quantity=1000, unit="liters")
    res2 = Resource(name="water_liters", quantity=1000, unit="liters")

    ranked = rank_candidate_warehouses(
        [(w_far, res2), (w_close, res1)],
        shelter_lat,
        shelter_lon
    )

    assert len(ranked) == 2
    # w_close should rank first due to higher efficiency score
    assert ranked[0]["warehouse"].name == "Close Hub"
    assert ranked[0]["efficiency_score"] > ranked[1]["efficiency_score"]


# ============================================================
# 2. INTEGRATION TESTS: MULTI-DESTINATION & INVENTORY
# ============================================================

def test_intelligent_allocation_full_flow(db_session: Session, auth_headers):
    # Setup disaster
    disaster = Disaster(
        name="Day 14 Intelligent Flood",
        severity=8,
        latitude=13.0827,
        longitude=80.2707,
        radius_km=15.0
    )
    db_session.add(disaster)
    db_session.commit()
    db_session.refresh(disaster)

    # Setup Relief Requirement
    relief = ReliefRequirement(
        disaster_id=disaster.id,
        food_packets=500,
        water_liters=1000,
        medical_kits=50,
        blankets=100
    )
    db_session.add(relief)

    # Setup 2 Shelters (Priority 1: overcrowded, Priority 2: lower load)
    s1 = Shelter(name="Overcrowded North Shelter", latitude=13.0900, longitude=80.2700, capacity=300, occupancy=280, is_active=True)
    s2 = Shelter(name="Underutilized South Shelter", latitude=13.0500, longitude=80.2500, capacity=400, occupancy=60, is_active=True)
    db_session.add_all([s1, s2])
    db_session.commit()

    # Setup 2 Warehouses with inventory
    w1 = Warehouse(name="Logistics Base A (Close)", latitude=13.0850, longitude=80.2720, capacity=5000)
    w2 = Warehouse(name="Logistics Base B (Backup)", latitude=13.1500, longitude=80.3000, capacity=5000)
    db_session.add_all([w1, w2])
    db_session.commit()

    # Add resources
    r1 = Resource(warehouse_id=w1.id, name="food_packets", quantity=400, unit="packets")
    r2 = Resource(warehouse_id=w2.id, name="food_packets", quantity=600, unit="packets")
    r3 = Resource(warehouse_id=w1.id, name="water_liters", quantity=1500, unit="liters")
    db_session.add_all([r1, r2, r3])
    db_session.commit()

    # Run Intelligent Allocation (in-memory dry run without committing to DB)
    result = run_intelligent_allocation_heuristic(db_session, disaster.id, commit_to_db=False)

    assert result["disaster_id"] == disaster.id
    assert result["status"] == "completed"
    assert len(result["allocations"]) > 0

    # Verify explainable fields present
    first_alloc = result["allocations"][0]
    assert "priority_score" in first_alloc
    assert "distance_km" in first_alloc
    assert "risk_score" in first_alloc
    assert "reason" in first_alloc
    assert len(first_alloc["reason"]) > 15


def test_insufficient_inventory_unmet_demand(db_session: Session):
    disaster = Disaster(
        name="Day 14 Shortage Disaster",
        severity=9,
        latitude=13.0827,
        longitude=80.2707,
        radius_km=10.0
    )
    db_session.add(disaster)
    db_session.commit()
    db_session.refresh(disaster)

    # Requires 2000 medical kits
    relief = ReliefRequirement(
        disaster_id=disaster.id,
        food_packets=0,
        water_liters=0,
        medical_kits=2000,
        blankets=0
    )
    db_session.add(relief)

    # Warehouse only has 300 medical kits
    w = Warehouse(name="Small Outpost", latitude=13.0800, longitude=80.2700, capacity=1000)
    db_session.add(w)
    db_session.commit()

    r = Resource(warehouse_id=w.id, name="medical_kits", quantity=300, unit="kits")
    db_session.add(r)
    db_session.commit()

    result = run_intelligent_allocation_heuristic(db_session, disaster.id, commit_to_db=False)

    assert len(result["unmet_demand"]) >= 1
    unmet_med = next(u for u in result["unmet_demand"] if u["resource"] == "medical_kits")
    assert unmet_med["required"] == 2000
    assert unmet_med["allocated"] > 0
    assert unmet_med["unmet"] == 2000 - unmet_med["allocated"]
    assert unmet_med["unmet"] > 0
    assert "Regional inventory deficit" in unmet_med["reason"]


def test_intelligent_allocate_api(auth_headers, db_session: Session):
    client = TestClient(app)

    disaster = Disaster(
        name="Day 14 API Disaster",
        severity=7,
        latitude=13.0827,
        longitude=80.2707,
        radius_km=10.0
    )
    db_session.add(disaster)
    db_session.commit()
    db_session.refresh(disaster)

    relief = ReliefRequirement(
        disaster_id=disaster.id,
        food_packets=100,
        water_liters=200,
        medical_kits=10,
        blankets=20
    )
    db_session.add(relief)
    db_session.commit()

    resp = client.post(
        f"/relief/{disaster.id}/intelligent-allocate?commit_to_db=false",
        headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["disaster_id"] == disaster.id
    assert "allocations" in data
    assert "unmet_demand" in data
    assert "heuristic_description" in data


def test_intelligent_allocate_missing_disaster(auth_headers):
    client = TestClient(app)
    resp = client.post("/relief/999999/intelligent-allocate", headers=auth_headers)
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Disaster not found"


def test_intelligent_allocate_missing_relief(auth_headers, db_session: Session):
    client = TestClient(app)
    disaster = Disaster(
        name="Disaster Without Relief",
        severity=5,
        latitude=13.0,
        longitude=80.0,
        radius_km=5.0
    )
    db_session.add(disaster)
    db_session.commit()
    db_session.refresh(disaster)

    resp = client.post(f"/relief/{disaster.id}/intelligent-allocate", headers=auth_headers)
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Relief requirement not found"
