"use client";

import React from "react";
import { CheckCircle2, Clock, CircleDot, AlertTriangle } from "lucide-react";

export function WorkflowStatus() {
  const steps = [
    {
      id: "loading",
      name: "Phase 1: Architecture & APIs",
      status: "completed",
      detail: "FastAPI server, SimpleITK core, Next.js frontend, Pydantic schemas",
    },
    {
      id: "preprocessing",
      name: "Phase 2: Medical CT Viewer",
      status: "completed",
      detail: "Interactive multiplanar viewer, HU windowing presets, candidate magnifier",
    },
    {
      id: "pipeline",
      name: "Phase 3: LUNA16 Ingestion & Geometry",
      status: "completed",
      detail: "3D patch extraction, verified coordinate transforms, zero-leakage splits",
    },
    {
      id: "inference",
      name: "Phase 4: Deep Learning Detection",
      status: "pending",
      detail: "3D CNN / UNet nodule candidate classifier training and PyTorch weights",
    },
    {
      id: "evaluation",
      name: "Phase 5: FROC & CPM Benchmark",
      status: "pending",
      detail: "LUNA16 official evaluation protocol, sensitivity at fixed FP rates",
    },
  ];

  return (
    <div className="bg-[#070e1b] border border-[#16243b] rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-[#16243b] mb-4">
        <h3 className="font-semibold text-white text-sm">Pipeline Execution State</h3>
        <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded">
          Phases 1–3 Operational
        </span>
      </div>

      <div className="space-y-4">
        {steps.map((step, idx) => {
          const isDone = step.status === "completed";
          return (
            <div key={step.id} className="flex items-start gap-3 text-xs">
              <div className="mt-0.5">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <CircleDot className="w-4 h-4 text-slate-500" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${isDone ? "text-slate-100" : "text-slate-400"}`}>
                    {step.name}
                  </span>
                  <span
                    className={`font-mono text-[10px] uppercase px-1.5 py-0.2 rounded ${
                      isDone
                        ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/50"
                        : "bg-slate-900 text-slate-500 border border-slate-800"
                    }`}
                  >
                    {step.status}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] mt-0.5">{step.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
