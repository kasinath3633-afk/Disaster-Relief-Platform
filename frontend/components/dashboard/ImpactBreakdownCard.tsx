"use client";

import React from "react";
import { Activity, Building2, Car, Users } from "lucide-react";
import { formatNumber, getSeverityBadgeClass } from "@/lib/utils";

interface ImpactBreakdownProps {
  impactScore?: number | null;
  impactLevel?: string | null;
  affectedPopulation: number;
  affectedBuildings: number;
  affectedRoads: number;
}

export function ImpactBreakdownCard({
  impactScore,
  impactLevel,
  affectedPopulation,
  affectedBuildings,
  affectedRoads,
}: ImpactBreakdownProps) {
  const score = impactScore ?? 0;
  const level = impactLevel || "MODERATE";

  return (
    <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-orange-400" />
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Multi-Sector Impact Exposure
          </h3>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${getSeverityBadgeClass(
            level
          )}`}
        >
          {level} ({score.toFixed(1)}/100)
        </span>
      </div>

      {/* Composite Score Progress Bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span>Weighted Damage Index</span>
          <span className="font-mono text-slate-200">{score.toFixed(1)}%</span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              score >= 75
                ? "bg-red-500"
                : score >= 50
                ? "bg-orange-500"
                : score >= 25
                ? "bg-amber-500"
                : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
          />
        </div>
      </div>

      {/* Exposure Metrics */}
      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-800/80 text-xs">
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>Population</span>
          </div>
          <div className="text-base font-bold font-mono text-slate-100 mt-1">
            {formatNumber(affectedPopulation)}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Residents in zone</span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Building2 className="w-3.5 h-3.5 text-orange-400" />
            <span>Buildings</span>
          </div>
          <div className="text-base font-bold font-mono text-slate-100 mt-1">
            {formatNumber(affectedBuildings)}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Structures damaged</span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Car className="w-3.5 h-3.5 text-amber-400" />
            <span>Road Segments</span>
          </div>
          <div className="text-base font-bold font-mono text-slate-100 mt-1">
            {formatNumber(affectedRoads)}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Corridors impacted</span>
        </div>
      </div>
    </div>
  );
}
