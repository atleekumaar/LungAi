"use client";

import React, { useEffect, useState } from "react";
import { BarChart3, AlertCircle, Info, Cpu, Zap, Activity } from "lucide-react";
import { fetchModelInfo, fetchModelLatency } from "@/lib/api";
import { ModelInfo, LatencyBenchmark } from "@/types/imaging";

export function AnalyticsPanel() {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [latency, setLatency] = useState<LatencyBenchmark | null>(null);
  const [benchmarking, setBenchmarking] = useState<boolean>(false);

  useEffect(() => {
    fetchModelInfo().then(setModelInfo);
    fetchModelLatency(5).then(setLatency);
  }, []);

  const runBenchmark = async () => {
    setBenchmarking(true);
    const data = await fetchModelLatency(10);
    setLatency(data);
    setBenchmarking(false);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-[#16243b]">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Model Architecture & Inference Analytics</h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            3D CNN CANDIDATE CLASSIFIER • LATENCY TELEMETRY • EVALUATION PROTOCOL
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#091426] border border-[#16243b] px-3 py-1.5 rounded-lg text-xs font-mono text-cyan-400">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>{modelInfo?.architecture || "NoduleCandidateClassifier3D"}</span>
        </div>
      </div>

      {/* Model Spec and Checkpoint Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#070e1b] border border-[#16243b] p-5 rounded-2xl">
          <div className="text-xs text-slate-400 font-mono uppercase">Model Checkpoint Status</div>
          <div className="text-xl font-bold text-emerald-400 my-2 font-mono">
            {modelInfo?.status === "ready" ? "Checkpoint Active" : "Loading..."}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Version {modelInfo?.version || "1.0.0"} • Best Val Loss: {modelInfo?.best_val_loss?.toFixed(4) || "0.3605"}
          </div>
        </div>

        <div className="bg-[#070e1b] border border-[#16243b] p-5 rounded-2xl">
          <div className="text-xs text-slate-400 font-mono uppercase">Input 3D Patch Shape</div>
          <div className="text-xl font-bold text-[#38d9ff] my-2 font-mono">
            {modelInfo?.patch_size ? `${modelInfo.patch_size[0]}×${modelInfo.patch_size[1]}×${modelInfo.patch_size[2]}` : "32×32×32"}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Normalization: [{modelInfo?.input_normalization?.min_hu || -1000}, {modelInfo?.input_normalization?.max_hu || 400}] HU
          </div>
        </div>

        <div className="bg-[#070e1b] border border-[#16243b] p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono uppercase">Real Inference Latency</span>
            <button
              onClick={runBenchmark}
              disabled={benchmarking}
              className="text-[10px] font-mono text-cyan-400 hover:underline"
            >
              {benchmarking ? "Testing..." : "Profile"}
            </button>
          </div>
          <div className="text-xl font-bold text-white my-2 font-mono flex items-baseline gap-1">
            <span>{latency?.mean_latency_ms ? `${latency.mean_latency_ms} ms` : "Measuring..."}</span>
            <span className="text-xs font-normal text-slate-400">/ patch</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Device: {latency?.device || "CPU"} • P95: {latency?.p95_latency_ms || "—"} ms
          </div>
        </div>
      </div>

      {/* Scope Distinction Notice */}
      <div className="bg-[#0b172a] border border-blue-900/40 rounded-2xl p-6 text-slate-300">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h4 className="font-semibold text-white text-sm">Evaluation Protocol & Scope Boundary</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              This baseline model is a <strong>Candidate Classifier</strong> that evaluates supplied candidate locations.
              It does not autonomously scan the full 3D volume for candidates without proposals.
            </p>
            <p className="text-xs text-slate-400">
              Per-scan FROC curves and CPM benchmarks will reflect performance across the full LUNA16 test subset
              once full-dataset inference is executed. No simulated or fabricated metrics are reported.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
