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
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Shelter, Warehouse, RouteNode, RouteEdge, PopulationPoint } from "@/types/api";
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
const originNodeIcon = createDivIcon("#a855f7", "A", true);
const destNodeIcon = createDivIcon("#ec4899", "B", true);

function RecenterMap({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
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
  populationPoints?: PopulationPoint[];
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
  onSelectOrigin?: (nodeId: number) => void;
  onSelectDestination?: (nodeId: number) => void;
  onMapClick?: (lat: number, lng: number) => void;
}

export default function LeafletMapInner({
  center = [13.0827, 80.2707],
  zoom = 11,
  height = "500px",
  disaster,
  shelters = [],
  warehouses = [],
  populationGeoJson,
  populationPoints = [],
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
  onSelectOrigin,
  onSelectDestination,
  onMapClick,
}: MapProps) {
  // Build node lookup map for road edges and quick lookups
  const nodeMap = new Map<number, RouteNode>();
  roadNodes.forEach((n) => nodeMap.set(n.id, n));

  const selectedOriginNode = originNodeId ? nodeMap.get(originNodeId) : null;
  const selectedDestNode = destNodeId ? nodeMap.get(destNodeId) : null;

  // Determine ideal initial center
  const mapCenter: [number, number] = routePath.length > 0
    ? [routePath[0].latitude, routePath[0].longitude]
    : selectedDestNode
    ? [selectedDestNode.latitude, selectedDestNode.longitude]
    : selectedOriginNode
    ? [selectedOriginNode.latitude, selectedOriginNode.longitude]
    : disaster
    ? [disaster.latitude, disaster.longitude]
    : shelters.length > 0
    ? [shelters[0].latitude, shelters[0].longitude]
    : center;

  return (
    <div style={{ height, width: "100%" }} className="relative rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <RecenterMap center={mapCenter} zoom={zoom} />
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

        {/* Base Cartographic Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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

        {/* 2B. DIRECT POPULATION POINTS LAYER */}
        {showPopulation && populationPoints && populationPoints.length > 0 &&
          populationPoints.map((pt) => {
            const vulnRatio = pt.population > 0 ? pt.vulnerable_population / pt.population : 0;
            const color = vulnRatio > 0.3 ? "#ef4444" : vulnRatio > 0.15 ? "#f97316" : "#eab308";

            return (
              <Circle
                key={`pop-pt-${pt.id}`}
                center={[pt.latitude, pt.longitude]}
                radius={Math.min(3000, Math.max(600, pt.population * 0.25))}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.35,
                  weight: 1.5,
                }}
              >
                <Popup>
                  <div className="p-2 space-y-1 text-xs text-slate-100">
                    <strong className="text-amber-400 font-bold block">
                      Demographic Census Point #{pt.id}
                    </strong>
                    <div>Total Population: <b>{formatNumber(pt.population)}</b></div>
                    <div>
                      Vulnerable: <b>{formatNumber(pt.vulnerable_population)}</b> ({Math.round(vulnRatio * 100)}%)
                    </div>
                    <div className="font-mono text-[10px] text-slate-400 mt-1">
                      {pt.latitude.toFixed(4)}°, {pt.longitude.toFixed(4)}°
                    </div>
                  </div>
                </Popup>
              </Circle>
            );
          })}

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
            const isShelter = node.name.toLowerCase().startsWith("shelter");
            let icon = isShelter ? shelterIcon : roadNodeIcon;
            if (node.id === originNodeId) icon = originNodeIcon;
            else if (node.id === destNodeId) icon = destNodeIcon;

            return (
              <Marker key={`node-${node.id}`} position={[node.latitude, node.longitude]} icon={icon}>
                <Popup>
                  <div className="p-2 text-xs text-slate-100 space-y-2">
                    <div>
                      <strong className={isShelter ? "text-cyan-400 font-bold" : "text-slate-200"}>
                        {node.name}
                      </strong>
                      <span className="text-slate-400 font-mono text-[10px] ml-1">#{node.id}</span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-400">
                      {node.latitude.toFixed(4)}°, {node.longitude.toFixed(4)}°
                    </div>
                    {(onSelectOrigin || onSelectDestination) && (
                      <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-700/80">
                        {onSelectOrigin && (
                          <button
                            type="button"
                            onClick={() => onSelectOrigin(node.id)}
                            className="px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 rounded text-[10px] font-mono font-bold transition-colors"
                          >
                            Set Origin (A)
                          </button>
                        )}
                        {onSelectDestination && (
                          <button
                            type="button"
                            onClick={() => onSelectDestination(node.id)}
                            className="px-2 py-1 bg-pink-600/30 hover:bg-pink-600/50 text-pink-200 border border-pink-500/40 rounded text-[10px] font-mono font-bold transition-colors"
                          >
                            Set Dest (B)
                          </button>
                        )}
                      </div>
                    )}
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
              opacity: 0.95,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}

        {/* 6. REGISTERED SHELTER MARKERS (Visible across all maps) */}
        {showShelters &&
          shelters.map((shelter) => {
            const avail = Math.max(0, shelter.capacity - shelter.occupancy);
            const isFull = shelter.occupancy >= shelter.capacity;

            // Find matching road node if any
            const matchingNode = roadNodes.find(
              (n) =>
                n.name.toLowerCase().includes(shelter.name.toLowerCase()) ||
                (Math.abs(n.latitude - shelter.latitude) < 0.0005 &&
                  Math.abs(n.longitude - shelter.longitude) < 0.0005)
            );

            let markerIcon = shelterIcon;
            if (matchingNode) {
              if (matchingNode.id === originNodeId) markerIcon = originNodeIcon;
              else if (matchingNode.id === destNodeId) markerIcon = destNodeIcon;
            }

            return (
              <Marker
                key={`shelter-${shelter.id}`}
                position={[shelter.latitude, shelter.longitude]}
                icon={markerIcon}
              >
                <Popup>
                  <div className="p-2 space-y-1.5 text-xs text-slate-100">
                    <div className="font-bold text-cyan-400 flex items-center justify-between gap-2">
                      <span>{shelter.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-cyan-950 border border-cyan-800 rounded font-mono">
                        Shelter #{shelter.id}
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
                    <div className="font-mono text-[10px] text-slate-400">
                      {shelter.latitude.toFixed(4)}°, {shelter.longitude.toFixed(4)}°
                    </div>

                    {(onSelectOrigin || onSelectDestination) && matchingNode && (
                      <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-700/80">
                        {onSelectOrigin && (
                          <button
                            type="button"
                            onClick={() => onSelectOrigin(matchingNode.id)}
                            className="px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 rounded text-[10px] font-mono font-bold transition-colors"
                          >
                            Set Origin (A)
                          </button>
                        )}
                        {onSelectDestination && (
                          <button
                            type="button"
                            onClick={() => onSelectDestination(matchingNode.id)}
                            className="px-2 py-1 bg-pink-600/30 hover:bg-pink-600/50 text-pink-200 border border-pink-500/40 rounded text-[10px] font-mono font-bold transition-colors"
                          >
                            Set Dest (B)
                          </button>
                        )}
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
                    <span className="text-[10px] px-1.5 py-0.2 bg-emerald-950 border border-emerald-800 rounded font-mono">
                      Depot #{wh.id}
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
