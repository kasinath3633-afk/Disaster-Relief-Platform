"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { LoadingState } from "@/components/ui/LoadingState";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      if (!isAuthenticated()) {
        setAuthorized(false);
        router.replace("/login");
      } else {
        setAuthorized(true);
      }
    };

    checkAuth();
    window.addEventListener("auth-change", checkAuth);
    return () => window.removeEventListener("auth-change", checkAuth);
  }, [router]);

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <LoadingState
          message="Verifying Security Credentials..."
          subMessage="Authenticating tactical coordinator session"
        />
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}
