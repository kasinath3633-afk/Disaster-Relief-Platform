"use client";

import React from "react";
import { Home, AlertTriangle } from "lucide-react";
import { Shelter } from "@/types/api";
import { formatNumber } from "@/lib/utils";

interface ShelterOccupancyTableProps {
  shelters: Shelter[];
}

export function ShelterOccupancyTable({ shelters }: ShelterOccupancyTableProps) {
  if (!shelters || shelters.length === 0) {
    return (
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-500">
        No active shelters registered in this sector.
      </div>
    );
  }

  return (
    <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Home className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Shelter Network Occupancy ({shelters.length})
          </h3>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          Capacity & Influx Tracking
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-mono">
              <th className="pb-2 font-medium">Shelter Facility</th>
              <th className="pb-2 font-medium text-right">Capacity</th>
              <th className="pb-2 font-medium text-right">Occupied</th>
              <th className="pb-2 font-medium text-right">Available</th>
              <th className="pb-2 font-medium">Occupancy Rate</th>
              <th className="pb-2 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {shelters.map((s) => {
              const available = Math.max(0, s.capacity - s.occupancy);
              const percentage = Math.min(100, Math.round((s.occupancy / s.capacity) * 100));
              const isOverloaded = percentage >= 90;
              const isWarning = percentage >= 75 && !isOverloaded;

              return (
                <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 font-medium text-slate-200">
                    <div className="flex items-center gap-1.5">
                      <span>{s.name}</span>
                      {isOverloaded && (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {s.latitude.toFixed(3)}°, {s.longitude.toFixed(3)}°
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-mono text-slate-300">
                    {formatNumber(s.capacity)}
                  </td>
                  <td className="py-2.5 text-right font-mono text-slate-300">
                    {formatNumber(s.occupancy)}
                  </td>
                  <td className="py-2.5 text-right font-mono font-semibold">
                    <span className={isOverloaded ? "text-red-400" : "text-emerald-400"}>
                      {formatNumber(available)}
                    </span>
                  </td>
                  <td className="py-2.5 w-32">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isOverloaded
                              ? "bg-red-500"
                              : isWarning
                              ? "bg-amber-500"
                              : "bg-cyan-500"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 w-8 text-right">
                        {percentage}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 text-right">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                        isOverloaded
                          ? "bg-red-500/10 text-red-400 border-red-500/30"
                          : isWarning
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      }`}
                    >
                      {isOverloaded ? "NEAR CAPACITY" : isWarning ? "ELEVATED" : "AVAILABLE"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
