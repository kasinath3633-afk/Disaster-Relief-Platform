from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field, ConfigDict



# ============================================================
# DISASTER SCHEMAS
# ============================================================

class DisasterCreate(BaseModel):
    name: str
    severity: int = Field(ge=1, le=10)
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    radius_km: float = Field(gt=0.0)


class DisasterUpdate(BaseModel):
    name: str
    severity: int = Field(ge=1, le=10)
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    radius_km: float = Field(gt=0.0)


# ============================================================
# WAREHOUSE SCHEMAS
# ============================================================

class WarehouseCreate(BaseModel):
    name: str
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    capacity: int = Field(gt=0)


class WarehouseUpdate(BaseModel):
    name: str
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    capacity: int = Field(gt=0)


# ============================================================
# POPULATION SCHEMAS
# ============================================================

class PopulationCreate(BaseModel):
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
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


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


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
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    capacity: int = Field(gt=0)
    occupancy: int = Field(default=0, ge=0)
    is_active: bool = True


class ShelterUpdate(BaseModel):
    name: str
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
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


# ============================================================
# ALLOCATION SCHEMAS
# ============================================================

class AllocationResponse(BaseModel):
    id: int
    disaster_id: int
    warehouse_id: int
    resource_id: int
    allocated_quantity: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# IMPACT ASSESSMENT SCHEMAS
# ============================================================

class ImpactAssessmentResponse(BaseModel):
    id: int
    disaster_id: int
    affected_population: int
    affected_buildings: int
    affected_roads: int
    affected_area_km2: float
    impact_score: float
    impact_level: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# GIS SCHEMAS
# ============================================================

class NearbyShelterResponse(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float
    capacity: int
    occupancy: int
    is_active: bool
    distance_km: float

    model_config = ConfigDict(from_attributes=True)


class NearbyWarehouseResponse(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float
    capacity: int
    distance_km: float

    model_config = ConfigDict(from_attributes=True)


class AffectedPopulationSpatialResponse(BaseModel):
    disaster_id: int
    total_affected_population: int
    total_vulnerable_population: int
    point_count: int
    geojson: dict


# ============================================================
# ROUTING SCHEMAS
# ============================================================

class RouteNodeResponse(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float

    model_config = ConfigDict(from_attributes=True)


class RouteEdgeResponse(BaseModel):
    id: int
    name: Optional[str] = "Road"
    start_node_id: int
    end_node_id: int
    distance_km: float
    speed_limit_kmh: float
    travel_time_minutes: float
    risk_score: float
    is_blocked: bool

    model_config = ConfigDict(from_attributes=True)


class RouteRequest(BaseModel):
    origin_node_id: int
    destination_node_id: int
    prefer_safe: bool = True
    algorithm: str = Field(default="dijkstra", pattern="^(dijkstra|astar)$")


class RouteResponse(BaseModel):
    origin_node_id: int
    destination_node_id: int
    path_node_ids: List[int]
    path_nodes: List[RouteNodeResponse]
    distance_km: float
    travel_time_minutes: float
    risk_score: float
    is_safe: bool
    algorithm_used: str
    explanation: str


class RoadEdgeBlockUpdate(BaseModel):
    is_blocked: bool


# ============================================================
# INTELLIGENT ALLOCATION SCHEMAS
# ============================================================

class IntelligentAllocationItem(BaseModel):
    resource: str
    destination_shelter_id: int
    destination_shelter_name: str
    warehouse_id: int
    warehouse_name: str
    quantity: int
    priority_score: float
    distance_km: float
    risk_score: float
    reason: str


class UnmetDemandItem(BaseModel):
    resource: str
    required: int
    allocated: int
    unmet: int
    reason: str


class IntelligentAllocationResponse(BaseModel):
    disaster_id: int
    total_allocations_count: int
    allocations: List[IntelligentAllocationItem]
    unmet_demand: List[UnmetDemandItem]
    heuristic_description: str
    status: str


# ============================================================
# WEATHER SCHEMAS
# ============================================================

class NormalizedWeatherResponse(BaseModel):
    temperature_c: float
    rainfall_mm: float
    wind_speed_kmh: float
    visibility_km: float
    weather_condition: str
    weather_risk: float
    source: str
    warnings: List[str]


# ============================================================
# DASHBOARD SCHEMAS
# ============================================================

class DashboardSummaryResponse(BaseModel):
    disaster: dict
    simulation_status: str
    impact_score: Optional[float] = None
    impact_level: Optional[str] = None
    affected_population: int
    affected_buildings: int
    affected_roads: int
    shelter_metrics: dict
    warehouse_metrics: dict
    relief_requirements: dict
    allocations_count: int
    unmet_demand: List[UnmetDemandItem]
    road_network: dict
    weather: Optional[dict] = None
    warnings: List[str]
    overall_response_status: str




