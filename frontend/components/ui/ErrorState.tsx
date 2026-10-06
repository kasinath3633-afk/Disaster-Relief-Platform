"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  status?: number;
}

export function ErrorState({
  title = "System Communication Alert",
  message = "Unable to connect to disaster management server.",
  onRetry,
  status,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-[300px] text-center rounded-xl bg-red-950/20 border border-red-900/40">
      <div className="p-3 bg-red-500/10 rounded-full border border-red-500/30 text-red-400 mb-4">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h3 className="text-base font-semibold text-red-200 tracking-wide">
        {title} {status ? `(Status ${status})` : ""}
      </h3>
      <p className="text-sm text-red-300/80 mt-2 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 active:bg-red-700 rounded-lg transition-colors shadow-lg shadow-red-900/20"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </button>
      )}
    </div>
  );
}
