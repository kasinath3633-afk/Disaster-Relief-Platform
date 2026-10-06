"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import {
  getDisasters,
  createDisaster,
  deleteDisaster,
  runSimulation,
  runImpactAssessment,
  estimateRelief,
} from "@/lib/api";
import { Disaster, DisasterCreate } from "@/types/api";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCoordinate, getSeverityBadgeClass } from "@/lib/utils";
import {
  Flame,
  Plus,
  Trash2,
  Play,
  Activity,
  PackagePlus,
  LayoutDashboard,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";

export default function DisastersPage() {
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newDisaster, setNewDisaster] = useState<DisasterCreate>({
    name: "",
    severity: 7,
    latitude: 13.0827,
    longitude: 80.2707,
    radius_km: 15.0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDisasters();
      setDisasters(data.sort((a, b) => b.id - a.id));
    } catch (err: any) {
      setError(err?.message || "Failed to load disasters from backend");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateDisaster = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    try {
      if (!newDisaster.name.trim()) throw new Error("Incident name is required.");
      if (newDisaster.severity < 1 || newDisaster.severity > 10) throw new Error("Severity must be 1-10.");
      if (newDisaster.radius_km <= 0) throw new Error("Radius must be greater than 0.");

      const created = await createDisaster(newDisaster);
      setShowCreateModal(false);
      setActionSuccess(`Disaster "${created.name}" (#${created.id}) registered successfully!`);
      setNewDisaster({
        name: "",
        severity: 7,
        latitude: 13.0827,
        longitude: 80.2707,
        radius_km: 15.0,
      });
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || "Failed to create disaster");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (disaster: Disaster) => {
    const confirmed = window.confirm(
      `Delete incident "${disaster.name}" (#${disaster.id})? This action removes all linked records.`
    );
    if (!confirmed) return;

    setProcessingId(disaster.id);
    try {
      await deleteDisaster(disaster.id);
      setActionSuccess(`Disaster #${disaster.id} deleted successfully.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || `Failed to delete disaster #${disaster.id}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRunSimulation = async (id: number) => {
    setProcessingId(id);
    setActionSuccess(null);
    try {
      const sim = await runSimulation(id);
      setActionSuccess(
        `Simulation completed for #${id}! Affected Population: ${sim.affected_population.toLocaleString()}, Area: ${sim.affected_area_km2.toFixed(1)} km²`
      );
    } catch (err: any) {
      setError(err?.message || `Simulation failed for #${id}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRunImpact = async (id: number) => {
    setProcessingId(id);
    setActionSuccess(null);
    try {
      const imp = await runImpactAssessment(id);
      setActionSuccess(
        `Impact Assessment calculated for #${id}! Level: ${imp.impact_level}, Score: ${imp.impact_score.toFixed(1)}%`
      );
    } catch (err: any) {
      setError(err?.message || `Impact Assessment failed for #${id}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleEstimateRelief = async (id: number) => {
    setProcessingId(id);
    setActionSuccess(null);
    try {
      const req = await estimateRelief(id);
      setActionSuccess(
        `Relief Requirements estimated for #${id}! Food: ${req.food_packets.toLocaleString()}, Water: ${req.water_liters.toLocaleString()} L`
      );
    } catch (err: any) {
      setError(err?.message || `Relief estimation failed for #${id}`);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredDisasters = disasters.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppShell
      title="Disaster Zone Management"
      subtitle="Operational Incident Registry & Multi-Sector Simulation Controls"
    >
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search disasters by name..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
          />
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-950/40 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Incident</span>
        </button>
      </div>

      {/* Notifications */}
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

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <LoadingState message="Loading Incident Registries..." />
      ) : filteredDisasters.length === 0 ? (
        <EmptyState
          title="No Disasters Found"
          message={searchQuery ? "No incidents match your filter query." : "Register an incident to initiate simulation."}
          actionLabel="Create First Incident"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredDisasters.map((d) => {
            const isBusy = processingId === d.id;

            return (
              <div
                key={d.id}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left Info */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-slate-500 font-bold">#{d.id}</span>
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-400" />
                      {d.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getSeverityBadgeClass(
                        d.severity
                      )}`}
                    >
                      Severity {d.severity}/10
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono">
                    <div>
                      Coordinates: <span className="text-slate-200">{formatCoordinate(d.latitude, d.longitude)}</span>
                    </div>
                    <div>
                      Operational Radius: <span className="text-slate-200">{d.radius_km} km</span>
                    </div>
                  </div>
                </div>

                {/* Right Operational Pipeline Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleRunSimulation(d.id)}
                    disabled={isBusy}
                    title="Run spatial population intersection simulation"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold font-mono border border-slate-700 transition-colors"
                  >
                    {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-blue-400" />}
                    <span>Simulate</span>
                  </button>

                  <button
                    onClick={() => handleRunImpact(d.id)}
                    disabled={isBusy}
                    title="Calculate multi-sector building and road exposure"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold font-mono border border-slate-700 transition-colors"
                  >
                    {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5 text-orange-400" />}
                    <span>Assess Impact</span>
                  </button>

                  <button
                    onClick={() => handleEstimateRelief(d.id)}
                    disabled={isBusy}
                    title="Estimate water, food, and medical kit requirements"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold font-mono border border-slate-700 transition-colors"
                  >
                    {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackagePlus className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>Estimate Relief</span>
                  </button>

                  <Link
                    href={`/dashboard`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold font-mono transition-colors"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Command View</span>
                  </Link>

                  <button
                    onClick={() => handleDelete(d)}
                    disabled={isBusy}
                    title="Delete incident"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-900/60 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Register Disaster Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-400" />
                <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                  Register Incident Footprint
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateDisaster} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-300 uppercase mb-1">Incident Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cyclone Nivar - Coastal Sector"
                  value={newDisaster.name}
                  onChange={(e) => setNewDisaster({ ...newDisaster, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 uppercase mb-1">Severity (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={newDisaster.severity}
                    onChange={(e) => setNewDisaster({ ...newDisaster, severity: parseInt(e.target.value, 10) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 uppercase mb-1">Radius (km)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    required
                    value={newDisaster.radius_km}
                    onChange={(e) => setNewDisaster({ ...newDisaster, radius_km: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 uppercase mb-1">Latitude (EPSG:4326)</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="-90"
                    max="90"
                    required
                    value={newDisaster.latitude}
                    onChange={(e) => setNewDisaster({ ...newDisaster, latitude: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 uppercase mb-1">Longitude (EPSG:4326)</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="-180"
                    max="180"
                    required
                    value={newDisaster.longitude}
                    onChange={(e) => setNewDisaster({ ...newDisaster, longitude: parseFloat(e.target.value) })}
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
                  className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider flex items-center gap-1.5"
                >
                  {formSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Commit Incident</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
