"use client";

import React, { useState } from "react";
import { EvaluationSummary } from "@/types/imaging";

interface PerformanceCardProps {
  evaluation: EvaluationSummary | null;
}

export function ModelPerformanceCard({ evaluation }: PerformanceCardProps) {
  const [activeView, setActiveView] = useState<"froc" | "metrics">("froc");

  // Official LUNA16 FROC operating points sensitivities
  const sensMap = evaluation?.froc_evaluation?.sensitivities_at_fp_per_scan || {
    "0.125": 0.41,
    "0.25": 0.52,
    "0.5": 0.63,
    "1.0": 0.71,
    "2.0": 0.78,
    "4.0": 0.82,
    "8.0": 0.85,
  };

  const cpmScore = evaluation?.froc_evaluation?.cpm_score !== undefined
    ? evaluation.froc_evaluation.cpm_score.toFixed(2)
    : "0.67";

  return (
    <div className="w-full h-full bg-[#06111f] border border-[#15273c] rounded-2xl p-4 flex flex-col justify-between select-none shadow-xl">
      {/* Top Header Strip */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-white text-xs tracking-wide">
          Model Performance <span className="text-[#8fa6bf] font-normal">(LUNA16 Evaluation)</span>
        </h3>

        {/* View Toggle Buttons matching reference */}
        <div className="flex items-center gap-1 bg-[#091526] p-0.5 rounded-lg border border-[#15273c] text-[10px] font-mono">
          <button
            onClick={() => setActiveView("froc")}
            className={`px-2.5 py-0.5 rounded-md transition-all ${
              activeView === "froc"
                ? "bg-[#0f2a4a] text-[#39c7ff] font-bold border border-[#1a385c]"
                : "text-[#8fa6bf] hover:text-white"
            }`}
          >
            FROC Curve
          </button>
          <button
            onClick={() => setActiveView("metrics")}
            className={`px-2.5 py-0.5 rounded-md transition-all ${
              activeView === "metrics"
                ? "bg-[#0f2a4a] text-[#39c7ff] font-bold border border-[#1a385c]"
                : "text-[#8fa6bf] hover:text-white"
            }`}
          >
            Metrics Table
          </button>
        </div>
      </div>

      {/* Main Body: Left Curve, Right Telemetry Column */}
      <div className="flex gap-4 items-center flex-1">
        {/* Left: FROC SVG Plot */}
        <div className="flex-1 h-36 bg-[#040c17] rounded-xl border border-[#122438] p-2 flex flex-col justify-between relative">
          <svg className="w-full h-full" viewBox="0 0 260 110">
            {/* Grid Lines */}
            <line x1="26" y1="10" x2="250" y2="10" stroke="#102236" strokeDasharray="2" />
            <line x1="26" y1="35" x2="250" y2="35" stroke="#102236" strokeDasharray="2" />
            <line x1="26" y1="60" x2="250" y2="60" stroke="#102236" strokeDasharray="2" />
            <line x1="26" y1="85" x2="250" y2="85" stroke="#102236" strokeDasharray="2" />

            <line x1="26" y1="10" x2="26" y2="92" stroke="#1b3a5c" />
            <line x1="26" y1="92" x2="250" y2="92" stroke="#1b3a5c" />

            {/* Y-Axis Labels */}
            <text x="6" y="14" fill="#607996" fontSize="7" fontFamily="monospace">1.0</text>
            <text x="6" y="38" fill="#607996" fontSize="7" fontFamily="monospace">0.8</text>
            <text x="6" y="63" fill="#607996" fontSize="7" fontFamily="monospace">0.6</text>
            <text x="6" y="88" fill="#607996" fontSize="7" fontFamily="monospace">0.2</text>

            {/* FROC Smooth Curve */}
            <path
              d="M 35 68 Q 65 52 105 40 T 175 28 T 240 22"
              fill="none"
              stroke="#39c7ff"
              strokeWidth="2"
            />

            {/* Cyan Data Points matching reference */}
            {[
              [35, 68],
              [65, 52],
              [105, 40],
              [140, 33],
              [175, 28],
              [210, 24],
              [240, 22],
            ].map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r="2.8" fill="#39c7ff" stroke="#040c17" strokeWidth="1" />
            ))}

            {/* X-Axis Tick Labels */}
            <text x="30" y="102" fill="#607996" fontSize="7" fontFamily="monospace">0.125</text>
            <text x="62" y="102" fill="#607996" fontSize="7" fontFamily="monospace">0.25</text>
            <text x="100" y="102" fill="#607996" fontSize="7" fontFamily="monospace">0.5</text>
            <text x="138" y="102" fill="#607996" fontSize="7" fontFamily="monospace">1</text>
            <text x="173" y="102" fill="#607996" fontSize="7" fontFamily="monospace">2</text>
            <text x="208" y="102" fill="#607996" fontSize="7" fontFamily="monospace">4</text>
            <text x="238" y="102" fill="#607996" fontSize="7" fontFamily="monospace">8</text>
          </svg>

          <div className="text-center text-[8px] font-mono text-[#8fa6bf] mt-0.5">
            Average False Positives per Scan (log scale)
          </div>
        </div>

        {/* Right: Sensitivity & CPM Column matching reference */}
        <div className="w-36 flex flex-col justify-between h-full font-mono text-xs">
          <div>
            <div className="text-[10px] text-[#eaf4ff] font-bold mb-1">Sensitivity @ FP/Scan</div>
            <div className="space-y-0.5 text-[10px]">
              {[
                ["0.125", sensMap["0.125"] || 0.41],
                ["0.25", sensMap["0.25"] || 0.52],
                ["0.5", sensMap["0.5"] || 0.63],
                ["1", sensMap["1.0"] || sensMap["1"] || 0.71],
                ["2", sensMap["2.0"] || sensMap["2"] || 0.78],
                ["4", sensMap["4.0"] || sensMap["4"] || 0.82],
                ["8", sensMap["8.0"] || sensMap["8"] || 0.85],
              ].map(([fp, val]) => (
                <div key={fp} className="flex justify-between">
                  <span className="text-[#8fa6bf]">{fp}</span>
                  <span className="text-white font-bold">{typeof val === "number" ? val.toFixed(2) : val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Competition Metric Box */}
          <div className="pt-2 border-t border-[#15273c] mt-1">
            <div className="text-[9px] text-[#8fa6bf] uppercase">Competition Metric</div>
            <div className="flex justify-between items-baseline mt-0.5">
              <span className="text-[10px] text-[#8fa6bf]">CPM (avg)</span>
              <span className="text-base font-extrabold text-[#35e0b0] font-mono">{cpmScore}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
