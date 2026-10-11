"use client";

import React, { useState } from "react";
import { Target, Play, Eye, EyeOff, Sparkles, Filter, AlertCircle, RefreshCw } from "lucide-react";
import { Candidate } from "@/types/imaging";

interface CandidatePanelProps {
  candidates: Candidate[];
  selectedCandidate: Candidate | null;
  onSelectCandidate: (candidate: Candidate) => void;
  showCandidates: boolean;
  setShowCandidates: (show: boolean) => void;
  scoreThreshold: number;
  setScoreThreshold: (th: number) => void;
  onRunInference: () => void;
  isInferring: boolean;
  inferProgress: number;
  modelReady: boolean;
}

export function CandidatePanel({
  candidates,
  selectedCandidate,
  onSelectCandidate,
  showCandidates,
  setShowCandidates,
  scoreThreshold,
  setScoreThreshold,
  onRunInference,
  isInferring,
  inferProgress,
  modelReady,
}: CandidatePanelProps) {
  const [filterMode, setFilterMode] = useState<"all" | "scored" | "reference">("all");

  const filteredCandidates = candidates.filter((c) => {
    if (filterMode === "scored" && c.model_score === null) return false;
    if (filterMode === "reference" && !c.is_reference) return false;
    if (c.model_score !== null && c.model_score !== undefined) {
      return c.model_score >= scoreThreshold;
    }
    return true;
  });

  return (
    <div className="bg-[#070e1b] border border-[#16243b] rounded-2xl p-4 flex flex-col h-full shadow-xl">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#16243b] mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-[#ff9a52]" />
          <h3 className="font-semibold text-white text-sm">Candidate Localization</h3>
          <span className="text-xs font-mono bg-[#112035] text-[#38d9ff] px-2 py-0.5 rounded-full border border-blue-900/60">
            {filteredCandidates.length}/{candidates.length}
          </span>
        </div>

        <button
          onClick={() => setShowCandidates(!showCandidates)}
          className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors"
          title={showCandidates ? "Hide overlay markers" : "Show overlay markers"}
        >
          {showCandidates ? <Eye className="w-4 h-4 text-cyan-400" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </div>

      {/* Model Inference Action Box */}
      <div className="bg-[#091426] border border-blue-900/40 rounded-xl p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold">3D CNN Candidate Classifier</span>
          </div>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
              modelReady
                ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40"
                : "bg-amber-950/80 text-amber-400 border border-amber-800/40"
            }`}
          >
            {modelReady ? "Model Ready" : "Loading Model"}
          </span>
        </div>

        <p className="text-[11px] text-slate-400 leading-tight mb-2.5">
          Scores supplied 3D candidate patch locations. (Not autonomous full-volume detection).
        </p>

        <button
          onClick={onRunInference}
          disabled={!modelReady || isInferring || candidates.length === 0}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 text-white font-medium text-xs shadow-md shadow-cyan-500/20 transition-all font-mono"
        >
          {isInferring ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Scoring ({Math.round(inferProgress * 100)}%)...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>Score Candidates with Model</span>
            </>
          )}
        </button>
      </div>

      {/* Filter and Score Threshold Controls */}
      <div className="bg-[#091220] border border-[#16243b] rounded-xl p-2.5 mb-3 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 font-mono">
            <Filter className="w-3 h-3 text-cyan-400" /> Score Threshold:
          </span>
          <span className="text-white font-mono font-bold">{scoreThreshold.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min="0.0"
          max="0.9"
          step="0.05"
          value={scoreThreshold}
          onChange={(e) => setScoreThreshold(parseFloat(e.target.value))}
          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#38d9ff]"
        />

        <div className="flex items-center gap-1 pt-1 text-[10px] font-mono">
          {(["all", "scored", "reference"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setFilterMode(m)}
              className={`flex-1 py-1 rounded text-center uppercase transition-all ${
                filterMode === m
                  ? "bg-[#162640] text-cyan-300 font-bold border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Candidates List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredCandidates.length === 0 ? (
          <div className="text-center py-8 text-slate-500 font-mono text-xs">
            No candidates match the current filter threshold.
          </div>
        ) : (
          filteredCandidates.map((c) => {
            const isSelected = selectedCandidate?.candidate_id === c.candidate_id;
            const hasScore = c.model_score !== null && c.model_score !== undefined;
            return (
              <div
                key={c.candidate_id}
                onClick={() => onSelectCandidate(c)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  isSelected
                    ? "bg-[#14233c] border-[#ff9a52] shadow-md shadow-orange-950/30"
                    : "bg-[#091322] border-[#16243b] hover:border-slate-700 hover:bg-[#0c182a]"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="font-mono font-bold text-slate-200 flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        hasScore && c.model_score! >= 0.5 ? "bg-[#ff9a52]" : "bg-cyan-400"
                      }`}
                    />
                    <span>{c.candidate_id}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      hasScore
                        ? "bg-orange-950/80 text-orange-400 border border-orange-800/40"
                        : "bg-blue-950/80 text-blue-300 border border-blue-900/40"
                    }`}
                  >
                    {hasScore ? "SCORED" : "LUNA16 REF"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1 font-mono text-[11px] text-slate-400">
                  <div>
                    Slice: <span className="text-slate-200 font-semibold">{c.slice_index + 1}</span>
                  </div>
                  <div>
                    Diameter:{" "}
                    <span className="text-slate-200">
                      {c.diameter_mm ? `${c.diameter_mm.toFixed(1)} mm` : "N/A"}
                    </span>
                  </div>
                  <div className="col-span-2 text-[10px] text-slate-500 truncate">
                    World: ({c.coord_x.toFixed(1)}, {c.coord_y.toFixed(1)}, {c.coord_z.toFixed(1)})
                  </div>
                  <div className="col-span-2 text-[11px] pt-0.5 flex items-center justify-between">
                    <span className="text-slate-400">Model Probability:</span>
                    <span
                      className={`font-mono font-bold ${
                        hasScore
                          ? c.model_score! >= 0.5
                            ? "text-[#ff9a52]"
                            : "text-cyan-400"
                          : "text-slate-500"
                      }`}
                    >
                      {hasScore ? `${(c.model_score! * 100).toFixed(1)}% (${c.model_score!.toFixed(3)})` : "Unscored"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
