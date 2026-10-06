"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon, Clock, Radio } from "lucide-react";
import { getStoredUser, clearAuthSession } from "@/lib/auth";
import { User } from "@/types/api";

interface TopNavProps {
  title?: string;
  subtitle?: string;
}

export function TopNav({
  title = "Emergency Tactical Operations",
  subtitle = "Decision-Support Platform",
}: TopNavProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    setUser(getStoredUser());
    const handleAuthChange = () => setUser(getStoredUser());
    window.addEventListener("auth-change", handleAuthChange);

    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " UTC"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => {
      window.removeEventListener("auth-change", handleAuthChange);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    router.push("/login");
  };

  return (
    <header className="h-16 px-6 bg-slate-950/90 backdrop-blur border-b border-slate-800 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
          <span>{title}</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
            <Radio className="w-2.5 h-2.5 animate-pulse text-cyan-400" />
            LIVE FEED
          </span>
        </h2>
        {subtitle && (
          <p className="text-[11px] text-slate-400 font-mono tracking-tight">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Mission Clock */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{currentTime || "00:00:00 UTC"}</span>
        </div>

        {/* User Badge */}
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200">
              <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px]">
                {user.username ? user.username.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-semibold leading-none">{user.username || "Coordinator"}</span>
                <span className="text-[10px] text-slate-400 font-mono leading-none mt-0.5">{user.email}</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out of Tactical Command"
              className="p-2 rounded-lg bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-900/60 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => router.push("/login")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
          >
            <UserIcon className="w-3.5 h-3.5" />
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}
