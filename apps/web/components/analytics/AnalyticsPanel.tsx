"use client";

import React from "react";
import { BarChart3, AlertCircle, Info, Lock } from "lucide-react";

export function AnalyticsPanel() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-[#16243b]">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Model Evaluation & FROC Analytics</h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            BENCHMARK METRICS PROTOCOL • LUNA16 SENSITIVITY & CPM (FREE-RESPONSE ROC)
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#091426] border border-[#16243b] px-3 py-1.5 rounded-lg text-xs font-mono text-amber-400">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>Evaluation Pending Phase 4 Model Weights</span>
        </div>
      </div>

      {/* Honest Empty State Alert */}
      <div className="bg-[#0b172a] border border-blue-900/40 rounded-2xl p-6 text-slate-300">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h4 className="font-semibold text-white text-sm">Evaluation Results Not Yet Available</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              In accordance with scientific and clinical engineering standards, no fabricated sensitivity,
              false-positive rate curves, or Competition Performance Metric (CPM) scores are simulated.
              The architecture is prepared for the integration of Phase 4 3D PyTorch model checkpoints.
            </p>
            <p className="text-xs text-slate-400">
              When a trained nodule classifier is evaluated against the LUNA16 test split, verified FROC curves
              (measuring sensitivity at 0.125, 0.25, 0.5, 1, 2, 4, and 8 false positives per scan) will render here.
            </p>
          </div>
        </div>
      </div>

      {/* Metric Cards Placeholders with explicit pending status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#070e1b] border border-[#16243b] p-5 rounded-2xl">
          <div className="text-xs text-slate-400 font-mono uppercase">CPM Score</div>
          <div className="text-2xl font-bold text-slate-500 my-2">—</div>
          <div className="text-[11px] text-slate-500 font-mono">Pending Model Checkpoint</div>
        </div>

        <div className="bg-[#070e1b] border border-[#16243b] p-5 rounded-2xl">
          <div className="text-xs text-slate-400 font-mono uppercase">Sensitivity @ 1 FP/Scan</div>
          <div className="text-2xl font-bold text-slate-500 my-2">—</div>
          <div className="text-[11px] text-slate-500 font-mono">Pending Model Checkpoint</div>
        </div>

        <div className="bg-[#070e1b] border border-[#16243b] p-5 rounded-2xl">
          <div className="text-xs text-slate-400 font-mono uppercase">Inference Latency</div>
          <div className="text-2xl font-bold text-slate-500 my-2">— ms</div>
          <div className="text-[11px] text-slate-500 font-mono">Pending Model Checkpoint</div>
        </div>
      </div>

      {/* FROC Placeholder Box */}
      <div className="bg-[#070e1b] border border-[#16243b] p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-white">Free-Response ROC (FROC) Curve</h4>
          <span className="text-xs font-mono text-slate-500">Fixed FPs: [0.125, 0.25, 0.5, 1, 2, 4, 8]</span>
        </div>
        <div className="h-64 border border-dashed border-[#1a2e4b] rounded-xl flex flex-col items-center justify-center text-slate-500 font-mono text-xs">
          <BarChart3 className="w-10 h-10 mb-2 text-slate-600 opacity-50" />
          <span>FROC graph awaiting real test-split predictions</span>
        </div>
      </div>
    </div>
  );
}
