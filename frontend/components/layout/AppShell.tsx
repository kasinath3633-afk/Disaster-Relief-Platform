"use client";

import React from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { ProtectedRoute } from "./ProtectedRoute";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function AppShell({ children, title, subtitle }: AppShellProps) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopNav title={title} subtitle={subtitle} />
          <main className="flex-1 p-6 md:p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
