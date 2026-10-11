"use client";

import React, { useRef, useEffect } from "react";
import { Search, Crosshair, ArrowLeft, AlertCircle } from "lucide-react";
import { Candidate, ScanInfo } from "@/types/imaging";
import { getSliceWindowedUrl } from "@/lib/api";

interface NoduleMagnifierProps {
  scan: ScanInfo | null;
  candidate: Candidate | null;
  onClearCandidate: () => void;
}

export function NoduleMagnifier({ scan, candidate, onClearCandidate }: NoduleMagnifierProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!scan || !candidate) return;

    const img = new Image();
    // Use nodule targeted window preset
    img.src = getSliceWindowedUrl(scan.scan_id, candidate.slice_index, "axial", -500, 1000);

    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const cropSize = 64; // 64x64 pixel crop around candidate
      canvas.width = 240;
      canvas.height = 240;

      const sx = Math.max(0, candidate.voxel_x - cropSize / 2);
      const sy = Math.max(0, candidate.voxel_y - cropSize / 2);

      // Disable smoothing for sharp pixelated radiological inspection
      ctx.imageSmoothingEnabled = false;

      ctx.clearRect(0, 0, 240, 240);
      ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, 240, 240);

      // Centered crosshair overlay
      ctx.strokeStyle = "rgba(255, 154, 82, 0.85)";
      ctx.lineWidth = 1.5;
      const mid = 120;
      ctx.beginPath();
      ctx.arc(mid, mid, 35, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(mid - 45, mid);
      ctx.lineTo(mid + 45, mid);
      ctx.moveTo(mid, mid - 45);
      ctx.lineTo(mid, mid + 45);
      ctx.stroke();
    };
  }, [scan, candidate]);

  if (!candidate) {
    return (
      <div className="bg-[#070e1b] border border-[#16243b] rounded-2xl p-4 flex flex-col items-center justify-center text-center text-slate-500 font-mono text-xs h-[320px]">
        <Search className="w-8 h-8 mb-2 text-slate-600 opacity-60" />
        <p>No candidate selected</p>
        <p className="text-[11px] text-slate-600 mt-1">Click a candidate in the panel to inspect a 4x magnified crop</p>
      </div>
    );
  }

  const hasScore = candidate.model_score !== null && candidate.model_score !== undefined;

  return (
    <div className="bg-[#070e1b] border border-[#16243b] rounded-2xl p-4 flex flex-col shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-[#16243b] mb-3">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-[#ff9a52]" />
          <h3 className="font-semibold text-white text-sm">Nodule Magnifier (4x Crop)</h3>
        </div>
        <button
          onClick={onClearCandidate}
          className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      <div className="flex justify-center items-center bg-black rounded-xl p-2 border border-[#16243b] mb-3">
        <canvas ref={canvasRef} className="rounded-lg shadow-inner" />
      </div>

      <div className="bg-[#091322] border border-[#16243b] rounded-xl p-3 font-mono text-[11px] space-y-1.5 text-slate-300">
        <div className="flex justify-between items-center">
          <span className="text-slate-500">ID:</span>
          <span className="text-[#ff9a52] font-bold">{candidate.candidate_id}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Model Probability:</span>
          <span className="font-bold text-white">
            {hasScore ? `${(candidate.model_score! * 100).toFixed(1)}% (${candidate.model_score!.toFixed(3)})` : "Unscored"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Estimated Diameter:</span>
          <span className="text-white">{candidate.diameter_mm ? `${candidate.diameter_mm.toFixed(1)} mm` : "N/A"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Voxel Coordinates:</span>
          <span className="text-white">({candidate.voxel_x}, {candidate.voxel_y}, {candidate.slice_index})</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Physical Origin (mm):</span>
          <span className="text-white">({candidate.coord_x.toFixed(1)}, {candidate.coord_y.toFixed(1)}, {candidate.coord_z.toFixed(1)})</span>
        </div>
      </div>
    </div>
  );
}
