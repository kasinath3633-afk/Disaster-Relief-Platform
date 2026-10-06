"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Flame,
  Home,
  Boxes,
  Navigation,
  Scale,
  FileText,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Command Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Disaster Zones", href: "/disasters", icon: Flame },
  { label: "Shelter Network", href: "/shelters", icon: Home },
  { label: "Depots & Warehouses", href: "/warehouses", icon: Boxes },
  { label: "Safe Routing & Roads", href: "/routing", icon: Navigation },
  { label: "Intelligent Allocation", href: "/allocation", icon: Scale },
  { label: "Dossiers & Reports", href: "/reports", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800 bg-slate-900/50">
        <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-wider text-slate-100 uppercase">
            Disaster Center
          </h1>
          <span className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase">
            AI Tactical Engine
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Operational Command
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors group",
                isActive
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 transition-colors",
                  isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-300"
                )}
              />
              <span>{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/80">
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px]">Backend API</span>
            <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              ONLINE
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono truncate">
            PostGIS 3.4 / FastAPI
          </div>
        </div>
      </div>
    </aside>
  );
}
