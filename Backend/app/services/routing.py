import heapq
from typing import Dict, List, Optional, Tuple, Any
from sqlalchemy.orm import Session

from app.models.routing import RoadNode, RoadEdge
from app.utils.geo import haversine_km


class RoutingGraph:
    def __init__(self):
        self.nodes: Dict[int, RoadNode] = {}
        self.adjacency: Dict[int, List[Tuple[int, RoadEdge]]] = {}

    def add_node(self, node: RoadNode):
        self.nodes[node.id] = node
        if node.id not in self.adjacency:
            self.adjacency[node.id] = []

    def add_edge(self, edge: RoadEdge):
        if edge.start_node_id not in self.adjacency:
            self.adjacency[edge.start_node_id] = []
        if edge.end_node_id not in self.adjacency:
            self.adjacency[edge.end_node_id] = []

        self.adjacency[edge.start_node_id].append((edge.end_node_id, edge))
        # Bidirectional graph for standard road segments
        reverse_edge = RoadEdge(
            id=edge.id,
            name=edge.name,
            start_node_id=edge.end_node_id,
            end_node_id=edge.start_node_id,
            distance_km=edge.distance_km,
            speed_limit_kmh=edge.speed_limit_kmh,
            travel_time_minutes=edge.travel_time_minutes,
            risk_score=edge.risk_score,
            is_blocked=edge.is_blocked
        )
        self.adjacency[edge.end_node_id].append((edge.start_node_id, reverse_edge))

    @classmethod
    def from_database(cls, db: Session) -> "RoutingGraph":
        graph = cls()
        nodes = db.query(RoadNode).all()
        for node in nodes:
            graph.add_node(node)

        edges = db.query(RoadEdge).all()
        for edge in edges:
            graph.add_edge(edge)

        return graph


def compute_edge_weight(
    edge: RoadEdge,
    prefer_safe: bool = True
) -> float:
    """
    Compute edge traversal weight. Blocked roads have infinite cost.
    When prefer_safe is True, risk_score is heavily penalized.
    """
    if edge.is_blocked:
        return float("inf")

    if prefer_safe:
        w_dist = 1.0
        w_time = 0.5
        w_risk = 8.0
    else:
        w_dist = 1.0
        w_time = 0.1
        w_risk = 0.0

    return (
        w_dist * edge.distance_km
        + w_time * edge.travel_time_minutes
        + w_risk * (edge.risk_score * 10.0)
    )


def dijkstra_safe_path(
    graph: RoutingGraph,
    origin_id: int,
    destination_id: int,
    prefer_safe: bool = True
) -> Optional[Dict[str, Any]]:
    """
    Find shortest or safest path using Dijkstra's algorithm.
    """
    if origin_id not in graph.nodes or destination_id not in graph.nodes:
        return None

    if origin_id == destination_id:
        node = graph.nodes[origin_id]
        return {
            "origin_node_id": origin_id,
            "destination_node_id": destination_id,
            "path_node_ids": [origin_id],
            "path_nodes": [{"id": node.id, "name": node.name, "latitude": node.latitude, "longitude": node.longitude}],
            "distance_km": 0.0,
            "travel_time_minutes": 0.0,
            "risk_score": 0.0,
            "is_safe": True,
            "algorithm_used": "dijkstra",
            "explanation": "Origin and destination are identical."
        }

    distances = {node_id: float("inf") for node_id in graph.nodes}
    distances[origin_id] = 0.0

    previous_nodes: Dict[int, Optional[int]] = {node_id: None for node_id in graph.nodes}
    previous_edges: Dict[int, Optional[RoadEdge]] = {node_id: None for node_id in graph.nodes}

    pq = [(0.0, origin_id)]

    while pq:
        current_dist, current_node = heapq.heappop(pq)

        if current_dist > distances[current_node]:
            continue

        if current_node == destination_id:
            break

        for neighbor_id, edge in graph.adjacency.get(current_node, []):
            weight = compute_edge_weight(edge, prefer_safe=prefer_safe)
            if weight == float("inf"):
                continue

            tentative_dist = current_dist + weight
            if tentative_dist < distances[neighbor_id]:
                distances[neighbor_id] = tentative_dist
                previous_nodes[neighbor_id] = current_node
                previous_edges[neighbor_id] = edge
                heapq.heappush(pq, (tentative_dist, neighbor_id))

    if distances[destination_id] == float("inf"):
        return None

    # Reconstruct path
    path = []
    edges_traversed = []
    curr = destination_id
    while curr is not None:
        path.append(curr)
        edge = previous_edges[curr]
        if edge is not None:
            edges_traversed.append(edge)
        curr = previous_nodes[curr]
    path.reverse()
    edges_traversed.reverse()

    total_distance = sum(e.distance_km for e in edges_traversed)
    total_time = sum(e.travel_time_minutes for e in edges_traversed)
    avg_risk = sum(e.risk_score for e in edges_traversed) / len(edges_traversed) if edges_traversed else 0.0
    is_safe = (avg_risk <= 0.35) and all(not e.is_blocked for e in edges_traversed)

    mode_label = "Risk-minimized safe routing" if prefer_safe else "Direct shortest path"
    explanation = (
        f"{mode_label} computed from node {origin_id} ({graph.nodes[origin_id].name}) "
        f"to node {destination_id} ({graph.nodes[destination_id].name}). "
        f"Traversed {len(edges_traversed)} segments spanning {round(total_distance, 2)} km "
        f"with estimated travel time of {round(total_time, 1)} minutes and aggregate hazard risk of {round(avg_risk, 2)}."
    )

    path_node_objects = [
        {
            "id": graph.nodes[nid].id,
            "name": graph.nodes[nid].name,
            "latitude": graph.nodes[nid].latitude,
            "longitude": graph.nodes[nid].longitude
        }
        for nid in path
    ]

    return {
        "origin_node_id": origin_id,
        "destination_node_id": destination_id,
        "path_node_ids": path,
        "path_nodes": path_node_objects,
        "distance_km": round(total_distance, 2),
        "travel_time_minutes": round(total_time, 1),
        "risk_score": round(avg_risk, 2),
        "is_safe": is_safe,
        "algorithm_used": "dijkstra",
        "explanation": explanation
    }


def astar_safe_path(
    graph: RoutingGraph,
    origin_id: int,
    destination_id: int,
    prefer_safe: bool = True
) -> Optional[Dict[str, Any]]:
    """
    Find path using A* search with Haversine distance heuristic.
    """
    if origin_id not in graph.nodes or destination_id not in graph.nodes:
        return None

    dest_node = graph.nodes[destination_id]

    g_score = {node_id: float("inf") for node_id in graph.nodes}
    g_score[origin_id] = 0.0

    def heuristic(nid: int) -> float:
        n = graph.nodes[nid]
        return haversine_km(n.latitude, n.longitude, dest_node.latitude, dest_node.longitude)

    f_score = {node_id: float("inf") for node_id in graph.nodes}
    f_score[origin_id] = heuristic(origin_id)

    previous_nodes: Dict[int, Optional[int]] = {node_id: None for node_id in graph.nodes}
    previous_edges: Dict[int, Optional[RoadEdge]] = {node_id: None for node_id in graph.nodes}

    open_set = [(f_score[origin_id], origin_id)]

    while open_set:
        _, current_node = heapq.heappop(open_set)

        if current_node == destination_id:
            break

        for neighbor_id, edge in graph.adjacency.get(current_node, []):
            weight = compute_edge_weight(edge, prefer_safe=prefer_safe)
            if weight == float("inf"):
                continue

            tentative_g = g_score[current_node] + weight
            if tentative_g < g_score[neighbor_id]:
                previous_nodes[neighbor_id] = current_node
                previous_edges[neighbor_id] = edge
                g_score[neighbor_id] = tentative_g
                f_score[neighbor_id] = tentative_g + heuristic(neighbor_id)
                heapq.heappush(open_set, (f_score[neighbor_id], neighbor_id))

    if g_score[destination_id] == float("inf"):
        return None

    path = []
    edges_traversed = []
    curr = destination_id
    while curr is not None:
        path.append(curr)
        edge = previous_edges[curr]
        if edge is not None:
            edges_traversed.append(edge)
        curr = previous_nodes[curr]
    path.reverse()
    edges_traversed.reverse()

    total_distance = sum(e.distance_km for e in edges_traversed)
    total_time = sum(e.travel_time_minutes for e in edges_traversed)
    avg_risk = sum(e.risk_score for e in edges_traversed) / len(edges_traversed) if edges_traversed else 0.0
    is_safe = (avg_risk <= 0.35) and all(not e.is_blocked for e in edges_traversed)

    mode_label = "Risk-minimized safe routing (A*)" if prefer_safe else "Direct shortest path (A*)"
    explanation = (
        f"{mode_label} computed from node {origin_id} ({graph.nodes[origin_id].name}) "
        f"to node {destination_id} ({graph.nodes[destination_id].name}). "
        f"Traversed {len(edges_traversed)} segments covering {round(total_distance, 2)} km "
        f"with estimated travel time of {round(total_time, 1)} minutes and hazard risk of {round(avg_risk, 2)}."
    )

    path_node_objects = [
        {
            "id": graph.nodes[nid].id,
            "name": graph.nodes[nid].name,
            "latitude": graph.nodes[nid].latitude,
            "longitude": graph.nodes[nid].longitude
        }
        for nid in path
    ]

    return {
        "origin_node_id": origin_id,
        "destination_node_id": destination_id,
        "path_node_ids": path,
        "path_nodes": path_node_objects,
        "distance_km": round(total_distance, 2),
        "travel_time_minutes": round(total_time, 1),
        "risk_score": round(avg_risk, 2),
        "is_safe": is_safe,
        "algorithm_used": "astar",
        "explanation": explanation
    }


def seed_sample_road_network(db: Session) -> Dict[str, int]:
    """
    Seed deterministic sample road network for university project demonstration.
    Creates 7 nodes and 9 interconnected road segments with risk variations and bypass routes.
    """
    existing_nodes = db.query(RoadNode).count()
    if existing_nodes > 0:
        return {"nodes": existing_nodes, "edges": db.query(RoadEdge).count(), "seeded": False}

    nodes = [
        RoadNode(name="Logistics Hub 1 (South)", latitude=13.0827, longitude=80.2707),
        RoadNode(name="Central Junction North", latitude=13.1000, longitude=80.2600),
        RoadNode(name="Eastern Coastal Highway", latitude=13.0900, longitude=80.2900),
        RoadNode(name="Hazard Flood Bypass (West)", latitude=13.1100, longitude=80.2450),
        RoadNode(name="Bridge Corridor (Hazard Sector)", latitude=13.1150, longitude=80.2750),
        RoadNode(name="Shelter Complex North", latitude=13.1300, longitude=80.2600),
        RoadNode(name="Emergency Evacuation Base", latitude=13.1400, longitude=80.2800),
    ]
    db.add_all(nodes)
    db.commit()
    for n in nodes:
        db.refresh(n)

    # Segments
    edges = [
        # Hub to Junction
        RoadEdge(name="Hub-Central Connector", start_node_id=nodes[0].id, end_node_id=nodes[1].id,
                 distance_km=2.5, speed_limit_kmh=50.0, travel_time_minutes=3.0, risk_score=0.05, is_blocked=False),
        # Hub to Coastal
        RoadEdge(name="Hub-Coast Link", start_node_id=nodes[0].id, end_node_id=nodes[2].id,
                 distance_km=2.2, speed_limit_kmh=40.0, travel_time_minutes=3.3, risk_score=0.10, is_blocked=False),
        # Junction to Flood Bypass
        RoadEdge(name="Western Bypass Road", start_node_id=nodes[1].id, end_node_id=nodes[3].id,
                 distance_km=3.0, speed_limit_kmh=60.0, travel_time_minutes=3.0, risk_score=0.02, is_blocked=False),
        # Junction to Bridge (Hazardous direct path)
        RoadEdge(name="Bridge Road Sector", start_node_id=nodes[1].id, end_node_id=nodes[4].id,
                 distance_km=2.0, speed_limit_kmh=40.0, travel_time_minutes=3.0, risk_score=0.85, is_blocked=False),
        # Coastal to Bridge
        RoadEdge(name="Coast-Bridge Link", start_node_id=nodes[2].id, end_node_id=nodes[4].id,
                 distance_km=3.2, speed_limit_kmh=45.0, travel_time_minutes=4.3, risk_score=0.40, is_blocked=False),
        # Bypass to Shelter
        RoadEdge(name="Northwest Approach", start_node_id=nodes[3].id, end_node_id=nodes[5].id,
                 distance_km=2.8, speed_limit_kmh=55.0, travel_time_minutes=3.1, risk_score=0.05, is_blocked=False),
        # Bridge to Shelter
        RoadEdge(name="Direct Bridge-Shelter Access", start_node_id=nodes[4].id, end_node_id=nodes[5].id,
                 distance_km=2.1, speed_limit_kmh=40.0, travel_time_minutes=3.1, risk_score=0.75, is_blocked=False),
        # Bridge to Evacuation Base
        RoadEdge(name="Bridge-Evacuation Link", start_node_id=nodes[4].id, end_node_id=nodes[6].id,
                 distance_km=3.5, speed_limit_kmh=50.0, travel_time_minutes=4.2, risk_score=0.30, is_blocked=False),
        # Shelter to Evacuation Base
        RoadEdge(name="Perimeter Ring Road", start_node_id=nodes[5].id, end_node_id=nodes[6].id,
                 distance_km=2.6, speed_limit_kmh=50.0, travel_time_minutes=3.1, risk_score=0.05, is_blocked=False),
    ]
    db.add_all(edges)
    db.commit()

    return {"nodes": len(nodes), "edges": len(edges), "seeded": True}
