"use client";

import React from "react";
import { AlertOctagon, AlertTriangle, CheckCircle, Flame, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusBannerProps {
  status: string;
  disasterName?: string;
  severity?: number;
  radiusKm?: number;
  warnings?: string[];
}

export function StatusBanner({
  status,
  disasterName,
  severity,
  radiusKm,
  warnings = [],
}: StatusBannerProps) {
  const isCritical = status === "CRITICAL_ACTION_REQUIRED";
  const isElevated = status === "ELEVATED_RESPONSE";

  const getStatusConfig = () => {
    if (isCritical) {
      return {
        badgeText: "CRITICAL ACTION REQUIRED",
        bannerBg: "bg-red-950/40 border-red-500/40 text-red-200",
        icon: <AlertOctagon className="w-5 h-5 text-red-400 animate-pulse" />,
        badgeClass: "bg-red-500/20 text-red-300 border-red-500/40",
      };
    }
    if (isElevated) {
      return {
        badgeText: "ELEVATED RESPONSE ACTIVE",
        bannerBg: "bg-amber-950/40 border-amber-500/40 text-amber-200",
        icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
        badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      };
    }
    return {
      badgeText: "NORMAL MONITORING",
      bannerBg: "bg-emerald-950/40 border-emerald-500/40 text-emerald-200",
      icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
      badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    };
  };

  const config = getStatusConfig();

  return (
    <div className={cn("p-5 rounded-2xl border backdrop-blur shadow-xl space-y-4", config.bannerBg)}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
            {config.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={cn("px-2.5 py-0.5 rounded text-[11px] font-bold font-mono border", config.badgeClass)}>
                {config.badgeText}
              </span>
              {disasterName && (
                <span className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-400" />
                  {disasterName}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1 font-mono">
              Operational Footprint: Radius {radiusKm ? `${radiusKm} km` : "N/A"} | Intensity: Severity {severity ? `${severity}/10` : "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Real Backend Warnings */}
      {warnings.length > 0 && (
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Active Operational Hazards ({warnings.length})</span>
          </div>
          <ul className="space-y-1">
            {warnings.map((warn, i) => (
              <li
                key={i}
                className="text-xs text-slate-300 font-mono flex items-start gap-2 before:content-['•'] before:text-red-400"
              >
                <span>{warn}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
