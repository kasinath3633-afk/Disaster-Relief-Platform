# DAY 13 COMPLETION REPORT: ROAD NETWORK + SAFE ROUTING

## 1. Objective
Establish an intelligent, risk-aware routing engine for disaster relief logistics. The system constructs an in-memory graph representation from relational database models (`RoadNode` and `RoadEdge`), calculates optimal trajectories using both Dijkstra and A* algorithms, dynamically enforces bypasses around hazardous or blocked road corridors, and explains route choices clearly with distance, travel time, and safety metrics.

## 2. Starting Repository State
- Branch: `climax`.
- Baseline Day 12 tests: 21 passed (`test_allocation.py`, `test_impact.py`, `test_gis.py`).
- PostgreSQL with PostGIS 3.4 running in Docker.
- No graph models, edge weighting, or route calculation capabilities existed previously.

## 3. Existing Functionality Verified
- Phase-1 allocation (6 tests), Day-11 impact assessment (7 tests), and Day-12 GIS spatial discovery (8 tests) all verified running cleanly.

## 4. What Was Implemented
- Database persistence models (`app/models/routing.py`):
  - `RoadNode`: Geographic vertex with name and WGS 84 coordinates.
  - `RoadEdge`: Weighted, directed/bidirectional edge with distance, speed limit, estimated travel time, risk score ($0.0\text{--}1.0$), and `is_blocked` status.
- Graph data structure & pathfinding service (`app/services/routing.py`):
  - In-memory `RoutingGraph` constructed directly from database state.
  - Multi-criteria edge cost calculation:
    $$\text{cost} = w_{\text{dist}} \times \text{distance} + w_{\text{time}} \times \text{travel\_time} + w_{\text{risk}} \times (\text{risk\_score} \times 10)$$
  - Strict exclusion of blocked edges (`cost = \infty`).
  - Priority-queue driven Dijkstra algorithm (`dijkstra_safe_path`).
  - A* search (`astar_safe_path`) with Haversine distance heuristic.
  - Automatic seed utility (`seed_sample_road_network`) creating a representative 7-node, 9-edge interconnected road network connecting logistics hubs, hazard sectors, bypasses, and shelters.
- Pydantic schemas (`app/schemas.py`):
  - `RouteNodeResponse`, `RouteEdgeResponse`, `RouteRequest`, `RouteResponse`, `RoadEdgeBlockUpdate`.
- Endpoints:
  - `POST /routing/calculate-route`: Computes shortest or safest route using Dijkstra or A*.
  - `GET /routing/nodes`: Lists road nodes.
  - `GET /routing/edges`: Lists road edges.
  - `PUT /routing/edges/{edge_id}/block`: Dynamically toggles road blockage status for real-time disaster rerouting.
  - `POST /routing/seed-network`: Idempotently seeds initial sample network.

## 5. Files Created
- `app/models/routing.py`: SQLAlchemy models for `RoadNode` and `RoadEdge`.
- `app/services/routing.py`: Graph management, Dijkstra, A*, edge weights, and network seeder.
- `app/test_routing.py`: 12 automated unit and integration tests.
- `README_Day13_Completion.md`: This completion documentation.

## 6. Files Modified
- `app/models/__init__.py`: Exported `RoadNode` and `RoadEdge`.
- `app/services/__init__.py`: Exported routing functions.
- `app/schemas.py`: Added routing request and response schemas.
- `app/main.py`: Registered routing endpoints and road models.

## 7. Database Changes
- Table added: `road_nodes`
  - `id`: Integer primary key, autoincrement
  - `name`: String(100), not null
  - `latitude`: Float, not null
  - `longitude`: Float, not null
- Table added: `road_edges`
  - `id`: Integer primary key, autoincrement
  - `name`: String(100), default 'Road'
  - `start_node_id`: Integer, foreign key referencing `road_nodes.id`
  - `end_node_id`: Integer, foreign key referencing `road_nodes.id`
  - `distance_km`: Float, not null
  - `speed_limit_kmh`: Float, default 40.0
  - `travel_time_minutes`: Float, not null
  - `risk_score`: Float, default 0.0
  - `is_blocked`: Boolean, default False

## 8. API Changes
- `POST /routing/calculate-route`:
  - Request: `origin_node_id`, `destination_node_id`, `prefer_safe` (bool), `algorithm` ("dijkstra" | "astar")
  - Response: Ordered node IDs, full node objects, total distance, travel time, composite risk score, safety classification, and natural-language explanation.
- `GET /routing/nodes`: Returns list of nodes.
- `GET /routing/edges`: Returns list of edges.
- `PUT /routing/edges/{edge_id}/block`: Toggles road accessibility (`{"is_blocked": true|false}`).
- `POST /routing/seed-network`: Seeds the sample network.

## 9. Algorithms
1. **Multi-Criteria Cost Evaluation:**
   When `prefer_safe = True`:
   $$\text{Weight} = 1.0 \cdot \text{distance\_km} + 0.5 \cdot \text{travel\_time\_min} + 8.0 \cdot (\text{risk\_score} \times 10)$$
   When `prefer_safe = False`:
   $$\text{Weight} = 1.0 \cdot \text{distance\_km} + 0.1 \cdot \text{travel\_time\_min}$$
   If `edge.is_blocked == True`, $\text{Weight} = \infty$.
2. **Dijkstra Algorithm:**
   Maintains min-heap priority queue over graph vertices, expanding the lowest tentative cost path.
3. **A\* Algorithm:**
   Augments path cost $g(n)$ with an admissible Euclidean/Haversine heuristic $h(n)$ to destination node:
   $$f(n) = g(n) + \text{haversine\_km}(n.\text{lat}, n.\text{lon}, \text{dest}.\text{lat}, \text{dest}.\text{lon})$$

## 10. Assumptions
- A deterministic 7-node sample road network is seeded to ensure fully verifiable, repeatable testing without relying on large external OSM downloads that could fail in restricted environments.
- Road segments are bidirectional unless specified otherwise.

## 11. Tests Added
- `test_graph_construction_and_weights`: Validates bidirectional edge insertion, safe vs shortest weights, and infinite cost for blocked edges.
- `test_dijkstra_shortest_vs_safest_path`: Confirms shortest mode selects shorter high-risk route while safe mode selects longer low-risk bypass.
- `test_blocked_road_avoidance`: Verifies dynamic detour routing when the primary road is blocked.
- `test_unreachable_destination`: Verifies `None` return when no connected component exists.
- `test_astar_search`: Confirms A* search with Haversine heuristic locates the target path.
- `test_seed_road_network_api`: Tests automated road network seeding.
- `test_get_nodes_and_edges_api`: Tests road graph inspection endpoints.
- `test_calculate_route_api`: Tests Dijkstra route calculation and explanation via REST API.
- `test_calculate_route_astar_api`: Tests A* route calculation via REST API.
- `test_dynamic_edge_block_and_reroute`: Verifies PUT edge blocking endpoint.
- `test_routing_missing_node`: Verifies 404 response on invalid node IDs.
- `test_routing_unauthorized`: Verifies 401/403 when token is omitted.

## 12. Test Results
- Targeted routing tests: 12 passed in `app/test_routing.py`.

## 13. Regression Test Results
```text
============================= test session starts =============================
platform win32 -- Python 3.13.3, pytest-9.1.1, pluggy-1.6.0
collected 33 items

app/test_allocation.py (6 tests)  PASSED
app/test_gis.py (8 tests)         PASSED
app/test_impact.py (7 tests)      PASSED
app/test_routing.py (12 tests)    PASSED

======================= 33 passed, 13 warnings in 1.70s =======================
```
All 33 tests passed. Zero regressions.

## 14. Swagger/API Verification
- Routing endpoints verified in OpenAPI schema with request and response documentation.

## 15. Database Verification
- Tables `road_nodes` and `road_edges` verified in PostgreSQL database with foreign key constraints.

## 16. Known Limitations
- Network size is currently tuned for deterministic university demonstrations; real OSM GeoJSON line strings can be imported into this exact node/edge schema.

## 17. Problems Encountered
- None. Graph construction and Dijkstra/A* path extraction executed smoothly.

## 18. How Problems Were Fixed
- N/A.

## 19. Final Architecture
```text
RoadNode & RoadEdge (PostgreSQL tables)
           │
           ▼
    RoutingGraph (In-memory adjacency list & weights)
           │
      ┌────┴────┐
      ▼         ▼
   Dijkstra     A* (Haversine heuristic)
      │         │
      └────┬────┘
           ▼
  Multi-Criteria Weighting (Distance + Travel Time + Risk Penalty + Block Filter)
           │
           ▼
RouteResponse (Ordered Coordinates + Distance + Time + Hazard Score + Human Explanation)
```

## 20. Next-Day Handoff (Day 14)
- Ready to proceed to **DAY 14: Intelligent Relief Allocation**.
- Baseline stands at 33 passing automated tests.
