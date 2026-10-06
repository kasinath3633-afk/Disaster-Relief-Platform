"use client";

import React from "react";
import { CloudRain, Wind, Eye, Thermometer, ShieldAlert, Radio } from "lucide-react";
import { NormalizedWeather } from "@/types/api";

interface WeatherWidgetProps {
  weather?: NormalizedWeather | null;
}

export function WeatherWidget({ weather }: WeatherWidgetProps) {
  if (!weather) {
    return (
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-500">
        No meteorological telemetry available for coordinates.
      </div>
    );
  }

  const isFallback = weather.source?.toLowerCase().includes("fallback") || weather.source?.toLowerCase().includes("mock");

  return (
    <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CloudRain className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Atmospheric Conditions
          </h3>
        </div>

        {/* Telemetry Source Badge */}
        <span
          className={`text-[10px] px-2 py-0.5 rounded font-mono border flex items-center gap-1 ${
            isFallback
              ? "bg-amber-950/60 text-amber-400 border-amber-800/80"
              : "bg-emerald-950/60 text-emerald-400 border-emerald-800/80"
          }`}
        >
          <Radio className="w-2.5 h-2.5 animate-pulse" />
          {isFallback ? "Fallback Simulation Adapter" : `Live: ${weather.source}`}
        </span>
      </div>

      {/* Main Condition & Temp */}
      <div className="flex items-baseline justify-between pt-1">
        <div>
          <span className="text-2xl font-bold font-mono text-slate-100">
            {weather.temperature_c.toFixed(1)}°C
          </span>
          <p className="text-xs text-slate-400 capitalize mt-0.5">
            {weather.weather_condition}
          </p>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400">Atmospheric Risk</div>
          <div className="text-lg font-bold font-mono text-cyan-400">
            {(weather.weather_risk * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-xs">
        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
            <CloudRain className="w-3 h-3 text-blue-400" /> Rain
          </span>
          <span className="font-mono font-semibold text-slate-200 mt-1">
            {weather.rainfall_mm.toFixed(1)} mm
          </span>
        </div>

        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
            <Wind className="w-3 h-3 text-cyan-400" /> Wind
          </span>
          <span className="font-mono font-semibold text-slate-200 mt-1">
            {weather.wind_speed_kmh.toFixed(1)} km/h
          </span>
        </div>

        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
            <Eye className="w-3 h-3 text-indigo-400" /> Visibility
          </span>
          <span className="font-mono font-semibold text-slate-200 mt-1">
            {weather.visibility_km.toFixed(1)} km
          </span>
        </div>
      </div>

      {/* Warnings if any */}
      {weather.warnings && weather.warnings.length > 0 && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 font-mono flex items-start gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <div>{weather.warnings.join("; ")}</div>
        </div>
      )}
    </div>
  );
}
