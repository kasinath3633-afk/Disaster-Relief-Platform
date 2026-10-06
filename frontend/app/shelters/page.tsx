"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { getShelters, createShelter, getNearbyShelters } from "@/lib/api";
import { Shelter, ShelterCreate } from "@/types/api";
import { CommandMap } from "@/components/maps/CommandMap";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatNumber, formatCoordinate } from "@/lib/utils";
import {
  Home,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Compass,
} from "lucide-react";

export default function SheltersPage() {
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Spatial search filter
  const [isSpatialFiltered, setIsSpatialFiltered] = useState(false);
  const [spatialLat, setSpatialLat] = useState<number>(13.0827);
  const [spatialLon, setSpatialLon] = useState<number>(80.2707);
  const [spatialRadius, setSpatialRadius] = useState<number>(50.0);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newShelter, setNewShelter] = useState<ShelterCreate>({
    name: "",
    latitude: 13.0827,
    longitude: 80.2707,
    capacity: 1000,
    occupancy: 0,
    is_active: true,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getShelters();
      setShelters(data);
      setIsSpatialFiltered(false);
    } catch (err: any) {
      setError(err?.message || "Failed to load shelter network from backend");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Spatial query
  const handleSpatialSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const nearby = await getNearbyShelters(spatialLat, spatialLon, spatialRadius, 50);
      setShelters(nearby);
      setIsSpatialFiltered(true);
      setActionSuccess(`Spatial PostGIS query returned ${nearby.length} shelters within ${spatialRadius} km.`);
    } catch (err: any) {
      setError(err?.message || "Spatial query failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShelter = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    try {
      if (!newShelter.name.trim()) throw new Error("Shelter name is required.");
      if (newShelter.capacity <= 0) throw new Error("Capacity must be greater than 0.");
      if (newShelter.occupancy < 0) throw new Error("Occupancy cannot be negative.");

      const created = await createShelter(newShelter);
      setShowCreateModal(false);
      setActionSuccess(`Shelter "${created.name}" (#${created.id}) registered successfully!`);
      setNewShelter({
        name: "",
        latitude: 13.0827,
        longitude: 80.2707,
        capacity: 1000,
        occupancy: 0,
        is_active: true,
      });
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || "Failed to create shelter");
    } finally {
      setFormSubmitting(false);
    }
  };

  const filteredShelters = shelters.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCapacity = shelters.reduce((sum, s) => sum + s.capacity, 0);
  const totalOccupancy = shelters.reduce((sum, s) => sum + s.occupancy, 0);
  const availableBeds = Math.max(0, totalCapacity - totalOccupancy);

  return (
    <AppShell
      title="Shelter Network Command"
      subtitle="Evacuation Facilities, Influx Balancing & Capacity Management"
    >
      {/* Metrics Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">
            Active Facilities
          </span>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-2">
            {shelters.length}
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Operational shelters</span>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">
            Total Accommodated
          </span>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-2">
            {formatNumber(totalOccupancy)}
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {totalCapacity > 0 ? `${Math.round((totalOccupancy / totalCapacity) * 100)}% utilization` : "0%"}
          </span>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">
            Available Capacity
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            {formatNumber(availableBeds)}
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Beds ready for influx</span>
        </div>
      </div>

      {/* Top Search & Actions */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shelters by name..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
            />
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg shadow-cyan-950/40 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Register Facility</span>
          </button>
        </div>

        {/* Spatial Radius Query Filter */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-3 text-xs font-mono">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>PostGIS Proximity Search:</span>
          </span>
          <input
            type="number"
            step="0.01"
            value={spatialLat}
            onChange={(e) => setSpatialLat(parseFloat(e.target.value))}
            placeholder="Lat"
            className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
          />
          <input
            type="number"
            step="0.01"
            value={spatialLon}
            onChange={(e) => setSpatialLon(parseFloat(e.target.value))}
            placeholder="Lon"
            className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
          />
          <input
            type="number"
            step="5"
            value={spatialRadius}
            onChange={(e) => setSpatialRadius(parseFloat(e.target.value))}
            placeholder="Radius km"
            className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
          />
          <button
            onClick={handleSpatialSearch}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded transition-colors"
          >
            Query
          </button>
          {isSpatialFiltered && (
            <button
              onClick={loadData}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded transition-colors"
            >
              Reset All
            </button>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cartographic Preview */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide font-mono">
          Shelter Spatial Deployment
        </h4>
        <CommandMap
          center={[13.0827, 80.2707]}
          zoom={11}
          height="320px"
          shelters={shelters}
          showShelters={true}
          showWarehouses={false}
          showPopulation={false}
        />
      </div>

      {/* Shelters Table */}
      {loading ? (
        <LoadingState message="Loading Shelter Network..." />
      ) : filteredShelters.length === 0 ? (
        <EmptyState
          title="No Shelters Registered"
          message="Register a shelter facility to manage evacuees."
          actionLabel="Register Facility"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2 font-medium">Facility</th>
                  <th className="pb-2 font-medium">Coordinates</th>
                  <th className="pb-2 font-medium text-right">Capacity</th>
                  <th className="pb-2 font-medium text-right">Occupied</th>
                  <th className="pb-2 font-medium text-right">Available</th>
                  <th className="pb-2 font-medium">Utilization</th>
                  {isSpatialFiltered && <th className="pb-2 font-medium text-right">Distance</th>}
                  <th className="pb-2 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredShelters.map((s) => {
                  const available = Math.max(0, s.capacity - s.occupancy);
                  const pct = Math.min(100, Math.round((s.occupancy / s.capacity) * 100));
                  const isOverloaded = pct >= 90;

                  return (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 font-medium text-slate-200">
                        <div className="flex items-center gap-1.5">
                          <Home className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{s.name}</span>
                          {isOverloaded && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                        </div>
                      </td>
                      <td className="py-2.5 text-slate-400">
                        {formatCoordinate(s.latitude, s.longitude)}
                      </td>
                      <td className="py-2.5 text-right text-slate-300">
                        {formatNumber(s.capacity)}
                      </td>
                      <td className="py-2.5 text-right text-slate-300">
                        {formatNumber(s.occupancy)}
                      </td>
                      <td className="py-2.5 text-right font-bold">
                        <span className={isOverloaded ? "text-red-400" : "text-emerald-400"}>
                          {formatNumber(available)}
                        </span>
                      </td>
                      <td className="py-2.5 w-32">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isOverloaded ? "bg-red-500" : pct >= 75 ? "bg-amber-500" : "bg-cyan-500"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                      {isSpatialFiltered && (
                        <td className="py-2.5 text-right text-cyan-400 font-bold">
                          {s.distance_km !== undefined ? `${s.distance_km.toFixed(2)} km` : "N/A"}
                        </td>
                      )}
                      <td className="py-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isOverloaded
                              ? "bg-red-500/20 text-red-300 border-red-500/40"
                              : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          }`}
                        >
                          {isOverloaded ? "NEAR CAPACITY" : "AVAILABLE"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Register Shelter Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Home className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                  Register Shelter Facility
                </h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-mono">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateShelter} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-300 uppercase mb-1">Facility Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Coastal Community Center Shelter"
                  value={newShelter.name}
                  onChange={(e) => setNewShelter({ ...newShelter, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 uppercase mb-1">Capacity (Beds)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newShelter.capacity}
                    onChange={(e) => setNewShelter({ ...newShelter, capacity: parseInt(e.target.value, 10) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 uppercase mb-1">Current Occupancy</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newShelter.occupancy}
                    onChange={(e) => setNewShelter({ ...newShelter, occupancy: parseInt(e.target.value, 10) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 uppercase mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="-90"
                    max="90"
                    required
                    value={newShelter.latitude}
                    onChange={(e) => setNewShelter({ ...newShelter, latitude: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 uppercase mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="-180"
                    max="180"
                    required
                    value={newShelter.longitude}
                    onChange={(e) => setNewShelter({ ...newShelter, longitude: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-wider flex items-center gap-1.5"
                >
                  {formSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Register Facility</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
