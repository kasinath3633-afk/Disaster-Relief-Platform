from datetime import datetime

from pydantic import BaseModel, Field


class DisasterCreate(BaseModel):
    name: str
    severity: int = Field(ge=1, le=10)
    latitude: float
    longitude: float
    radius_km: float

class DisasterUpdate(BaseModel):
    name: str
    severity: int = Field(ge=1, le=10)
    latitude: float
    longitude: float
    radius_km: float

class ShelterCreate(BaseModel):
    name: str
    latitude: float
    longitude: float
    capacity: int
    occupancy: int = 0
    is_active: bool = True

class ShelterUpdate(BaseModel):
    name: str
    latitude: float
    longitude: float
    capacity: int
    occupancy: int
    is_active: bool

class ShelterResponse(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float
    capacity: int
    occupancy: int
    is_active: bool
    created_at: datetime

    model_config = {
        "from_attributes": True
    }