"use client";

import React from "react";
import { Target, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Candidate } from "@/types/imaging";

interface CandidatePanelProps {
  candidates: Candidate[];
  selectedCandidate: Candidate | null;
  onSelectCandidate: (candidate: Candidate) => void;
  showCandidates: boolean;
  setShowCandidates: (show: boolean) => void;
}

export function CandidatePanel({
  candidates,
  selectedCandidate,
  onSelectCandidate,
  showCandidates,
  setShowCandidates,
}: CandidatePanelProps) {
  return (
    <div className="bg-[#070e1b] border border-[#16243b] rounded-2xl p-4 flex flex-col h-full shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-[#16243b] mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-[#ff9a52]" />
          <h3 className="font-semibold text-white text-sm">Candidates & Annotations</h3>
          <span className="text-xs font-mono bg-[#112035] text-[#38d9ff] px-2 py-0.5 rounded-full border border-blue-900/60">
            {candidates.length}
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

      {/* Model status disclaimer */}
      <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg p-2.5 mb-3 text-[11px] text-amber-300 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
        <div>
          <span className="font-semibold">Reference Protocol:</span> Showing validated LUNA16 ground-truth annotations.
          Model prediction scores will appear when Phase 4 model weights are loaded.
        </div>
      </div>

      {/* Candidates List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {candidates.length === 0 ? (
          <div className="text-center py-8 text-slate-500 font-mono text-xs">
            No candidates registered for this scan.
          </div>
        ) : (
          candidates.map((c) => {
            const isSelected = selectedCandidate?.candidate_id === c.candidate_id;
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
                    <span className="w-2 h-2 rounded-full bg-[#ff9a52]" />
                    <span>{c.candidate_id}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-900/40">
                    {c.is_reference ? "LUNA16 REF" : "MODEL"}
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
                  <div className="col-span-2 text-[10px] text-slate-400">
                    Score:{" "}
                    <span className="text-amber-400 font-mono">
                      {c.model_score !== null && c.model_score !== undefined
                        ? c.model_score.toFixed(3)
                        : "Awaiting model evaluation"}
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
