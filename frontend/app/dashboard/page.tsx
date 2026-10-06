"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  getDisasters,
  getDashboardSummary,
  getAffectedPopulationSpatial,
  getShelters,
  getWarehouses,
} from "@/lib/api";
import {
  Disaster,
  DashboardSummary,
  Shelter,
  Warehouse,
  AffectedPopulationSpatial,
} from "@/types/api";
import { KPICard } from "@/components/dashboard/KPICard";
import { StatusBanner } from "@/components/dashboard/StatusBanner";
import { WeatherWidget } from "@/components/dashboard/WeatherWidget";
import { ImpactBreakdownCard } from "@/components/dashboard/ImpactBreakdownCard";
import { ShelterOccupancyTable } from "@/components/dashboard/ShelterOccupancyTable";
import { CommandMap } from "@/components/maps/CommandMap";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatNumber } from "@/lib/utils";
import {
  Flame,
  Users,
  Building2,
  Car,
  Home,
  Boxes,
  Package,
  Activity,
  CloudRain,
  RefreshCw,
  Layers,
  ShieldAlert,
} from "lucide-react";

export default function CommandDashboardPage() {
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [selectedDisasterId, setSelectedDisasterId] = useState<number | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [populationGeoJson, setPopulationGeoJson] = useState<any>(null);

  const [loadingDisasters, setLoadingDisasters] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map layer toggle states
  const [layerPopulation, setLayerPopulation] = useState(true);
  const [layerShelters, setLayerShelters] = useState(true);
  const [layerWarehouses, setLayerWarehouses] = useState(true);

  // Initial load: Fetch all disasters
  const loadDisasters = useCallback(async () => {
    setLoadingDisasters(true);
    setError(null);
    try {
      const data = await getDisasters();
      setDisasters(data);
      if (data.length > 0 && !selectedDisasterId) {
        setSelectedDisasterId(data[0].id);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load disaster registries from backend.");
    } finally {
      setLoadingDisasters(false);
    }
  }, [selectedDisasterId]);

  useEffect(() => {
    loadDisasters();
  }, [loadDisasters]);

  // Load selected disaster dashboard and GIS telemetry
  const loadDashboardData = useCallback(async (disasterId: number) => {
    setLoadingDashboard(true);
    setError(null);
    try {
      const [dashData, sheltersData, warehousesData] = await Promise.all([
        getDashboardSummary(disasterId),
        getShelters().catch(() => []),
        getWarehouses().catch(() => []),
      ]);
      setDashboard(dashData);
      setShelters(sheltersData);
      setWarehouses(warehousesData);

      // Fetch GIS spatial population GeoJSON for the disaster
      try {
        const popSpatial: AffectedPopulationSpatial = await getAffectedPopulationSpatial(disasterId);
        setPopulationGeoJson(popSpatial?.geojson || null);
      } catch {
        setPopulationGeoJson(null);
      }
    } catch (err: any) {
      setError(err?.message || `Failed to retrieve tactical dashboard for Disaster #${disasterId}`);
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDisasterId) {
      loadDashboardData(selectedDisasterId);
    }
  }, [selectedDisasterId, loadDashboardData]);

  const activeDisaster = disasters.find((d) => d.id === selectedDisasterId);

  return (
    <AppShell
      title="Disaster Response Command Center"
      subtitle="Unified Tactical Dashboard & Spatial GIS Telemetry"
    >
      {/* Top Controls: Selector & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
            Active Disaster Incident:
          </label>
          <div className="relative">
            <select
              value={selectedDisasterId || ""}
              onChange={(e) => setSelectedDisasterId(Number(e.target.value))}
              disabled={loadingDisasters || disasters.length === 0}
              className="bg-slate-950 border border-slate-700 text-slate-100 text-xs font-medium rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
            >
              {disasters.map((d) => (
                <option key={d.id} value={d.id}>
                  #{d.id} — {d.name} (Severity {d.severity}/10)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => selectedDisasterId && loadDashboardData(selectedDisasterId)}
            disabled={loadingDashboard || !selectedDisasterId}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold font-mono transition-colors border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDashboard ? "animate-spin text-cyan-400" : ""}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {loadingDisasters ? (
        <LoadingState message="Connecting to Incident Databases..." />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={() => selectedDisasterId && loadDashboardData(selectedDisasterId)}
        />
      ) : !selectedDisasterId || !dashboard ? (
        <EmptyState
          title="No Incident Selected"
          message="Please select or register a disaster incident to view tactical telemetry."
        />
      ) : (
        <div className="space-y-6">
          {/* 1. Tactical Status Banner */}
          <StatusBanner
            status={dashboard.overall_response_status}
            disasterName={dashboard.disaster?.name}
            severity={dashboard.disaster?.severity}
            radiusKm={dashboard.disaster?.radius_km}
            warnings={dashboard.warnings}
          />

          {/* 2. Key Performance Indicators (KPI Cards) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Affected Population"
              value={formatNumber(dashboard.affected_population)}
              subtext="Individuals in exposure zone"
              icon={<Users className="w-4 h-4 text-indigo-400" />}
              variant={dashboard.affected_population > 5000 ? "critical" : "default"}
            />

            <KPICard
              title="Impact Rating"
              value={dashboard.impact_score !== null ? `${dashboard.impact_score.toFixed(1)}%` : "N/A"}
              subtext={`Level: ${dashboard.impact_level || "Pending"}`}
              icon={<Activity className="w-4 h-4 text-orange-400" />}
              variant={dashboard.impact_level === "CRITICAL" ? "critical" : dashboard.impact_level === "HIGH" ? "warning" : "default"}
            />

            <KPICard
              title="Shelter Availability"
              value={`${formatNumber(dashboard.shelter_metrics.available_capacity)} / ${formatNumber(dashboard.shelter_metrics.total_capacity)}`}
              subtext={`${dashboard.shelter_metrics.total_shelters} facilities active`}
              icon={<Home className="w-4 h-4 text-cyan-400" />}
              variant={dashboard.shelter_metrics.available_capacity === 0 ? "critical" : "success"}
            />

            <KPICard
              title="Warehouse Stock"
              value={formatNumber(dashboard.warehouse_metrics.total_available_stock_units)}
              subtext={`${dashboard.warehouse_metrics.total_warehouses} logistics depots`}
              icon={<Boxes className="w-4 h-4 text-emerald-400" />}
              variant="default"
            />
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Damaged Buildings"
              value={formatNumber(dashboard.affected_buildings)}
              subtext="Structural assessment"
              icon={<Building2 className="w-4 h-4 text-amber-400" />}
              variant="default"
            />

            <KPICard
              title="Impacted Roads"
              value={formatNumber(dashboard.affected_roads)}
              subtext={`${dashboard.road_network.blocked_corridors} blocked corridors`}
              icon={<Car className="w-4 h-4 text-red-400" />}
              variant={dashboard.road_network.blocked_corridors > 0 ? "warning" : "default"}
            />

            <KPICard
              title="Dispatched Units"
              value={formatNumber(dashboard.allocations_count)}
              subtext="Intelligent consignments"
              icon={<Package className="w-4 h-4 text-cyan-400" />}
              variant="info"
            />

            <KPICard
              title="Atmospheric Risk"
              value={dashboard.weather ? `${(dashboard.weather.weather_risk * 100).toFixed(0)}%` : "N/A"}
              subtext={dashboard.weather?.weather_condition || "No sensor data"}
              icon={<CloudRain className="w-4 h-4 text-blue-400" />}
              variant={dashboard.weather && dashboard.weather.weather_risk > 0.6 ? "critical" : "default"}
            />
          </div>

          {/* 3. Interactive GIS Tactical Map */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Spatial Incident Map & Infrastructure Layers
                </h3>
              </div>

              {/* Layer Controls */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <button
                  onClick={() => setLayerPopulation(!layerPopulation)}
                  className={`px-2.5 py-1 rounded border transition-colors ${
                    layerPopulation
                      ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                      : "bg-slate-900 text-slate-500 border-slate-800"
                  }`}
                >
                  ● Population Points
                </button>
                <button
                  onClick={() => setLayerShelters(!layerShelters)}
                  className={`px-2.5 py-1 rounded border transition-colors ${
                    layerShelters
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                      : "bg-slate-900 text-slate-500 border-slate-800"
                  }`}
                >
                  ● Shelters
                </button>
                <button
                  onClick={() => setLayerWarehouses(!layerWarehouses)}
                  className={`px-2.5 py-1 rounded border transition-colors ${
                    layerWarehouses
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-slate-900 text-slate-500 border-slate-800"
                  }`}
                >
                  ● Warehouses
                </button>
              </div>
            </div>

            <CommandMap
              center={
                activeDisaster
                  ? [activeDisaster.latitude, activeDisaster.longitude]
                  : [13.0827, 80.2707]
              }
              zoom={11}
              height="480px"
              disaster={
                activeDisaster
                  ? {
                      name: activeDisaster.name,
                      latitude: activeDisaster.latitude,
                      longitude: activeDisaster.longitude,
                      radius_km: activeDisaster.radius_km,
                      severity: activeDisaster.severity,
                    }
                  : null
              }
              shelters={shelters}
              warehouses={warehouses}
              populationGeoJson={populationGeoJson}
              showPopulation={layerPopulation}
              showShelters={layerShelters}
              showWarehouses={layerWarehouses}
            />
          </div>

          {/* 4. Impact Assessment & Weather Telemetry Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ImpactBreakdownCard
              impactScore={dashboard.impact_score}
              impactLevel={dashboard.impact_level}
              affectedPopulation={dashboard.affected_population}
              affectedBuildings={dashboard.affected_buildings}
              affectedRoads={dashboard.affected_roads}
            />

            <WeatherWidget weather={dashboard.weather} />
          </div>

          {/* 5. Shelter Network Occupancy Table */}
          <ShelterOccupancyTable shelters={shelters} />
        </div>
      )}
    </AppShell>
  );
}
