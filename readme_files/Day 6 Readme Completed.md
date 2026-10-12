# Day 6 Completion --- Relief Requirement Calculation

## Project

**Disaster Simulation and Intelligent Relief Allocation System**

Day 6 focused on calculating the amount of relief required for a
disaster based on the affected population produced by the existing
simulation system.

The implementation followed the project workflow:

> Explain → Implement → Test → Verify → Continue

------------------------------------------------------------------------

# 1. Day 6 Objective

The objective of Day 6 was to answer:

> **How much relief is required for the affected population?**

The system uses the `affected_population` calculated during the
simulation and converts it into four relief requirements:

-   Food
-   Water
-   Medical kits
-   Blankets

Day 6 does **not** perform relief allocation, warehouse selection,
routing, optimization, machine learning, weather integration, frontend
development, or advanced GIS processing.

The distinction is:

``` text
Simulation
"What population is affected?"
        ↓
Relief Estimation
"How much relief is required?"
        ↓
Future Allocation
"Where should the available relief come from?"
```

------------------------------------------------------------------------

# 2. Project Structure at the End of Day 6

``` text
Disaster Management System/
│
├── .env
├── .gitignore
├── docker-compose.yml
├── requirements.txt
│
├── app/
│   ├── __init__.py
│   ├── database.py
│   ├── geo.py
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   ├── security.py
│   │
│   └── models/
│       ├── __init__.py
│       ├── disaster.py
│       ├── population.py
│       ├── relief.py
│       ├── resource.py
│       ├── shelter.py
│       ├── simulation.py
│       ├── user.py
│       └── warehouse.py
│
└── venv/
```

------------------------------------------------------------------------

# 3. Initial Inspection

Before making changes, the existing Day 1--5 implementation was
inspected.

An important finding was that the project already contained:

``` text
app/models/relief.py
```

and existing relief schemas and API endpoints.

Therefore, a new relief system was **not** created.

The existing implementation was reused and only the relief formulas were
corrected.

This avoided unnecessary changes to the project architecture.

------------------------------------------------------------------------

# 4. Existing Relief Database Model

The project already contains the `ReliefRequirement` model.

The database fields were kept unchanged:

``` text
id
disaster_id
food_packets
water_liters
medical_kits
blankets
status
```

The names were intentionally preserved.

In particular:

``` text
medical_kits
```

was kept as the database/API field name. It was not renamed to another
term.

The model stores the calculated relief requirement in PostgreSQL.

------------------------------------------------------------------------

# 5. Existing Relief Schemas

The existing Pydantic schemas were also reused.

### ReliefCreate

``` python
class ReliefCreate(BaseModel):
    disaster_id: int
```

### ReliefResponse

The response contains:

``` text
id
disaster_id
food_packets
water_liters
medical_kits
blankets
status
```

No new schema was required for Day 6.

------------------------------------------------------------------------

# 6. Existing Relief API

The existing endpoint was reused:

``` text
POST /relief/estimate/{disaster_id}
```

The endpoint performs the following operations:

1.  Checks whether the disaster exists.
2.  Finds the latest simulation result for the disaster.
3.  Gets `affected_population` from that simulation.
4.  Calculates the required relief.
5.  Creates a `ReliefRequirement` record.
6.  Stores it in PostgreSQL.
7.  Returns the stored relief requirement.

The existing retrieval endpoint is:

``` text
GET /relief/{disaster_id}
```

It returns the stored relief requirements for a disaster.

------------------------------------------------------------------------

# 7. Relief Calculation Formulas

The Day 6 assumptions are:

``` text
Food = 3 portions/packets per affected person

Water = 2 liters per affected person

Medical kits = 10% of affected population

Blankets = 50% of affected population
```

The implemented formulas are:

``` python
food_packets = affected_population * 3
water_liters = affected_population * 2
medical_kits = int(affected_population * 0.10)
blankets = int(affected_population * 0.50)
```

The database fields remain:

``` text
food_packets
water_liters
medical_kits
blankets
```

Because the medical-kit and blanket database fields are integer fields,
the calculated values are converted to integers before being stored.

------------------------------------------------------------------------

# 8. Example Calculation

During testing, the simulation produced:

``` text
affected_population = 8000
```

The relief calculation therefore becomes:

``` text
Food:
8000 × 3
= 24000 packets

Water:
8000 × 2
= 16000 liters

Medical kits:
8000 × 0.10
= 800 kits

Blankets:
8000 × 0.50
= 4000 blankets
```

Final requirement:

``` text
Food          = 24000
Water         = 16000
Medical kits  = 800
Blankets      = 4000
```

------------------------------------------------------------------------

# 9. Database Persistence

After calculating the relief requirement, the system stores it using
SQLAlchemy:

``` python
db.add(new_relief)
db.commit()
db.refresh(new_relief)
```

This was verified in PostgreSQL.

The stored values matched the values returned by the API.

The relief requirement could also be retrieved using:

``` text
GET /relief/{disaster_id}
```

------------------------------------------------------------------------

# 10. Testing Performed

## Test 1 --- Normal Relief Calculation

A disaster with a simulation result was used.

The simulation had:

``` text
affected_population = 8000
```

Expected:

``` text
food_packets = 24000
water_liters = 16000
medical_kits = 800
blankets = 4000
```

Result:

``` text
PASS
```

------------------------------------------------------------------------

## Test 2 --- Database Persistence

The calculated relief requirement was checked through PostgreSQL.

Result:

``` text
PASS
```

The database values matched the API response.

------------------------------------------------------------------------

## Test 3 --- GET Relief Requirement

The stored requirement was retrieved through:

``` text
GET /relief/{disaster_id}
```

Result:

``` text
PASS
```

------------------------------------------------------------------------

## Test 4 --- Invalid Disaster

A non-existent disaster ID was supplied.

Expected behavior:

``` text
404
Disaster not found
```

Result:

``` text
PASS
```

------------------------------------------------------------------------

## Test 5 --- Missing Simulation

A disaster without a simulation result was used.

Expected behavior:

``` text
404
Run simulation before estimating relief
```

This prevents the relief calculation from running without an
affected-population value.

Result:

``` text
PASS
```

------------------------------------------------------------------------

## Test 6 --- Zero Affected Population

The formulas were checked for the zero-population case.

Expected:

``` text
Food = 0
Water = 0
Medical kits = 0
Blankets = 0
```

The formulas naturally produce zero.

Result:

``` text
PASS
```

------------------------------------------------------------------------

## Test 7 --- Authentication

The relief endpoint was tested without authentication.

Expected:

``` text
401 Not authenticated
```

Result:

``` text
PASS
```

------------------------------------------------------------------------

## Test 8 --- Authenticated Request

The same endpoint was tested with a valid JWT.

Expected:

``` text
200 OK
```

Result:

``` text
PASS
```

------------------------------------------------------------------------

## Test 9 --- Regression Testing

Existing functionality from earlier days was tested again, including:

-   Health check
-   Disaster API
-   Population API
-   Simulation API
-   Shelter API
-   Authentication

The existing functionality continued to work.

Result:

``` text
PASS
```

------------------------------------------------------------------------

# 11. Authentication and Authorization

Day 6 preserved the authentication system implemented previously.

The relief APIs continue to use the existing authentication dependency:

``` python
Depends(get_current_user)
```

No authentication bypass was introduced.

The following were verified:

``` text
Unauthenticated request
        ↓
401 Not authenticated
```

and:

``` text
Authenticated request
        ↓
Relief API
        ↓
200 OK
```

------------------------------------------------------------------------

# 12. What Was Changed on Day 6

The main implementation change was the relief calculation formula.

Previous temporary formulas included:

``` python
water_liters = affected_population * 5
medical_kits = max(1, affected_population // 20)
blankets = affected_population
```

These were replaced with the Day 6 formulas:

``` python
food_packets = affected_population * 3
water_liters = affected_population * 2
medical_kits = int(affected_population * 0.10)
blankets = int(affected_population * 0.50)
```

The following were **not** unnecessarily changed:

-   Database field names
-   Relief model
-   Relief schema
-   Relief endpoint names
-   Authentication system
-   Existing simulation system
-   Existing population system
-   Existing database structure

------------------------------------------------------------------------

# 13. Important Design Decision

The relief calculation uses the simulation result instead of
recalculating the affected population.

The flow is:

``` text
Population Data
       ↓
Simulation
       ↓
SimulationResult
       ↓
affected_population
       ↓
Relief Calculation
       ↓
ReliefRequirement
```

This keeps the responsibilities separated.

The simulation is responsible for determining the affected population.

The relief module is responsible for converting that population into
resource requirements.

------------------------------------------------------------------------

# 14. Day 6 Scope

### Completed

-   Existing relief implementation inspected
-   Existing model reused
-   Existing schemas reused
-   Existing endpoints reused
-   Relief formulas corrected
-   Affected population reused from simulation
-   Food requirement calculated
-   Water requirement calculated
-   Medical-kit requirement calculated
-   Blanket requirement calculated
-   Results stored in PostgreSQL
-   Results retrieved through API
-   Error cases tested
-   Authentication tested
-   Regression testing completed

### Not Implemented

The following are intentionally outside Day 6:

-   Relief allocation
-   Warehouse selection
-   Resource availability matching
-   Route optimization
-   Shortest-path algorithms
-   Vehicle routing
-   Advanced optimization
-   Machine learning
-   Weather APIs
-   External flood-data integration
-   Frontend implementation
-   Advanced PostGIS functionality

These can be considered in later project phases.

------------------------------------------------------------------------

# 15. Day 6 Final Status

``` text
========================================
          DAY 6 STATUS
========================================

Relief Model              ✓
Relief Schema             ✓
Relief Calculation        ✓
Food Calculation          ✓
Water Calculation         ✓
Medical Kit Calculation   ✓
Blanket Calculation       ✓
Database Persistence      ✓
Relief Retrieval API      ✓
Error Handling            ✓
Authentication            ✓
Regression Testing        ✓

========================================
             COMPLETE
========================================
```

------------------------------------------------------------------------

# 16. Current System Flow

At the end of Day 6, the backend supports the following complete flow:

``` text
                    DISASTER
                       │
                       ▼
               POPULATION DATA
                       │
                       ▼
                  SIMULATION
                       │
                       ▼
              AFFECTED POPULATION
                       │
                       ▼
             RELIEF CALCULATION
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
        FOOD         WATER      MEDICAL KITS
          │            │            │
          └────────────┼────────────┘
                       │
                       ▼
                   BLANKETS
                       │
                       ▼
              POSTGRESQL DATABASE
                       │
                       ▼
                  RELIEF API
```

------------------------------------------------------------------------

# 17. Day 6 Completion

Day 6 is complete.

The backend can now determine **how much relief is required for a
simulated disaster** using the affected population generated by the
existing simulation system.

The implementation has been tested through Swagger, PostgreSQL,
authentication checks, error cases, and regression testing.

The next development stage can build on this stored relief requirement
without changing the completed simulation and relief-estimation flow.
