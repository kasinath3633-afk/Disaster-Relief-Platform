import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.routing import RoadNode, RoadEdge
from app.security import hash_password, create_access_token
from app.services.routing import (
    RoutingGraph,
    dijkstra_safe_path,
    astar_safe_path,
    compute_edge_weight,
    seed_sample_road_network
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
    user = db_session.query(User).filter(User.email == "routing_tester@example.com").first()
    if not user:
        user = User(
            username="routing_tester",
            email="routing_tester@example.com",
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
# 1. UNIT TESTS: GRAPH ALGORITHMS, WEIGHTS & HEURISTICS
# ============================================================

def test_graph_construction_and_weights():
    graph = RoutingGraph()
    n1 = RoadNode(id=1, name="Node 1", latitude=13.0, longitude=80.0)
    n2 = RoadNode(id=2, name="Node 2", latitude=13.1, longitude=80.1)
    graph.add_node(n1)
    graph.add_node(n2)

    edge = RoadEdge(
        id=1,
        name="Test Edge",
        start_node_id=1,
        end_node_id=2,
        distance_km=5.0,
        speed_limit_kmh=50.0,
        travel_time_minutes=6.0,
        risk_score=0.1,
        is_blocked=False
    )
    graph.add_edge(edge)

    assert 1 in graph.nodes
    assert 2 in graph.nodes
    assert len(graph.adjacency[1]) == 1
    assert len(graph.adjacency[2]) == 1  # Bidirectional

    # Normal weight
    w_safe = compute_edge_weight(edge, prefer_safe=True)
    w_short = compute_edge_weight(edge, prefer_safe=False)
    assert w_safe > 0
    assert w_short > 0

    # Blocked weight must be infinity
    edge.is_blocked = True
    assert compute_edge_weight(edge, prefer_safe=True) == float("inf")
    assert compute_edge_weight(edge, prefer_safe=False) == float("inf")


def test_dijkstra_shortest_vs_safest_path():
    graph = RoutingGraph()
    # 3 nodes: 1 -> 2 direct (hazardous), 1 -> 3 -> 2 (safe bypass)
    n1 = RoadNode(id=10, name="Origin", latitude=13.0, longitude=80.0)
    n2 = RoadNode(id=20, name="Destination", latitude=13.0, longitude=80.2)
    n3 = RoadNode(id=30, name="Safe Bypass", latitude=13.1, longitude=80.1)

    graph.add_node(n1)
    graph.add_node(n2)
    graph.add_node(n3)

    # Edge direct: 2.0 km, risk 0.90
    e_direct = RoadEdge(
        id=101, name="Direct Dangerous Road",
        start_node_id=10, end_node_id=20,
        distance_km=2.0, speed_limit_kmh=40.0,
        travel_time_minutes=3.0, risk_score=0.90, is_blocked=False
    )
    # Edge bypass 1: 1.5 km, risk 0.05
    e_b1 = RoadEdge(
        id=102, name="Bypass Leg 1",
        start_node_id=10, end_node_id=30,
        distance_km=1.5, speed_limit_kmh=60.0,
        travel_time_minutes=1.5, risk_score=0.05, is_blocked=False
    )
    # Edge bypass 2: 1.5 km, risk 0.05
    e_b2 = RoadEdge(
        id=103, name="Bypass Leg 2",
        start_node_id=30, end_node_id=20,
        distance_km=1.5, speed_limit_kmh=60.0,
        travel_time_minutes=1.5, risk_score=0.05, is_blocked=False
    )

    graph.add_edge(e_direct)
    graph.add_edge(e_b1)
    graph.add_edge(e_b2)

    # 1. Shortest path mode (prefer_safe=False) should pick direct edge (2.0 km < 3.0 km)
    route_short = dijkstra_safe_path(graph, origin_id=10, destination_id=20, prefer_safe=False)
    assert route_short is not None
    assert route_short["path_node_ids"] == [10, 20]
    assert route_short["distance_km"] == 2.0

    # 2. Safe path mode (prefer_safe=True) should pick the bypass to avoid the 0.90 risk
    route_safe = dijkstra_safe_path(graph, origin_id=10, destination_id=20, prefer_safe=True)
    assert route_safe is not None
    assert route_safe["path_node_ids"] == [10, 30, 20]
    assert route_safe["distance_km"] == 3.0
    assert route_safe["is_safe"] is True


def test_blocked_road_avoidance():
    graph = RoutingGraph()
    n1 = RoadNode(id=100, name="A", latitude=13.0, longitude=80.0)
    n2 = RoadNode(id=200, name="B", latitude=13.0, longitude=80.1)
    n3 = RoadNode(id=300, name="C", latitude=13.1, longitude=80.05)

    graph.add_node(n1)
    graph.add_node(n2)
    graph.add_node(n3)

    # Direct edge is blocked
    e_direct = RoadEdge(
        id=201, name="Blocked Highway",
        start_node_id=100, end_node_id=200,
        distance_km=1.0, speed_limit_kmh=60.0,
        travel_time_minutes=1.0, risk_score=0.0, is_blocked=True
    )
    e_detour1 = RoadEdge(
        id=202, name="Detour 1",
        start_node_id=100, end_node_id=300,
        distance_km=2.0, speed_limit_kmh=50.0,
        travel_time_minutes=2.4, risk_score=0.1, is_blocked=False
    )
    e_detour2 = RoadEdge(
        id=203, name="Detour 2",
        start_node_id=300, end_node_id=200,
        distance_km=2.0, speed_limit_kmh=50.0,
        travel_time_minutes=2.4, risk_score=0.1, is_blocked=False
    )
    graph.add_edge(e_direct)
    graph.add_edge(e_detour1)
    graph.add_edge(e_detour2)

    # Even with prefer_safe=False, must take detour because direct is blocked
    route = dijkstra_safe_path(graph, origin_id=100, destination_id=200, prefer_safe=False)
    assert route is not None
    assert route["path_node_ids"] == [100, 300, 200]
    assert route["distance_km"] == 4.0


def test_unreachable_destination():
    graph = RoutingGraph()
    n1 = RoadNode(id=501, name="Island A", latitude=13.0, longitude=80.0)
    n2 = RoadNode(id=502, name="Island B", latitude=14.0, longitude=81.0)
    graph.add_node(n1)
    graph.add_node(n2)
    # No edges connecting n1 and n2

    route = dijkstra_safe_path(graph, origin_id=501, destination_id=502)
    assert route is None


def test_astar_search():
    graph = RoutingGraph()
    n1 = RoadNode(id=601, name="Start", latitude=13.0, longitude=80.0)
    n2 = RoadNode(id=602, name="Mid", latitude=13.05, longitude=80.05)
    n3 = RoadNode(id=603, name="Goal", latitude=13.10, longitude=80.10)
    graph.add_node(n1)
    graph.add_node(n2)
    graph.add_node(n3)

    graph.add_edge(RoadEdge(
        id=701, name="E1", start_node_id=601, end_node_id=602,
        distance_km=5.0, speed_limit_kmh=50.0, travel_time_minutes=6.0, risk_score=0.05, is_blocked=False
    ))
    graph.add_edge(RoadEdge(
        id=702, name="E2", start_node_id=602, end_node_id=603,
        distance_km=5.0, speed_limit_kmh=50.0, travel_time_minutes=6.0, risk_score=0.05, is_blocked=False
    ))

    route = astar_safe_path(graph, origin_id=601, destination_id=603, prefer_safe=True)
    assert route is not None
    assert route["path_node_ids"] == [601, 602, 603]
    assert route["algorithm_used"] == "astar"


# ============================================================
# 2. INTEGRATION TESTS: DATABASE SEEDING & ROUTING APIS
# ============================================================

def test_seed_road_network_api(auth_headers, db_session: Session):
    client = TestClient(app)
    resp = client.post("/routing/seed-network", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["nodes"] >= 7
    assert data["edges"] >= 9


def test_get_nodes_and_edges_api(auth_headers):
    client = TestClient(app)
    resp_nodes = client.get("/routing/nodes", headers=auth_headers)
    assert resp_nodes.status_code == 200
    nodes = resp_nodes.json()
    assert len(nodes) >= 7

    resp_edges = client.get("/routing/edges", headers=auth_headers)
    assert resp_edges.status_code == 200
    edges = resp_edges.json()
    assert len(edges) >= 9


def test_calculate_route_api(auth_headers, db_session: Session):
    client = TestClient(app)
    # Seed network nodes are present
    nodes = db_session.query(RoadNode).order_by(RoadNode.id.asc()).all()
    origin = nodes[0]
    destination = nodes[5]  # Shelter Complex North

    # Test Dijkstra Safe Route
    payload = {
        "origin_node_id": origin.id,
        "destination_node_id": destination.id,
        "prefer_safe": True,
        "algorithm": "dijkstra"
    }
    resp = client.post("/routing/calculate-route", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["origin_node_id"] == origin.id
    assert data["destination_node_id"] == destination.id
    assert len(data["path_node_ids"]) >= 2
    assert data["distance_km"] > 0
    assert data["travel_time_minutes"] > 0
    assert "explanation" in data
    assert data["algorithm_used"] == "dijkstra"


def test_calculate_route_astar_api(auth_headers, db_session: Session):
    client = TestClient(app)
    nodes = db_session.query(RoadNode).order_by(RoadNode.id.asc()).all()
    origin = nodes[0]
    destination = nodes[6]  # Emergency Evacuation Base

    payload = {
        "origin_node_id": origin.id,
        "destination_node_id": destination.id,
        "prefer_safe": True,
        "algorithm": "astar"
    }
    resp = client.post("/routing/calculate-route", json=payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["algorithm_used"] == "astar"


def test_dynamic_edge_block_and_reroute(auth_headers, db_session: Session):
    client = TestClient(app)
    edges = db_session.query(RoadEdge).all()
    edge_to_block = edges[0]

    # Block edge
    resp = client.put(
        f"/routing/edges/{edge_to_block.id}/block",
        json={"is_blocked": True},
        headers=auth_headers
    )
    assert resp.status_code == 200
    assert resp.json()["is_blocked"] is True

    # Unblock edge for cleanup
    resp2 = client.put(
        f"/routing/edges/{edge_to_block.id}/block",
        json={"is_blocked": False},
        headers=auth_headers
    )
    assert resp2.status_code == 200
    assert resp2.json()["is_blocked"] is False


def test_routing_missing_node(auth_headers):
    client = TestClient(app)
    payload = {
        "origin_node_id": 99999,
        "destination_node_id": 88888,
        "prefer_safe": True,
        "algorithm": "dijkstra"
    }
    resp = client.post("/routing/calculate-route", json=payload, headers=auth_headers)
    assert resp.status_code == 404


def test_routing_unauthorized():
    client = TestClient(app)
    resp = client.get("/routing/nodes")
    assert resp.status_code in [401, 403]
