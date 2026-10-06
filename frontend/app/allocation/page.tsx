"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  getDisasters,
  runIntelligentAllocation,
  getRelief,
  estimateRelief,
  runSimulation,
} from "@/lib/api";
import {
  Disaster,
  IntelligentAllocationResponse,
  ReliefRequirement,
} from "@/types/api";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatNumber } from "@/lib/utils";
import {
  Scale,
  Play,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  Home,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  Database,
  Eye,
  Info,
} from "lucide-react";

export default function AllocationPage() {
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [selectedDisasterId, setSelectedDisasterId] = useState<number | null>(null);
  const [reliefReq, setReliefReq] = useState<ReliefRequirement | null>(null);
  const [allocationData, setAllocationData] = useState<IntelligentAllocationResponse | null>(null);

  const [loadingDisasters, setLoadingDisasters] = useState(true);
  const [runningAllocation, setRunningAllocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Load disasters
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
      setError(err?.message || "Failed to load disasters from backend");
    } finally {
      setLoadingDisasters(false);
    }
  }, [selectedDisasterId]);

  useEffect(() => {
    loadDisasters();
  }, [loadDisasters]);

  // Load relief requirements for active disaster
  const loadRelief = useCallback(async (disasterId: number) => {
    try {
      const r = await getRelief(disasterId);
      setReliefReq(r);
    } catch {
      setReliefReq(null);
    }
  }, []);

  useEffect(() => {
    if (selectedDisasterId) {
      loadRelief(selectedDisasterId);
      setAllocationData(null);
      setActionSuccess(null);
      setError(null);
    }
  }, [selectedDisasterId, loadRelief]);

  // Ensure relief requirement is estimated
  const handleEstimateRelief = async () => {
    if (!selectedDisasterId) return;
    setRunningAllocation(true);
    setError(null);
    try {
      try {
        await runSimulation(selectedDisasterId);
      } catch {
        // Simulation may already have run
      }
      const r = await estimateRelief(selectedDisasterId);
      setReliefReq(r);
      setActionSuccess("Simulation verified & relief requirements estimated successfully!");
    } catch (err: any) {
      setError(err?.message || "Failed to estimate relief requirements");
    } finally {
      setRunningAllocation(false);
    }
  };

  // Run Allocation (Preview or Commit)
  const handleRunAllocation = async (commitToDb: boolean) => {
    if (!selectedDisasterId) return;

    if (commitToDb) {
      const confirmed = window.confirm(
        "COMMIT TO DATABASE: This will decrement available warehouse stock and record persistent allocations. Proceed?"
      );
      if (!confirmed) return;
    }

    setRunningAllocation(true);
    setError(null);
    setActionSuccess(null);

    try {
      const result = await runIntelligentAllocation(selectedDisasterId, commitToDb);
      setAllocationData(result);
      if (commitToDb) {
        setActionSuccess(
          `Successfully committed ${result.total_allocations_count} relief dispatches to the database!`
        );
      } else {
        setActionSuccess(
          `Calculated allocation preview with ${result.total_allocations_count} optimized dispatches.`
        );
      }
      // Refresh relief requirement
      await loadRelief(selectedDisasterId);
    } catch (err: any) {
      setError(err?.message || "Failed to execute intelligent allocation");
    } finally {
      setRunningAllocation(false);
    }
  };

  return (
    <AppShell
      title="Intelligent Multi-Shelter Relief Allocation"
      subtitle="Priority-Weighted Multi-Commodity Heuristic & Unmet Demand Optimization"
    >
      {/* Top Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
            Operational Disaster:
          </label>
          <select
            value={selectedDisasterId || ""}
            onChange={(e) => setSelectedDisasterId(Number(e.target.value))}
            disabled={loadingDisasters || disasters.length === 0}
            className="bg-slate-950 border border-slate-700 text-slate-100 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
          >
            {disasters.map((d) => (
              <option key={d.id} value={d.id}>
                #{d.id} — {d.name} (Severity {d.severity}/10)
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons: Preview vs Commit */}
        <div className="flex items-center gap-3">
          {!reliefReq && (
            <button
              onClick={handleEstimateRelief}
              disabled={runningAllocation}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-600/40 rounded-lg text-xs font-semibold font-mono transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Step 1: Estimate Relief</span>
            </button>
          )}

          <button
            onClick={() => handleRunAllocation(false)}
            disabled={runningAllocation || !selectedDisasterId}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-bold uppercase tracking-wider font-mono transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview Allocation</span>
          </button>

          <button
            onClick={() => handleRunAllocation(true)}
            disabled={runningAllocation || !selectedDisasterId}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider font-mono shadow-lg shadow-cyan-950/40 transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Commit to Database</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Target Requirements Overview */}
      {reliefReq && (
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide font-mono flex items-center gap-2">
              <Scale className="w-4 h-4 text-cyan-400" />
              Relief Requirements Baseline (Demand Targets)
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 uppercase">
              Status: {reliefReq.status}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase">Food Packets</span>
              <span className="text-base font-bold text-slate-100 block mt-1">
                {formatNumber(reliefReq.food_packets)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase">Water (Liters)</span>
              <span className="text-base font-bold text-slate-100 block mt-1">
                {formatNumber(reliefReq.water_liters)} L
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase">Medical Kits</span>
              <span className="text-base font-bold text-slate-100 block mt-1">
                {formatNumber(reliefReq.medical_kits)}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase">Blankets</span>
              <span className="text-base font-bold text-slate-100 block mt-1">
                {formatNumber(reliefReq.blankets)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Allocation Execution View */}
      {runningAllocation ? (
        <LoadingState
          message="Executing Intelligent Optimization Algorithm..."
          subMessage="Ranking destination shelter pressures, assessing transit risk, and resolving warehouse shortages"
        />
      ) : !allocationData ? (
        <EmptyState
          title="Allocation Plan Not Calculated"
          message="Click 'Preview Allocation' or 'Commit to Database' to evaluate optimal dispatches."
          actionLabel="Run Preview"
          onAction={() => handleRunAllocation(false)}
        />
      ) : (
        <div className="space-y-6">
          {/* Heuristic Description Banner */}
          <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40 text-xs text-cyan-300 font-mono flex items-start gap-2.5">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-cyan-200">Algorithmic Heuristic:</strong>{" "}
              {allocationData.heuristic_description}
            </div>
          </div>

          {/* 1. Optimized Dispatches Table */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Calculated Logistics Dispatches ({allocationData.allocations.length})
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Multi-warehouse routing solutions ranked by shelter priority pressure and hazard exposure.
                </p>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Status: {allocationData.status}
              </span>
            </div>

            {allocationData.allocations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 font-mono">
                Zero dispatches generated (depots may have insufficient inventory or requirements already fulfilled).
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-2 font-medium">Destination Shelter</th>
                      <th className="pb-2 font-medium">Source Depot</th>
                      <th className="pb-2 font-medium">Commodity</th>
                      <th className="pb-2 font-medium text-right">Quantity</th>
                      <th className="pb-2 font-medium text-right">Priority</th>
                      <th className="pb-2 font-medium text-right">Proximity</th>
                      <th className="pb-2 font-medium text-right">Risk Score</th>
                      <th className="pb-2 font-medium pl-4">Optimization Rationale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {allocationData.allocations.map((a, i) => (
                      <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 font-medium text-slate-200">
                          <div className="flex items-center gap-1.5">
                            <Home className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{a.destination_shelter_name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Boxes className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{a.warehouse_name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 capitalize text-slate-200">
                          {a.resource.replace("_", " ")}
                        </td>
                        <td className="py-2.5 text-right font-bold text-emerald-400">
                          {formatNumber(a.quantity)}
                        </td>
                        <td className="py-2.5 text-right text-cyan-400 font-bold">
                          {a.priority_score.toFixed(1)}
                        </td>
                        <td className="py-2.5 text-right text-slate-400">
                          {a.distance_km.toFixed(1)} km
                        </td>
                        <td className="py-2.5 text-right text-amber-400">
                          {a.risk_score.toFixed(2)}
                        </td>
                        <td className="py-2.5 pl-4 text-slate-300 text-[11px] max-w-sm">
                          {a.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 2. Unmet Demand Table */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Unmet Demand & Critical Inventory Shortage Audit
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Exact deficits between disaster demand requirements and warehouse stockpiles.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2 font-medium">Commodity</th>
                    <th className="pb-2 font-medium text-right">Demand Required</th>
                    <th className="pb-2 font-medium text-right">Allocated</th>
                    <th className="pb-2 font-medium text-right">Unmet Deficit</th>
                    <th className="pb-2 font-medium pl-4">Deficit Explanation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {allocationData.unmet_demand.map((u, i) => {
                    const hasShortage = u.unmet > 0;

                    return (
                      <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 font-medium text-slate-200 capitalize">
                          {u.resource.replace("_", " ")}
                        </td>
                        <td className="py-2.5 text-right text-slate-300">
                          {formatNumber(u.required)}
                        </td>
                        <td className="py-2.5 text-right text-emerald-400 font-bold">
                          {formatNumber(u.allocated)}
                        </td>
                        <td className="py-2.5 text-right font-bold">
                          <span className={hasShortage ? "text-red-400" : "text-emerald-400"}>
                            {formatNumber(u.unmet)}
                          </span>
                        </td>
                        <td className="py-2.5 pl-4 text-slate-400 text-[11px]">
                          {u.reason}
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
