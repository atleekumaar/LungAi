"use client";

import React from "react";
import { ArrowRight } from "lucide-react";

interface HeroLeftProps {
  onTryDemo: () => void;
  onLearnMore: () => void;
  stats?: {
    totalScans: number;
    annotatedNodules: number;
    detectionType: string;
    frocMetric: string;
  };
}

export function HeroLeft({ onTryDemo, onLearnMore, stats }: HeroLeftProps) {
  return (
    <div className="flex flex-col justify-between h-full select-none pr-2">
      <div>
        {/* Outlined Eyebrow Pill */}
        <div className="inline-block px-3 py-1 rounded-full border border-[#1b3a5c] bg-[#07172b]/60 text-[#39c7ff] text-[11px] font-medium tracking-wide mb-5">
          AI for Early Lung Cancer Detection
        </div>

        {/* Large Multi-line Headline */}
        <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-[1.15] mb-5">
          Finding the <br />
          Smallest <span className="text-[#39c7ff]">Signals</span> <br />
          in the <span className="text-[#39c7ff]">Lung.</span>
        </h1>

        {/* Supporting Copy */}
        <p className="text-[13px] text-[#8fa6bf] leading-relaxed max-w-sm mb-7">
          AI-powered pulmonary nodule candidate analysis from CT scans, with research-grade visualization and evaluation.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={onTryDemo}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2f82ff] to-[#39c7ff] hover:opacity-95 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <span>Try Demo Scan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onLearnMore}
            className="px-5 py-2.5 rounded-xl border border-[#1b3a5c] bg-[#06111f] hover:bg-[#0c1f38] text-[#eaf4ff] text-xs font-medium transition-all cursor-pointer"
          >
            Learn More
          </button>
        </div>
      </div>

      {/* 4 Bottom Summary Metrics */}
      <div className="grid grid-cols-4 gap-2 pt-4 border-t border-[#15273c]">
        <div>
          <div className="text-xl font-extrabold text-[#39c7ff] font-mono leading-none">
            {stats?.totalScans ? stats.totalScans : "888"}
          </div>
          <div className="text-[10px] text-[#eaf4ff] font-medium mt-1 leading-tight">CT Scans</div>
          <div className="text-[9px] text-[#8fa6bf] leading-tight">
            {stats?.totalScans ? "(Local Scans)" : "(Target LUNA16)"}
          </div>
        </div>

        <div>
          <div className="text-xl font-extrabold text-[#39c7ff] font-mono leading-none">
            {stats?.annotatedNodules ? stats.annotatedNodules.toLocaleString() : "1,186"}
          </div>
          <div className="text-[10px] text-[#eaf4ff] font-medium mt-1 leading-tight">Nodules</div>
          <div className="text-[9px] text-[#8fa6bf] leading-tight">
            {stats?.annotatedNodules ? "(Loaded)" : "(Benchmark Ref)"}
          </div>
        </div>

        <div>
          <div className="text-xl font-extrabold text-[#39c7ff] font-mono leading-none">
            3D CNN
          </div>
          <div className="text-[10px] text-[#eaf4ff] font-medium mt-1 leading-tight">Candidate Model</div>
          <div className="text-[9px] text-[#8fa6bf] leading-tight">& Localization</div>
        </div>

        <div>
          <div className="text-xl font-extrabold text-[#39c7ff] font-mono leading-none">
            FROC
          </div>
          <div className="text-[10px] text-[#eaf4ff] font-medium mt-1 leading-tight">Sensitivity at Fixed</div>
          <div className="text-[9px] text-[#8fa6bf] leading-tight">False Positives</div>
        </div>
      </div>
    </div>
  );
}
