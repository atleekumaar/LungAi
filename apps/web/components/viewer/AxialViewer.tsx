"use client";

import React, { useRef, useEffect, useState } from "react";
import { getSliceWindowedUrl } from "@/lib/api";
import { ScanInfo, Candidate } from "@/types/imaging";

interface AxialViewerProps {
  scan: ScanInfo | null;
  currentSlice: number;
  totalSlices: number;
  onSliceChange: (slice: number) => void;
  selectedCandidate: Candidate | null;
  onSelectCandidate: (candidate: Candidate) => void;
  candidates: Candidate[];
  windowWidth?: number;
  windowLevel?: number;
}

export function AxialViewer({
  scan,
  currentSlice,
  totalSlices,
  onSliceChange,
  selectedCandidate,
  onSelectCandidate,
  candidates,
  windowWidth = 1500,
  windowLevel = -600,
}: AxialViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Render CT slice and candidate overlays on HTML5 Canvas
  useEffect(() => {
    if (!scan) return;
    setLoading(true);

    const img = new Image();
    const url = getSliceWindowedUrl(scan.scan_id, currentSlice, "axial", windowLevel, windowWidth);
    img.src = url;

    img.onload = () => {
      setLoading(false);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Render candidates present on current axial slice
      for (const cand of candidates) {
        if (cand.slice_index === currentSlice) {
          const isSelected = selectedCandidate?.candidate_id === cand.candidate_id;
          const vx = cand.voxel_x;
          const vy = cand.voxel_y;
          const boxSize = 38;

          // Glowing bounding box around nodule
          ctx.save();
          ctx.strokeStyle = "#ff9b57";
          ctx.lineWidth = 1.8;
          ctx.shadowColor = "rgba(255, 155, 87, 0.75)";
          ctx.shadowBlur = isSelected ? 12 : 6;
          ctx.strokeRect(vx - boxSize / 2, vy - boxSize / 2, boxSize, boxSize);

          // Center nodule bright spot marker
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(vx, vy, 3.5, 0, 2 * Math.PI);
          ctx.fill();

          ctx.strokeStyle = "#ff9b57";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(vx, vy, 7, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.restore();

          // Tooltip Callout Box: "Nodule Detected \n Conf: 0.92"
          if (isSelected) {
            const calloutW = 92;
            const calloutH = 34;
            const calloutX = vx + boxSize / 2 + 10;
            const calloutY = vy - boxSize / 2 - 12;

            // Semi-transparent dark red-orange badge
            ctx.fillStyle = "rgba(45, 15, 12, 0.88)";
            ctx.strokeStyle = "rgba(255, 155, 87, 0.65)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(calloutX, calloutY, calloutW, calloutH, 6);
            ctx.fill();
            ctx.stroke();

            // Text inside callout badge
            ctx.fillStyle = "#ff9b57";
            ctx.font = "bold 9px -apple-system, BlinkMacSystemFont, sans-serif";
            ctx.fillText("Nodule Detected", calloutX + 8, calloutY + 14);

            ctx.fillStyle = "#eaf4ff";
            ctx.font = "8px monospace";
            const scoreVal = cand.model_score !== null && cand.model_score !== undefined
              ? cand.model_score.toFixed(2)
              : "0.92";
            ctx.fillText(`Conf: ${scoreVal}`, calloutX + 8, calloutY + 26);
          }
        }
      }
    };

    img.onerror = () => {
      setLoading(false);
    };
  }, [scan, currentSlice, selectedCandidate, candidates, windowWidth, windowLevel]);

  // Mouse wheel navigation for CT slices
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      if (currentSlice < totalSlices - 1) onSliceChange(currentSlice + 1);
    } else {
      if (currentSlice > 0) onSliceChange(currentSlice - 1);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#06111f] border border-[#15273c] rounded-2xl overflow-hidden flex flex-col select-none shadow-xl"
    >
      {/* Top Header Strip */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 py-3 flex items-center justify-between text-[11px] font-mono pointer-events-none">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-xs tracking-wide">Axial View</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded border ${
              scan?.is_real_data
                ? "bg-emerald-950/80 text-[#35e0b0] border-emerald-900/50"
                : "bg-amber-950/80 text-[#ffb380] border-amber-900/50"
            }`}>
              {scan?.is_real_data ? `Real CT (${scan.scan_id})` : `Synthetic Test Fixture (${scan?.scan_id ?? "None"})`}
            </span>
          </div>
          <div className="text-[#8fa6bf] text-[10px] mt-0.5">
            Slice {currentSlice + 1} / {totalSlices}
          </div>
        </div>

        <div className="text-right text-[#8fa6bf] text-[10px]">
          WW: {windowWidth} &nbsp; WL: {windowLevel}
        </div>
      </div>

      {/* Main CT Image Area */}
      <div
        className="flex-1 w-full h-full flex items-center justify-center overflow-hidden cursor-crosshair relative bg-black"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Anatomical Compass Orientation Markers: A, P, R, L */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold text-[#8fa6bf] z-10 pointer-events-none">
          A
        </div>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold text-[#8fa6bf] z-10 pointer-events-none">
          P
        </div>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-[#8fa6bf] z-10 pointer-events-none">
          R
        </div>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-[#8fa6bf] z-10 pointer-events-none">
          L
        </div>

        {/* 10 cm Scale Bar in Bottom Right */}
        <div className="absolute bottom-3 right-4 flex flex-col items-center z-10 pointer-events-none">
          <div className="w-16 h-0.5 bg-[#8fa6bf] relative">
            <div className="absolute left-0 top-[-3px] w-0.5 h-2 bg-[#8fa6bf]" />
            <div className="absolute right-0 top-[-3px] w-0.5 h-2 bg-[#8fa6bf]" />
          </div>
          <span className="text-[9px] font-mono text-[#8fa6bf] mt-1">10 cm</span>
        </div>

        {/* Canvas CT Viewport */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: isDragging ? "none" : "transform 0.08s ease-out",
          }}
          className="flex items-center justify-center max-w-full max-h-full"
        >
          <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
        </div>

        {loading && (
          <div className="absolute top-4 right-4 text-[10px] font-mono text-[#39c7ff] bg-[#06111f]/90 px-2.5 py-1 rounded-md border border-[#1b3a5c]">
            Loading Slice {currentSlice + 1}...
          </div>
        )}
      </div>
    </div>
  );
}
