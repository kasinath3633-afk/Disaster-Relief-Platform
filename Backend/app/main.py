from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import engine, Base, get_db

from app.models.disaster import Disaster
from app.models.warehouse import Warehouse
from app.models.population import PopulationPoint
from app.models.simulation import SimulationResult

from app.schemas import (
    DisasterCreate,
    DisasterUpdate,
    WarehouseCreate,
    WarehouseUpdate,
    PopulationCreate,
    SimulationCreate,
    SimulationResponse
)


# =========================================================
# CREATE DATABASE TABLES
# =========================================================

Base.metadata.create_all(bind=engine)


app = FastAPI()


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
    # Find the disaster
    disaster = db.query(Disaster).filter(
        Disaster.id == simulation.disaster_id
    ).first()

    if disaster is None:
        raise HTTPException(
            status_code=404,
            detail="Disaster not found"
        )

    # -----------------------------------------------------
    # Temporary simulation logic
    # -----------------------------------------------------

    affected_population = 0

    population_points = db.query(
        PopulationPoint
    ).all()

    # Temporary distance approximation.
    #
    # 1 degree of latitude is approximately 111 km.
    #
    # This is NOT the final geographic calculation.
    # PostGIS will be used later for accurate spatial
    # calculations.
    #

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

    # Approximate affected circular area
    affected_area_km2 = (
        3.14159
        * disaster.radius_km
        * disaster.radius_km
    )

    # Create simulation result
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