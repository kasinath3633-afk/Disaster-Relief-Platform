# DAY 14 COMPLETION REPORT: INTELLIGENT RELIEF ALLOCATION

## 1. Objective
Design and implement an intelligent, multi-criteria relief allocation engine that builds upon the baseline Phase-1 allocation service. The Day-14 engine prioritizes shelters dynamically based on vulnerability, capacity, and proximity to disaster epicenters, ranks candidate warehouses by stock availability and route viability, records allocations transactionally, and isolates unmet demands with actionable deficit reports when warehouse stockpiles fall short.

## 2. Starting Repository State
- Branch: `climax`.
- Baseline Day 13 tests: 33 passed (`test_allocation.py`, `test_impact.py`, `test_gis.py`, `test_routing.py`).
- PostgreSQL with PostGIS 3.4 running in Docker container `disaster_relief_db`.
- Baseline allocation in `app/services/allocation.py` supported single-warehouse greedy deduction without shelter vulnerability weighting, multi-warehouse routing integration, or unmet demand tracking.

## 3. Existing Functionality Verified
- Phase-1 allocation (6 tests), Day-11 impact assessment (7 tests), Day-12 GIS spatial discovery (8 tests), and Day-13 road network routing (12 tests) verified running cleanly without regression.

## 4. What Was Implemented
- Intelligent Multi-Criteria Allocation Service (`app/services/intelligent_allocation.py`):
  - **Shelter Priority Scoring**: Dynamic weighting of shelters based on population capacity (35%), disaster proximity/severity (35%), and road accessibility (30%).
  - **Warehouse Selection Ranking**: Dynamic ranking of supply depots based on current stock availability (50%), geographic distance to target shelter (35%), and route viability (15%).
  - **Deterministic Multi-Warehouse Dispatch**: Exhausts stock sequentially from the closest and best-stocked warehouses to meet shelter relief needs.
  - **Unmet Demand Isolation**: Tracks unsatisfied demand per resource type per shelter when overall regional stockpiles are depleted, generating clear deficit warnings for emergency logistics coordinators.
  - **Database Persistence**: Transactionally creates `Allocation` records linking the disaster, warehouse, resource, and allocated quantities, decrementing `WarehouseResource` stock cleanly.
- Pydantic Schemas (`app/schemas.py`):
  - `ShelterPriorityInfo`: Detailed breakdown of shelter capacity, distance, and final priority score.
  - `UnmetDemandInfo`: Unmet resource requirements per shelter with deficit quantities.
  - `IntelligentAllocationResponse`: Comprehensive response including execution timestamp, prioritized shelters, allocations dispatched, unmet demands, and summary statistics.
- REST Endpoint:
  - `POST /relief/{disaster_id}/intelligent-allocate`: Triggers intelligent triage and dispatch execution, returning structured allocations and remaining deficits.

## 5. Files Created
- `app/services/intelligent_allocation.py`: Multi-criteria shelter scoring, warehouse selection, allocation execution, and deficit tracking.
- `app/test_intelligent_allocation.py`: 7 automated tests covering scoring, multi-warehouse distribution, deficit handling, and API integration.
- `README_Day14_Completion.md`: This completion documentation.

## 6. Files Modified
- `app/schemas.py`: Added `ShelterPriorityInfo`, `UnmetDemandInfo`, and `IntelligentAllocationResponse`.
- `app/services/__init__.py`: Exported `run_intelligent_allocation`.
- `app/main.py`: Registered `POST /relief/{disaster_id}/intelligent-allocate` route.

## 7. Database Changes
- No schema alterations required; fully compatible with existing SQLAlchemy `Allocation`, `WarehouseResource`, `Shelter`, and `Disaster` models.
- Safely decrements `WarehouseResource.quantity` within an atomic SQLAlchemy transaction block (`db.commit()`), rolling back cleanly on unhandled exceptions.

## 8. Models Added
- Reused existing models: `Disaster`, `Shelter`, `Warehouse`, `Resource`, `WarehouseResource`, `ReliefRequirement`, `Allocation`.

## 9. Schemas Added
- `ShelterPriorityInfo`:
  - `shelter_id`: int
  - `shelter_name`: str
  - `priority_score`: float (0.0 to 100.0)
  - `capacity`: int
  - `distance_km`: float
  - `urgency_level`: str (CRITICAL, HIGH, MODERATE, LOW)
- `UnmetDemandInfo`:
  - `shelter_id`: int
  - `shelter_name`: str
  - `resource_id`: int
  - `resource_name`: str
  - `requested_quantity`: float
  - `allocated_quantity`: float
  - `deficit`: float
- `IntelligentAllocationResponse`:
  - `disaster_id`: int
  - `total_allocations_count`: int
  - `total_units_allocated`: float
  - `shelters_prioritized`: List[ShelterPriorityInfo]
  - `allocations`: List[AllocationResponse]
  - `unmet_demands`: List[UnmetDemandInfo]
  - `status`: str

## 10. Endpoints Added
- `POST /relief/{disaster_id}/intelligent-allocate`:
  - Request: Empty body or disaster ID path parameter.
  - Response: `IntelligentAllocationResponse` (HTTP 200) or HTTP 404 if disaster or simulation requirements not found.

## 11. Algorithms & Mathematical Models

### A. Shelter Priority Scoring Model
Each shelter $s$ receives a priority score $P(s) \in [0, 100]$:
$$P(s) = 0.35 \times C(s) + 0.35 \times S(s) + 0.30 \times A(s)$$

Where:
1. **Capacity Score $C(s)$**:
   $$C(s) = \min\left(100, \frac{\text{capacity}}{500} \times 100\right)$$
   Reflects that larger shelters house more displaced civilians and require urgent bulk supply.
2. **Proximity / Severity Score $S(s)$**:
   Calculated using Haversine distance $d(s, \text{disaster})$ from the disaster center:
   $$S(s) = 100 \times \max\left(0, 1 - \frac{d(s, \text{disaster})}{2 \times R_{\text{affected}}}\right)$$
   Shelters directly at ground zero receive maximum severity scores, decaying as distance increases.
3. **Accessibility Score $A(s)$**:
   $$A(s) = \begin{cases} 90.0 & \text{if primary approach roads are open} \\ 40.0 & \text{if nearby roads are obstructed/high-risk} \end{cases}$$

Priority bands:
- $\ge 75$: `CRITICAL`
- $50 - 74.9$: `HIGH`
- $25 - 49.9$: `MODERATE`
- $< 25$: `LOW`

### B. Warehouse Ranking Model
For shelter $s$ needing resource $r$, candidate warehouses $w \in W$ are scored:
$$W_{\text{score}}(w, s, r) = 0.50 \times I(w, r) + 0.35 \times \text{Prox}(w, s) + 0.15 \times R_{\text{rel}}(w, s)$$

Where:
- $I(w, r) = \min(100, (\text{stock}_{w, r} / \text{needed}_r) \times 100)$
- $\text{Prox}(w, s) = 100 \times \max(0, 1 - \frac{d(w, s)}{100\text{ km}})$
- $R_{\text{rel}} = 100$ (default safe route available) or $50$ (degraded).

### C. Greedy Dispatch & Deficit Isolation
Shelters are served in descending order of $P(s)$. For each resource:
1. Candidate warehouses are sorted in descending order of $W_{\text{score}}$.
2. Stock is drawn until the requirement is fulfilled or all warehouses are depleted.
3. If $\sum \text{allocated} < \text{requested}$, an `UnmetDemand` record is created:
   $$\text{Deficit} = \text{Requested} - \text{Allocated}$$

## 12. Official Documentation Consulted
- SQLAlchemy 2.0 ORM Session management and transactional integrity (`session.commit()`, `session.rollback()`).
- Pydantic v2 validation and nested schema serialization.
- Mathematical optimization heuristics for multi-depot emergency vehicle dispatch (Operations Research in Disaster Relief).

## 13. Assumptions & Limitations
- **Explainability**: University viva guidelines prioritize transparent, deterministic heuristics over stochastic or black-box solvers.
- **Stock Depletion**: Assumes real-time inventory updates; concurrent dispatches rely on SQLAlchemy row-level locks or transactional isolation.
- **Fixed Disaster Radius**: Distance decay uses the disaster's recorded radius or a deterministic fallback of 10.0 km.

## 14. Unit and Integration Tests Added (`app/test_intelligent_allocation.py`)
1. `test_shelter_priority_scoring_logic`: Validates mathematical priority scores under varying capacities and distances.
2. `test_intelligent_allocation_success`: Verifies complete multi-shelter, multi-resource allocation and stock deduction.
3. `test_intelligent_allocation_unmet_demand`: Verifies that deficits are correctly calculated when warehouse stock is insufficient.
4. `test_intelligent_allocation_multiple_warehouses`: Verifies multi-warehouse cascading dispatch (exhausting warehouse A before warehouse B).
5. `test_intelligent_allocation_missing_disaster`: Confirms HTTP 404 when disaster does not exist.
6. `test_intelligent_allocation_unauthenticated`: Confirms HTTP 401 when token is omitted.
7. `test_priority_urgency_bands`: Verifies boundary conditions for CRITICAL, HIGH, MODERATE, and LOW urgency thresholds.

## 15. Test Results
- **Day 14 Targeted Tests**: 7 passed in 0.85s.
- **Full Regression Test Suite**: 40 passed across 5 test modules.
- **Regressions**: 0.

## 16. Database Verification
- Verified `allocations` rows are inserted with accurate `warehouse_id`, `shelter_id`, `resource_id`, and `quantity`.
- Verified `warehouse_resources.quantity` correctly decremented without allowing negative stock values.

## 17. API Verification
- Tested `POST /relief/{disaster_id}/intelligent-allocate` via FastAPI TestClient.
- Inspected JSON response verifying presence of `shelters_prioritized`, `allocations`, and `unmet_demands`.

## 18. Regressions Encountered and Fixed
- *Issue*: In cases with zero initial requirements, the endpoint raised a division-by-zero error in warehouse inventory availability scoring.
- *Fix*: Added guard check returning early with zero allocations if requirements list is empty, and clamped denominators with `max(needed, 1.0)`.

## 19. University Viva Explanation
> "In disaster response, resource scarcity and operational urgency demand transparent triage rather than arbitrary distribution. The Intelligent Allocation engine uses a multi-criteria scoring function combining shelter capacity, epicenter proximity via Haversine distance decay, and route accessibility. Warehouses are evaluated based on stock availability and transit proximity, dispatching goods sequentially to highest-need shelters first. When supplies run dry, the engine doesn't fail; it isolates unmet demand into an actionable deficit report, giving coordinators exact quantities required for secondary procurement or federal aid."

## 20. Next Steps
- Day 15: External telemetry integration (weather feeds, atmospheric hazard indices, and comprehensive multi-page PDF generation).
