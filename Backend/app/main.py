from fastapi.security import OAuth2PasswordBearer
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import engine, Base, get_db
from app.security import hash_password, verify_password, create_access_token, decode_access_token
from app.models.disaster import Disaster
from app.models.warehouse import Warehouse
from app.models.population import PopulationPoint
from app.models.user import User
from app.models.simulation import SimulationResult
from app.models.relief import ReliefRequirement
from app.models.shelter import Shelter
from app.models.resource import Resource

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
    Token
)


# =========================================================
# CREATE DATABASE TABLES
# =========================================================

Base.metadata.create_all(bind=engine)


app = FastAPI()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
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
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
):
    disasters = db.query(Disaster).all()

    return disasters


@app.get("/disasters/{disaster_id}")
def get_disaster(
    disaster_id: int,
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
):
    warehouses = db.query(Warehouse).all()

    return warehouses


@app.get("/warehouses/{warehouse_id}")
def get_warehouse(
    warehouse_id: int,
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
):
    resources = db.query(Resource).all()

    return resources


@app.get(
    "/resources/{resource_id}",
    response_model=ResourceResponse
)
def get_resource(
    resource_id: int,
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
):
    users = db.query(User).all()

    return users


@app.get("/users/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
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

    # Temporary geographic approximation
    for point in population_points:

        latitude_difference = abs(
            point.latitude - disaster.latitude
        )

        longitude_difference = abs(
            point.longitude - disaster.longitude
        )

        if (
            latitude_difference <= disaster.radius_km / 111
            and
            longitude_difference <= disaster.radius_km / 111
        ):
            affected_population += point.population

    affected_area_km2 = (
        3.14159
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
    db: Session = Depends(get_db)
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
# SHELTER APIs
# =========================================================

@app.post(
    "/shelters",
    response_model=ShelterResponse
)
def create_shelter(
    shelter: ShelterCreate,
    db: Session = Depends(get_db)
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


@app.get(
    "/shelters/{shelter_id}",
    response_model=ShelterResponse
)
def get_shelter(
    shelter_id: int,
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
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
# RELIEF APIs
# =========================================================

@app.post(
    "/relief/estimate/{disaster_id}",
    response_model=ReliefResponse
)
def estimate_relief(
    disaster_id: int,
    db: Session = Depends(get_db)
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

    medical_kits = max(
        1,
        affected_population // 20
    )

    blankets = affected_population

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
    db: Session = Depends(get_db)
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