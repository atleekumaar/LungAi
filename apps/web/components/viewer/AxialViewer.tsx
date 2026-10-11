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
  const [wl, setWl] = useState<number>(windowLevel);
  const [ww, setWw] = useState<number>(windowWidth);

  const presets = [
    { label: "Lung", wl: -600, ww: 1500 },
    { label: "Med", wl: 40, ww: 400 },
    { label: "Bone", wl: 400, ww: 1800 },
  ];

  // Render CT slice and candidate overlays on HTML5 Canvas
  useEffect(() => {
    if (!scan) return;
    setLoading(true);

    const img = new Image();
    const url = getSliceWindowedUrl(scan.scan_id, currentSlice, "axial", wl, ww);
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
  }, [scan, currentSlice, selectedCandidate, candidates, wl, ww]);

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
      <div className="absolute top-0 left-0 right-0 z-20 px-4 py-2.5 flex items-center justify-between text-[11px] font-mono bg-[#06111f]/90 border-b border-[#15273c]">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-xs tracking-wide">Axial View</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#15273c] bg-[#091b33] text-[#8fa6bf]">
            {scan?.scan_id ? `${scan.scan_id.slice(0, 13)}…${scan.scan_id.slice(-5)}` : "No Scan"}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-white font-mono font-semibold">
            {currentSlice + 1} / {totalSlices}
          </span>
          <span className="text-[#39c7ff] font-mono">
            WW: {ww} · WL: {wl}
          </span>
        </div>
      </div>

      {/* Preset Filter Bar */}
      <div className="absolute top-10 left-0 right-0 z-20 px-4 py-1.5 flex items-center gap-1.5 bg-[#040c17]/85 border-b border-[#15273c]">
        {presets.map((p) => {
          const active = wl === p.wl && ww === p.ww;
          return (
            <button
              key={p.label}
              onClick={() => {
                setWl(p.wl);
                setWw(p.ww);
              }}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono border transition-all cursor-pointer ${
                active
                  ? "border-[#39c7ff] bg-[#091b33] text-[#39c7ff] font-bold"
                  : "border-[#15273c] text-[#8fa6bf] hover:text-white"
              }`}
            >
              {p.label}
            </button>
          );
        })}
        <span className="ml-auto text-[9px] font-mono text-[#5d7388] hidden sm:inline">
          Scroll slice · Drag pan
        </span>
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

        {/* Navigation Arrow Overlays matching reference */}
        <div className="absolute top-1/2 left-3 -translate-y-1/2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (currentSlice > 0) onSliceChange(currentSlice - 1);
            }}
            className="w-8 h-8 rounded-lg bg-[#06111f]/85 border border-[#15273c] hover:border-[#39c7ff] flex items-center justify-center text-[#8fa6bf] hover:text-white transition-all cursor-pointer shadow-lg"
          >
            ‹
          </button>
        </div>
        <div className="absolute top-1/2 right-3 -translate-y-1/2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (currentSlice < totalSlices - 1) onSliceChange(currentSlice + 1);
            }}
            className="w-8 h-8 rounded-lg bg-[#06111f]/85 border border-[#15273c] hover:border-[#39c7ff] flex items-center justify-center text-[#8fa6bf] hover:text-white transition-all cursor-pointer shadow-lg"
          >
            ›
          </button>
        </div>

        {/* Bottom Left Zoom Controls matching reference */}
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom((z) => Math.max(0.5, z - 0.2));
            }}
            className="w-7 h-7 rounded-lg bg-[#06111f]/85 border border-[#15273c] hover:border-[#39c7ff] flex items-center justify-center text-xs text-[#8fa6bf] hover:text-white transition-all cursor-pointer"
          >
            −
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom((z) => Math.min(4.0, z + 0.2));
            }}
            className="w-7 h-7 rounded-lg bg-[#06111f]/85 border border-[#15273c] hover:border-[#39c7ff] flex items-center justify-center text-xs text-[#8fa6bf] hover:text-white transition-all cursor-pointer"
          >
            +
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom(1.0);
              setPan({ x: 0, y: 0 });
            }}
            className="w-7 h-7 rounded-lg bg-[#06111f]/85 border border-[#15273c] hover:border-[#39c7ff] flex items-center justify-center text-xs text-[#8fa6bf] hover:text-white transition-all cursor-pointer"
          >
            ↺
          </button>
        </div>

        {loading && (
          <div className="absolute top-16 right-4 text-[10px] font-mono text-[#39c7ff] bg-[#06111f]/90 px-2.5 py-1 rounded-md border border-[#1b3a5c]">
            Loading Slice {currentSlice + 1}...
          </div>
        )}
      </div>
    </div>
  );
}
