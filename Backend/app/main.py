from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import engine, Base, get_db
from app.models.disaster import Disaster
from app.models.shelter import Shelter
from app.schemas import (
    DisasterCreate,
    DisasterUpdate,
    ShelterCreate,
    ShelterResponse, 
    ShelterUpdate
)

Base.metadata.create_all(bind=engine)

app = FastAPI()


@app.get("/")
def root():
    return {"message": "Disaster Management System API"}

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
def get_disasters(db: Session = Depends(get_db)):
    disasters = db.query(Disaster).all()
    return disasters

@app.get("/disasters/{disaster_id}")
def get_disaster(disaster_id: int, db: Session = Depends(get_db)):
    disaster = db.query(Disaster).filter(Disaster.id == disaster_id).first()

    if disaster is None:
        return {"error": "Disaster not found"}

    return disaster

@app.delete("/disasters/{disaster_id}")
def delete_disaster(disaster_id: int, db: Session = Depends(get_db)):
    disaster = db.query(Disaster).filter(Disaster.id == disaster_id).first()

    if disaster is None:
        return {"error": "Disaster not found"}

    db.delete(disaster)
    db.commit()

    return {"message": "Disaster deleted successfully"}

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
        return {"error": "Disaster not found"}

    existing_disaster.name = disaster.name
    existing_disaster.severity = disaster.severity
    existing_disaster.latitude = disaster.latitude
    existing_disaster.longitude = disaster.longitude
    existing_disaster.radius_km = disaster.radius_km

    db.commit()
    db.refresh(existing_disaster)

    return existing_disaster

@app.post("/shelters", response_model=ShelterResponse)
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

@app.get("/shelters", response_model=list[ShelterResponse])
def get_shelters(db: Session = Depends(get_db)):
    shelters = db.query(Shelter).all()
    return shelters

@app.get("/shelters/{shelter_id}", response_model=ShelterResponse)
def get_shelter(shelter_id: int, db: Session = Depends(get_db)):
    if shelter is None:
        return {"error": "Shelter not found"}
    shelter = db.query(Shelter).filter(
        Shelter.id == shelter_id
    ).first()

    if shelter is None:
        return {"error": "Shelter not found"}

    return shelter

@app.put("/shelters/{shelter_id}", response_model=ShelterResponse)
def update_shelter(
    shelter_id: int,
    shelter: ShelterUpdate,
    db: Session = Depends(get_db)
):
    existing_shelter = db.query(Shelter).filter(
        Shelter.id == shelter_id
    ).first()

    if existing_shelter is None:
        return {"error": "Shelter not found"}

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
        return {"error": "Shelter not found"}

    db.delete(shelter)
    db.commit()

    return {"message": "Shelter deleted successfully"}