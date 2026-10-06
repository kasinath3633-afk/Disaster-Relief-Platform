"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  getWarehouses,
  createWarehouse,
  getResources,
  createResource,
  getNearbyWarehouses,
} from "@/lib/api";
import { Warehouse, WarehouseCreate, Resource, ResourceCreate } from "@/types/api";
import { CommandMap } from "@/components/maps/CommandMap";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatNumber, formatCoordinate } from "@/lib/utils";
import {
  Boxes,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Compass,
  Package,
} from "lucide-react";

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Spatial search filter
  const [isSpatialFiltered, setIsSpatialFiltered] = useState(false);
  const [spatialLat, setSpatialLat] = useState<number>(13.0827);
  const [spatialLon, setSpatialLon] = useState<number>(80.2707);
  const [spatialRadius, setSpatialRadius] = useState<number>(100.0);

  // Warehouse Modal
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [whSubmitting, setWhSubmitting] = useState(false);
  const [whError, setWhError] = useState<string | null>(null);
  const [newWh, setNewWh] = useState<WarehouseCreate>({
    name: "",
    latitude: 13.0700,
    longitude: 80.2600,
    capacity: 25000,
  });

  // Resource Modal
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [resSubmitting, setResSubmitting] = useState(false);
  const [resError, setResError] = useState<string | null>(null);
  const [newRes, setNewRes] = useState<ResourceCreate>({
    warehouse_id: 1,
    name: "food_packets",
    quantity: 5000,
    unit: "packets",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [whData, resData] = await Promise.all([
        getWarehouses(),
        getResources().catch(() => []),
      ]);
      setWarehouses(whData);
      setResources(resData);
      if (whData.length > 0) {
        setNewRes((prev) => ({ ...prev, warehouse_id: whData[0].id }));
      }
      setIsSpatialFiltered(false);
    } catch (err: any) {
      setError(err?.message || "Failed to load warehouse data from backend");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Spatial Query
  const handleSpatialSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const nearby = await getNearbyWarehouses(spatialLat, spatialLon, spatialRadius, 50);
      setWarehouses(nearby);
      setIsSpatialFiltered(true);
      setActionSuccess(`Spatial PostGIS query found ${nearby.length} warehouses within ${spatialRadius} km.`);
    } catch (err: any) {
      setError(err?.message || "Spatial warehouse query failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setWhSubmitting(true);
    setWhError(null);
    try {
      if (!newWh.name.trim()) throw new Error("Warehouse name is required.");
      if (newWh.capacity <= 0) throw new Error("Capacity must be positive.");

      const created = await createWarehouse(newWh);
      setShowWarehouseModal(false);
      setActionSuccess(`Warehouse "${created.name}" (#${created.id}) registered successfully!`);
      setNewWh({
        name: "",
        latitude: 13.0700,
        longitude: 80.2600,
        capacity: 25000,
      });
      await loadData();
    } catch (err: any) {
      setWhError(err?.message || "Failed to create warehouse");
    } finally {
      setWhSubmitting(false);
    }
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setResSubmitting(true);
    setResError(null);
    try {
      if (newRes.quantity <= 0) throw new Error("Quantity must be greater than zero.");
      await createResource(newRes);
      setShowResourceModal(false);
      setActionSuccess(`Provisioned ${newRes.quantity} ${newRes.unit} of ${newRes.name}!`);
      await loadData();
    } catch (err: any) {
      setResError(err?.message || "Failed to provision resource");
    } finally {
      setResSubmitting(false);
    }
  };

  const filteredWarehouses = warehouses.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalStockUnits = resources.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <AppShell
      title="Logistics Depots & Resource Stockpiles"
      subtitle="Warehouse Inventory Provisioning & Spatial PostGIS Proximity"
    >
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">
            Active Depots
          </span>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-2">
            {warehouses.length}
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Logistics warehouses</span>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">
            Total Inventory Units
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            {formatNumber(totalStockUnits)}
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Packets, Liters, Kits, Blankets</span>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">
            Resource Batches
          </span>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-2">
            {resources.length}
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Tracked commodity SKUs</span>
        </div>
      </div>

      {/* Top Bar with Search & Action Buttons */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search depots by name..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowResourceModal(true)}
              disabled={warehouses.length === 0}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider font-mono transition-colors"
            >
              <Package className="w-4 h-4 text-emerald-400" />
              <span>Provision Stock</span>
            </button>

            <button
              onClick={() => setShowWarehouseModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider font-mono shadow-lg shadow-emerald-950/40 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Register Depot</span>
            </button>
          </div>
        </div>

        {/* Spatial Radius Search */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-3 text-xs font-mono">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>PostGIS Proximity Search:</span>
          </span>
          <input
            type="number"
            step="0.01"
            value={spatialLat}
            onChange={(e) => setSpatialLat(parseFloat(e.target.value))}
            placeholder="Lat"
            className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
          />
          <input
            type="number"
            step="0.01"
            value={spatialLon}
            onChange={(e) => setSpatialLon(parseFloat(e.target.value))}
            placeholder="Lon"
            className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
          />
          <input
            type="number"
            step="10"
            value={spatialRadius}
            onChange={(e) => setSpatialRadius(parseFloat(e.target.value))}
            placeholder="Radius km"
            className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
          />
          <button
            onClick={handleSpatialSearch}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded transition-colors"
          >
            Query
          </button>
          {isSpatialFiltered && (
            <button
              onClick={loadData}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded transition-colors"
            >
              Reset All
            </button>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Map Preview */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide font-mono">
          Logistics Network Map
        </h4>
        <CommandMap
          center={[13.0827, 80.2707]}
          zoom={11}
          height="320px"
          warehouses={warehouses}
          showShelters={false}
          showWarehouses={true}
          showPopulation={false}
        />
      </div>

      {/* Warehouses & Inventory List */}
      {loading ? (
        <LoadingState message="Loading Logistics Depots..." />
      ) : filteredWarehouses.length === 0 ? (
        <EmptyState
          title="No Depots Registered"
          message="Register a logistics depot to stock resources."
          actionLabel="Register Depot"
          onAction={() => setShowWarehouseModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredWarehouses.map((wh) => {
            const whResources = resources.filter((r) => r.warehouse_id === wh.id);
            const totalQty = whResources.reduce((sum, r) => sum + r.quantity, 0);

            return (
              <div
                key={wh.id}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-emerald-400" />
                      {wh.name}
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Coordinates: {formatCoordinate(wh.latitude, wh.longitude)}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Cap: {formatNumber(wh.capacity)}
                  </span>
                </div>

                {/* Stock breakdown */}
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                    Stock Inventory ({formatNumber(totalQty)} units)
                  </span>

                  {whResources.length === 0 ? (
                    <div className="text-[11px] text-slate-500 font-mono italic">
                      Zero stock allocated to this warehouse.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                      {whResources.map((res) => (
                        <div
                          key={res.id}
                          className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                        >
                          <span className="capitalize text-slate-300">
                            {res.name.replace("_", " ")}
                          </span>
                          <span className="font-bold text-emerald-400">
                            {formatNumber(res.quantity)} {res.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Register Warehouse Modal */}
      {showWarehouseModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                  Register Logistics Depot
                </h3>
              </div>
              <button onClick={() => setShowWarehouseModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {whError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-mono">
                {whError}
              </div>
            )}

            <form onSubmit={handleCreateWarehouse} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-300 uppercase mb-1">Depot Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Central Strategic Stockpile 1"
                  value={newWh.name}
                  onChange={(e) => setNewWh({ ...newWh, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 uppercase mb-1">Storage Capacity (Units)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newWh.capacity}
                  onChange={(e) => setNewWh({ ...newWh, capacity: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 uppercase mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="-90"
                    max="90"
                    required
                    value={newWh.latitude}
                    onChange={(e) => setNewWh({ ...newWh, latitude: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 uppercase mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="-180"
                    max="180"
                    required
                    value={newWh.longitude}
                    onChange={(e) => setNewWh({ ...newWh, longitude: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowWarehouseModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={whSubmitting}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider flex items-center gap-1.5"
                >
                  {whSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Register Depot</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Provision Stock Modal */}
      {showResourceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                  Provision Stock to Warehouse
                </h3>
              </div>
              <button onClick={() => setShowResourceModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {resError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-mono">
                {resError}
              </div>
            )}

            <form onSubmit={handleCreateResource} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-300 uppercase mb-1">Destination Warehouse</label>
                <select
                  value={newRes.warehouse_id}
                  onChange={(e) => setNewRes({ ...newRes, warehouse_id: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      #{w.id} — {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 uppercase mb-1">Resource Commodity</label>
                <select
                  value={newRes.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    let unit = "packets";
                    if (name === "water_liters") unit = "liters";
                    else if (name === "medical_kits") unit = "kits";
                    else if (name === "blankets") unit = "pieces";
                    setNewRes({ ...newRes, name, unit });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="food_packets">food_packets</option>
                  <option value="water_liters">water_liters</option>
                  <option value="medical_kits">medical_kits</option>
                  <option value="blankets">blankets</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 uppercase mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newRes.quantity}
                    onChange={(e) => setNewRes({ ...newRes, quantity: parseInt(e.target.value, 10) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 uppercase mb-1">Unit</label>
                  <input
                    type="text"
                    required
                    value={newRes.unit}
                    onChange={(e) => setNewRes({ ...newRes, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowResourceModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resSubmitting}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider flex items-center gap-1.5"
                >
                  {resSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Commit Inventory</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
