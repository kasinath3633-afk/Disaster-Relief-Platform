# Day 7 Handoff --- Disaster Simulation and Intelligent Relief Allocation System

## Purpose of this README

This README is a **handoff document for the next chat**. It describes
the project state after completing Day 7, the current backend structure,
the important code paths, the APIs that were added/verified, the test
data created, and what should happen next.

The next chat should **continue from this state** rather than recreating
Day 7 functionality.

> **Important:** The actual source code is the source of truth. Inspect
> the current files before making changes.

------------------------------------------------------------------------

# 1. Project Overview

The project is a backend-first **Disaster Simulation and Intelligent
Relief Allocation System**.

The long-term system flow is:

``` text
DISASTER
   ↓
POPULATION DATA
   ↓
SIMULATION
   ↓
AFFECTED POPULATION
   ↓
RELIEF REQUIREMENT
   ↓
SHELTERS + WAREHOUSES + RESOURCES
   ↓
FUTURE RELIEF ALLOCATION
   ↓
FUTURE ROUTING / LOGISTICS
   ↓
REPORTS / ANALYTICS
   ↓
FRONTEND
```

Day 7 did **not** implement the allocation or routing stage.

Day 7's responsibility was to make shelter capacity and warehouse
resource availability usable by later stages.

------------------------------------------------------------------------

# 2. Development Approach

The project has been developed incrementally using:

``` text
EXPLAIN
   ↓
INSPECT
   ↓
IDENTIFY WHAT ALREADY EXISTS
   ↓
MAKE THE SMALLEST REQUIRED CHANGE
   ↓
START / RESTART SERVER
   ↓
TEST THROUGH SWAGGER
   ↓
VERIFY DATABASE
   ↓
CONTINUE
```

This approach should continue in future days.

Do not recreate existing models, schemas, APIs, or authentication
systems unless the current code actually requires it.

------------------------------------------------------------------------

# 3. Project Structure

The backend currently follows this general structure:

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

`app/main.py` is currently the main FastAPI application/route file and
is roughly 900+ lines in the working project.

------------------------------------------------------------------------

# 4. Main Application Structure

`app/main.py` imports the main SQLAlchemy models:

``` python
from app.models.disaster import Disaster
from app.models.warehouse import Warehouse
from app.models.population import PopulationPoint
from app.models.user import User
from app.models.simulation import SimulationResult
from app.models.relief import ReliefRequirement
from app.models.shelter import Shelter
from app.models.resource import Resource
```

It also imports the existing geographic helpers:

``` python
from app.geo import haversine_km
from app.utils.geo import haversine_distance
```

The Pydantic schemas are imported from `app.schemas`.

The application creates the database tables through:

``` python
Base.metadata.create_all(bind=engine)
```

and creates the FastAPI application with:

``` python
app = FastAPI()
```

Source structure: `main.py` imports the disaster, warehouse, population,
user, simulation, relief, shelter and resource models and initializes
the FastAPI application/database layer.

------------------------------------------------------------------------

# 5. Authentication

The existing authentication system is still used.

The application uses:

``` python
security = HTTPBearer()
```

and the dependency:

``` python
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
```

The JWT is decoded and the user is loaded from PostgreSQL.

Protected APIs use:

``` python
current_user: User = Depends(get_current_user)
```

Role-protected APIs use:

``` python
current_user: User = Depends(require_role("admin"))
```

Do not create a second authentication system in future work.

------------------------------------------------------------------------

# 6. Existing Core Entities

The backend currently works around these main entities:

``` text
Disaster
PopulationPoint
SimulationResult
ReliefRequirement
Shelter
Warehouse
Resource
User
```

The important Day 7 relationship is:

``` text
Warehouse
   ↓
Resource
```

while the relief flow is:

``` text
Disaster
   ↓
SimulationResult
   ↓
ReliefRequirement
```

------------------------------------------------------------------------

# 7. Disaster Model and API

The current disaster creation schema is:

``` python
class DisasterCreate(BaseModel):
    name: str
    severity: int = Field(ge=1, le=10)
    latitude: float
    longitude: float
    radius_km: float
```

Therefore:

-   `severity` is an integer from 1 to 10.
-   `latitude` and `longitude` are floats.
-   `radius_km` is required.

Important existing endpoints include:

``` text
POST   /disasters
GET    /disasters
GET    /disasters/{disaster_id}
PUT    /disasters/{disaster_id}
DELETE /disasters/{disaster_id}
```

A test disaster was created during Day 7 testing using the schema above.

Example test payload:

``` json
{
  "name": "Flood Test Kerala",
  "severity": 3,
  "latitude": 9.59,
  "longitude": 76.52,
  "radius_km": 10
}
```

------------------------------------------------------------------------

# 8. Simulation Flow

The existing simulation endpoint is:

``` text
POST /simulation/run
```

It accepts:

``` python
class SimulationCreate(BaseModel):
    disaster_id: int
```

The simulation:

1.  Finds the disaster.
2.  Reads all population points.
3.  Calculates the geographic distance between the disaster center and
    each population point.
4.  Includes population points whose distance is within `radius_km`.
5.  Sums their population.
6.  Calculates the circular affected area.
7.  Stores a `SimulationResult`.

The important logic is conceptually:

``` python
affected_population = 0

for point in population_points:
    distance = haversine_km(
        disaster.latitude,
        disaster.longitude,
        point.latitude,
        point.longitude
    )

    if distance <= disaster.radius_km:
        affected_population += point.population
```

Then:

``` python
new_simulation = SimulationResult(
    disaster_id=disaster.id,
    affected_population=affected_population,
    affected_area_km2=affected_area_km2,
    severity=disaster.severity,
    status="completed"
)
```

This is the source of the affected population used by the relief
calculation.

------------------------------------------------------------------------

# 9. Day 6 Relief Requirement System

Day 6 established the relief requirement calculation.

The existing relief schema is:

``` python
class ReliefCreate(BaseModel):
    disaster_id: int
```

The response contains:

``` python
class ReliefResponse(BaseModel):
    id: int
    disaster_id: int
    food_packets: int
    water_liters: int
    medical_kits: int
    blankets: int
    status: str
```

The existing endpoint is:

``` text
POST /relief/estimate/{disaster_id}
```

The endpoint:

1.  Checks that the disaster exists.
2.  Finds the latest simulation for that disaster.
3.  Reads `affected_population`.
4.  Calculates relief quantities.
5.  Stores the `ReliefRequirement`.
6.  Returns the stored record.

The Day 6 formulas are:

``` python
food_packets = affected_population * 3
water_liters = affected_population * 2
medical_kits = int(affected_population * 0.10)
blankets = int(affected_population * 0.50)
```

The retrieval endpoint is:

``` text
GET /relief/{disaster_id}
```

Day 7 builds on this existing system rather than replacing it.

------------------------------------------------------------------------

# 10. Warehouse Model

The current warehouse model is:

``` python
class Warehouse(Base):
    __tablename__ = "warehouses"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    latitude: Mapped[float] = mapped_column(
        nullable=False
    )

    longitude: Mapped[float] = mapped_column(
        nullable=False
    )

    capacity: Mapped[int] = mapped_column(
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )
```

The corresponding create/update schema is:

``` python
class WarehouseCreate(BaseModel):
    name: str
    latitude: float
    longitude: float
    capacity: int = Field(gt=0)
```

The warehouse API includes:

``` text
POST   /warehouses
GET    /warehouses
GET    /warehouses/{warehouse_id}
PUT    /warehouses/{warehouse_id}
DELETE /warehouses/{warehouse_id}
```

------------------------------------------------------------------------

# 11. Day 7 Warehouse Test Data

A warehouse was successfully created during Day 7 testing.

Current test warehouse:

``` text
ID:        1
Name:      Central Relief Warehouse
Latitude:  9.59
Longitude: 76.52
Capacity:  10000
```

Successful API response included:

``` json
{
  "longitude": 76.52,
  "id": 1,
  "created_at": "2026-09-25T16:53:18.001231",
  "latitude": 9.59,
  "capacity": 10000,
  "name": "Central Relief Warehouse"
}
```

Use the actual database contents as the source of truth if IDs/data
differ later.

------------------------------------------------------------------------

# 12. Resource Model

The current resource model is intentionally simple:

``` python
class Resource(Base):
    __tablename__ = "resources"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    warehouse_id: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    unit: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
```

Important:

> There is no separate `available_quantity` column.

For the current Day 7 design, `quantity` represents the current
inventory quantity.

------------------------------------------------------------------------

# 13. Resource Schemas

The resource create schema is:

``` python
class ResourceCreate(BaseModel):
    warehouse_id: int
    name: str
    quantity: int = Field(gt=0)
    unit: str
```

The update schema is:

``` python
class ResourceUpdate(BaseModel):
    warehouse_id: int
    name: str
    quantity: int = Field(gt=0)
    unit: str
```

The response schema is:

``` python
class ResourceResponse(BaseModel):
    id: int
    warehouse_id: int
    name: str
    quantity: int
    unit: str

    model_config = ConfigDict(from_attributes=True)
```

------------------------------------------------------------------------

# 14. Resource CRUD

The existing Resource APIs are:

``` text
POST   /resources
GET    /resources
GET    /resources/{resource_id}
PUT    /resources/{resource_id}
DELETE /resources/{resource_id}
```

Resource creation first checks whether the warehouse exists:

``` python
warehouse = db.query(Warehouse).filter(
    Warehouse.id == resource.warehouse_id
).first()

if warehouse is None:
    raise HTTPException(
        status_code=404,
        detail="Warehouse not found"
    )
```

Then the resource is created:

``` python
new_resource = Resource(
    warehouse_id=resource.warehouse_id,
    name=resource.name,
    quantity=resource.quantity,
    unit=resource.unit
)
```

The same warehouse-existence validation is also performed during
resource updates.

This means a resource cannot intentionally be associated with a
warehouse ID that does not exist.

------------------------------------------------------------------------

# 15. Resource Types Used During Day 7

The test inventory used these resource names:

``` text
food_packets
water_liters
medical_kits
blankets
```

The intended interpretation is:

``` text
food_packets → packets
water_liters → liters
medical_kits → kits
blankets      → blankets
```

Example test inventory:

``` text
food_packets   → 5000 packets
water_liters   → 10000 liters
medical_kits   → 500 kits
blankets       → 1000 blankets
```

These are test/inventory values, not permanent business assumptions.

------------------------------------------------------------------------

# 16. Resource Availability Endpoint

Day 7 added:

``` text
GET /resources/available
```

The endpoint returns resources whose existing `quantity` is greater than
zero.

Important implementation:

``` python
@app.get(
    "/resources/available",
    response_model=list[ResourceResponse]
)
def get_available_resources(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resources = db.query(Resource).filter(
        Resource.quantity > 0
    ).all()

    return resources
```

This is intentionally simple.

There is no additional availability column.

------------------------------------------------------------------------

# 17. Important Route Ordering Rule

The static route:

``` text
/resources/available
```

must appear **before**:

``` text
/resources/{resource_id}
```

Otherwise FastAPI can match:

``` text
/resources/available
```

against:

``` text
/resources/{resource_id}
```

and try to parse:

``` text
available
```

as an integer.

This happened during Day 7 testing.

The resulting error was:

``` json
{
  "detail": [
    {
      "type": "int_parsing",
      "loc": ["path", "resource_id"],
      "msg": "Input should be a valid integer, unable to parse string as an integer",
      "input": "available"
    }
  ]
}
```

The route ordering was corrected.

Correct order:

``` text
GET /resources
GET /resources/available
GET /resources/{resource_id}
PUT /resources/{resource_id}
DELETE /resources/{resource_id}
```

The same principle applies to other static routes placed next to dynamic
`{id}` routes.

------------------------------------------------------------------------

# 18. Shelter Model

The current shelter model contains:

``` python
class Shelter(Base):
    __tablename__ = "shelters"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    latitude: Mapped[float]
    longitude: Mapped[float]
    capacity: Mapped[int]
    occupancy: Mapped[int] = mapped_column(default=0)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )
```

The response schema contains:

``` text
id
name
latitude
longitude
capacity
occupancy
is_active
```

------------------------------------------------------------------------

# 19. Shelter Availability Logic

The existing shelter information is sufficient to calculate availability
without adding another database field.

The derived concept is:

``` text
available_capacity = capacity - occupancy
```

A shelter is considered available when:

``` text
is_active == true
AND
occupancy < capacity
```

This means there is no need for a permanent:

``` text
available_capacity
```

column just to store a value that can be calculated from existing data.

------------------------------------------------------------------------

# 20. Relief Availability Integration

Day 7 added a comparison endpoint:

``` text
GET /relief/{disaster_id}/availability
```

Its purpose is **not allocation**.

It provides:

``` text
required
   vs
available
```

for the four relief resource categories:

``` text
food_packets
water_liters
medical_kits
blankets
```

The endpoint first obtains the latest relief requirement for the
disaster.

Conceptually:

``` python
relief = db.query(ReliefRequirement).filter(
    ReliefRequirement.disaster_id == disaster_id
).order_by(
    ReliefRequirement.id.desc()
).first()
```

If no relief requirement exists:

``` python
raise HTTPException(
    status_code=404,
    detail="Relief requirement not found"
)
```

Then it loads currently available resources:

``` python
resources = db.query(Resource).filter(
    Resource.quantity > 0
).all()
```

and builds a lookup:

``` python
available = {
    resource.name: resource.quantity
    for resource in resources
}
```

The response contains:

``` text
disaster_id
required
available
```

with missing resource types defaulting to zero:

``` python
available.get("food_packets", 0)
available.get("water_liters", 0)
available.get("medical_kits", 0)
available.get("blankets", 0)
```

------------------------------------------------------------------------

# 21. Required vs Available Flow

The completed Day 7 flow is:

``` text
                    DISASTER
                       ↓
                  SIMULATION
                       ↓
              AFFECTED POPULATION
                       ↓
              RELIEF ESTIMATION
                       ↓
               REQUIRED RESOURCES
                       │
                       │
                       ▼
              ┌─────────────────┐
              │   WAREHOUSE     │
              └─────────────────┘
                       ↓
                 RESOURCE STOCK
                       ↓
              AVAILABLE RESOURCES
                       │
                       ▼
              REQUIRED vs AVAILABLE
```

This is the bridge between Day 6 and the future allocation stage.

------------------------------------------------------------------------

# 22. Important Scope Boundary

Day 7 is **not** an allocation algorithm.

Do not interpret:

``` text
required vs available
```

as:

``` text
allocate resources
```

Day 7 does NOT implement:

-   warehouse selection
-   resource assignment
-   demand prioritization
-   vehicle routing
-   shortest paths
-   Dijkstra
-   A\*
-   NetworkX optimization
-   machine learning
-   weather APIs
-   external flood APIs
-   advanced GIS optimization
-   frontend/dashboard work

The purpose is to make reliable inventory and shelter information
available for later logic.

------------------------------------------------------------------------

# 23. Complete Day 7 API Flow

The practical testing flow is:

``` text
1. POST /disasters
        ↓
2. POST /simulation/run
        ↓
3. POST /relief/estimate/{disaster_id}
        ↓
4. POST /warehouses
        ↓
5. POST /resources
        ↓
6. GET /resources
        ↓
7. GET /resources/available
        ↓
8. GET /relief/{disaster_id}/availability
```

The exact IDs must come from the API/database; never assume an ID.

------------------------------------------------------------------------

# 24. Day 7 Testing Problems That Were Resolved

## Problem 1 --- Empty database

At the beginning of the Day 7 resource tests there was no test data.

Solution:

``` text
Create Warehouse
      ↓
Create Resource
      ↓
Verify Resource
```

A warehouse had to exist before a resource could reference it.

------------------------------------------------------------------------

## Problem 2 --- Invalid warehouse relationship

Resource creation checks the warehouse:

``` python
warehouse = db.query(Warehouse).filter(
    Warehouse.id == resource.warehouse_id
).first()
```

A non-existent warehouse results in:

``` text
404 Warehouse not found
```

This protects the resource relationship.

------------------------------------------------------------------------

## Problem 3 --- `/resources/available` route collision

Initially:

``` text
/resources/available
```

was being matched by:

``` text
/resources/{resource_id}
```

The error indicated that `"available"` could not be parsed as an
integer.

Solution:

Place:

``` text
/resources/available
```

before:

``` text
/resources/{resource_id}
```

------------------------------------------------------------------------

## Problem 4 --- Relief availability returned 404

The new endpoint initially returned:

``` json
{
  "detail": "Relief requirement not found"
}
```

Reason:

The selected disaster did not yet have a stored `ReliefRequirement`.

Solution:

``` text
Create/use disaster
      ↓
Run simulation
      ↓
Create relief estimate
      ↓
Run relief availability comparison
```

------------------------------------------------------------------------

## Problem 5 --- Disaster schema mismatch during testing

An initial test attempted:

``` json
{
  "severity": "High"
}
```

but the API expects:

``` python
severity: int = Field(ge=1, le=10)
```

and also requires:

``` python
radius_km: float
```

Correct example:

``` json
{
  "name": "Flood Test Kerala",
  "severity": 3,
  "latitude": 9.59,
  "longitude": 76.52,
  "radius_km": 10
}
```

------------------------------------------------------------------------

# 25. Day 7 Completion Checklist

``` text
Day 7
────────────────────────────────────

Shelter model inspected                 ✓
Shelter availability logic               ✓
Warehouse model/API verified             ✓
Warehouse test data created              ✓
Resource model/API verified              ✓
Warehouse-resource validation            ✓
Resource test inventory created          ✓
GET /resources verified                  ✓
GET /resources/available added           ✓
Route ordering issue fixed               ✓
Relief requirement reused                ✓
GET /relief/{id}/availability added      ✓
Required vs available comparison        ✓
Disaster test data created               ✓
Simulation → relief workflow verified   ✓
Swagger testing completed                ✓

────────────────────────────────────
DAY 7 COMPLETE
────────────────────────────────────
```

------------------------------------------------------------------------

# 26. Current Data Used for Testing

A warehouse was created:

``` text
Warehouse ID: 1
Name: Central Relief Warehouse
Latitude: 9.59
Longitude: 76.52
Capacity: 10000
```

Resource categories used:

``` text
food_packets
water_liters
medical_kits
blankets
```

Example quantities used:

``` text
food_packets   5000 packets
water_liters   10000 liters
medical_kits   500 kits
blankets       1000 blankets
```

These values exist as Day 7 test data and should be checked in
PostgreSQL before assuming they still exist.

------------------------------------------------------------------------

# 27. What the Next Chat Should Understand

The next chat should start from this understanding:

``` text
DAY 1–5
Foundation + DB + CRUD + Auth + Simulation

DAY 6
Relief requirement calculation

DAY 7
Shelters + Warehouses + Resources
       +
Available resource view
       +
Required vs available view

NEXT
Use this information for the next planned stage.
```

Do **not** go back and rebuild Day 6 or Day 7.

First inspect the current code and database, then continue.

------------------------------------------------------------------------

# 28. Important Files for Future Work

The most important files to inspect before continuing are:

``` text
app/main.py
app/schemas.py
app/database.py
app/security.py

app/models/disaster.py
app/models/population.py
app/models/simulation.py
app/models/relief.py
app/models/shelter.py
app/models/warehouse.py
app/models/resource.py
```

For Day 7-specific work, pay particular attention to:

``` text
app/main.py
app/schemas.py
app/models/resource.py
app/models/warehouse.py
app/models/shelter.py
app/models/relief.py
app/models/simulation.py
```

------------------------------------------------------------------------

# 29. Important Code Principles to Preserve

### Reuse existing fields

For resources:

``` text
quantity
```

already represents current inventory.

Do not automatically introduce:

``` text
available_quantity
```

unless a future requirement genuinely needs a separate concept.

### Keep derived values derived

For shelters:

``` text
available_capacity = capacity - occupancy
```

Do not duplicate derived state unnecessarily.

### Keep modules responsible for one thing

``` text
Simulation
    → determines affected population

Relief
    → determines required relief

Warehouse / Resource
    → represents available inventory

Shelter
    → represents shelter capacity

Future allocation
    → decides how resources should be assigned
```

------------------------------------------------------------------------

# 30. Final Day 7 State

At the end of Day 7, the backend can answer:

``` text
What disaster are we handling?
        ↓
How many people are affected?
        ↓
How much relief is required?
        ↓
Which shelters have available capacity?
        ↓
Where are the warehouses?
        ↓
What resources are available?
        ↓
How much is required vs available?
```

The system is now ready for the **next development stage** without
changing the completed Day 6 relief calculation or the Day 7
shelter/resource foundation.

------------------------------------------------------------------------

# 31. Handoff Instruction for the Next Chat

Start the next chat with:

> "Read this README first. It is the Day 7 handoff for my Disaster
> Simulation and Intelligent Relief Allocation System. Inspect the
> current code before making changes. Day 7 is complete. Do not recreate
> the existing shelter, warehouse, resource, simulation, relief,
> authentication, or database functionality. Continue from the current
> state and follow the smallest-change/test/verify workflow."
