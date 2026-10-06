# Disaster Simulation and Intelligent Relief Allocation System

A high-performance, full-stack disaster response and decision-support platform designed for emergency coordinators. The system integrates real-time geospatial modeling (**PostGIS**), multi-criteria heuristic logistics optimization, risk-aware routing (**Dijkstra** and **A\***), atmospheric telemetry adapters, ReportLab vector PDF audit generation, and an interactive **Next.js 14** tactical operations command dashboard.

---

## System Architecture

```text
                     INCIDENT COMMANDER / USER
                                │
                                ▼
                   NEXT.JS 14 FRONTEND (PORT 3000)
                                │
       ┌────────────────────────┼────────────────────────┐
       ▼                        ▼                        ▼
Tactical Dashboard         Command Map               Operations
(Situation Awareness)    (Leaflet / PostGIS)             │
       │                        │                        ├── Disasters
       │                        │                        ├── Shelters
       │                        │                        ├── Warehouses
       │                        │                        ├── Allocation
       │                        │                        └── Reports (PDF)
       └────────────────────────┼────────────────────────┘
                                │
                       REST APIs / JWT Bearer
                                │
                                ▼
                    FASTAPI BACKEND (PORT 8000)
                                │
       ┌────────────────────────┼────────────────────────┐
       ▼                        ▼                        ▼
Spatial Simulation      Impact Assessment          GIS / PostGIS
(Haversine Footprint)   (Multi-Sector Damage)    (GIST Proximity)
       │                        │                        │
       └────────────────────────┼────────────────────────┘
                                ▼
                       Road Network Graph
                     (Dijkstra / A* Safe Routing)
                                │
                                ▼
                     Intelligent Allocation
               (Priority-Weighted Heuristic Engine)
                                │
                                ▼
                   Resilient Weather Telemetry
                                │
                                ▼
                 PDF Audits & Unified Dashboard
                                │
                                ▼
                   PostgreSQL 16 + PostGIS 3.4
```

---

## Key Modules & Capabilities

### 1. Authentication & Security
- **Backend:** Passwords hashed with Argon2 (`pwdlib[argon2]`); access tokens issued via PyJWT with standard HS256 signatures.
- **Frontend:** Centralized token handling, reactive session synchronization across tabs/components, 401 automatic redirection with session expiry alerts, and protected route wrapper (`ProtectedRoute`).

### 2. Disaster Simulation & Multi-Sector Impact
- **Spatial Intersection:** Haversine radial filtering calculates affected population density and footprint area ($km^2$).
- **Multi-Sector Empirical Exposure:** Estimates structural building damage and road segment disruption.
- **Composite Scoring:** Weighted index: Population (40%), Buildings (20%), Roads (15%), Severity (25%) classified into `LOW`, `MODERATE`, `HIGH`, or `CRITICAL`.

### 3. Advanced GIS & PostGIS Spatial Integration
- **CRS Standards:** WGS 84 (EPSG:4326) with strict $[-90, 90]$ latitude and $[-180, 180]$ longitude bounding.
- **Spatial Indexing:** Functional GIST indexes on geometries (`ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography`).
- **GeoJSON Streaming:** Native serialization of affected population points for interactive map overlays.
- **Proximity Queries:** Native PostGIS `ST_DWithin` and `ST_Distance` calculations for shelters and logistics warehouses.

### 4. Road Network & Risk-Aware Routing
- **Graph Modeling:** Relational nodes (`RoadNode`) and corridors (`RoadEdge`) with distance, speed limits, transit times, and hazard risk scores.
- **Dual Pathfinding Algorithms:**
  - *Dijkstra:* Exact multi-criteria path minimizing distance, transit time, or aggregate hazard risk.
  - *A\* Search:* Accelerated pathfinding utilizing Haversine heuristic distance.
- **Dynamic Corridor Blockage:** Real-time road toggling (`PUT /routing/edges/{id}/block`) for flood and debris detours.

### 5. Intelligent Multi-Shelter Relief Allocation
- **Demand Targets:** Calculates food packets, water liters, medical kits, and blanket requirements based on affected population.
- **Priority Heuristic:** Evaluates destination shelter capacity pressure and disaster intensity.
- **Route-Aware Dispatching:** Matches destinations with nearest low-risk warehouse stockpiles.
- **Unmet Demand Audit:** Explicit tracking of supply deficits and exhausted regional inventories.
- **Preview vs. Commit:** Preview allocation dispatches safely without altering inventory, or commit to decrement warehouse stock and record persistent allocations.

### 6. Atmospheric Telemetry & Resilient Fallback
- **Weather Service:** Fetches real-time precipitation, wind speed, visibility, condition, and composite atmospheric risk.
- **Resilient Fallback:** Automatically switches to deterministic algorithmic simulation if external weather providers encounter network timeouts.

### 7. Official Audit Dossiers (ReportLab PDF)
- **Standard Disaster Report:** Executive summary of disaster parameters, simulation results, relief requirements, and shelter occupancies.
- **Comprehensive Audit Dossier:** Multi-sector verification report incorporating weather telemetry, road network states, and intelligent allocation dispatch receipts.
- **Frontend PDF Engine:** In-browser responsive PDF viewer with direct download and tab export.

### 8. Tactical Command Dashboard (`/dashboard`)
- **Central Aggregation API:** `GET /dashboard/{disaster_id}` delivers complete situation awareness in a single optimized payload.
- **Situation State Machine:** Automatically evaluates overall status into:
  - `CRITICAL_ACTION_REQUIRED`
  - `ELEVATED_RESPONSE`
  - `NORMAL_MONITORING`
- **Interactive Cartography:** OpenStreetMap cartographic tiles with layer controls for population points, shelters, warehouses, and road corridors.

---

## Technology Stack

### Backend
- **Framework:** FastAPI (Python 3.13)
- **Database:** PostgreSQL 16 with PostGIS 3.4
- **ORM:** SQLAlchemy 2.0 (Mapped Columns, DeclarativeBase)
- **Database Driver:** psycopg 3 (async/binary driver)
- **Validation:** Pydantic v2
- **Security:** Argon2 (`pwdlib`), PyJWT
- **Reporting:** ReportLab 5.0
- **HTTP Client:** HTTPX
- **Test Suite:** pytest with TestClient (51 automated tests)

### Frontend
- **Framework:** Next.js 14.2 (App Router)
- **Language:** TypeScript 5.6
- **Styling:** Tailwind CSS 3.4
- **Iconography:** Lucide React
- **Cartography:** Leaflet 1.9 & React-Leaflet 4.2
- **State & Session:** Local storage with event-driven cross-tab synchronization

---

## Environment Configuration

### Backend (`Backend/.env`)
```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/disaster_relief
JWT_SECRET_KEY=your-very-long-random-secret-key-here-at-least-32-characters
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Quickstart Guide

### Prerequisites
- Docker & Docker Compose (for PostgreSQL + PostGIS)
- Python 3.13
- Node.js 18+ (verified on Node.js 22.17.0 and npm 10.9.2)

### 1. Start the PostgreSQL / PostGIS Database
```powershell
# From the project root or Backend directory:
docker compose -f Backend/docker-compose.yml up -d
```
The database will listen on `localhost:5432` (`postgres` / `postgres`).

### 2. Start the FastAPI Backend
```powershell
cd Backend
.\venv\Scripts\activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive API documentation will be available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Health check: `http://localhost:8000/health`

### 3. Run Automated Backend Tests
```powershell
cd Backend
.\venv\Scripts\pytest.exe -v
```
All 51 automated unit, integration, and end-to-end tests will execute in under 3 seconds.

### 4. Start the Next.js Frontend
```powershell
cd frontend
npm run dev
```
Open `http://localhost:3000` in your browser.

To compile a production build:
```powershell
cd frontend
npm run build
npm run start
```

---

## Complete Operational User Journey

The system supports an end-to-end operational workflow verified by automated integration scripts:

1. **Authentication:** Sign in at `/login` as coordinator (`coordinator_e2e_final@emergency.gov` / `EmergencySecurePassword123!`).
2. **Disaster Selection:** Select an active incident or register a new one at `/disasters`.
3. **Command Dashboard:** View live situation status, active warnings, and KPI metric cards at `/dashboard`.
4. **Impact Assessment:** View multi-sector structural damage estimates and exposure indices.
5. **Interactive GIS Map:** Inspect spatial layers (Disaster epicenter, population points, shelters, warehouses).
6. **Shelter Network:** Manage capacity and monitor influx at `/shelters`.
7. **Logistics Stockpiles:** Track depot inventories and provision relief commodities at `/warehouses`.
8. **Meteorological Telemetry:** Check rainfall, wind speed, visibility, and atmospheric hazard scores.
9. **Safe Routing:** Calculate Dijkstra or A* safe corridors between hubs and shelters at `/routing`, avoiding blocked segments.
10. **Intelligent Allocation:** Preview or commit multi-shelter dispatches at `/allocation`.
11. **Unmet Demand Audit:** Review supply deficits and regional shortage explanations.
12. **Audit Dossiers:** Generate and preview standard or comprehensive ReportLab PDF reports at `/reports`.
13. **Return to Dashboard:** Synchronized live incident status.

---

## Verification Test Results

```text
============================= test session starts =============================
platform win32 -- Python 3.13.3, pytest-9.1.1, pluggy-1.6.0
collected 51 items

app/test_allocation.py (6 tests)              PASSED
app/test_end_to_end.py (2 tests)              PASSED
app/test_external_data.py (9 tests)           PASSED
app/test_gis.py (8 tests)                     PASSED
app/test_impact.py (7 tests)                  PASSED
app/test_intelligent_allocation.py (7 tests)  PASSED
app/test_routing.py (12 tests)                PASSED

======================= 51 passed in 2.51s =======================
```

Next.js Production Build:
```text
Route (app)                              Size     First Load JS
┌ ○ /                                    737 B          88.5 kB
├ ○ /_not-found                          873 B          88.6 kB
├ ○ /allocation                          4.03 kB         113 kB
├ ○ /dashboard                           8.29 kB         117 kB
├ ○ /disasters                           4.33 kB         113 kB
├ ○ /login                               5.01 kB        92.8 kB
├ ○ /reports                             3 kB            112 kB
├ ○ /routing                             6 kB            115 kB
├ ○ /shelters                            5.2 kB          114 kB
└ ○ /warehouses                          5.47 kB         115 kB
+ First Load JS shared by all            87.7 kB
```

---

## Daily Completion Reports
- [`README_Day11_Completion.md`](Backend/app/readme%20files/README_Day11_Completion.md): Advanced Impact Assessment
- [`README_Day12_Completion.md`](Backend/app/readme%20files/README_Day12_Completion.md): Advanced GIS & PostGIS Spatial Integration
- [`README_Day13_Completion.md`](Backend/app/readme%20files/README_Day13_Completion.md): Road Network & Safe Routing
- [`README_Day14_Completion.md`](Backend/app/readme%20files/README_Day14_Completion.md): Intelligent Relief Allocation & Unmet Demand
- [`README_Day15_Completion.md`](Backend/app/readme%20files/README_Day15_Completion.md): External Telemetry & Comprehensive PDF Reporting
- [`README_Day16_Completion.md`](Backend/app/readme%20files/README_Day16_Completion.md): Unified Dashboard API & Final Backend Hardening
- [`README_Day17_Completion.md`](README_Day17_Completion.md): Frontend Foundation & JWT Authentication
- [`README_Day18_Completion.md`](README_Day18_Completion.md): Command Dashboard, Interactive GIS & Routing
- [`README_Day19_Completion.md`](README_Day19_Completion.md): Relief Operations, Reports & Final Integration

---

## Known Limitations & Future Roadmap
- Cartography currently leverages OpenStreetMap raster tiles; high-density operational deployments would benefit from Mapbox/MapLibre vector tiles.
- Telemetry fallback provides deterministic simulation; live multi-station IoT sensor integrations can be added as physical hardware feeds become available.
