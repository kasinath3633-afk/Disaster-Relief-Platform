"use client";

import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  GeoJSON,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Shelter, Warehouse, RouteNode, RouteEdge } from "@/types/api";
import { formatNumber } from "@/lib/utils";

// Custom tactical DivIcons
const createDivIcon = (color: string, label: string, pulse: boolean = false) => {
  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px;">
        ${pulse ? `<div style="position: absolute; inset: 0; border-radius: 9999px; background: ${color}; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ""}
        <div style="width: 24px; height: 24px; border-radius: 9999px; background: #0f172a; border: 2px solid ${color}; display: flex; align-items: center; justify-content: center; color: ${color}; font-size: 11px; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);">
          ${label}
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

const disasterIcon = createDivIcon("#ef4444", "⚠", true);
const shelterIcon = createDivIcon("#38bdf8", "S");
const warehouseIcon = createDivIcon("#10b981", "W");
const roadNodeIcon = createDivIcon("#94a3b8", "•");
const originNodeIcon = createDivIcon("#a855f7", "A");
const destNodeIcon = createDivIcon("#ec4899", "B");

function RecenterMap({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export interface MapProps {
  center?: [number, number];
  zoom?: number;
  height?: string;
  disaster?: {
    name: string;
    latitude: number;
    longitude: number;
    radius_km: number;
    severity?: number;
  } | null;
  shelters?: Shelter[];
  warehouses?: Warehouse[];
  populationGeoJson?: any;
  roadNodes?: RouteNode[];
  roadEdges?: RouteEdge[];
  routePath?: RouteNode[];
  originNodeId?: number | null;
  destNodeId?: number | null;
  showPopulation?: boolean;
  showShelters?: boolean;
  showWarehouses?: boolean;
  showRoads?: boolean;
  showRoute?: boolean;
}

export default function LeafletMapInner({
  center = [13.0827, 80.2707],
  zoom = 11,
  height = "500px",
  disaster,
  shelters = [],
  warehouses = [],
  populationGeoJson,
  roadNodes = [],
  roadEdges = [],
  routePath = [],
  originNodeId,
  destNodeId,
  showPopulation = true,
  showShelters = true,
  showWarehouses = true,
  showRoads = true,
  showRoute = true,
}: MapProps) {
  const mapCenter: [number, number] = disaster
    ? [disaster.latitude, disaster.longitude]
    : center;

  // Build node lookup map for road edges
  const nodeMap = new Map<number, RouteNode>();
  roadNodes.forEach((n) => nodeMap.set(n.id, n));

  return (
    <div style={{ height, width: "100%" }} className="relative rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <RecenterMap center={mapCenter} zoom={zoom} />

        {/* OpenStreetMap Dark / Standard CartoDB Dark Matter */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* 1. DISASTER ZONE & RADIUS CIRCLE */}
        {disaster && (
          <>
            <Marker position={[disaster.latitude, disaster.longitude]} icon={disasterIcon}>
              <Popup>
                <div className="p-2 space-y-1 text-slate-100">
                  <div className="font-bold text-red-400 text-sm flex items-center gap-1.5">
                    <span>⚠</span> {disaster.name}
                  </div>
                  <div className="text-xs text-slate-300">
                    <div>Severity Level: <span className="font-bold text-white">{disaster.severity || "N/A"}/10</span></div>
                    <div>Impact Radius: <span className="font-bold text-white">{disaster.radius_km} km</span></div>
                    <div className="font-mono text-[11px] text-slate-400 mt-1">
                      {disaster.latitude.toFixed(4)}°, {disaster.longitude.toFixed(4)}°
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>

            <Circle
              center={[disaster.latitude, disaster.longitude]}
              radius={disaster.radius_km * 1000}
              pathOptions={{
                color: "#ef4444",
                fillColor: "#ef4444",
                fillOpacity: 0.15,
                weight: 2,
                dashArray: "4, 6",
              }}
            />
          </>
        )}

        {/* 2. POPULATION GEOJSON LAYER */}
        {showPopulation && populationGeoJson && (
          <GeoJSON
            data={populationGeoJson}
            pointToLayer={(feature, latlng) => {
              const count = feature.properties?.population || 0;
              const radius = Math.min(12, Math.max(5, count / 500));
              return L.circleMarker(latlng, {
                radius,
                fillColor: "#f97316",
                color: "#ea580c",
                weight: 1.5,
                opacity: 0.9,
                fillOpacity: 0.6,
              });
            }}
            onEachFeature={(feature, layer) => {
              const p = feature.properties;
              layer.bindPopup(`
                <div style="font-family: sans-serif; font-size: 12px; color: #f8fafc; padding: 4px;">
                  <strong style="color: #fb923c;">Population Sector #${p.id || ""}</strong><br/>
                  Total Residents: <b>${formatNumber(p.population)}</b><br/>
                  Vulnerable Population: <b>${formatNumber(p.vulnerable_population)}</b><br/>
                  Distance from Epicenter: <b>${p.distance_km ? p.distance_km.toFixed(2) : "N/A"} km</b>
                </div>
              `);
            }}
          />
        )}

        {/* 3. ROAD NETWORK (EDGES) */}
        {showRoads &&
          roadEdges.map((edge) => {
            const startNode = nodeMap.get(edge.start_node_id);
            const endNode = nodeMap.get(edge.end_node_id);
            if (!startNode || !endNode) return null;

            const isBlocked = edge.is_blocked;
            const color = isBlocked ? "#ef4444" : "#64748b";

            return (
              <Polyline
                key={`edge-${edge.id}`}
                positions={[
                  [startNode.latitude, startNode.longitude],
                  [endNode.latitude, endNode.longitude],
                ]}
                pathOptions={{
                  color,
                  weight: isBlocked ? 3.5 : 2,
                  opacity: isBlocked ? 0.9 : 0.4,
                  dashArray: isBlocked ? "6, 6" : undefined,
                }}
              >
                <Popup>
                  <div className="p-2 space-y-1 text-xs text-slate-100">
                    <strong className={isBlocked ? "text-red-400" : "text-slate-200"}>
                      {edge.name || "Road Corridor"} #{edge.id}
                    </strong>
                    <div>Distance: {edge.distance_km} km</div>
                    <div>Travel Time: {edge.travel_time_minutes.toFixed(1)} mins</div>
                    <div>Risk Score: {edge.risk_score.toFixed(2)}</div>
                    <div>
                      Status:{" "}
                      <span className={isBlocked ? "text-red-400 font-bold" : "text-emerald-400"}>
                        {isBlocked ? "BLOCKED / PASSAGE DENIED" : "PASSABLE"}
                      </span>
                    </div>
                  </div>
                </Popup>
              </Polyline>
            );
          })}

        {/* 4. ROAD NODES */}
        {showRoads &&
          roadNodes.map((node) => {
            let icon = roadNodeIcon;
            if (node.id === originNodeId) icon = originNodeIcon;
            else if (node.id === destNodeId) icon = destNodeIcon;

            return (
              <Marker key={`node-${node.id}`} position={[node.latitude, node.longitude]} icon={icon}>
                <Popup>
                  <div className="p-2 text-xs text-slate-100">
                    <strong className="text-cyan-400">{node.name}</strong> (Node #{node.id})
                    <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                      {node.latitude.toFixed(4)}°, {node.longitude.toFixed(4)}°
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* 5. CALCULATED ROUTE PATH */}
        {showRoute && routePath.length >= 2 && (
          <Polyline
            positions={routePath.map((n) => [n.latitude, n.longitude] as [number, number])}
            pathOptions={{
              color: "#38bdf8",
              weight: 5,
              opacity: 0.9,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}

        {/* 6. SHELTER MARKERS */}
        {showShelters &&
          shelters.map((shelter) => {
            const avail = Math.max(0, shelter.capacity - shelter.occupancy);
            const isFull = shelter.occupancy >= shelter.capacity;

            return (
              <Marker
                key={`shelter-${shelter.id}`}
                position={[shelter.latitude, shelter.longitude]}
                icon={shelterIcon}
              >
                <Popup>
                  <div className="p-2 space-y-1.5 text-xs text-slate-100">
                    <div className="font-bold text-cyan-400 flex items-center justify-between gap-2">
                      <span>{shelter.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-cyan-950 border border-cyan-800 rounded">
                        Shelter
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>Capacity: <b>{formatNumber(shelter.capacity)}</b></div>
                      <div>Occupied: <b>{formatNumber(shelter.occupancy)}</b></div>
                    </div>
                    <div>
                      Available Beds:{" "}
                      <span className={isFull ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                        {formatNumber(avail)} {isFull ? "(AT CAPACITY)" : ""}
                      </span>
                    </div>
                    {shelter.distance_km !== undefined && (
                      <div className="text-[11px] text-slate-400">
                        Proximity: {shelter.distance_km.toFixed(2)} km
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* 7. WAREHOUSE MARKERS */}
        {showWarehouses &&
          warehouses.map((wh) => (
            <Marker
              key={`wh-${wh.id}`}
              position={[wh.latitude, wh.longitude]}
              icon={warehouseIcon}
            >
              <Popup>
                <div className="p-2 space-y-1.5 text-xs text-slate-100">
                  <div className="font-bold text-emerald-400 flex items-center justify-between gap-2">
                    <span>{wh.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-emerald-950 border border-emerald-800 rounded">
                      Logistics Depot
                    </span>
                  </div>
                  <div>Storage Capacity: <b>{formatNumber(wh.capacity)} units</b></div>
                  {wh.distance_km !== undefined && (
                    <div className="text-[11px] text-slate-400">
                      Proximity: {wh.distance_km.toFixed(2)} km
                    </div>
                  )}
                  <div className="font-mono text-[10px] text-slate-500">
                    {wh.latitude.toFixed(4)}°, {wh.longitude.toFixed(4)}°
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
