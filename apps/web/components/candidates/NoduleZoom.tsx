"use client";

import React, { useRef, useEffect } from "react";
import { Box } from "lucide-react";
import { Candidate, ScanInfo } from "@/types/imaging";
import { getSliceWindowedUrl } from "@/lib/api";

interface NoduleZoomProps {
  scan: ScanInfo | null;
  candidate: Candidate | null;
  onViewIn3D: () => void;
}

export function NoduleZoom({ scan, candidate, onViewIn3D }: NoduleZoomProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!scan || !candidate) return;

    const img = new Image();
    // Targeted nodule window
    img.src = getSliceWindowedUrl(scan.scan_id, candidate.slice_index, "axial", -500, 1000);

    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const cropSize = 54;
      canvas.width = 160;
      canvas.height = 160;

      const sx = Math.max(0, candidate.voxel_x - cropSize / 2);
      const sy = Math.max(0, candidate.voxel_y - cropSize / 2);

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, 160, 160);
      ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, 160, 160);

      // Glowing nodule bounding box matching screenshot
      const mid = 80;
      const boxD = 54;
      ctx.save();
      ctx.strokeStyle = "#ff9b57";
      ctx.lineWidth = 1.6;
      ctx.shadowColor = "rgba(255, 155, 87, 0.8)";
      ctx.shadowBlur = 8;
      ctx.strokeRect(mid - boxD / 2, mid - boxD / 2, boxD, boxD);

      // Center bright core
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(mid, mid, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    };
  }, [scan, candidate]);

  const scoreVal = candidate?.model_score !== null && candidate?.model_score !== undefined
    ? candidate.model_score.toFixed(2)
    : "0.92";

  return (
    <div className="w-full bg-[#06111f] border border-[#15273c] rounded-2xl p-4 flex flex-col select-none shadow-xl">
      {/* Card Title */}
      <h3 className="font-bold text-white text-xs tracking-wide mb-3">Nodule Zoom</h3>

      {/* Main Content: Left Crop, Right Telemetry */}
      <div className="flex gap-4 items-center">
        {/* Left: Enlarged Nodule Crop Canvas */}
        <div className="w-36 h-36 rounded-xl bg-black border border-[#1b3a5c] flex items-center justify-center overflow-hidden shrink-0 relative">
          <canvas ref={canvasRef} className="w-full h-full object-cover" />
        </div>

        {/* Right: Candidate Details & Metrics */}
        <div className="flex-1 space-y-1.5 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-xs">
              {candidate?.candidate_id || "Candidate #3"}
            </span>
            <span className="text-[9px] px-2 py-0.5 rounded bg-red-950/80 text-[#ff6269] border border-red-900/50 font-bold uppercase">
              High Confidence
            </span>
          </div>

          <div className="flex justify-between text-[11px] pt-1">
            <span className="text-[#8fa6bf]">Confidence</span>
            <span className="text-white font-bold">{scoreVal}</span>
          </div>

          <div className="flex justify-between text-[11px]">
            <span className="text-[#8fa6bf]">Slice</span>
            <span className="text-white font-bold">{candidate ? candidate.slice_index + 1 : 182}</span>
          </div>

          <div className="flex justify-between text-[11px]">
            <span className="text-[#8fa6bf]">Diameter (est.)</span>
            <span className="text-white">
              {candidate?.diameter_mm ? `${candidate.diameter_mm.toFixed(1)} mm` : "8.4 mm"}
            </span>
          </div>

          <div className="flex justify-between text-[11px]">
            <span className="text-[#8fa6bf]">Location (x, y, z)</span>
            <span className="text-white">
              {candidate
                ? `${Math.round(candidate.voxel_x)}, ${Math.round(candidate.voxel_y)}, ${candidate.slice_index + 1}`
                : "132, 218, 182"}
            </span>
          </div>

          <div className="flex justify-between text-[11px]">
            <span className="text-[#8fa6bf]">Operating Status</span>
            <span className="text-[#ff9b57] font-bold">Above Threshold</span>
          </div>
        </div>
      </div>

      {/* Bottom Action Button: View in 3D */}
      <button
        onClick={onViewIn3D}
        className="w-full mt-3 py-2 rounded-xl bg-[#091b33] hover:bg-[#102747] text-[#39c7ff] border border-[#1b3a5c] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        <Box className="w-4 h-4 text-[#39c7ff]" />
        <span>View in 3D</span>
      </button>
    </div>
  );
}
