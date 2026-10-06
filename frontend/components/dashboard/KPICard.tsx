"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  badge?: string;
  variant?: "default" | "critical" | "warning" | "success" | "info";
}

export function KPICard({
  title,
  value,
  subtext,
  icon,
  badge,
  variant = "default",
}: KPICardProps) {
  const borderVariants = {
    default: "border-slate-800 bg-slate-900/60",
    critical: "border-red-500/40 bg-red-950/20 shadow-red-950/20",
    warning: "border-amber-500/40 bg-amber-950/20 shadow-amber-950/20",
    success: "border-emerald-500/40 bg-emerald-950/20 shadow-emerald-950/20",
    info: "border-cyan-500/40 bg-cyan-950/20 shadow-cyan-950/20",
  };

  const textVariants = {
    default: "text-slate-100",
    critical: "text-red-400",
    warning: "text-amber-400",
    success: "text-emerald-400",
    info: "text-cyan-400",
  };

  return (
    <div
      className={cn(
        "p-5 rounded-xl border backdrop-blur transition-all flex flex-col justify-between shadow-lg",
        borderVariants[variant]
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <div className="p-2 rounded-lg bg-slate-800/80 text-slate-300">
          {icon}
        </div>
      </div>

      <div className="mt-3">
        <div className={cn("text-2xl font-bold tracking-tight font-mono", textVariants[variant])}>
          {value}
        </div>
        {subtext && (
          <p className="text-[11px] text-slate-400 font-mono mt-1 flex items-center justify-between">
            <span>{subtext}</span>
            {badge && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                {badge}
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
