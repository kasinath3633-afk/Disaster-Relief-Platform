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
# USER SCHEMAS
# ============================================================

class UserCreate(BaseModel):
    username: str
    email: str
    phone_number: str
    password: str


class UserUpdate(BaseModel):
    username: str
    email: str
    phone_number: str
    role: str


# ============================================================
# SHELTER SCHEMAS
# ============================================================

class ShelterCreate(BaseModel):
    name: str
    latitude: float
    longitude: float
    capacity: int = Field(gt=0)
    occupancy: int = Field(default=0, ge=0)
    is_active: bool = True


class ShelterUpdate(BaseModel):
    name: str
    latitude: float
    longitude: float
    capacity: int = Field(gt=0)
    occupancy: int = Field(default=0, ge=0)
    is_active: bool = True


class ShelterResponse(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float
    capacity: int
    occupancy: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


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


# ============================================================
# RELIEF SCHEMAS
# ============================================================

class ReliefCreate(BaseModel):
    disaster_id: int


class ReliefResponse(BaseModel):
    id: int
    disaster_id: int
    food_packets: int
    water_liters: int
    medical_kits: int
    blankets: int
    status: str

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# RESOURCE SCHEMAS
# ============================================================

class ResourceCreate(BaseModel):
    warehouse_id: int
    name: str
    quantity: int = Field(gt=0)
    unit: str


class ResourceUpdate(BaseModel):
    warehouse_id: int
    name: str
    quantity: int = Field(gt=0)
    unit: str


class ResourceResponse(BaseModel):
    id: int
    warehouse_id: int
    name: str
    quantity: int
    unit: str

    model_config = ConfigDict(from_attributes=True)
