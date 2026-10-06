"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { MapProps } from "./LeafletMapInner";

const DynamicLeafletMap = dynamic(() => import("./LeafletMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-6">
      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
        Initializing Spatial GIS Engine...
      </span>
      <span className="text-[11px] text-slate-500 font-mono mt-1">
        Loading OpenStreetMap & PostGIS Cartographic Layers
      </span>
    </div>
  ),
});

export function CommandMap(props: MapProps) {
  return <DynamicLeafletMap {...props} />;
}
