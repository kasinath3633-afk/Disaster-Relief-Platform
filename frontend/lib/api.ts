import { getAuthToken, clearAuthSession } from "./auth";
import {
  User,
  UserLogin,
  UserCreate,
  Token,
  Disaster,
  DisasterCreate,
  DisasterUpdate,
  Shelter,
  ShelterCreate,
  ShelterUpdate,
  Warehouse,
  WarehouseCreate,
  WarehouseUpdate,
  Resource,
  ResourceCreate,
  SimulationResult,
  ImpactAssessment,
  ReliefRequirement,
  NearbyShelter,
  NearbyWarehouse,
  AffectedPopulationSpatial,
  RouteNode,
  RouteEdge,
  RouteRequest,
  RouteResponse,
  RoadEdgeBlockUpdate,
  IntelligentAllocationResponse,
  NormalizedWeather,
  DashboardSummary,
} from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      clearAuthSession();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login?expired=true";
      }
      throw new ApiError("Session expired. Please log in again.", 401);
    }

    if (!res.ok) {
      let errorData: any = null;
      try {
        errorData = await res.json();
      } catch {
        errorData = { detail: await res.text() };
      }
      const message = errorData?.detail || errorData?.message || `HTTP ${res.status}: ${res.statusText}`;
      throw new ApiError(message, res.status, errorData);
    }

    // If expecting a blob (e.g. PDF reports)
    if (res.headers.get("content-type")?.includes("application/pdf")) {
      return (await res.blob()) as unknown as T;
    }

    // Default to JSON
    return (await res.json()) as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network errors (FastAPI offline, CORS, connection refused)
    throw new ApiError(
      "Unable to connect to disaster management server. Please check that the backend is running.",
      0,
      err
    );
  }
}

// ==========================================
// AUTHENTICATION APIs
// ==========================================

export async function login(payload: UserLogin): Promise<Token> {
  return request<Token>("/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function registerUser(payload: UserCreate): Promise<User> {
  return request<User>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCurrentUser(): Promise<User> {
  const res = await request<{ message: string; user_id: number; username: string; email: string }>("/test-auth");
  return {
    id: res.user_id,
    username: res.username,
    email: res.email,
  };
}

// ==========================================
// DISASTER APIs
// ==========================================

export async function getDisasters(): Promise<Disaster[]> {
  return request<Disaster[]>("/disasters");
}

export async function getDisaster(id: number): Promise<Disaster> {
  return request<Disaster>(`/disasters/${id}`);
}

export async function createDisaster(data: DisasterCreate): Promise<Disaster> {
  return request<Disaster>("/disasters", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateDisaster(id: number, data: DisasterUpdate): Promise<Disaster> {
  return request<Disaster>(`/disasters/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteDisaster(id: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/disasters/${id}`, {
    method: "DELETE",
  });
}

// ==========================================
// SIMULATION & IMPACT APIs
// ==========================================

export async function runSimulation(disaster_id: number): Promise<SimulationResult> {
  return request<SimulationResult>("/simulation/run", {
    method: "POST",
    body: JSON.stringify({ disaster_id }),
  });
}

export async function getSimulation(disaster_id: number): Promise<SimulationResult> {
  return request<SimulationResult>(`/simulation/${disaster_id}`);
}

export async function runImpactAssessment(disaster_id: number): Promise<ImpactAssessment> {
  return request<ImpactAssessment>(`/impact/run/${disaster_id}`, {
    method: "POST",
  });
}

export async function getImpactAssessment(disaster_id: number): Promise<ImpactAssessment> {
  return request<ImpactAssessment>(`/impact/${disaster_id}`);
}

// ==========================================
// RELIEF ESTIMATION & ALLOCATION APIs
// ==========================================

export async function estimateRelief(disaster_id: number): Promise<ReliefRequirement> {
  return request<ReliefRequirement>(`/relief/estimate/${disaster_id}`, {
    method: "POST",
  });
}

export async function getRelief(disaster_id: number): Promise<ReliefRequirement> {
  return request<ReliefRequirement>(`/relief/${disaster_id}`);
}

export async function getReliefAvailability(disaster_id: number): Promise<any> {
  return request<any>(`/relief/${disaster_id}/availability`);
}

export async function runIntelligentAllocation(
  disaster_id: number,
  commitToDb: boolean = false
): Promise<IntelligentAllocationResponse> {
  return request<IntelligentAllocationResponse>(
    `/relief/${disaster_id}/intelligent-allocate?commit_to_db=${commitToDb}`,
    {
      method: "POST",
    }
  );
}

// ==========================================
// SHELTERS APIs
// ==========================================

export async function getShelters(): Promise<Shelter[]> {
  return request<Shelter[]>("/shelters");
}

export async function getAvailableShelters(): Promise<Shelter[]> {
  return request<Shelter[]>("/shelters/available");
}

export async function createShelter(data: ShelterCreate): Promise<Shelter> {
  return request<Shelter>("/shelters", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateShelter(id: number, data: ShelterUpdate): Promise<Shelter> {
  return request<Shelter>(`/shelters/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteShelter(id: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/shelters/${id}`, {
    method: "DELETE",
  });
}

// ==========================================
// WAREHOUSES & RESOURCES APIs
// ==========================================

export async function getWarehouses(): Promise<Warehouse[]> {
  return request<Warehouse[]>("/warehouses");
}

export async function createWarehouse(data: WarehouseCreate): Promise<Warehouse> {
  return request<Warehouse>("/warehouses", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getResources(): Promise<Resource[]> {
  return request<Resource[]>("/resources");
}

export async function createResource(data: ResourceCreate): Promise<Resource> {
  return request<Resource>("/resources", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ==========================================
// GIS / SPATIAL APIs
// ==========================================

export async function getNearbyShelters(
  latitude: number,
  longitude: number,
  radius_km: number = 50.0,
  limit: number = 10
): Promise<NearbyShelter[]> {
  return request<NearbyShelter[]>(
    `/gis/shelters/nearby?latitude=${latitude}&longitude=${longitude}&radius_km=${radius_km}&limit=${limit}`
  );
}

export async function getNearbyWarehouses(
  latitude: number,
  longitude: number,
  radius_km: number = 100.0,
  limit: number = 10
): Promise<NearbyWarehouse[]> {
  return request<NearbyWarehouse[]>(
    `/gis/warehouses/nearby?latitude=${latitude}&longitude=${longitude}&radius_km=${radius_km}&limit=${limit}`
  );
}

export async function getAffectedPopulationSpatial(
  disaster_id: number
): Promise<AffectedPopulationSpatial> {
  return request<AffectedPopulationSpatial>(
    `/gis/population/affected?disaster_id=${disaster_id}`
  );
}

// ==========================================
// ROUTING APIs
// ==========================================

export async function seedRoadNetwork(): Promise<{ message: string; nodes_count: number; edges_count: number }> {
  return request<{ message: string; nodes_count: number; edges_count: number }>("/routing/seed-network", {
    method: "POST",
  });
}

export async function getRoadNodes(): Promise<RouteNode[]> {
  return request<RouteNode[]>("/routing/nodes");
}

export async function getRoadEdges(): Promise<RouteEdge[]> {
  return request<RouteEdge[]>("/routing/edges");
}

export async function blockRoadEdge(
  edge_id: number,
  is_blocked: boolean
): Promise<RouteEdge> {
  return request<RouteEdge>(`/routing/edges/${edge_id}/block`, {
    method: "PUT",
    body: JSON.stringify({ is_blocked }),
  });
}

export async function calculateRoute(
  payload: RouteRequest
): Promise<RouteResponse> {
  return request<RouteResponse>("/routing/calculate-route", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ==========================================
// WEATHER TELEMETRY APIs
// ==========================================

export async function getWeather(
  latitude: number,
  longitude: number
): Promise<NormalizedWeather> {
  return request<NormalizedWeather>(
    `/external/weather?latitude=${latitude}&longitude=${longitude}`
  );
}

// ==========================================
// PDF REPORTS APIs
// ==========================================

export async function getStandardReportBlob(disaster_id: number): Promise<Blob> {
  return request<Blob>(`/reports/${disaster_id}`);
}

export async function getComprehensiveReportBlob(disaster_id: number): Promise<Blob> {
  return request<Blob>(`/reports/${disaster_id}/comprehensive`);
}

// ==========================================
// UNIFIED DASHBOARD API
// ==========================================

export async function getDashboardSummary(
  disaster_id: number
): Promise<DashboardSummary> {
  return request<DashboardSummary>(`/dashboard/${disaster_id}`);
}
