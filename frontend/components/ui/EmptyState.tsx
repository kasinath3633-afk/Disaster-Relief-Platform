"use client";

import React from "react";
import { Inbox, Plus } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  title = "No Operational Records Found",
  message = "No data is registered for this category in the active disaster sector.",
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-[260px] text-center rounded-xl bg-slate-900/30 border border-slate-800/80">
      <div className="p-3 bg-slate-800/50 rounded-full border border-slate-700 text-slate-400 mb-3">
        {icon || <Inbox className="w-8 h-8" />}
      </div>
      <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">{title}</h3>
      <p className="text-sm text-slate-400 mt-1 max-w-sm">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
