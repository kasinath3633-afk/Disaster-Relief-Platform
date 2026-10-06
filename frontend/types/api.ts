// TypeScript interfaces strictly matching FastAPI / Pydantic schemas

export interface User {
  id: number;
  username: string;
  email: string;
  phone_number?: string;
  role?: string;
  created_at?: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserCreate {
  username: string;
  email: string;
  phone_number: string;
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface Disaster {
  id: number;
  name: string;
  severity: number; // 1-10
  latitude: floatNumber;
  longitude: floatNumber;
  radius_km: number;
  created_at?: string;
}

type floatNumber = number;

export interface DisasterCreate {
  name: string;
  severity: number;
  latitude: number;
  longitude: number;
  radius_km: number;
}

export interface DisasterUpdate {
  name: string;
  severity: number;
  latitude: number;
  longitude: number;
  radius_km: number;
}

export interface Shelter {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  occupancy: number;
  is_active: boolean;
  distance_km?: number;
}

export interface ShelterCreate {
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  occupancy: number;
  is_active: boolean;
}

export interface ShelterUpdate {
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  occupancy: number;
  is_active: boolean;
}

export interface Warehouse {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  distance_km?: number;
}

export interface WarehouseCreate {
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
}

export interface WarehouseUpdate {
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
}

export interface Resource {
  id: number;
  warehouse_id: number;
  name: string;
  quantity: number;
  unit: string;
}

export interface ResourceCreate {
  warehouse_id: number;
  name: string;
  quantity: number;
  unit: string;
}

export interface SimulationResult {
  id: number;
  disaster_id: number;
  affected_population: number;
  affected_area_km2: number;
  severity: number;
  status: string;
}

export interface ReliefRequirement {
  id: number;
  disaster_id: number;
  food_packets: number;
  water_liters: number;
  medical_kits: number;
  blankets: number;
  status: string;
}

export interface ImpactAssessment {
  id: number;
  disaster_id: number;
  affected_population: number;
  affected_buildings: number;
  affected_roads: number;
  affected_area_km2: number;
  impact_score: number;
  impact_level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | string;
  created_at: string;
}

export interface NearbyShelter {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  occupancy: number;
  is_active: boolean;
  distance_km: number;
}

export interface NearbyWarehouse {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  distance_km: number;
}

export interface AffectedPopulationSpatial {
  disaster_id: number;
  total_affected_population: number;
  total_vulnerable_population: number;
  point_count: number;
  geojson: {
    type: string;
    features: Array<{
      type: string;
      geometry: {
        type: string;
        coordinates: [number, number]; // [longitude, latitude] in GeoJSON
      };
      properties: {
        id: number;
        population: number;
        vulnerable_population: number;
        distance_km: number;
      };
    }>;
  };
}

export interface RouteNode {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

export interface RouteEdge {
  id: number;
  name?: string;
  start_node_id: number;
  end_node_id: number;
  distance_km: number;
  speed_limit_kmh: number;
  travel_time_minutes: number;
  risk_score: number;
  is_blocked: boolean;
}

export interface RouteRequest {
  origin_node_id: number;
  destination_node_id: number;
  prefer_safe: boolean;
  algorithm: "dijkstra" | "astar";
}

export interface RouteResponse {
  origin_node_id: number;
  destination_node_id: number;
  path_node_ids: number[];
  path_nodes: RouteNode[];
  distance_km: number;
  travel_time_minutes: number;
  risk_score: number;
  is_safe: boolean;
  algorithm_used: string;
  explanation: string;
}

export interface RoadEdgeBlockUpdate {
  is_blocked: boolean;
}

export interface IntelligentAllocationItem {
  resource: string;
  destination_shelter_id: number;
  destination_shelter_name: string;
  warehouse_id: number;
  warehouse_name: string;
  quantity: number;
  priority_score: number;
  distance_km: number;
  risk_score: number;
  reason: string;
}

export interface UnmetDemandItem {
  resource: string;
  required: number;
  allocated: number;
  unmet: number;
  reason: string;
}

export interface IntelligentAllocationResponse {
  disaster_id: number;
  total_allocations_count: number;
  allocations: IntelligentAllocationItem[];
  unmet_demand: UnmetDemandItem[];
  heuristic_description: string;
  status: string;
}

export interface NormalizedWeather {
  temperature_c: number;
  rainfall_mm: number;
  wind_speed_kmh: number;
  visibility_km: number;
  weather_condition: string;
  weather_risk: number;
  source: string;
  warnings: string[];
}

export interface DashboardSummary {
  disaster: {
    id: number;
    name: string;
    severity: number;
    latitude: number;
    longitude: number;
    radius_km: number;
    created_at?: string;
  };
  simulation_status: string;
  impact_score: number | null;
  impact_level: string | null;
  affected_population: number;
  affected_buildings: number;
  affected_roads: number;
  shelter_metrics: {
    total_shelters: number;
    total_capacity: number;
    total_occupancy: number;
    available_capacity: number;
  };
  warehouse_metrics: {
    total_warehouses: number;
    total_available_stock_units: number;
  };
  relief_requirements: {
    food_packets: number;
    water_liters: number;
    medical_kits: number;
    blankets: number;
    status: string;
  };
  allocations_count: number;
  unmet_demand: UnmetDemandItem[];
  road_network: {
    passable_corridors: number;
    blocked_corridors: number;
  };
  weather: NormalizedWeather | null;
  warnings: string[];
  overall_response_status: "CRITICAL_ACTION_REQUIRED" | "ELEVATED_RESPONSE" | "NORMAL_MONITORING" | string;
}
