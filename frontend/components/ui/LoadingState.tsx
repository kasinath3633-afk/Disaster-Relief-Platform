"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  subMessage?: string;
}

export function LoadingState({
  message = "Loading tactical telemetry...",
  subMessage = "Connecting to real-time disaster management backend",
}: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[300px] text-center rounded-xl bg-slate-900/40 border border-slate-800">
      <div className="relative mb-4">
        <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 animate-ping absolute inset-0" />
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin relative z-10" />
      </div>
      <h3 className="text-base font-semibold text-slate-200 tracking-wide uppercase">{message}</h3>
      <p className="text-sm text-slate-400 mt-1 max-w-sm">{subMessage}</p>
    </div>
  );
}
