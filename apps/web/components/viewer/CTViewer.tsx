"use client";

import React, { useRef, useEffect, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Sliders, Maximize2, Layers } from "lucide-react";
import { getSliceWindowedUrl } from "@/lib/api";
import { ScanInfo, Candidate } from "@/types/imaging";

interface CTViewerProps {
  scan: ScanInfo | null;
  currentSlice: number;
  totalSlices: number;
  onSliceChange: (slice: number) => void;
  selectedCandidate: Candidate | null;
  windowPreset: string;
  onWindowPresetChange: (preset: string) => void;
  activePlane: "axial" | "coronal" | "sagittal";
  setActivePlane: (plane: "axial" | "coronal" | "sagittal") => void;
}

export function CTViewer({
  scan,
  currentSlice,
  totalSlices,
  onSliceChange,
  selectedCandidate,
  windowPreset,
  onWindowPresetChange,
  activePlane,
  setActivePlane,
}: CTViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [loadingSlice, setLoadingSlice] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);

  // Window presets values
  const presetsMap: Record<string, { wc: number; ww: number }> = {
    lung: { wc: -600, ww: 1500 },
    mediastinum: { wc: 40, ww: 400 },
    bone: { wc: 300, ww: 1500 },
    nodule: { wc: -500, ww: 1000 },
  };

  const currentWindow = presetsMap[windowPreset] || presetsMap.lung;

  // Render slice image onto canvas with candidate overlay
  useEffect(() => {
    if (!scan) return;

    setLoadingSlice(true);
    setImgError(false);

    const img = new Image();
    const url = getSliceWindowedUrl(
      scan.scan_id,
      currentSlice,
      activePlane,
      currentWindow.wc,
      currentWindow.ww
    );
    img.src = url;

    img.onload = () => {
      setLoadingSlice(false);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Render Candidate Overlay if candidate belongs to this slice
      if (
        selectedCandidate &&
        selectedCandidate.slice_index === currentSlice &&
        activePlane === "axial"
      ) {
        const vx = selectedCandidate.voxel_x;
        const vy = selectedCandidate.voxel_y;
        const rad = Math.max(6, (selectedCandidate.diameter_mm || 8) * 1.5);

        // Highlight ring in orange (#FF9A52)
        ctx.strokeStyle = "#ff9a52";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(vx, vy, rad, 0, 2 * Math.PI);
        ctx.stroke();

        // Crosshair
        ctx.strokeStyle = "rgba(255, 154, 82, 0.7)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(vx - rad - 6, vy);
        ctx.lineTo(vx + rad + 6, vy);
        ctx.moveTo(vx, vy - rad - 6);
        ctx.lineTo(vx, vy + rad + 6);
        ctx.stroke();

        // Candidate Label
        ctx.fillStyle = "#ff9a52";
        ctx.font = "bold 11px monospace";
        ctx.fillText(
          `${selectedCandidate.candidate_id} (${selectedCandidate.diameter_mm ? selectedCandidate.diameter_mm.toFixed(1) + 'mm' : 'Ref'})`,
          vx + rad + 4,
          vy - 4
        );
      }
    };

    img.onerror = () => {
      setLoadingSlice(false);
      setImgError(true);
    };
  }, [scan, currentSlice, activePlane, windowPreset, selectedCandidate]);

  // Mouse wheel for slice scrolling
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

  const resetViewport = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col h-full bg-[#070e1b] border border-[#16243b] rounded-2xl overflow-hidden relative shadow-2xl">
      {/* Top Viewport Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#091426] border-b border-[#16243b] text-xs">
        <div className="flex items-center gap-3 font-mono text-slate-300">
          <span className="font-bold text-[#38d9ff]">{scan?.scan_id || "No Scan Selected"}</span>
          <span className="text-slate-500">|</span>
          <span>
            {scan ? `${scan.width}×${scan.height}×${scan.num_slices}` : "—"}
          </span>
          <span className="text-slate-500">|</span>
          <span>
            Spacing:{" "}
            {scan
              ? `${scan.spacing_xyz[0].toFixed(2)}, ${scan.spacing_xyz[1].toFixed(2)}, ${scan.spacing_xyz[2].toFixed(2)} mm`
              : "—"}
          </span>
        </div>

        {/* Multiplanar plane tabs */}
        <div className="flex items-center gap-1 bg-[#050b14] border border-[#16243b] p-0.5 rounded-lg">
          {(["axial", "coronal", "sagittal"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setActivePlane(p)}
              className={`px-2.5 py-1 rounded text-[11px] uppercase font-mono transition-all ${
                activePlane === p
                  ? "bg-[#182844] text-[#38d9ff] font-semibold border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Window Presets */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono text-[11px]">Preset:</span>
          <select
            value={windowPreset}
            onChange={(e) => onWindowPresetChange(e.target.value)}
            className="bg-[#050b14] border border-[#1a2d48] text-slate-200 text-xs rounded px-2 py-1 font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="lung">Lung (-600 / 1500 HU)</option>
            <option value="mediastinum">Mediastinum (40 / 400 HU)</option>
            <option value="bone">Bone (300 / 1500 HU)</option>
            <option value="nodule">Nodule Target (-500 / 1000 HU)</option>
          </select>
        </div>
      </div>

      {/* Main Medical Viewport Canvas */}
      <div
        className="flex-1 relative flex items-center justify-center bg-black overflow-hidden cursor-crosshair select-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {scan ? (
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: isDragging ? "none" : "transform 0.1s ease-out",
            }}
          >
            <canvas ref={canvasRef} className="max-w-none shadow-2xl" />
          </div>
        ) : (
          <div className="text-center p-8 text-slate-500 font-mono">
            <Layers className="w-12 h-12 mx-auto mb-3 text-slate-600 opacity-50" />
            <p className="text-sm">No CT study currently loaded</p>
            <p className="text-xs text-slate-600 mt-1">Select a scan from the sidebar to visualize slices</p>
          </div>
        )}

        {/* Loading Spinner / Error Overlay */}
        {loadingSlice && (
          <div className="absolute top-4 right-4 bg-[#091426]/90 border border-cyan-500/30 px-3 py-1.5 rounded-lg text-xs font-mono text-cyan-300 flex items-center gap-2 shadow-lg backdrop-blur">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Streaming Slice {currentSlice + 1}...</span>
          </div>
        )}

        {imgError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 font-mono text-rose-400 text-xs">
            Failed to render CT slice image stream. Verify backend connection.
          </div>
        )}

        {/* Viewport Floating HUD Coordinates */}
        <div className="absolute bottom-4 left-4 font-mono text-[11px] text-slate-400 bg-[#050b14]/80 backdrop-blur border border-[#16243b] px-3 py-2 rounded-lg pointer-events-none space-y-0.5">
          <div>
            SLICE: <span className="text-white font-bold">{currentSlice + 1}</span> / {totalSlices}
          </div>
          <div>
            PLANE: <span className="text-[#38d9ff] uppercase">{activePlane}</span>
          </div>
          <div>
            WL/WW: <span className="text-white">{currentWindow.wc} / {currentWindow.ww} HU</span>
          </div>
          <div>
            ZOOM: <span className="text-white">{zoom.toFixed(1)}x</span>
          </div>
        </div>

        {/* Viewport Quick Action Controls */}
        <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-[#050b14]/90 backdrop-blur border border-[#16243b] p-1.5 rounded-lg">
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.25, 4.0))}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetViewport}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Reset Pan & Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
