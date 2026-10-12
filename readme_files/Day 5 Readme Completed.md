# Disaster Simulation and Intelligent Relief Allocation System

## Day 5 Completion Report --- Population Data + Basic Disaster Simulation

**Status: DAY 5 COMPLETE ✅**

This README records the work completed during Day 5, the current backend
structure, the code changes made, the testing performed, and the final
state of the project.

------------------------------------------------------------------------

# 1. Project Overview

The project is a backend-first **Disaster Simulation and Intelligent
Relief Allocation System**.

Current technology stack:

-   Python
-   FastAPI
-   PostgreSQL
-   PostGIS
-   SQLAlchemy
-   Pydantic
-   JWT authentication
-   Docker / Docker Compose
-   Later stages: NetworkX, NumPy/Pandas, ReportLab,
    Next.js/React/TypeScript/Tailwind/Leaflet

The project is being developed incrementally. Each day must leave the
backend in a working state.

The development rule followed throughout the project is:

> Explain → Implement → Test → Verify → Continue

------------------------------------------------------------------------

# 2. Work Completed Before Day 5

## Day 1 --- Backend Foundation

Completed:

-   Created the backend project.
-   Created the Python virtual environment.
-   Installed the initial dependencies.
-   Created the FastAPI application.
-   Started and verified the FastAPI server.
-   Established the initial project structure.
-   Verified Swagger/API access.

## Day 2 --- Database Foundation

Completed:

-   Docker/Docker Compose setup.
-   PostgreSQL 16 running in Docker.
-   PostGIS 3.4 available through the PostgreSQL image.
-   `disaster_relief` database created.
-   SQLAlchemy 2.x configured.
-   Psycopg PostgreSQL driver installed.
-   `.env` created for database configuration.
-   `app/database.py` created.
-   SQLAlchemy engine configured.
-   `SessionLocal` configured.
-   SQLAlchemy `Base` created.
-   Database connection verified.
-   `/health` endpoint verifies both FastAPI and PostgreSQL.

Database architecture:

``` text
FastAPI
   ↓
SQLAlchemy
   ↓
PostgreSQL + PostGIS
```

## Day 3 --- Models, Schemas and CRUD

Completed:

-   SQLAlchemy models.
-   Pydantic schemas.
-   Disaster model and CRUD APIs.
-   Shelter model and CRUD APIs.
-   Database table creation.
-   Database session dependency.
-   Swagger testing.
-   Direct database verification where required.

The Disaster model already contained:

``` text
id
name
severity
latitude
longitude
radius_km
created_at
```

The Shelter model contained:

``` text
id
name
latitude
longitude
capacity
occupancy
is_active
created_at
```

A database issue involving `created_at` being NULL was encountered and
corrected.

## Day 4 --- Authentication and Authorization

Completed:

-   User creation.
-   Password hashing.
-   Login.
-   JWT access tokens.
-   Authentication dependency.
-   Protected APIs.
-   Role-based authorization.
-   Admin-only access to user APIs.
-   Authentication and authorization testing.

Authentication flow:

``` text
User
 ↓
Login
 ↓
Credentials verified
 ↓
JWT generated
 ↓
Bearer token sent with request
 ↓
JWT validated
 ↓
User identified
 ↓
Role checked
 ↓
Request allowed/denied
```

The existing Day 4 authentication and authorization implementation was
preserved during Day 5.

------------------------------------------------------------------------

# 3. Project Structure After Day 5

Current backend structure:

``` text
Backend/
│
├── .env
├── .gitignore
├── docker-compose.yml
├── requirements.txt
│
├── app/
│   ├── __init__.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   ├── security.py
│   ├── geo.py
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

Important environment:

``` text
Backend/venv
```

The existing project virtual environment is used.

------------------------------------------------------------------------

# 4. Important Existing Files

## `app/database.py`

Responsible for:

-   Loading the database URL.
-   Creating the SQLAlchemy engine.
-   Creating `SessionLocal`.
-   Defining the SQLAlchemy `Base`.
-   Providing the `get_db()` database-session dependency.

Current architecture:

``` text
FastAPI endpoint
      ↓
Depends(get_db)
      ↓
SQLAlchemy Session
      ↓
PostgreSQL
```

## `app/security.py`

Responsible for:

-   Password hashing.
-   Password verification.
-   JWT creation.
-   JWT decoding.
-   Authentication-related security operations.

## `app/main.py`

Currently contains the main FastAPI application and existing API
endpoints.

It includes:

-   Root endpoint.
-   Health endpoint.
-   User APIs.
-   Login/authentication.
-   Authentication dependency.
-   Authorization dependency.
-   Disaster APIs.
-   Shelter APIs.
-   Warehouse APIs.
-   Resource APIs.
-   Population APIs.
-   Simulation APIs.
-   Existing relief APIs.

The file is currently monolithic; this was preserved rather than
unnecessarily refactoring it during Day 5.

## `app/schemas.py`

Contains the project's Pydantic request/response schemas, including the
Day 5 schemas for population and simulation.

------------------------------------------------------------------------

# 5. Day 5 Objective

Day 5 focused on:

> **Given a disaster and population data, determine how many people are
> potentially affected.**

The first simulation is intentionally simple and uses a radius-based
model.

The basic rule is:

``` text
distance <= disaster.radius_km
```

If the population point lies within the disaster radius, its population
is counted as affected.

------------------------------------------------------------------------

# 6. Population Model Added

We added:

``` text
app/models/population.py
```

The model is:

``` text
PopulationPoint
----------------
id
latitude
longitude
population
vulnerable_population
```

The actual implementation uses:

``` python
class PopulationPoint(Base):
    __tablename__ = "population_points"

    id
    latitude
    longitude
    population
    vulnerable_population
```

### Important design decision

The Day 5 planning document originally described a `name` field for
population points.

During implementation, we did **not** unnecessarily redesign the
existing model. The implemented model instead uses geographic population
points with:

-   latitude
-   longitude
-   population
-   vulnerable population

Population points are global geographic data. They are **not directly
attached to a specific disaster**.

This means the same population data can be evaluated against different
disasters.

Example:

``` text
Population Point
       ↓
latitude / longitude / population
       ↓
Simulation checks its distance
       ↓
Disaster A
```

The same population point can later be checked against Disaster B.

------------------------------------------------------------------------

# 7. Population Schema

The population request schema was added to `app/schemas.py`.

Current structure:

``` text
PopulationCreate
----------------
latitude
longitude
population
vulnerable_population
```

Validation includes:

``` text
population > 0
vulnerable_population >= 0
```

This prevents invalid population values from being inserted through the
API.

------------------------------------------------------------------------

# 8. Population APIs

The following APIs are currently available:

``` text
POST /population
GET  /population
```

## `POST /population`

The endpoint:

1.  Requires authentication.
2.  Validates the request using Pydantic.
3.  Creates a `PopulationPoint`.
4.  Adds it to the SQLAlchemy session.
5.  Commits the transaction.
6.  Refreshes the object.
7.  Returns the stored record.

## `GET /population`

The endpoint retrieves population points from PostgreSQL.

The APIs were tested through Swagger.

Population data was successfully inserted and retrieved.

------------------------------------------------------------------------

# 9. Geographic Distance --- Haversine Formula

Day 5 required a geographic distance calculation between a disaster and
each population point.

We created:

``` text
app/geo.py
```

This contains:

``` text
haversine_km(...)
```

The Haversine formula calculates the approximate great-circle distance
between two latitude/longitude coordinates.

Conceptually:

``` text
Disaster coordinates
        +
Population coordinates
        ↓
Haversine formula
        ↓
Distance in kilometers
```

The Python `math` functionality used for the calculation includes
operations such as:

``` text
radians
sin
cos
sqrt
atan2
```

The function was tested separately before being connected to the
simulation.

Verified behavior:

``` text
Same coordinates
      ↓
approximately 0 km

Nearby coordinates
      ↓
small distance

Farther coordinates
      ↓
larger distance
```

------------------------------------------------------------------------

# 10. Simulation Model

We added:

``` text
app/models/simulation.py
```

The SQLAlchemy model is:

``` text
SimulationResult
----------------
id
disaster_id
affected_population
affected_area_km2
severity
status
```

The corresponding PostgreSQL table is:

``` text
simulation_results
```

The model stores the result of a completed basic disaster simulation.

------------------------------------------------------------------------

# 11. Simulation Schema

`app/schemas.py` contains:

``` text
SimulationCreate
----------------
disaster_id
```

and:

``` text
SimulationResponse
------------------
id
disaster_id
affected_population
affected_area_km2
severity
status
```

The response schema uses Pydantic's ORM/object attribute support so
SQLAlchemy model objects can be returned through the API.

------------------------------------------------------------------------

# 12. Simulation Endpoint

The actual implementation uses:

``` text
POST /simulation/run
```

with the disaster ID in the request body.

Example:

``` json
{
  "disaster_id": 5
}
```

This differs slightly from the original Day 5 planning document, which
described:

``` text
POST /simulation/run/{disaster_id}
```

We kept the existing working route instead of changing it unnecessarily.

------------------------------------------------------------------------

# 13. Simulation Algorithm

The simulation now works as follows:

``` text
Receive disaster_id
       ↓
Find disaster
       ↓
If disaster does not exist
       ↓
Return 404
       ↓
Get all population points
       ↓
For every population point
       ↓
Calculate Haversine distance
       ↓
Compare distance with disaster radius
       ↓
distance <= radius?
       │
       ├── YES → add population
       │
       └── NO  → ignore population
       ↓
Calculate affected area
       ↓
Create SimulationResult
       ↓
Store result in PostgreSQL
       ↓
Return result
```

The important implementation change during Day 5 was replacing the
earlier simple geographic approximation with the reusable Haversine
calculation.

The simulation now uses:

``` python
distance = haversine_km(
    disaster.latitude,
    disaster.longitude,
    point.latitude,
    point.longitude
)

if distance <= disaster.radius_km:
    affected_population += point.population
```

This is the core Day 5 simulation logic.

------------------------------------------------------------------------

# 14. Affected Population Calculation

For every population point:

``` text
Calculate distance
       ↓
Compare with disaster radius
       ↓
Inside radius?
       ↓
Add population
```

The condition is:

``` text
distance <= radius
```

Therefore, a population point on the boundary is considered affected.

------------------------------------------------------------------------

# 15. Affected Area Calculation

The first simulation assumes the disaster impact area is a circle.

Formula:

``` text
Area = π × r²
```

For a disaster with:

``` text
radius = 5 km
```

the calculated area is approximately:

``` text
78.53975 km²
```

This is deliberately a simplified assumption.

It is not intended to represent a real flood boundary or advanced GIS
impact area.

------------------------------------------------------------------------

# 16. Main Simulation Test

We created a test disaster:

``` text
Name: Pala Flood
Severity: 8
Latitude: 9.71
Longitude: 76.68
Radius: 5 km
```

Population test data included:

``` text
Population 1
----------------
population: 5000
latitude: 9.71
longitude: 76.68

Population 2
----------------
population: 3000
latitude: 9.72
longitude: 76.69

Population 3
----------------
population: 2000
latitude: 9.80
longitude: 76.80
```

The simulation returned:

``` text
affected_population = 8000
affected_area_km2 = 78.53975
```

This means:

``` text
5000 + 3000 = 8000
```

were counted as affected in this test.

The simulation result was successfully stored and retrieved from
PostgreSQL.

------------------------------------------------------------------------

# 17. Simulation Result Retrieval

The existing API:

``` text
GET /simulation/{disaster_id}
```

was used to verify that the simulation result had been stored.

The result could be retrieved after the simulation was completed.

This confirmed:

``` text
Run simulation
      ↓
Create SimulationResult
      ↓
Commit to PostgreSQL
      ↓
Retrieve result later
```

------------------------------------------------------------------------

# 18. Edge-Case Testing

We verified the important Day 5 edge cases.

## Invalid disaster

A nonexistent disaster ID was submitted.

Expected behavior:

``` text
404 Not Found
```

This worked correctly.

## No affected population

A disaster was created in an area where existing population points were
outside the disaster radius.

Expected:

``` text
affected_population = 0
```

Verified successfully.

## All population inside

A disaster with a sufficiently large radius was used.

Expected:

``` text
affected_population =
sum of all population points inside the radius
```

Verified successfully.

## Boundary condition

The simulation uses:

``` text
distance <= radius
```

Therefore, the boundary is inclusive.

This was verified as part of the edge-case testing.

## Authentication

The simulation endpoint remains protected by the existing JWT
authentication system.

Requests without authentication are rejected.

The existing authentication behavior was preserved.

## Authorization

The existing Day 4 authorization behavior remains intact.

No changes were made that bypass or replace the role-based authorization
system.

------------------------------------------------------------------------

# 19. No DELETE Population API Was Added

During testing, we noticed that there is currently no:

``` text
DELETE /population/{id}
```

endpoint.

We deliberately did **not** add one merely for testing.

Instead, edge cases were tested by creating additional disaster
scenarios.

This keeps Day 5 focused on its required objective and avoids adding
unrelated API functionality.

Population points are global geographic data, so they can also be reused
across multiple disaster simulations.

------------------------------------------------------------------------

# 20. Database State After Day 5

The main Day 5 tables are:

``` text
population_points
simulation_results
```

The data flow is:

``` text
POST /population
       ↓
population_points
       ↓
POST /simulation/run
       ↓
Haversine calculation
       ↓
affected population
       ↓
affected area
       ↓
simulation_results
```

The existing disaster data is used as the input to the simulation.

------------------------------------------------------------------------

# 21. Existing Architecture Preserved

During Day 5, we intentionally preserved the existing:

``` text
FastAPI application
SQLAlchemy architecture
PostgreSQL database
database session dependency
JWT authentication
role-based authorization
Disaster APIs
Shelter APIs
Warehouse APIs
Resource APIs
```

No unnecessary architectural rewrite was performed.

------------------------------------------------------------------------

# 22. Current API Flow

The current relevant flow is:

``` text
Register
   ↓
Login
   ↓
Receive JWT
   ↓
Authenticate request
   ↓
Create Disaster
   ↓
Add Population
   ↓
Run Simulation
   ↓
Haversine distance calculation
   ↓
Radius comparison
   ↓
Affected Population
   ↓
Affected Area
   ↓
SimulationResult
   ↓
PostgreSQL
```

------------------------------------------------------------------------

# 23. Day 5 Regression Verification

The following functionality was verified after the Day 5 changes:

``` text
✓ FastAPI starts
✓ PostgreSQL connection works
✓ /health works
✓ User registration works
✓ Login works
✓ JWT authentication works
✓ Authorization works
✓ Disaster APIs continue working
✓ Shelter APIs continue working
✓ Population API works
✓ Population data is stored
✓ Haversine calculation works
✓ Simulation works
✓ Affected population is calculated
✓ Affected area is calculated
✓ Simulation result is stored
✓ Simulation result can be retrieved
✓ Invalid disaster is handled
✓ No affected population case works
✓ All affected population case works
✓ Boundary rule is preserved
✓ Unauthenticated access is rejected
✓ Existing authorization rules remain intact
```

------------------------------------------------------------------------

# 24. What We Did NOT Implement on Day 5

The following were intentionally left for later:

-   Advanced flood propagation.
-   Machine learning.
-   Weather API integration.
-   OpenStreetMap routing.
-   Dijkstra/A\* routing.
-   Advanced PostGIS spatial queries.
-   Intelligent optimization.
-   Advanced resource allocation.
-   Frontend.
-   Complex GIS visualization.
-   Real road-network analysis.

Day 5 establishes the first reliable simulation layer.

------------------------------------------------------------------------

# 25. Final Day 5 Architecture

``` text
                    ┌───────────────┐
                    │     User      │
                    └───────┬───────┘
                            ↓
                         Login
                            ↓
                           JWT
                            ↓
                  ┌───────────────────┐
                  │     FastAPI       │
                  └─────────┬─────────┘
                            ↓
                    Authentication
                            ↓
                    Authorization
                            ↓
             ┌──────────────┴──────────────┐
             ↓                             ↓
        Disaster Data                Population Data
             │                             │
             │                    latitude/longitude
             │                    population
             │                             │
             └──────────────┬──────────────┘
                            ↓
                     Haversine Distance
                            ↓
                  Distance <= Radius
                            ↓
                  Affected Population
                            ↓
                     Affected Area
                            ↓
                  SimulationResult
                            ↓
                     PostgreSQL
```

------------------------------------------------------------------------

# 26. Definition of Done --- Day 5

Day 5 is now complete.

``` text
[✓] Existing backend starts successfully
[✓] Database connection works
[✓] Authentication still works
[✓] Authorization still works
[✓] Existing disaster APIs still work
[✓] Existing shelter APIs still work
[✓] Population model exists
[✓] Population schema exists
[✓] Population API exists
[✓] Population data can be stored
[✓] Geographic distance calculation works
[✓] Simulation result model exists
[✓] Simulation endpoint exists
[✓] Affected population is calculated correctly
[✓] Affected area is calculated
[✓] Simulation result is stored
[✓] Simulation result can be retrieved
[✓] Invalid disaster is handled
[✓] Unauthenticated access is handled
[✓] Authorization rules are preserved
[✓] Edge cases are tested
[✓] Regression testing passes
[✓] Day 5 documentation is updated
```

------------------------------------------------------------------------

# 27. Day 5 Final Result

The backend can now perform the following complete operation:

``` text
Create Disaster
      ↓
Add Population Data
      ↓
Run Basic Simulation
      ↓
Calculate Distance from Disaster
      ↓
Check Disaster Radius
      ↓
Identify Affected Population
      ↓
Calculate Affected Area
      ↓
Store Simulation Result
      ↓
Retrieve Simulation Result
```

The project has therefore moved from simply storing disaster data to
performing its first actual **disaster-impact calculation**.

------------------------------------------------------------------------

# 28. Phase 1 Progress

The current Phase 1 progression is:

``` text
Day 1
Backend Foundation
      ↓
Day 2
Database Foundation
      ↓
Day 3
Models + CRUD
      ↓
Day 4
Authentication + Authorization
      ↓
Day 5
Population + Basic Simulation
      ↓
Day 6
Relief Requirement Calculation
      ↓
Day 7
Shelters + Warehouses + Resources
      ↓
Day 8
Basic Resource Allocation
      ↓
Day 9
Reports
      ↓
Day 10
Testing + Documentation
      ↓
Phase 1 Complete
```

**Day 5 is complete.**

------------------------------------------------------------------------

# 29. Next Step --- Day 6

The next major objective is:

## Relief Requirement Calculation

Day 6 will build on the simulation result.

Current flow:

``` text
Disaster
   +
Population
   ↓
Simulation
   ↓
Affected Population
```

Next:

``` text
Affected Population
        ↓
Relief Requirement Calculation
        ↓
Required resources
```

The existing simulation result should be reused rather than
recalculating the affected population unnecessarily.

------------------------------------------------------------------------

# 30. Important Instructions for Future Development

When continuing this project:

1.  Read this README before starting the next development day.
2.  Inspect the current project structure and code.
3.  Verify the existing application before making changes.
4.  Do not recreate completed functionality.
5.  Implement one part at a time.
6.  Explain the purpose before implementing.
7.  Test after every implementation.
8.  Do not proceed while the current step is broken.
9.  Preserve authentication and authorization.
10. Preserve the existing database/session architecture.
11. Preserve working Disaster and Shelter APIs.
12. Use Swagger for API verification.
13. Verify important database state.
14. Perform regression testing after significant changes.
15. Keep university-level implementations understandable.
16. Avoid unnecessary complexity.
17. Consult the relevant official Python, FastAPI, SQLAlchemy, and
    Pydantic documentation when changing code that depends on their
    APIs.

------------------------------------------------------------------------

# Final Status

``` text
========================================
          DAY 5 — COMPLETE
========================================

Population Data          ✓
Haversine Distance       ✓
Basic Simulation         ✓
Affected Population      ✓
Affected Area            ✓
Simulation Persistence   ✓
Edge Cases               ✓
Authentication           ✓
Authorization            ✓
Regression Testing       ✓
Documentation            ✓

========================================
             READY FOR DAY 6
========================================
```
