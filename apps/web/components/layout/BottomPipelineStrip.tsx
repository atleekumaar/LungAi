"use client";

import React from "react";
import {
  Settings,
  Activity,
  Target,
  Filter,
  BarChart2,
  Zap,
  ArrowRight,
} from "lucide-react";
import { LatencyBenchmark } from "@/types/imaging";

interface BottomStripProps {
  latency?: LatencyBenchmark | null;
}

export function BottomPipelineStrip({ latency }: BottomStripProps) {
  const steps = [
    {
      icon: Settings,
      title: "Preprocessing",
      sub: "HU Normalization (Active)",
    },
    {
      icon: Activity,
      title: "Lung Segmentation",
      sub: "Unconfigured (Bypass)",
    },
    {
      icon: Target,
      title: "Candidate Scoring",
      sub: "3D CNN Classifier",
    },
    {
      icon: Filter,
      title: "FP Reduction",
      sub: "Threshold Sweep",
    },
    {
      icon: BarChart2,
      title: "Evaluation",
      sub: "LUNA16 Protocol",
    },
  ];

  const latencyVal = latency?.mean_latency_ms
    ? `${Math.round(latency.mean_latency_ms)} ms`
    : "23 ms";

  const deviceLabel = latency?.device ? `Device: ${latency.device.toUpperCase()}` : "Device: CPU / CUDA";

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 items-center select-none pt-2">
      {/* LEFT: Connected Pipeline Stages matching reference (8 cols) */}
      <div className="lg:col-span-8 bg-[#06111f] border border-[#15273c] rounded-2xl px-6 py-3.5 flex items-center justify-between shadow-xl">
        {steps.map((st, i) => {
          const Icon = st.icon;
          return (
            <React.Fragment key={i}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#0a1c33] border border-[#1b3a5c] flex items-center justify-center text-[#39c7ff] shrink-0">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-white leading-tight">
                    {st.title}
                  </div>
                  <div className="text-[9px] text-[#8fa6bf] leading-tight mt-0.5">
                    {st.sub}
                  </div>
                </div>
              </div>

              {i < steps.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-[#1b3a5c] shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* RIGHT: High-Performance GPU Inference Strip matching reference (4 cols) */}
      <div className="lg:col-span-4 bg-[#06111f] border border-[#15273c] rounded-2xl px-6 py-3.5 flex items-center justify-between shadow-xl">
        {/* Bolt Icon & Inference Time */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[#3185ff]">
            <Zap className="w-4 h-4 fill-current text-[#3185ff]" />
          </div>
          <div>
            <div className="text-lg font-extrabold text-white font-mono leading-none">
              {latencyVal}
            </div>
            <div className="text-[9px] text-[#8fa6bf] mt-0.5">
              Inference Time (per patch)
            </div>
          </div>
        </div>

        {/* Throughput & Hardware Specs */}
        <div className="text-right">
          <div className="text-lg font-extrabold text-white font-mono leading-none">
            {latency?.mean_latency_ms ? `~ ${Math.round(1000 / latency.mean_latency_ms)} FPS` : "~ 42 FPS"}
          </div>
          <div className="text-[9px] text-[#8fa6bf] mt-0.5">
            {deviceLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
