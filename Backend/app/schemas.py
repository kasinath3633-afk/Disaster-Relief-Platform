from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict


# ============================================================
# DISASTER SCHEMAS
# ============================================================

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


# ============================================================
# WAREHOUSE SCHEMAS
# ============================================================

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


# ============================================================
# POPULATION SCHEMAS
# ============================================================

class PopulationCreate(BaseModel):
    latitude: float
    longitude: float
    population: int = Field(gt=0)
    vulnerable_population: int = Field(
        default=0,
        ge=0
    )


# ============================================================
# SIMULATION SCHEMAS
# ============================================================

class SimulationCreate(BaseModel):
    disaster_id: int


class SimulationResponse(BaseModel):
    id: int
    disaster_id: int
    affected_population: int
    affected_area_km2: float
    severity: int
    status: str

    model_config = ConfigDict(from_attributes=True)

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