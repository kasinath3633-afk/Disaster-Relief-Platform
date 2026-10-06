import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.routing import RoadNode
from app.security import hash_password


@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_complete_disaster_management_workflow(db_session: Session):
    """
    Complete end-to-end integration test exercising all 6 development phases:
    1. User Creation & Registration
    2. Authentication & JWT Token Issuance
    3. Disaster Creation
    4. Population Point Registration
    5. Shelter Management
    6. Warehouse Registration
    7. Resource Inventory Provisioning
    8. Simulation Execution
    9. Advanced Multi-Sector Impact Assessment
    10. Relief Requirement Estimation
    11. Road Network Seeding
    12. Risk-Aware Safe Routing (Dijkstra & A*)
    13. Intelligent Multi-Shelter Relief Allocation
    14. PDF Disaster Report & Comprehensive Dossier Generation
    15. Real-Time Dashboard Summary Retrieval
    """
    client = TestClient(app)

    # 1. User Creation
    unique_suffix = "e2e_final"
    user_payload = {
        "username": f"coordinator_{unique_suffix}",
        "email": f"coordinator_{unique_suffix}@emergency.gov",
        "phone_number": "9876543210",
        "password": "EmergencySecurePassword123!"
    }
    # Check if user already exists
    existing = db_session.query(User).filter(User.email == user_payload["email"]).first()
    if not existing:
        resp_user = client.post("/users", json=user_payload)
        assert resp_user.status_code == 200

    # 2. Authentication & JWT Token
    resp_login = client.post("/login", json={
        "email": user_payload["email"],
        "password": user_payload["password"]
    })
    assert resp_login.status_code == 200
    token = resp_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify authentication works
    resp_auth = client.get("/test-auth", headers=headers)
    assert resp_auth.status_code == 200
    assert resp_auth.json()["email"] == user_payload["email"]

    # 3. Create Disaster (Cyclone 'Vardah' in coastal zone)
    disaster_payload = {
        "name": "Super Cyclone Vardah - Final E2E",
        "severity": 8,
        "latitude": 13.0827,
        "longitude": 80.2707,
        "radius_km": 15.0
    }
    resp_disaster = client.post("/disasters", json=disaster_payload, headers=headers)
    assert resp_disaster.status_code == 200
    disaster_id = resp_disaster.json()["id"]
    assert disaster_id > 0

    # 4. Add Population Point within disaster footprint
    pop_payload = {
        "latitude": 13.0900,
        "longitude": 80.2750,
        "population": 4500,
        "vulnerable_population": 850
    }
    resp_pop = client.post("/population", json=pop_payload, headers=headers)
    assert resp_pop.status_code == 200

    # 5. Add Active Shelter
    shelter_payload = {
        "name": "E2E Coastal Relief Shelter",
        "latitude": 13.1000,
        "longitude": 80.2800,
        "capacity": 800,
        "occupancy": 350,
        "is_active": True
    }
    resp_shelter = client.post("/shelters", json=shelter_payload, headers=headers)
    assert resp_shelter.status_code == 200
    shelter_id = resp_shelter.json()["id"]

    # 6. Add Logistics Warehouse
    wh_payload = {
        "name": "E2E Central Logistics Depot",
        "latitude": 13.0700,
        "longitude": 80.2600,
        "capacity": 20000
    }
    resp_wh = client.post("/warehouses", json=wh_payload, headers=headers)
    assert resp_wh.status_code == 200
    warehouse_id = resp_wh.json()["id"]

    # 7. Add Resources to Warehouse
    resources_to_add = [
        {"warehouse_id": warehouse_id, "name": "food_packets", "quantity": 10000, "unit": "packets"},
        {"warehouse_id": warehouse_id, "name": "water_liters", "quantity": 25000, "unit": "liters"},
        {"warehouse_id": warehouse_id, "name": "medical_kits", "quantity": 1000, "unit": "kits"},
        {"warehouse_id": warehouse_id, "name": "blankets", "quantity": 3000, "unit": "pieces"},
    ]
    for res in resources_to_add:
        resp_res = client.post("/resources", json=res, headers=headers)
        assert resp_res.status_code == 200

    # 8. Run Simulation
    resp_sim = client.post("/simulation/run", json={"disaster_id": disaster_id}, headers=headers)
    assert resp_sim.status_code == 200
    sim_data = resp_sim.json()
    assert sim_data["disaster_id"] == disaster_id
    assert sim_data["affected_population"] >= 4500
    assert sim_data["affected_area_km2"] > 0

    # 9. Run Advanced Impact Assessment (Day 11)
    resp_impact = client.post(f"/impact/run/{disaster_id}", headers=headers)
    assert resp_impact.status_code == 200
    impact_data = resp_impact.json()
    assert impact_data["disaster_id"] == disaster_id
    assert impact_data["impact_score"] > 0
    assert impact_data["impact_level"] in ["MODERATE", "HIGH", "CRITICAL"]
    assert impact_data["affected_buildings"] > 0
    assert impact_data["affected_roads"] > 0

    # 10. Estimate Relief Requirements
    resp_relief = client.post(f"/relief/estimate/{disaster_id}", headers=headers)
    assert resp_relief.status_code == 200
    relief_data = resp_relief.json()
    assert relief_data["food_packets"] > 0
    assert relief_data["water_liters"] > 0

    # 11. Seed Road Network (Day 13)
    resp_seed = client.post("/routing/seed-network", headers=headers)
    assert resp_seed.status_code == 200

    # 12. Calculate Safe Route (Day 13)
    nodes = db_session.query(RoadNode).order_by(RoadNode.id.asc()).all()
    route_req = {
        "origin_node_id": nodes[0].id,
        "destination_node_id": nodes[-1].id,
        "prefer_safe": True,
        "algorithm": "dijkstra"
    }
    resp_route = client.post("/routing/calculate-route", json=route_req, headers=headers)
    assert resp_route.status_code == 200
    route_data = resp_route.json()
    assert len(route_data["path_node_ids"]) >= 2
    assert route_data["distance_km"] > 0
    assert "explanation" in route_data

    # 13. Run Intelligent Relief Allocation (Day 14)
    resp_alloc = client.post(
        f"/relief/{disaster_id}/intelligent-allocate?commit_to_db=true",
        headers=headers
    )
    assert resp_alloc.status_code == 200
    alloc_data = resp_alloc.json()
    assert alloc_data["disaster_id"] == disaster_id
    assert alloc_data["status"] == "completed"
    assert len(alloc_data["allocations"]) > 0

    # 14. Generate Reports (Standard and Comprehensive - Day 15)
    resp_std_report = client.get(f"/reports/{disaster_id}", headers=headers)
    assert resp_std_report.status_code == 200
    assert resp_std_report.headers["content-type"] == "application/pdf"
    assert resp_std_report.content.startswith(b"%PDF")

    resp_comp_report = client.get(f"/reports/{disaster_id}/comprehensive", headers=headers)
    assert resp_comp_report.status_code == 200
    assert resp_comp_report.headers["content-type"] == "application/pdf"
    assert resp_comp_report.content.startswith(b"%PDF")

    # 15. Retrieve Dashboard Summary (Day 16)
    resp_dash = client.get(f"/dashboard/{disaster_id}", headers=headers)
    assert resp_dash.status_code == 200
    dash = resp_dash.json()

    assert dash["disaster"]["id"] == disaster_id
    assert dash["simulation_status"] == "completed"
    assert dash["impact_score"] == impact_data["impact_score"]
    assert dash["impact_level"] == impact_data["impact_level"]
    assert dash["affected_population"] >= 4500
    assert dash["shelter_metrics"]["total_shelters"] >= 1
    assert dash["warehouse_metrics"]["total_warehouses"] >= 1
    assert dash["relief_requirements"]["food_packets"] > 0
    assert dash["allocations_count"] > 0
    assert "road_network" in dash
    assert dash["road_network"]["passable_corridors"] > 0
    assert "overall_response_status" in dash
    assert dash["overall_response_status"] in ["CRITICAL_ACTION_REQUIRED", "ELEVATED_RESPONSE", "NORMAL_MONITORING"]


def test_dashboard_api_error_handling(db_session: Session):
    client = TestClient(app)

    # 1. Non-existent disaster ID
    # Generate auth token
    user = db_session.query(User).first()
    token = client.post("/login", json={"email": user.email, "password": "EmergencySecurePassword123!"}).json().get("access_token")
    if not token:
        from app.security import create_access_token
        token = create_access_token({"sub": str(user.id)})

    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/dashboard/999999", headers=headers)
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Disaster not found"

    # 2. Unauthorized access without bearer token
    resp_unauth = client.get("/dashboard/1")
    assert resp_unauth.status_code in [401, 403]
