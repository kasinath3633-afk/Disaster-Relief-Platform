"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  getPopulationPoints,
  createPopulationPoint,
  deletePopulationPoint,
  getDisasters,
} from "@/lib/api";
import { PopulationPoint, Disaster } from "@/types/api";
import { CommandMap } from "@/components/maps/CommandMap";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatNumber } from "@/lib/utils";
import {
  Users,
  UserPlus,
  Trash2,
  MapPin,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  HeartHandshake,
  Percent,
  Search,
  Crosshair,
  Flame,
  Info,
} from "lucide-react";

export default function PopulationCensusPage() {
  const [points, setPoints] = useState<PopulationPoint[]>([]);
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [population, setPopulation] = useState<string>("");
  const [vulnerablePop, setVulnerablePop] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Table search & delete
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Load population points and active disasters
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [popData, disasterData] = await Promise.all([
        getPopulationPoints(),
        getDisasters().catch(() => [] as Disaster[]),
      ]);
      setPoints(popData);
      setDisasters(disasterData);

      // Pre-fill coordinates from latest disaster if available and form is empty
      if (disasterData.length > 0 && !latitude && !longitude) {
        setLatitude(disasterData[0].latitude.toString());
        setLongitude(disasterData[0].longitude.toString());
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load demographic census data.");
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle map click to set coordinates in form
  const handleMapClick = (lat: number, lng: number) => {
    setLatitude(lat.toFixed(5));
    setLongitude(lng.toFixed(5));
    setFormError(null);
  };

  // Submit new population point
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const pop = parseInt(population, 10);
    const vuln = vulnerablePop ? parseInt(vulnerablePop, 10) : 0;

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setFormError("Latitude must be a valid coordinate between -90 and 90.");
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setFormError("Longitude must be a valid coordinate between -180 and 180.");
      return;
    }
    if (isNaN(pop) || pop <= 0) {
      setFormError("Total population must be a positive integer greater than 0.");
      return;
    }
    if (isNaN(vuln) || vuln < 0) {
      setFormError("Vulnerable population cannot be negative.");
      return;
    }
    if (vuln > pop) {
      setFormError("Vulnerable population cannot exceed total population.");
      return;
    }

    setSubmitting(true);
    try {
      await createPopulationPoint({
        latitude: lat,
        longitude: lng,
        population: pop,
        vulnerable_population: vuln,
      });

      setSuccessMessage(`Successfully registered demographic sector at (${lat.toFixed(4)}°, ${lng.toFixed(4)}°) with ${formatNumber(pop)} residents.`);
      setPopulation("");
      setVulnerablePop("");
      await loadData();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setFormError(err?.message || "Failed to register population point.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete population point
  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(`Are you sure you want to delete Demographic Census Point #${id}?`);
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await deletePopulationPoint(id);
      setPoints((prev) => prev.filter((p) => p.id !== id));
      setSuccessMessage(`Demographic Sector #${id} deleted.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err?.message || `Failed to delete population point #${id}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Quick preset loader
  const handleApplyPreset = (lat: number, lng: number, defaultPop: number = 10000, defaultVuln: number = 2000) => {
    setLatitude(lat.toString());
    setLongitude(lng.toString());
    if (!population) setPopulation(defaultPop.toString());
    if (!vulnerablePop) setVulnerablePop(defaultVuln.toString());
    setFormError(null);
  };

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalPoints = points.length;
    const totalPop = points.reduce((sum, p) => sum + p.population, 0);
    const totalVuln = points.reduce((sum, p) => sum + p.vulnerable_population, 0);
    const vulnRate = totalPop > 0 ? (totalVuln / totalPop) * 100 : 0;

    return { totalPoints, totalPop, totalVuln, vulnRate };
  }, [points]);

  // Filtered points for table
  const filteredPoints = useMemo(() => {
    if (!searchQuery.trim()) return points;
    const q = searchQuery.toLowerCase();
    return points.filter(
      (p) =>
        p.id.toString().includes(q) ||
        p.latitude.toString().includes(q) ||
        p.longitude.toString().includes(q) ||
        p.population.toString().includes(q)
    );
  }, [points, searchQuery]);

  return (
    <AppShell
      title="Population Census & Demographic Density"
      subtitle="Spatial Vulnerability Mapping, Census Ingestion & Impact Demographics"
    >
      {loading ? (
        <LoadingState message="Loading Demographic Census Vectors & Spatial Points..." />
      ) : error && points.length === 0 ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
              <span className="text-[11px] text-slate-400 uppercase font-mono flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>Census Points</span>
              </span>
              <span className="text-2xl font-bold font-mono text-slate-100 mt-2 block">
                {formatNumber(metrics.totalPoints)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                Spatial demographic nodes
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
              <span className="text-[11px] text-slate-400 uppercase font-mono flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>Total Residents</span>
              </span>
              <span className="text-2xl font-bold font-mono text-slate-100 mt-2 block">
                {formatNumber(metrics.totalPop)}
              </span>
              <span className="text-[10px] text-blue-400 font-mono mt-0.5 block">
                Tracked in GIS database
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
              <span className="text-[11px] text-slate-400 uppercase font-mono flex items-center gap-1.5">
                <HeartHandshake className="w-3.5 h-3.5 text-amber-400" />
                <span>Vulnerable Residents</span>
              </span>
              <span className="text-2xl font-bold font-mono text-amber-400 mt-2 block">
                {formatNumber(metrics.totalVuln)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                Elderly, infants, acute-need
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
              <span className="text-[11px] text-slate-400 uppercase font-mono flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-rose-400" />
                <span>Vulnerability Ratio</span>
              </span>
              <span className="text-2xl font-bold font-mono text-rose-400 mt-2 block">
                {metrics.vulnRate.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                Weighted hazard risk factor
              </span>
            </div>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2 font-mono shadow-md">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form & Map Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Population Form */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
              <div className="border-b border-slate-800 pb-3">
                <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-cyan-400" />
                  <span>Register Demographic Sector</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ingest population census data for simulation, impact assessment, and relief allocation.
                </p>
              </div>

              {/* Preset Shortcuts */}
              {disasters.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[10px] text-slate-400 font-mono font-semibold uppercase flex items-center gap-1">
                    <Crosshair className="w-3 h-3 text-cyan-400" />
                    Quick Presets (Disaster Centers)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {disasters.slice(0, 3).map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleApplyPreset(d.latitude, d.longitude, 12000, 2500)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono flex items-center gap-1 border border-slate-700 transition-colors"
                      >
                        <Flame className="w-2.5 h-2.5 text-red-400" />
                        <span className="truncate max-w-[120px]">{d.name}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(13.0827, 80.2707, 25000, 4000)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono border border-slate-700"
                    >
                      Chennai Hub
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(9.5916, 76.5222, 18000, 3200)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono border border-slate-700"
                    >
                      Kerala / Kottayam
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-mono flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-purple-400" /> Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 13.0827"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-mono flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-purple-400" /> Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 80.2707"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-mono">
                    Total Residents in Sector
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 15000"
                    value={population}
                    onChange={(e) => setPopulation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-mono flex items-center justify-between">
                    <span>Vulnerable Population</span>
                    <span className="text-[10px] text-slate-500 font-mono">Optional</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 2500"
                    value={vulnerablePop}
                    onChange={(e) => setVulnerablePop(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Tip: Click anywhere on the map to automatically pin coordinates into this form.</span>
                </div>

                {formError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold uppercase tracking-wider font-mono shadow-lg shadow-cyan-950/40 transition-all"
                >
                  {submitting ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Ingesting Census Data...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Register Population Point</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Interactive Demographic Map */}
            <div className="lg:col-span-2 space-y-4">
              <CommandMap
                zoom={11}
                height="480px"
                disaster={disasters.length > 0 ? disasters[0] : null}
                populationPoints={points}
                showPopulation={true}
                showRoads={false}
                showShelters={false}
                showWarehouses={false}
                onMapClick={handleMapClick}
              />
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 flex items-center justify-between font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Demographic Census Bubbles (Radius & opacity proportional to population density)
                </span>
                <span className="text-[11px] text-cyan-400">Click map to set coordinates</span>
              </div>
            </div>
          </div>

          {/* Demographic Data Records Table */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>Census Data Points Inventory</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {points.length} Registered population clusters available for spatial simulation and relief calculation.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by ID, coordinates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-lg font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {filteredPoints.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs font-mono">
                No population census points found matching your search.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono">
                      <th className="pb-2.5 font-medium">Census ID</th>
                      <th className="pb-2.5 font-medium">Spatial Coordinates</th>
                      <th className="pb-2.5 font-medium text-right">Total Residents</th>
                      <th className="pb-2.5 font-medium text-right">Vulnerable Population</th>
                      <th className="pb-2.5 font-medium text-center">Vulnerability Ratio</th>
                      <th className="pb-2.5 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredPoints.map((p) => {
                      const vulnRatio = p.population > 0 ? (p.vulnerable_population / p.population) * 100 : 0;
                      const isDeleting = deletingId === p.id;

                      return (
                        <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 font-bold text-slate-200">
                            #{p.id}
                          </td>
                          <td className="py-3 text-slate-400">
                            <span className="text-slate-300">{p.latitude.toFixed(4)}° N</span>,{" "}
                            <span className="text-slate-300">{p.longitude.toFixed(4)}° E</span>
                          </td>
                          <td className="py-3 text-right font-bold text-slate-100">
                            {formatNumber(p.population)}
                          </td>
                          <td className="py-3 text-right text-amber-400">
                            {formatNumber(p.vulnerable_population)}
                          </td>
                          <td className="py-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                vulnRatio > 30
                                  ? "bg-red-500/20 text-red-300 border-red-500/40"
                                  : vulnRatio > 15
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              }`}
                            >
                              {vulnRatio.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDelete(p.id)}
                              disabled={isDeleting}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 transition-colors disabled:opacity-50"
                            >
                              {isDeleting ? (
                                <RotateCcw className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
