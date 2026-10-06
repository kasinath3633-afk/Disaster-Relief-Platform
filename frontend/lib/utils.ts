import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return "0";
  return new Intl.NumberFormat().format(num);
}

export function formatCoordinate(lat: number, lon: number): string {
  return `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
}

export function getSeverityBadgeClass(severity: number | string): string {
  const sevNum = typeof severity === "string" ? parseInt(severity, 10) : severity;
  if (sevNum >= 8 || severity === "CRITICAL") {
    return "bg-red-500/10 text-red-400 border-red-500/20";
  }
  if (sevNum >= 6 || severity === "HIGH") {
    return "bg-orange-500/10 text-orange-400 border-orange-500/20";
  }
  if (sevNum >= 4 || severity === "MODERATE") {
    return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  }
  return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
}

export function getStatusBadgeClass(status: string): string {
  switch (status?.toUpperCase()) {
    case "CRITICAL_ACTION_REQUIRED":
      return "bg-red-500/20 text-red-300 border-red-500/40 animate-pulse";
    case "ELEVATED_RESPONSE":
      return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    case "NORMAL_MONITORING":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    case "COMPLETED":
      return "bg-blue-500/20 text-blue-300 border-blue-500/40";
    default:
      return "bg-slate-500/20 text-slate-300 border-slate-500/40";
  }
}
