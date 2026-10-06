"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  getDisasters,
  getStandardReportBlob,
  getComprehensiveReportBlob,
} from "@/lib/api";
import { Disaster } from "@/types/api";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  FileText,
  Download,
  Eye,
  FileCheck,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Layers,
} from "lucide-react";

export default function ReportsPage() {
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [selectedDisasterId, setSelectedDisasterId] = useState<number | null>(null);
  const [loadingDisasters, setLoadingDisasters] = useState(true);
  const [generatingType, setGeneratingType] = useState<"standard" | "comprehensive" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // PDF Preview State
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>("");

  const loadDisasters = useCallback(async () => {
    setLoadingDisasters(true);
    setError(null);
    try {
      const data = await getDisasters();
      setDisasters(data);
      if (data.length > 0 && !selectedDisasterId) {
        setSelectedDisasterId(data[0].id);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load disasters for reporting");
    } finally {
      setLoadingDisasters(false);
    }
  }, [selectedDisasterId]);

  useEffect(() => {
    loadDisasters();
  }, [loadDisasters]);

  // Clean up object URLs on unmount or URL change
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleGenerateReport = async (type: "standard" | "comprehensive") => {
    if (!selectedDisasterId) return;

    setGeneratingType(type);
    setError(null);

    try {
      let blob: Blob;
      let filename = "";

      if (type === "standard") {
        blob = await getStandardReportBlob(selectedDisasterId);
        filename = `Disaster_Report_${selectedDisasterId}.pdf`;
      } else {
        blob = await getComprehensiveReportBlob(selectedDisasterId);
        filename = `Comprehensive_Audit_Dossier_${selectedDisasterId}.pdf`;
      }

      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setPdfFileName(filename);
    } catch (err: any) {
      setError(err?.message || `Failed to compile ${type} PDF dossier`);
    } finally {
      setGeneratingType(null);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = pdfFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const activeDisaster = disasters.find((d) => d.id === selectedDisasterId);

  return (
    <AppShell
      title="Dossiers & Audit Reports"
      subtitle="ReportLab PDF Generation Engine & Multi-Sector Incident Verification"
    >
      {/* Top Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
            Audit Incident:
          </label>
          <select
            value={selectedDisasterId || ""}
            onChange={(e) => {
              setSelectedDisasterId(Number(e.target.value));
              setPdfUrl(null);
            }}
            disabled={loadingDisasters || disasters.length === 0}
            className="bg-slate-950 border border-slate-700 text-slate-100 text-xs font-medium rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
          >
            {disasters.map((d) => (
              <option key={d.id} value={d.id}>
                #{d.id} — {d.name} (Severity {d.severity}/10)
              </option>
            ))}
          </select>
        </div>

        {/* Report Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleGenerateReport("standard")}
            disabled={generatingType !== null || !selectedDisasterId}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider font-mono transition-colors"
          >
            {generatingType === "standard" ? (
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-blue-400" />
            )}
            <span>Standard PDF</span>
          </button>

          <button
            onClick={() => handleGenerateReport("comprehensive")}
            disabled={generatingType !== null || !selectedDisasterId}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider font-mono shadow-lg shadow-cyan-950/40 transition-colors"
          >
            {generatingType === "comprehensive" ? (
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileCheck className="w-3.5 h-3.5" />
            )}
            <span>Generate Comprehensive Dossier</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Report Types Description Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              Standard Disaster Report
            </h4>
          </div>
          <p className="text-xs text-slate-400">
            Baseline executive briefing compiling incident location, population exposure, shelter capacities, warehouse inventories, and initial relief estimations.
          </p>
          <div className="text-[11px] text-slate-500 font-mono">
            API: <code className="text-cyan-400">GET /reports/{selectedDisasterId || "{id}"}</code>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-cyan-500/30 bg-cyan-950/10 space-y-3">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-cyan-400" />
            <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              Comprehensive Multi-Sector Dossier
            </h4>
          </div>
          <p className="text-xs text-slate-400">
            Complete incident audit incorporating multi-sector damage exposure (buildings, roads), atmospheric telemetry from weather stations, road corridor statuses, and intelligent relief allocation dispatches.
          </p>
          <div className="text-[11px] text-slate-500 font-mono">
            API: <code className="text-cyan-400">GET /reports/{selectedDisasterId || "{id}"}/comprehensive</code>
          </div>
        </div>
      </div>

      {/* In-Browser PDF Preview and Download Bar */}
      {generatingType !== null ? (
        <LoadingState
          message="Compiling ReportLab Vector PDF..."
          subMessage="Streaming multi-sector audit tables and cryptographic timestamps from backend"
        />
      ) : pdfUrl ? (
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  {pdfFileName}
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">
                  Compiled from PostgreSQL & PostGIS Live State
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold font-mono border border-slate-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Tab</span>
              </a>

              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold font-mono uppercase tracking-wider transition-colors shadow-lg shadow-cyan-950/40"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>

          {/* PDF Viewer Embed */}
          <div className="w-full h-[650px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
            <iframe
              src={pdfUrl}
              className="w-full h-full"
              title="Disaster Report PDF Viewer"
            />
          </div>
        </div>
      ) : (
        <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-3">
          <div className="p-3 bg-slate-800/50 rounded-full border border-slate-700 text-slate-400 inline-flex mb-1">
            <FileText className="w-8 h-8" />
          </div>
          <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wide">
            Ready to Compile PDF Audit Dossier
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Select an incident above and click <strong>Standard PDF</strong> or <strong>Generate Comprehensive Dossier</strong> to generate and preview official reports.
          </p>
        </div>
      )}
    </AppShell>
  );
}
