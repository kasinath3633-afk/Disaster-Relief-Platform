"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  getRoadNodes,
  getRoadEdges,
  getShelters,
  calculateRoute,
  blockRoadEdge,
  seedRoadNetwork,
  syncSheltersToRoads,
} from "@/lib/api";
import { RouteNode, RouteEdge, RouteResponse, Shelter } from "@/types/api";
import { CommandMap } from "@/components/maps/CommandMap";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  Navigation,
  Shield,
  Zap,
  MapPin,
  Clock,
  Activity,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Lock,
  Unlock,
  Sparkles,
  RefreshCw,
  Home,
  Network,
  Info,
} from "lucide-react";

export default function RoutingCommandPage() {
  const [nodes, setNodes] = useState<RouteNode[]>([]);
  const [edges, setEdges] = useState<RouteEdge[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [originId, setOriginId] = useState<number | null>(null);
  const [destinationId, setDestinationId] = useState<number | null>(null);
  const [algorithm, setAlgorithm] = useState<"dijkstra" | "astar">("dijkstra");
  const [preferSafe, setPreferSafe] = useState<boolean>(true);

  const [routeResult, setRouteResult] = useState<RouteResponse | null>(null);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [loadingGraph, setLoadingGraph] = useState<boolean>(true);
  const [syncingShelters, setSyncingShelters] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blockingEdgeId, setBlockingEdgeId] = useState<number | null>(null);

  // Load road network nodes, edges, and all registered shelters
  const loadNetwork = useCallback(async () => {
    setLoadingGraph(true);
    setError(null);
    try {
      const [nodesData, edgesData, sheltersData] = await Promise.all([
        getRoadNodes(),
        getRoadEdges(),
        getShelters().catch(() => [] as Shelter[]),
      ]);

      setNodes(nodesData);
      setEdges(edgesData);
      setShelters(sheltersData);

      // Auto-set default origin and destination if none selected
      if (nodesData.length >= 2 && !originId && !destinationId) {
        setOriginId(nodesData[0].id);
        setDestinationId(nodesData[nodesData.length - 1].id);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load road network topology from backend.");
    } finally {
      setLoadingGraph(false);
    }
  }, [originId, destinationId]);

  useEffect(() => {
    loadNetwork();
  }, [loadNetwork]);

  // Seed standard network if empty
  const handleSeedNetwork = async () => {
    setLoadingGraph(true);
    try {
      await seedRoadNetwork();
      await loadNetwork();
    } catch (err: any) {
      setError(err?.message || "Failed to seed road network");
    } finally {
      setLoadingGraph(false);
    }
  };

  // Explicitly sync shelters to road network
  const handleSyncShelters = async () => {
    setSyncingShelters(true);
    setSyncNotice(null);
    try {
      const res = await syncSheltersToRoads();
      await loadNetwork();
      setSyncNotice(`Synced ${res.synced_nodes} shelters into the road network (${res.total_nodes} total waypoints active).`);
      setTimeout(() => setSyncNotice(null), 6000);
    } catch (err: any) {
      setError(err?.message || "Failed to sync shelters into road network.");
    } finally {
      setSyncingShelters(false);
    }
  };

  // Calculate safe or shortest route
  const handleCalculateRoute = async () => {
    if (!originId || !destinationId) {
      setError("Please select both Origin and Destination waypoints.");
      return;
    }

    if (originId === destinationId) {
      setError("Origin and Destination cannot be the same waypoint.");
      return;
    }

    setCalculating(true);
    setError(null);
    try {
      const result = await calculateRoute({
        origin_node_id: originId,
        destination_node_id: destinationId,
        prefer_safe: preferSafe,
        algorithm,
      });
      setRouteResult(result);
    } catch (err: any) {
      setError(err?.message || "Failed to calculate navigation route.");
      setRouteResult(null);
    } finally {
      setCalculating(false);
    }
  };

  // Toggle road block
  const handleToggleBlock = async (edge: RouteEdge) => {
    const action = edge.is_blocked ? "unblock" : "block";
    const confirmed = window.confirm(
      `Are you sure you want to ${action.toUpperCase()} Road Corridor #${edge.id} (${edge.name || "Road"})? This will immediately alter graph edge weights.`
    );
    if (!confirmed) return;

    setBlockingEdgeId(edge.id);
    try {
      await blockRoadEdge(edge.id, !edge.is_blocked);
      const updatedEdges = await getRoadEdges();
      setEdges(updatedEdges);
      if (routeResult) {
        await handleCalculateRoute();
      }
    } catch (err: any) {
      setError(err?.message || `Failed to ${action} road edge #${edge.id}`);
    } finally {
      setBlockingEdgeId(null);
    }
  };

  // Categorize waypoints into Shelters vs Logistics Hubs
  const { shelterNodes, hubNodes } = useMemo(() => {
    const sNodes: RouteNode[] = [];
    const hNodes: RouteNode[] = [];

    nodes.forEach((n) => {
      if (n.name.toLowerCase().startsWith("shelter")) {
        sNodes.push(n);
      } else {
        hNodes.push(n);
      }
    });

    return { shelterNodes: sNodes, hubNodes: hNodes };
  }, [nodes]);

  return (
    <AppShell
      title="Safe Routing & Road Network Logistics"
      subtitle="Multi-Criteria Dijkstra & A* Risk-Aware Pathfinding Engine"
    >
      {loadingGraph ? (
        <LoadingState message="Loading Spatial Road Graph & Shelters..." />
      ) : error && nodes.length === 0 ? (
        <ErrorState message={error} onRetry={loadNetwork} />
      ) : (
        <div className="space-y-6">
          {/* Top Control Bar & Sync Option */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
                  <span>Tactical Route Navigation</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono">
                    {shelterNodes.length} Shelters + {hubNodes.length} Hubs Connected
                  </span>
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  {nodes.length} Waypoints & {edges.length} Corridors active in topological graph
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleSyncShelters}
                disabled={syncingShelters}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-50 text-slate-200 text-xs font-semibold uppercase tracking-wider transition-colors border border-slate-700 font-mono"
                title="Synchronizes newly registered shelters into the road network as routable waypoints"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${syncingShelters ? "animate-spin" : ""}`} />
                <span>{syncingShelters ? "Syncing..." : "Sync Shelters"}</span>
              </button>

              {nodes.length === 0 && (
                <button
                  type="button"
                  onClick={handleSeedNetwork}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-lg shadow-cyan-950/40"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Seed Standard Network
                </button>
              )}
            </div>
          </div>

          {/* Sync Notification Banner */}
          {syncNotice && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{syncNotice}</span>
            </div>
          )}

          {/* Form & Controls Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Path Calculation Controls */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Network className="w-4 h-4 text-cyan-400" />
                  <span>Logistics Waypoints</span>
                </h4>
                <span className="text-[10px] text-slate-500 font-mono">
                  {nodes.length} Selectable
                </span>
              </div>

              {/* Origin Node Dropdown */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-400" />
                    <span>Origin Waypoint (A)</span>
                  </span>
                  <span className="text-[10px] text-purple-400 font-mono font-semibold">START</span>
                </label>
                <select
                  value={originId || ""}
                  onChange={(e) => setOriginId(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5 font-mono focus:outline-none focus:border-purple-500 transition-colors"
                >
                  <option value="">Select origin waypoint...</option>
                  {shelterNodes.length > 0 && (
                    <optgroup label={`🏠 Registered Shelters & Evacuation Centers (${shelterNodes.length})`}>
                      {shelterNodes.map((n) => (
                        <option key={`orig-shelter-${n.id}`} value={n.id}>
                          #{n.id} — {n.name.replace(/^Shelter:\s*/, "")} ({n.latitude.toFixed(4)}°, {n.longitude.toFixed(4)}°)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {hubNodes.length > 0 && (
                    <optgroup label={`🌐 Logistics Hubs & Road Network Waypoints (${hubNodes.length})`}>
                      {hubNodes.map((n) => (
                        <option key={`orig-hub-${n.id}`} value={n.id}>
                          #{n.id} — {n.name} ({n.latitude.toFixed(4)}°, {n.longitude.toFixed(4)}°)
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Destination Node Dropdown */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-pink-400" />
                    <span>Destination Waypoint (B)</span>
                  </span>
                  <span className="text-[10px] text-pink-400 font-mono font-semibold">GOAL</span>
                </label>
                <select
                  value={destinationId || ""}
                  onChange={(e) => setDestinationId(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5 font-mono focus:outline-none focus:border-pink-500 transition-colors"
                >
                  <option value="">Select destination shelter / depot...</option>
                  {shelterNodes.length > 0 && (
                    <optgroup label={`🏠 Registered Shelters & Evacuation Centers (${shelterNodes.length})`}>
                      {shelterNodes.map((n) => (
                        <option key={`dest-shelter-${n.id}`} value={n.id}>
                          #{n.id} — {n.name.replace(/^Shelter:\s*/, "")} ({n.latitude.toFixed(4)}°, {n.longitude.toFixed(4)}°)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {hubNodes.length > 0 && (
                    <optgroup label={`🌐 Logistics Hubs & Road Network Waypoints (${hubNodes.length})`}>
                      {hubNodes.map((n) => (
                        <option key={`dest-hub-${n.id}`} value={n.id}>
                          #{n.id} — {n.name} ({n.latitude.toFixed(4)}°, {n.longitude.toFixed(4)}°)
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Algorithm Switch */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-mono">
                  Pathfinding Algorithm
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAlgorithm("dijkstra")}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border font-mono transition-colors ${
                      algorithm === "dijkstra"
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                    }`}
                  >
                    Dijkstra (Exact)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlgorithm("astar")}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border font-mono transition-colors ${
                      algorithm === "astar"
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                    }`}
                  >
                    A* (Heuristic)
                  </button>
                </div>
              </div>

              {/* Preference Toggle: Safest vs Shortest */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-mono">
                  Operational Criterion
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPreferSafe(true)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                      preferSafe
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Safest Path</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferSafe(false)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                      !preferSafe
                        ? "bg-blue-500/20 text-blue-300 border-blue-500/50"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Shortest Path</span>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleCalculateRoute}
                disabled={calculating || !originId || !destinationId}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold uppercase tracking-wider font-mono shadow-lg shadow-cyan-950/40 transition-all"
              >
                {calculating ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    <span>Computing Graph Vectors...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
                    <span>Compute Safe Transit Route</span>
                  </>
                )}
              </button>

              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1 text-cyan-400 font-semibold">
                  <Info className="w-3.5 h-3.5" />
                  <span>Map Interaction Tip</span>
                </div>
                <p>
                  Click on any shelter icon (<span className="text-cyan-400 font-bold">S</span>) or waypoint pin on the map to set it directly as Origin (A) or Destination (B).
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* 2. Interactive Route Map */}
            <div className="lg:col-span-2 space-y-4">
              <CommandMap
                zoom={11}
                height="450px"
                roadNodes={nodes}
                roadEdges={edges}
                shelters={shelters}
                showShelters={true}
                showRoads={true}
                showRoute={true}
                routePath={routeResult?.path_nodes || []}
                originNodeId={originId}
                destNodeId={destinationId}
                onSelectOrigin={(id) => setOriginId(id)}
                onSelectDestination={(id) => setDestinationId(id)}
              />

              {/* Route Metrics Card */}
              {routeResult && (
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                        Calculated Corridor Solution
                      </h4>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded font-mono font-bold border ${
                        routeResult.is_safe
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      }`}
                    >
                      {routeResult.is_safe ? "VERIFIED SAFE CORRIDOR" : "ELEVATED RISK ROUTE"}
                    </span>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-cyan-400" /> Total Distance
                      </span>
                      <span className="text-base font-bold font-mono text-slate-100 mt-1 block">
                        {routeResult.distance_km.toFixed(2)} km
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-400" /> Travel Time
                      </span>
                      <span className="text-base font-bold font-mono text-slate-100 mt-1 block">
                        {routeResult.travel_time_minutes.toFixed(1)} mins
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                        <Activity className="w-3 h-3 text-amber-400" /> Hazard Risk
                      </span>
                      <span className="text-base font-bold font-mono text-slate-100 mt-1 block">
                        {routeResult.risk_score.toFixed(2)}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                        <Shield className="w-3 h-3 text-emerald-400" /> Algorithm
                      </span>
                      <span className="text-base font-bold font-mono text-slate-100 mt-1 block capitalize">
                        {routeResult.algorithm_used}
                      </span>
                    </div>
                  </div>

                  {/* Explanation Banner */}
                  <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-300 font-mono">
                    <strong>Tactical Routing Rationale:</strong> {routeResult.explanation}
                  </div>

                  {/* Waypoint Sequence */}
                  <div className="text-xs text-slate-400 font-mono">
                    <span className="text-slate-500">Node Traversal Sequence:</span>{" "}
                    {routeResult.path_nodes.map((n, i) => (
                      <span key={n.id}>
                        <span className="text-slate-200 font-bold">{n.name}</span> (#{n.id})
                        {i < routeResult.path_nodes.length - 1 && " ➔ "}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Road Segment Management & Blockage Toggle Table */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Road Segment Condition & Blockage Control
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dynamically simulate flood damage or debris blockages to force logistics rerouting.
                </p>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                {edges.filter((e) => e.is_blocked).length} Corridors Blocked
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono">
                    <th className="pb-2 font-medium">Corridor Name</th>
                    <th className="pb-2 font-medium">Endpoints</th>
                    <th className="pb-2 font-medium text-right">Distance</th>
                    <th className="pb-2 font-medium text-right">Speed Limit</th>
                    <th className="pb-2 font-medium text-right">Transit Time</th>
                    <th className="pb-2 font-medium text-right">Risk Score</th>
                    <th className="pb-2 font-medium text-center">Status</th>
                    <th className="pb-2 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {edges.map((e) => {
                    const isBusy = blockingEdgeId === e.id;

                    return (
                      <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 font-medium text-slate-200">
                          {e.name || "Road"} #{e.id}
                        </td>
                        <td className="py-2.5 text-slate-400">
                          Node {e.start_node_id} ➔ Node {e.end_node_id}
                        </td>
                        <td className="py-2.5 text-right text-slate-300">
                          {e.distance_km} km
                        </td>
                        <td className="py-2.5 text-right text-slate-400">
                          {e.speed_limit_kmh} km/h
                        </td>
                        <td className="py-2.5 text-right text-slate-300">
                          {e.travel_time_minutes.toFixed(1)} mins
                        </td>
                        <td className="py-2.5 text-right text-amber-400">
                          {e.risk_score.toFixed(2)}
                        </td>
                        <td className="py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              e.is_blocked
                                ? "bg-red-500/20 text-red-300 border-red-500/40"
                                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            }`}
                          >
                            {e.is_blocked ? "BLOCKED" : "PASSABLE"}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleBlock(e)}
                            disabled={isBusy}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors border ${
                              e.is_blocked
                                ? "bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/40"
                                : "bg-red-600/20 hover:bg-red-600/30 text-red-300 border-red-500/40"
                            }`}
                          >
                            {isBusy ? (
                              <RotateCcw className="w-3 h-3 animate-spin" />
                            ) : e.is_blocked ? (
                              <>
                                <Unlock className="w-3 h-3" />
                                <span>Unblock</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3" />
                                <span>Block</span>
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
          </div>
        </div>
      )}
    </AppShell>
  );
}
