"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart3,
  Cpu,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Table,
  Layers,
  Activity,
  ShieldCheck,
  TrendingUp,
  RefreshCw
} from "lucide-react";
import { fetchModelInfo, fetchModelLatency, fetchEvaluationSummary, getDownloadCandidatesCsvUrl } from "@/lib/api";
import { ModelInfo, LatencyBenchmark, EvaluationSummary } from "@/types/imaging";

export function AnalyticsPanel() {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [latency, setLatency] = useState<LatencyBenchmark | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"froc" | "metrics" | "failures" | "perscan">("froc");

  const loadData = async () => {
    setLoading(true);
    const [m, l, e] = await Promise.all([
      fetchModelInfo(),
      fetchModelLatency(5),
      fetchEvaluationSummary()
    ]);
    setModelInfo(m);
    setLatency(l);
    setEvaluation(e);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#16243b]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Research-Grade Model Evaluation & FROC</h2>
            <span className="text-[10px] font-mono uppercase bg-cyan-950/80 text-cyan-300 border border-cyan-800/40 px-2 py-0.5 rounded">
              Phase 7 Protocol
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            OFFICIAL LUNA16 FROC/CPM METHODOLOGY • SCAN-LEVEL ISOLATION • FAILURE ANALYSIS
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={getDownloadCandidatesCsvUrl()}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0d1a2d] hover:bg-[#152744] text-cyan-300 border border-blue-900/50 text-xs font-mono transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Scored CSV</span>
          </a>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-1.5 rounded-lg bg-[#0d1a2d] hover:bg-[#152744] text-slate-300 border border-blue-900/50 text-xs font-mono transition-colors"
            title="Refresh Evaluation"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Top Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#070e1b] border border-[#16243b] p-4 rounded-2xl shadow-lg">
          <div className="text-xs text-slate-400 font-mono uppercase">LUNA16 CPM Score</div>
          <div className="text-2xl font-bold text-[#38d9ff] my-1 font-mono">
            {evaluation?.froc_evaluation?.cpm_score !== undefined
              ? evaluation.froc_evaluation.cpm_score.toFixed(3)
              : "—"}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Mean Sensitivity @ 7 FP/scan points
          </div>
        </div>

        <div className="bg-[#070e1b] border border-[#16243b] p-4 rounded-2xl shadow-lg">
          <div className="text-xs text-slate-400 font-mono uppercase">Sensitivity / Recall</div>
          <div className="text-2xl font-bold text-emerald-400 my-1 font-mono">
            {evaluation?.classification_metrics?.recall !== undefined
              ? `${(evaluation.classification_metrics.recall * 100).toFixed(1)}%`
              : "—"}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            At threshold {evaluation?.classification_metrics?.threshold?.toFixed(2) || "0.50"}
          </div>
        </div>

        <div className="bg-[#070e1b] border border-[#16243b] p-4 rounded-2xl shadow-lg">
          <div className="text-xs text-slate-400 font-mono uppercase">Precision / F1</div>
          <div className="text-2xl font-bold text-white my-1 font-mono">
            {evaluation?.classification_metrics?.f1_score !== undefined
              ? `${evaluation.classification_metrics.f1_score.toFixed(2)} F1`
              : "—"}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Precision: {evaluation?.classification_metrics?.precision ? `${(evaluation.classification_metrics.precision * 100).toFixed(1)}%` : "—"}
          </div>
        </div>

        <div className="bg-[#070e1b] border border-[#16243b] p-4 rounded-2xl shadow-lg">
          <div className="text-xs text-slate-400 font-mono uppercase">Mean Latency</div>
          <div className="text-2xl font-bold text-white my-1 font-mono flex items-baseline gap-1">
            <span>{latency?.mean_latency_ms ? `${latency.mean_latency_ms}` : "—"}</span>
            <span className="text-xs font-normal text-slate-400">ms/patch</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {latency?.device || "CPU"} • 32×32×32 Patch
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 bg-[#091220] border border-[#16243b] p-1 rounded-xl w-fit">
        {[
          { id: "froc", label: "FROC / CPM Curve", icon: TrendingUp },
          { id: "metrics", label: "Classification & Sweep", icon: Activity },
          { id: "failures", label: "Failure Analysis", icon: AlertCircle },
          { id: "perscan", label: "Per-Scan Statistics", icon: Table },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                isActive
                  ? "bg-[#182844] text-[#38d9ff] font-semibold border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: FROC Curve & Sensitivities */}
      {activeTab === "froc" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#070e1b] border border-[#16243b] p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-white text-sm">LUNA16 Free-Response ROC (FROC)</h4>
                <p className="text-[11px] text-slate-400 font-mono">Sensitivity vs False Positives per Scan</p>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2.5 py-0.5 rounded">
                CPM: {evaluation?.froc_evaluation?.cpm_score?.toFixed(3) || "—"}
              </span>
            </div>

            {/* Visual SVG Plot for FROC Curve */}
            <div className="h-64 bg-[#050b14] border border-[#16243b] rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 400 150">
                {/* Grid lines */}
                <line x1="40" y1="20" x2="380" y2="20" stroke="#16243b" strokeDasharray="4" />
                <line x1="40" y1="60" x2="380" y2="60" stroke="#16243b" strokeDasharray="4" />
                <line x1="40" y1="100" x2="380" y2="100" stroke="#16243b" strokeDasharray="4" />
                <line x1="40" y1="130" x2="380" y2="130" stroke="#253a5c" />
                <line x1="40" y1="10" x2="40" y2="130" stroke="#253a5c" />

                {/* Y-axis labels */}
                <text x="10" y="25" fill="#64748b" fontSize="9" fontFamily="monospace">1.0</text>
                <text x="10" y="75" fill="#64748b" fontSize="9" fontFamily="monospace">0.5</text>
                <text x="10" y="130" fill="#64748b" fontSize="9" fontFamily="monospace">0.0</text>

                {/* Curve line */}
                {evaluation?.froc_evaluation?.froc_curve && evaluation.froc_evaluation.froc_curve.length > 0 ? (
                  <polyline
                    fill="none"
                    stroke="#38d9ff"
                    strokeWidth="2.5"
                    points={evaluation.froc_evaluation.froc_curve
                      .map((pt) => {
                        const x = 40 + Math.min(340, (pt.false_positives_per_scan / 8.0) * 340);
                        const y = 130 - pt.sensitivity * 110;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />
                ) : (
                  <line x1="40" y1="130" x2="380" y2="130" stroke="#64748b" />
                )}

                {/* Operating points markers [0.125, 0.25, 0.5, 1, 2, 4, 8] */}
                {[0.125, 0.25, 0.5, 1, 2, 4, 8].map((op, i) => {
                  const x = 40 + (op / 8.0) * 340;
                  return (
                    <g key={i}>
                      <line x1={x} y1="128" x2={x} y2="133" stroke="#64748b" />
                      <text x={x - 6} y="145" fill="#64748b" fontSize="8" fontFamily="monospace">{op}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Operating Points Table */}
          <div className="bg-[#070e1b] border border-[#16243b] p-6 rounded-2xl flex flex-col">
            <h4 className="font-semibold text-white text-sm mb-3">Prescribed Operating Points</h4>
            <div className="space-y-2 flex-1 overflow-y-auto">
              {[0.125, 0.25, 0.5, 1.0, 2.0, 4.0, 8.0].map((fp) => {
                const sens = evaluation?.froc_evaluation?.sensitivities_at_fp_per_scan?.[`${fp}`];
                return (
                  <div key={fp} className="flex items-center justify-between p-2 rounded-lg bg-[#091322] border border-[#16243b] text-xs font-mono">
                    <span className="text-slate-400">{fp} FP / Scan</span>
                    <span className="text-white font-bold">
                      {sens !== undefined ? `${(sens * 100).toFixed(1)}%` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Classification Metrics & Threshold Sweep */}
      {activeTab === "metrics" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#070e1b] border border-[#16243b] p-6 rounded-2xl">
            <h4 className="font-semibold text-white text-sm mb-3">Confusion Matrix (@ Th=0.50)</h4>
            <div className="grid grid-cols-2 gap-3 font-mono text-center">
              <div className="bg-[#0a182b] border border-cyan-800/40 p-4 rounded-xl">
                <div className="text-xs text-slate-400">True Positives (TP)</div>
                <div className="text-2xl font-bold text-cyan-300 mt-1">
                  {evaluation?.classification_metrics?.true_positives || 0}
                </div>
              </div>
              <div className="bg-[#1c1218] border border-rose-900/40 p-4 rounded-xl">
                <div className="text-xs text-slate-400">False Positives (FP)</div>
                <div className="text-2xl font-bold text-rose-400 mt-1">
                  {evaluation?.classification_metrics?.false_positives || 0}
                </div>
              </div>
              <div className="bg-[#14121f] border border-slate-800 p-4 rounded-xl">
                <div className="text-xs text-slate-400">False Negatives (FN)</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">
                  {evaluation?.classification_metrics?.false_negatives || 0}
                </div>
              </div>
              <div className="bg-[#0b1b1c] border border-emerald-900/40 p-4 rounded-xl">
                <div className="text-xs text-slate-400">True Negatives (TN)</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">
                  {evaluation?.classification_metrics?.true_negatives || 0}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#070e1b] border border-[#16243b] p-6 rounded-2xl">
            <h4 className="font-semibold text-white text-sm mb-3">Threshold Sensitivity Sweep</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead className="text-slate-400 border-b border-[#16243b]">
                  <tr>
                    <th className="py-2">Threshold</th>
                    <th>Precision</th>
                    <th>Recall</th>
                    <th>F1 Score</th>
                    <th>Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#16243b]/60">
                  {evaluation?.threshold_sweep?.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40 text-slate-300">
                      <td className="py-2 font-bold text-cyan-300">{s.threshold.toFixed(2)}</td>
                      <td>{(s.precision * 100).toFixed(1)}%</td>
                      <td>{(s.recall * 100).toFixed(1)}%</td>
                      <td>{s.f1_score.toFixed(2)}</td>
                      <td>{(s.accuracy * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Failure Analysis & Stratification */}
      {activeTab === "failures" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(evaluation?.failure_analysis?.performance_by_diameter || {}).map(([cat, stats]) => (
              <div key={cat} className="bg-[#070e1b] border border-[#16243b] p-4 rounded-xl font-mono text-xs">
                <div className="text-slate-400 uppercase">{cat.replace(/_/g, " ")}</div>
                <div className="text-xl font-bold text-white mt-1">
                  {(stats.sensitivity * 100).toFixed(1)}% Sensitivity
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Detected {stats.detected_nodules} of {stats.total_nodules} nodules
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#070e1b] border border-[#16243b] p-6 rounded-2xl">
            <h4 className="font-semibold text-white text-sm mb-3">Identified False Positives</h4>
            {evaluation?.failure_analysis?.false_positives?.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono">No false positives identified.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {evaluation?.failure_analysis?.false_positives?.map((fp, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-[#091322] border border-[#16243b] text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-rose-400" />
                      <span className="text-slate-200">{fp.candidate_id}</span>
                      <span className="text-slate-500">({fp.seriesuid})</span>
                    </div>
                    <span className="text-rose-400 font-bold">Score: {fp.model_score.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Per-Scan Statistics */}
      {activeTab === "perscan" && (
        <div className="bg-[#070e1b] border border-[#16243b] p-6 rounded-2xl">
          <h4 className="font-semibold text-white text-sm mb-3">Scan-Level Evaluation Performance</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left">
              <thead className="text-slate-400 border-b border-[#16243b]">
                <tr>
                  <th className="py-2">Series UID</th>
                  <th>Ground Truth</th>
                  <th>Predictions</th>
                  <th>True Positives</th>
                  <th>False Positives</th>
                  <th>Sensitivity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#16243b]/60">
                {Object.values(evaluation?.froc_evaluation?.per_scan_stats || {}).map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40 text-slate-300">
                    <td className="py-2 text-cyan-300 font-bold">{s.seriesuid}</td>
                    <td>{s.ground_truth_count}</td>
                    <td>{s.predictions_count}</td>
                    <td className="text-emerald-400">{s.true_positives}</td>
                    <td className="text-rose-400">{s.false_positives}</td>
                    <td>{(s.scan_sensitivity * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
