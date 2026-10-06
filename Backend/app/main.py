from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi.responses import StreamingResponse
from app.services.report import generate_disaster_report, generate_comprehensive_disaster_report

from app.database import engine, Base, get_db, SessionLocal
from app.security import hash_password, verify_password, create_access_token, decode_access_token
from app.models.disaster import Disaster
from app.models.warehouse import Warehouse
from app.models.population import PopulationPoint
from app.models.user import User
from app.models.simulation import SimulationResult
from app.models.relief import ReliefRequirement
from app.models.shelter import Shelter
from app.models.resource import Resource
from app.models.allocation import Allocation
from app.models.impact import ImpactAssessment
from app.models.routing import RoadNode, RoadEdge
from app.services.allocation import create_allocation
from app.services.impact import execute_and_persist_impact_assessment
from app.services.gis import (
    get_nearby_shelters_spatial,
    get_nearby_warehouses_spatial,
    get_affected_population_spatial,
    ensure_spatial_indexes,
    validate_coordinates
)
from app.services.routing import (
    RoutingGraph,
    dijkstra_safe_path,
    astar_safe_path,
    seed_sample_road_network
)
from app.services.intelligent_allocation import run_intelligent_allocation_heuristic
from app.services.external_data import ResilientWeatherService, get_weather_adjusted_impact_score
from app.services.dashboard import get_disaster_dashboard_summary
from app.utils.geo import haversine_km

from app.schemas import (
    DisasterCreate,
    DisasterUpdate,

    ShelterCreate,
    ShelterResponse,
    ShelterUpdate,

    WarehouseCreate,
    WarehouseUpdate,

    UserCreate,
    UserUpdate,

    PopulationCreate,


    SimulationCreate,
    SimulationResponse,

    ReliefCreate,
    ReliefResponse,

    ResourceCreate,
    ResourceUpdate,
    ResourceResponse,

    UserCreate,
    UserUpdate,
    UserLogin,
    Token,
    ImpactAssessmentResponse,
    NearbyShelterResponse,
    NearbyWarehouseResponse,
    AffectedPopulationSpatialResponse,
    RouteNodeResponse,
    RouteEdgeResponse,
    RouteRequest,
    RouteResponse,
    RoadEdgeBlockUpdate,
    IntelligentAllocationResponse,
    NormalizedWeatherResponse,
    DashboardSummaryResponse
)


# =========================================================
# CREATE DATABASE TABLES & SPATIAL INDEXES
# =========================================================

Base.metadata.create_all(bind=engine)
with SessionLocal() as _db_init:
    ensure_spatial_indexes(_db_init)



app = FastAPI()
weather_service = ResilientWeatherService()

security = HTTPBearer()



def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = decode_access_token(token)

    user_id = payload.get("sub")

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user

def require_role(required_role: str):
    def role_checker(
        current_user: User = Depends(get_current_user)
    ):
        if current_user.role != required_role:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions"
            )

        return current_user
    return role_checker


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "message": "Disaster Management System API"
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "api": "ok",
            "database": "ok"
        }

    except Exception:
        return {
            "api": "ok",
            "database": "error"
        }


# =========================================================
# DISASTER APIs
# =========================================================

@app.post("/disasters")
def create_disaster(
    disaster: DisasterCreate,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    new_disaster = Disaster(
        name=disaster.name,
        severity=disaster.severity,
        latitude=disaster.latitude,
        longitude=disaster.longitude,
        radius_km=disaster.radius_km
    )

    db.add(new_disaster)
    db.commit()
    db.refresh(new_disaster)

    return new_disaster


@app.get("/disasters")
def get_disasters(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    disasters = db.query(Disaster).all()

    return disasters


@app.get("/disasters/{disaster_id}")
def get_disaster(
    disaster_id: int,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    disaster = db.query(Disaster).filter(
        Disaster.id == disaster_id
    ).first()

    if disaster is None:
        return {
            "error": "Disaster not found"
        }

    return disaster


@app.put("/disasters/{disaster_id}")
def update_disaster(
    disaster_id: int,
    disaster: DisasterUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing_disaster = db.query(Disaster).filter(
        Disaster.id == disaster_id
    ).first()

    if existing_disaster is None:
        return {
            "error": "Disaster not found"
        }

    existing_disaster.name = disaster.name
    existing_disaster.severity = disaster.severity
    existing_disaster.latitude = disaster.latitude
    existing_disaster.longitude = disaster.longitude
    existing_disaster.radius_km = disaster.radius_km

    db.commit()
    db.refresh(existing_disaster)

    return existing_disaster


@app.delete("/disasters/{disaster_id}")
def delete_disaster(
    disaster_id: int,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    disaster = db.query(Disaster).filter(
        Disaster.id == disaster_id
    ).first()

    if disaster is None:
        return {
            "error": "Disaster not found"
        }

    db.delete(disaster)
    db.commit()

    return {
        "message": "Disaster deleted successfully"
    }


# =========================================================
# WAREHOUSE APIs
# =========================================================

@app.post("/warehouses")
def create_warehouse(
    warehouse: WarehouseCreate,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    new_warehouse = Warehouse(
        name=warehouse.name,
        latitude=warehouse.latitude,
        longitude=warehouse.longitude,
        capacity=warehouse.capacity
    )

    db.add(new_warehouse)
    db.commit()
    db.refresh(new_warehouse)

    return new_warehouse


@app.get("/warehouses")
def get_warehouses(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    warehouses = db.query(Warehouse).all()

    return warehouses


@app.get("/warehouses/{warehouse_id}")
def get_warehouse(
    warehouse_id: int,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    warehouse = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id
    ).first()

    if warehouse is None:
        raise HTTPException(
            status_code=404,
            detail="Warehouse not found"
        )

    return warehouse


@app.put("/warehouses/{warehouse_id}")
def update_warehouse(
    warehouse_id: int,
    warehouse_data: WarehouseUpdate,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    warehouse = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id
    ).first()

    if warehouse is None:
        raise HTTPException(
            status_code=404,
            detail="Warehouse not found"
        )

    warehouse.name = warehouse_data.name
    warehouse.latitude = warehouse_data.latitude
    warehouse.longitude = warehouse_data.longitude
    warehouse.capacity = warehouse_data.capacity

    db.commit()
    db.refresh(warehouse)

    return warehouse


@app.delete("/warehouses/{warehouse_id}")
def delete_warehouse(
    warehouse_id: int,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    warehouse = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id
    ).first()

    if warehouse is None:
        raise HTTPException(
            status_code=404,
            detail="Warehouse not found"
        )

    db.delete(warehouse)
    db.commit()

    return {
        "message": "Warehouse deleted successfully"
    }


# =========================================================
# RESOURCE APIs
# =========================================================

@app.post(
    "/resources",
    response_model=ResourceResponse
)
def create_resource(
    resource: ResourceCreate,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
    
):
    warehouse = db.query(Warehouse).filter(
        Warehouse.id == resource.warehouse_id
    ).first()

    if warehouse is None:
        raise HTTPException(
            status_code=404,
            detail="Warehouse not found"
        )

    new_resource = Resource(
        warehouse_id=resource.warehouse_id,
        name=resource.name,
        quantity=resource.quantity,
        unit=resource.unit
    )

    db.add(new_resource)
    db.commit()
    db.refresh(new_resource)

    return new_resource


@app.get(
    "/resources",
    response_model=list[ResourceResponse]
)
def get_resources(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    resources = db.query(Resource).all()

    return resources
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


@app.get(
    "/resources/{resource_id}",
    response_model=ResourceResponse
)
def get_resource(
    resource_id: int,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    resource = db.query(Resource).filter(
        Resource.id == resource_id
    ).first()

    if resource is None:
        raise HTTPException(
            status_code=404,
            detail="Resource not found"
        )

    return resource


@app.put(
    "/resources/{resource_id}",
    response_model=ResourceResponse
)
def update_resource(
    resource_id: int,
    resource_data: ResourceUpdate,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    resource = db.query(Resource).filter(
        Resource.id == resource_id
    ).first()

    if resource is None:
        raise HTTPException(
            status_code=404,
            detail="Resource not found"
        )

    warehouse = db.query(Warehouse).filter(
        Warehouse.id == resource_data.warehouse_id
    ).first()

    if warehouse is None:
        raise HTTPException(
            status_code=404,
            detail="Warehouse not found"
        )

    resource.warehouse_id = resource_data.warehouse_id
    resource.name = resource_data.name
    resource.quantity = resource_data.quantity
    resource.unit = resource_data.unit

    db.commit()
    db.refresh(resource)

    return resource


@app.delete("/resources/{resource_id}")
def delete_resource(
    resource_id: int,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    resource = db.query(Resource).filter(
        Resource.id == resource_id
    ).first()

    if resource is None:
        raise HTTPException(
            status_code=404,
            detail="Resource not found"
        )

    db.delete(resource)
    db.commit()

    return {
        "message": "Resource deleted successfully"
    }


# =========================================================
# POPULATION APIs
# =========================================================

@app.post("/population")
def create_population(
    population: PopulationCreate,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    new_population = PopulationPoint(
        latitude=population.latitude,
        longitude=population.longitude,
        population=population.population,
        vulnerable_population=population.vulnerable_population
    )

    db.add(new_population)
    db.commit()
    db.refresh(new_population)

    return new_population


@app.get("/population")
def get_population(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    population_points = db.query(
        PopulationPoint
    ).all()

    return population_points


# =========================================================
# USER APIs
# =========================================================

@app.post("/users")
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    new_user = User(
        username=user.username,
        email=user.email,
        phone_number=user.phone_number,
       password_hash=hash_password(user.password)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@app.get("/users")
def get_users(
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role("admin"))
):
    users = db.query(User).all()

    return users


@app.get("/users/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role("admin"))
):
    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return user


@app.put("/users/{user_id}")
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role("admin"))
):
    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    user.username = user_data.username
    user.email = user_data.email
    user.phone_number = user_data.phone_number
    user.role = user_data.role

    db.commit()
    db.refresh(user)

    return user


@app.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role("admin"))
):
    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    db.delete(user)
    db.commit()

    return {
        "message": "User deleted successfully"
    }


# =========================================================
# SIMULATION APIs
# =========================================================

@app.post(
    "/simulation/run",
    response_model=SimulationResponse
)
def run_simulation(
    simulation: SimulationCreate,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    disaster = db.query(Disaster).filter(
        Disaster.id == simulation.disaster_id
    ).first()

    if disaster is None:
        raise HTTPException(
            status_code=404,
            detail="Disaster not found"
        )

    affected_population = 0

    population_points = db.query(
        PopulationPoint
    ).all()

    # Calculate the real distance between
    # the disaster center and each population point.
    for point in population_points:

        distance = haversine_km(
            disaster.latitude,
            disaster.longitude,
            point.latitude,
            point.longitude
        )

        if distance <= disaster.radius_km:
            affected_population += point.population

    # Area of the circular disaster zone
    affected_area_km2 = (
        3.141592653589793
        * disaster.radius_km
        * disaster.radius_km
    )

    new_simulation = SimulationResult(
        disaster_id=disaster.id,
        affected_population=affected_population,
        affected_area_km2=affected_area_km2,
        severity=disaster.severity,
        status="completed"
    )

    db.add(new_simulation)
    db.commit()
    db.refresh(new_simulation)

    return new_simulation


@app.get(
    "/simulation/{disaster_id}",
    response_model=list[SimulationResponse]
)
def get_simulation_results(
    disaster_id: int,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    disaster = db.query(Disaster).filter(
        Disaster.id == disaster_id
    ).first()

    if disaster is None:
        raise HTTPException(
            status_code=404,
            detail="Disaster not found"
        )

    simulations = db.query(
        SimulationResult
    ).filter(
        SimulationResult.disaster_id == disaster_id
    ).all()

    return simulations


# =========================================================
# IMPACT ASSESSMENT APIs
# =========================================================

@app.post(
    "/impact/run/{disaster_id}",
    response_model=ImpactAssessmentResponse
)
def run_impact_assessment(
    disaster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    disaster = db.query(Disaster).filter(
        Disaster.id == disaster_id
    ).first()

    if disaster is None:
        raise HTTPException(
            status_code=404,
            detail="Disaster not found"
        )

    assessment = execute_and_persist_impact_assessment(
        db=db,
        disaster_id=disaster_id
    )

    return assessment


@app.get(
    "/impact/{disaster_id}",
    response_model=ImpactAssessmentResponse
)
def get_impact_assessment(
    disaster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    disaster = db.query(Disaster).filter(
        Disaster.id == disaster_id
    ).first()

    if disaster is None:
        raise HTTPException(
            status_code=404,
            detail="Disaster not found"
        )

    assessment = db.query(
        ImpactAssessment
    ).filter(
        ImpactAssessment.disaster_id == disaster_id
    ).order_by(
        ImpactAssessment.id.desc()
    ).first()

    if assessment is None:
        raise HTTPException(
            status_code=404,
            detail="Impact assessment not found"
        )

    return assessment


# =========================================================
# SHELTER APIs
# =========================================================

@app.post(
    "/shelters",
    response_model=ShelterResponse
)
def create_shelter(
    shelter: ShelterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_shelter = Shelter(
        name=shelter.name,
        latitude=shelter.latitude,
        longitude=shelter.longitude,
        capacity=shelter.capacity,
        occupancy=shelter.occupancy,
        is_active=shelter.is_active
    )

    db.add(new_shelter)
    db.commit()
    db.refresh(new_shelter)

    return new_shelter


@app.get(
    "/shelters",
    response_model=list[ShelterResponse]
)
def get_shelters(
    db: Session = Depends(get_db)
):
    shelters = db.query(Shelter).all()

    return shelters

@app.get("/shelters/available", response_model=list[ShelterResponse])
def get_available_shelters(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    shelters = db.query(Shelter).filter(
        Shelter.is_active == True,
        Shelter.occupancy < Shelter.capacity
    ).all()

    return shelters

@app.get(
    "/shelters/{shelter_id}",
    response_model=ShelterResponse
)
def get_shelter(
    shelter_id: int,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    shelter = db.query(Shelter).filter(
        Shelter.id == shelter_id
    ).first()

    if shelter is None:
        raise HTTPException(
            status_code=404,
            detail="Shelter not found"
        )

    return shelter


@app.put(
    "/shelters/{shelter_id}",
    response_model=ShelterResponse
)
def update_shelter(
    shelter_id: int,
    shelter: ShelterUpdate,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    existing_shelter = db.query(Shelter).filter(
        Shelter.id == shelter_id
    ).first()

    if existing_shelter is None:
        raise HTTPException(
            status_code=404,
            detail="Shelter not found"
        )

    existing_shelter.name = shelter.name
    existing_shelter.latitude = shelter.latitude
    existing_shelter.longitude = shelter.longitude
    existing_shelter.capacity = shelter.capacity
    existing_shelter.occupancy = shelter.occupancy
    existing_shelter.is_active = shelter.is_active

    db.commit()
    db.refresh(existing_shelter)

    return existing_shelter


@app.delete("/shelters/{shelter_id}")
def delete_shelter(
    shelter_id: int,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    shelter = db.query(Shelter).filter(
        Shelter.id == shelter_id
    ).first()

    if shelter is None:
        raise HTTPException(
            status_code=404,
            detail="Shelter not found"
        )

    db.delete(shelter)
    db.commit()

    return {
        "message": "Shelter deleted successfully"
    }


# =========================================================
# GIS APIs (POSTGIS SPATIAL QUERIES)
# =========================================================

@app.get(
    "/gis/shelters/nearby",
    response_model=list[NearbyShelterResponse]
)
def get_nearby_shelters_endpoint(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Target latitude (EPSG:4326)"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Target longitude (EPSG:4326)"),
    radius_km: float = Query(50.0, gt=0.0, description="Search radius in kilometers"),
    limit: int = Query(10, ge=1, le=100, description="Maximum number of shelters to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        shelters = get_nearby_shelters_spatial(
            db=db,
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            limit=limit
        )
        return shelters
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get(
    "/gis/warehouses/nearby",
    response_model=list[NearbyWarehouseResponse]
)
def get_nearby_warehouses_endpoint(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Target latitude (EPSG:4326)"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Target longitude (EPSG:4326)"),
    radius_km: float = Query(100.0, gt=0.0, description="Search radius in kilometers"),
    limit: int = Query(10, ge=1, le=100, description="Maximum number of warehouses to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        warehouses = get_nearby_warehouses_spatial(
            db=db,
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            limit=limit
        )
        return warehouses
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get(
    "/gis/population/affected",
    response_model=AffectedPopulationSpatialResponse
)
def get_affected_population_spatial_endpoint(
    disaster_id: int = Query(..., description="Target disaster ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    disaster = db.query(Disaster).filter(Disaster.id == disaster_id).first()
    if disaster is None:
        raise HTTPException(
            status_code=404,
            detail="Disaster not found"
        )

    try:
        result = get_affected_population_spatial(db=db, disaster_id=disaster_id)
        if result is None:
            raise HTTPException(status_code=404, detail="Disaster not found")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =========================================================
# ROUTING APIs (SAFE PATH & GRAPH ALGORITHMS)
# =========================================================

@app.post(
    "/routing/seed-network",
    response_model=dict
)
def seed_road_network_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = seed_sample_road_network(db)
    return result


@app.get(
    "/routing/nodes",
    response_model=list[RouteNodeResponse]
)
def get_road_nodes_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    nodes = db.query(RoadNode).all()
    return nodes


@app.get(
    "/routing/edges",
    response_model=list[RouteEdgeResponse]
)
def get_road_edges_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    edges = db.query(RoadEdge).all()
    return edges


@app.put(
    "/routing/edges/{edge_id}/block",
    response_model=RouteEdgeResponse
)
def set_road_edge_block_status(
    edge_id: int,
    block_data: RoadEdgeBlockUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    edge = db.query(RoadEdge).filter(RoadEdge.id == edge_id).first()
    if edge is None:
        raise HTTPException(status_code=404, detail="Road edge not found")

    edge.is_blocked = block_data.is_blocked
    db.commit()
    db.refresh(edge)
    return edge


@app.post(
    "/routing/calculate-route",
    response_model=RouteResponse
)
def calculate_route_endpoint(
    req: RouteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    origin = db.query(RoadNode).filter(RoadNode.id == req.origin_node_id).first()
    if not origin:
        raise HTTPException(status_code=404, detail=f"Origin node {req.origin_node_id} not found")

    dest = db.query(RoadNode).filter(RoadNode.id == req.destination_node_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail=f"Destination node {req.destination_node_id} not found")

    graph = RoutingGraph.from_database(db)

    if req.algorithm.lower() == "astar":
        route = astar_safe_path(
            graph=graph,
            origin_id=req.origin_node_id,
            destination_id=req.destination_node_id,
            prefer_safe=req.prefer_safe
        )
    else:
        route = dijkstra_safe_path(
            graph=graph,
            origin_id=req.origin_node_id,
            destination_id=req.destination_node_id,
            prefer_safe=req.prefer_safe
        )

    if route is None:
        raise HTTPException(
            status_code=404,
            detail=f"No passable route found between node {req.origin_node_id} and {req.destination_node_id}. Road segments may be blocked or disconnected."
        )

    return route



# =========================================================
# RELIEF APIs
# =========================================================

@app.post(
    "/relief/estimate/{disaster_id}",
    response_model=ReliefResponse
)
def estimate_relief(
    disaster_id: int,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    disaster = db.query(Disaster).filter(
        Disaster.id == disaster_id
    ).first()

    if disaster is None:
        raise HTTPException(
            status_code=404,
            detail="Disaster not found"
        )

    simulation = db.query(
        SimulationResult
    ).filter(
        SimulationResult.disaster_id == disaster_id
    ).order_by(
        SimulationResult.id.desc()
    ).first()

    if simulation is None:
        raise HTTPException(
            status_code=404,
            detail="Run simulation before estimating relief"
        )

    affected_population = simulation.affected_population

    # Temporary relief estimation
    food_packets = affected_population * 3

    water_liters = affected_population * 5

    medical_kits = int(affected_population * 0.10)

    blankets = int(affected_population * 0.50)

    new_relief = ReliefRequirement(
        disaster_id=disaster_id,
        food_packets=food_packets,
        water_liters=water_liters,
        medical_kits=medical_kits,
        blankets=blankets,
        status="estimated"
    )

    db.add(new_relief)
    db.commit()
    db.refresh(new_relief)

    return new_relief


@app.get(
    "/relief/{disaster_id}",
    response_model=list[ReliefResponse]
)
def get_relief_requirements(
    disaster_id: int,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    disaster = db.query(Disaster).filter(
        Disaster.id == disaster_id
    ).first()

    if disaster is None:
        raise HTTPException(
            status_code=404,
            detail="Disaster not found"
        )

    relief_requirements = db.query(
        ReliefRequirement
    ).filter(
        ReliefRequirement.disaster_id == disaster_id
    ).all()

    return relief_requirements
@app.get("/relief/{disaster_id}/availability")
def get_relief_availability(
    disaster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    relief = db.query(ReliefRequirement).filter(
        ReliefRequirement.disaster_id == disaster_id
    ).order_by(
        ReliefRequirement.id.desc()
    ).first()

    if relief is None:
        raise HTTPException(
            status_code=404,
            detail="Relief requirement not found"
        )

    resources = db.query(Resource).filter(
        Resource.quantity > 0
    ).all()

    available = {
        resource.name: resource.quantity
        for resource in resources
    }

    return {
        "disaster_id": disaster_id,
        "required": {
            "food_packets": relief.food_packets,
            "water_liters": relief.water_liters,
            "medical_kits": relief.medical_kits,
            "blankets": relief.blankets
        },
        "available": {
            "food_packets": available.get("food_packets", 0),
            "water_liters": available.get("water_liters", 0),
            "medical_kits": available.get("medical_kits", 0),
            "blankets": available.get("blankets", 0)
        }
    }

@app.post("/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()

    if not existing_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(user.password, existing_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token({
        "sub": str(existing_user.id)
    })

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }
@app.get("/test-auth")
def test_auth(current_user: User = Depends(get_current_user)):
    return {
        "message": "Authentication successful",
        "user_id": current_user.id,
        "username": current_user.username,
        "email": current_user.email
    }

@app.post("/relief/{disaster_id}/allocate")
def allocate_relief(
    disaster_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    disaster = db.query(Disaster).filter(
        Disaster.id == disaster_id
    ).first()

    if not disaster:
        raise HTTPException(
            status_code=404,
            detail="Disaster not found"
        )

    requirement = db.query(ReliefRequirement).filter(
        ReliefRequirement.disaster_id == disaster_id
    ).first()

    if not requirement:
        raise HTTPException(
            status_code=404,
            detail="Relief requirement not found"
        )

    resource_names = {
        "food_packets": requirement.food_packets,
        "water_liters": requirement.water_liters,
        "medical_kits": requirement.medical_kits,
        "blankets": requirement.blankets
    }

    results = {}

    for resource_name, required in resource_names.items():

        resources = db.query(Resource).filter(
            Resource.name == resource_name,
            Resource.quantity > 0
        ).all()

        if not resources:
            results[resource_name] = {
                "required": required,
                "available": 0,
                "allocated": 0,
                "shortage": required
            }
            continue

        total_available = sum(
            resource.quantity for resource in resources
        )

        remaining_required = required
        total_allocated = 0

        for resource in resources:

            if remaining_required <= 0:
                break

            allocation, shortage = create_allocation(
                db=db,
                disaster_id=disaster_id,
                resource=resource,
                required=remaining_required
            )

            total_allocated += allocation.allocated_quantity
            remaining_required -= allocation.allocated_quantity

        results[resource_name] = {
            "required": required,
            "available": total_available,
            "allocated": total_allocated,
            "shortage": remaining_required
        }

    db.commit()

    return {
        "disaster_id": disaster_id,
        "allocation": results
    }


@app.post(
    "/relief/{disaster_id}/intelligent-allocate",
    response_model=IntelligentAllocationResponse
)
def intelligent_allocate_relief_endpoint(
    disaster_id: int,
    commit_to_db: bool = Query(True, description="Whether to persist allocations and decrement warehouse inventories in database"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    disaster = db.query(Disaster).filter(
        Disaster.id == disaster_id
    ).first()

    if not disaster:
        raise HTTPException(
            status_code=404,
            detail="Disaster not found"
        )

    requirement = db.query(ReliefRequirement).filter(
        ReliefRequirement.disaster_id == disaster_id
    ).first()

    if not requirement:
        raise HTTPException(
            status_code=404,
            detail="Relief requirement not found"
        )

    result = run_intelligent_allocation_heuristic(
        db=db,
        disaster_id=disaster_id,
        commit_to_db=commit_to_db
    )

    if not result:
        raise HTTPException(
            status_code=400,
            detail="Unable to compute intelligent allocation"
        )

    return result


@app.get("/reports/{disaster_id}")
def generate_report(
    disaster_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    disaster = db.query(Disaster).filter(
        Disaster.id == disaster_id
    ).first()

    if not disaster:
        raise HTTPException(
            status_code=404,
            detail="Disaster not found"
        )

    simulation = db.query(SimulationResult).filter(
        SimulationResult.disaster_id == disaster_id
    ).order_by(SimulationResult.id.desc()).first()

    relief = db.query(ReliefRequirement).filter(
        ReliefRequirement.disaster_id == disaster_id
    ).order_by(ReliefRequirement.id.desc()).first()

    allocations = db.query(Allocation).filter(
        Allocation.disaster_id == disaster_id
    ).all()

    resources = db.query(Resource).all()

    shelters = db.query(Shelter).all()

    population_points = db.query(PopulationPoint).all()

    pdf = generate_disaster_report(
        disaster,
        simulation,
        relief,
        allocations,
        resources,
        shelters,
        population_points
    )

    return StreamingResponse(
        pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename=disaster_report_{disaster_id}.pdf"
        }
    )


# =========================================================
# EXTERNAL DATA & ADVANCED REPORTING APIs
# =========================================================

@app.get(
    "/external/weather",
    response_model=NormalizedWeatherResponse
)
def get_external_weather_endpoint(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
    current_user: User = Depends(get_current_user)
):
    weather = weather_service.get_weather(latitude, longitude)
    return weather


@app.get("/reports/{disaster_id}/comprehensive")
def generate_comprehensive_report_endpoint(
    disaster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    disaster = db.query(Disaster).filter(
        Disaster.id == disaster_id
    ).first()

    if not disaster:
        raise HTTPException(
            status_code=404,
            detail="Disaster not found"
        )

    simulation = db.query(SimulationResult).filter(
        SimulationResult.disaster_id == disaster_id
    ).order_by(SimulationResult.id.desc()).first()

    impact = db.query(ImpactAssessment).filter(
        ImpactAssessment.disaster_id == disaster_id
    ).order_by(ImpactAssessment.id.desc()).first()

    relief = db.query(ReliefRequirement).filter(
        ReliefRequirement.disaster_id == disaster_id
    ).order_by(ReliefRequirement.id.desc()).first()

    allocations = db.query(Allocation).filter(
        Allocation.disaster_id == disaster_id
    ).all()

    resources = db.query(Resource).all()
    shelters = db.query(Shelter).all()
    population_points = db.query(PopulationPoint).all()

    weather = weather_service.get_weather(disaster.latitude, disaster.longitude).model_dump()

    unmet_demands = []
    if relief:
        resource_requirements = {
            "food_packets": relief.food_packets,
            "water_liters": relief.water_liters,
            "medical_kits": relief.medical_kits,
            "blankets": relief.blankets
        }
        res_by_id = {r.id: r.name for r in resources}
        allocated_sums = {}
        for a in allocations:
            rname = res_by_id.get(a.resource_id)
            if rname:
                allocated_sums[rname] = allocated_sums.get(rname, 0) + a.allocated_quantity

        for rname, req_qty in resource_requirements.items():
            alloc_qty = allocated_sums.get(rname, 0)
            unmet_demands.append({
                "resource": rname,
                "required": req_qty,
                "allocated": alloc_qty,
                "unmet": max(0, req_qty - alloc_qty)
            })

    pdf = generate_comprehensive_disaster_report(
        disaster=disaster,
        simulation=simulation,
        impact=impact,
        relief=relief,
        allocations=allocations,
        resources=resources,
        shelters=shelters,
        population_points=population_points,
        weather=weather,
        unmet_demands=unmet_demands
    )

    return StreamingResponse(
        pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename=comprehensive_disaster_report_{disaster_id}.pdf"
        }
    )


# =========================================================
# UNIFIED DASHBOARD API
# =========================================================

@app.get(
    "/dashboard/{disaster_id}",
    response_model=DashboardSummaryResponse
)
def get_dashboard_summary_endpoint(
    disaster_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    summary = get_disaster_dashboard_summary(
        db=db,
        disaster_id=disaster_id,
        weather_service=weather_service
    )
    if summary is None:
        raise HTTPException(
            status_code=404,
            detail="Disaster not found"
        )
    return summary
