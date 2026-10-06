# Disaster Simulation and Intelligent Relief Allocation System

A high-performance, modular disaster-response decision-support backend built with **FastAPI**, **PostgreSQL**, **PostGIS**, and **SQLAlchemy**. Designed for emergency coordinators to simulate disaster impact, discover nearby resources, compute risk-aware logistics routes, optimize multi-shelter relief allocation, and generate comprehensive audit reports.

---

## Architecture Overview

```text
                          AUTHENTICATION (JWT / Argon2)
                                       │
                                       ▼
                                   DISASTER
                                       │
                                       ▼
                                  SIMULATION (Population Spatial Intersection)
                                       │
                                       ▼
                              IMPACT ASSESSMENT (Multi-Sector Exposure Scoring)
                                       │
                                       ▼
                              RELIEF REQUIREMENT (Food, Water, Medical, Blankets)
                                       │
                                       ▼
                       GIS / POSTGIS (Spatial GIST Proximity Queries)
                                       │
                                       ▼
                       ROAD NETWORK & ROUTING (Dijkstra / A* Safe Routing)
                                       │
                                       ▼
                      INTELLIGENT ALLOCATION (Priority Scoring & Shortage Tracking)
                                       │
                                       ▼
                    EXTERNAL TELEMETRY (Resilient Weather Adapters)
                                       │
                        ┌──────────────┴──────────────┐
                        ▼                             ▼
              PDF AUDIT DOSSIERS             UNIFIED DASHBOARD API
             (Standard & Comprehensive)    (GET /dashboard/{disaster_id})
```

---

## Key Capabilities

1. **Phase-1 Baseline (Days 1–10):**
   - JWT Authentication & Argon2 password hashing with role-based access.
   - Core domain management for Disasters, Population Points, Shelters, Warehouses, and Resources.
   - Disaster zone simulation (radius-based population intersection and footprint area).
   - Baseline relief requirements estimation and warehouse inventory decrement.
   - ReportLab PDF disaster report generator.

2. **Day 11 — Advanced Impact Assessment:**
   - Multi-sector empirical estimation for building damage and road network disruption.
   - Composite weighted impact scoring: Population (40%), Buildings (20%), Roads (15%), Severity (25%).
   - Severity classification: `LOW` (0–25), `MODERATE` (26–50), `HIGH` (51–75), `CRITICAL` (76–100).
   - Endpoints: `POST /impact/run/{disaster_id}`, `GET /impact/{disaster_id}`.

3. **Day 12 — Advanced GIS / PostGIS:**
   - WGS 84 (EPSG:4326) coordinate validation bounds (lat: $[-90, 90]$, lon: $[-180, 180]$).
   - Functional GIST spatial indexing on geometries (`ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography`).
   - Native PostGIS spatial queries (`ST_DWithin`, `ST_Distance`).
   - GeoJSON FeatureCollection serialization for map visualizers.
   - Endpoints: `GET /gis/shelters/nearby`, `GET /gis/warehouses/nearby`, `GET /gis/population/affected`.

4. **Day 13 — Road Network & Safe Routing:**
   - Relational road network models (`RoadNode` and `RoadEdge`).
   - Multi-criteria edge cost evaluation balancing distance, transit time, and transit hazard risk.
   - Priority-queue Dijkstra and A* pathfinding with Haversine heuristic.
   - Dynamic road blockage toggling (`PUT /routing/edges/{id}/block`) for flood and debris detours.
   - Endpoints: `POST /routing/calculate-route`, `GET /routing/nodes`, `GET /routing/edges`, `POST /routing/seed-network`.

5. **Day 14 — Intelligent Relief Allocation:**
   - Destination priority scoring heuristic balancing shelter capacity pressure and disaster intensity.
   - Route-aware warehouse selection ranking candidates by distance and route hazard exposure.
   - Dynamic multi-warehouse multi-destination dispatching with exact unmet demand tracking.
   - Endpoint: `POST /relief/{disaster_id}/intelligent-allocate`.

6. **Day 15 — Real-World Telemetry & Reporting:**
   - Resilient provider adapter architecture (`ExternalDataProvider`) with automatic fallback to deterministic simulation during network failure.
   - Atmospheric risk formula incorporating rainfall, wind speed, and visibility.
   - Multi-sector comprehensive PDF audit dossier (`GET /reports/{disaster_id}/comprehensive`).
   - Endpoint: `GET /external/weather`.

7. **Day 16 — Unified Dashboard & End-to-End Hardening:**
   - Tactical coordinator dashboard aggregating real-time incident status, resources, road conditions, and alerts (`GET /dashboard/{disaster_id}`).
   - Comprehensive 15-step end-to-end integration test suite (`app/test_end_to_end.py`).
   - 51 passing automated tests across the regression suite.

---

## Technology Stack

- **Framework:** FastAPI (Python 3.13)
- **Database:** PostgreSQL 16 with PostGIS 3.4
- **ORM:** SQLAlchemy 2.0 (Mapped Columns, DeclarativeBase)
- **Driver:** psycopg 3 (async/binary driver)
- **Validation:** Pydantic v2
- **Security:** Argon2 (`pwdlib[argon2]`), PyJWT
- **Reporting:** ReportLab 5.0
- **HTTP Client:** HTTPX
- **Testing:** pytest with TestClient

---

## Quickstart Guide

### 1. Start the PostgreSQL / PostGIS Database
```powershell
docker compose up -d
```
The database will start on `localhost:5432` with credentials defined in `docker-compose.yml` (`postgres` / `postgres`).

### 2. Activate Virtual Environment & Install Dependencies
```powershell
.\venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Run the Development Server
```powershell
uvicorn app.main:app --reload --port 8000
```
Interactive Swagger API documentation will be available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 4. Run the Automated Test Suite
```powershell
pytest -v
```
All 51 automated unit, integration, and end-to-end tests will execute in under 3 seconds.

---

## Daily Completion Reports

Detailed verification reports, algorithms, schemas, and test outputs for each development phase:

- [`README_Day11_Completion.md`](file:///c:/Users/jishn/OneDrive/Documents/Disaster%20Management%20System/Backend/README_Day11_Completion.md): Advanced Impact Assessment
- [`README_Day12_Completion.md`](file:///c:/Users/jishn/OneDrive/Documents/Disaster%20Management%20System/Backend/README_Day12_Completion.md): Advanced GIS & PostGIS Spatial Integration
- [`README_Day13_Completion.md`](file:///c:/Users/jishn/OneDrive/Documents/Disaster%20Management%20System/Backend/README_Day13_Completion.md): Road Network & Dijkstra/A* Safe Routing
- [`README_Day14_Completion.md`](file:///c:/Users/jishn/OneDrive/Documents/Disaster%20Management%20System/Backend/README_Day14_Completion.md): Intelligent Relief Allocation & Unmet Demand
- [`README_Day15_Completion.md`](file:///c:/Users/jishn/OneDrive/Documents/Disaster%20Management%20System/Backend/README_Day15_Completion.md): External Data Integration & Comprehensive Reporting
- [`README_Day16_Completion.md`](file:///c:/Users/jishn/OneDrive/Documents/Disaster%20Management%20System/Backend/README_Day16_Completion.md): Unified Dashboard API & Final End-to-End Verification
