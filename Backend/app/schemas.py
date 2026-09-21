from datetime import datetime
from pydantic import BaseModel, Field , ConfigDict


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

class WarehouseCreate(BaseModel):
    name: str
    latitude: float
    longitude: float
    capacity: int = Field(gt=0)

class WarehouseUpdate(BaseModel):
    name: str
    latitude: float
    longitude: float
    capacity: int = Field(gt=0)


    model_config = ConfigDict(from_attributes=True)
