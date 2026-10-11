"use client";

import React, { useRef, useEffect } from "react";
import { ScanInfo, Candidate } from "@/types/imaging";
import { getSliceWindowedUrl } from "@/lib/api";

interface MultiPlanarProps {
  scan: ScanInfo | null;
  candidate: Candidate | null;
  currentSlice: number;
  activePlane: "axial" | "coronal" | "sagittal";
  onSelectPlane: (plane: "axial" | "coronal" | "sagittal") => void;
}

export function MultiPlanarView({
  scan,
  candidate,
  currentSlice,
  activePlane,
  onSelectPlane,
}: MultiPlanarProps) {
  const axialRef = useRef<HTMLCanvasElement | null>(null);
  const coronalRef = useRef<HTMLCanvasElement | null>(null);
  const sagittalRef = useRef<HTMLCanvasElement | null>(null);

  // Synchronized rendering of Axial, Coronal, and Sagittal crosshairs
  useEffect(() => {
    if (!scan) return;

    const sliceZ = candidate ? candidate.slice_index : currentSlice;
    const sliceY = candidate ? candidate.voxel_y : Math.floor(scan.height / 2);
    const sliceX = candidate ? candidate.voxel_x : Math.floor(scan.width / 2);

    // 1. Axial (XY)
    const imgAx = new Image();
    imgAx.src = getSliceWindowedUrl(scan.scan_id, sliceZ, "axial");
    imgAx.onload = () => {
      const c = axialRef.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      c.width = imgAx.width;
      c.height = imgAx.height;
      ctx.drawImage(imgAx, 0, 0);

      // Render red/orange bounding box at nodule
      if (candidate) {
        ctx.strokeStyle = "#ff9b57";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(candidate.voxel_x - 16, candidate.voxel_y - 16, 32, 32);
      }
    };

    // 2. Coronal (XZ)
    const imgCor = new Image();
    imgCor.src = getSliceWindowedUrl(scan.scan_id, sliceY, "coronal");
    imgCor.onload = () => {
      const c = coronalRef.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      c.width = imgCor.width;
      c.height = imgCor.height;
      ctx.drawImage(imgCor, 0, 0);

      if (candidate) {
        // Vertical axis in rescaled coronal image is cranial-up:
        const scaleY = imgCor.height / scan.num_slices;
        const boxX = candidate.voxel_x;
        const boxY = imgCor.height - (candidate.slice_index * scaleY);
        ctx.strokeStyle = "#ff9b57";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(boxX - 16, boxY - 16, 32, 32);
      }
    };

    // 3. Sagittal (YZ)
    const imgSag = new Image();
    imgSag.src = getSliceWindowedUrl(scan.scan_id, sliceX, "sagittal");
    imgSag.onload = () => {
      const c = sagittalRef.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      c.width = imgSag.width;
      c.height = imgSag.height;
      ctx.drawImage(imgSag, 0, 0);

      if (candidate) {
        const scaleY = imgSag.height / scan.num_slices;
        const boxX = candidate.voxel_y;
        const boxY = imgSag.height - (candidate.slice_index * scaleY);
        ctx.strokeStyle = "#ff9b57";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(boxX - 16, boxY - 16, 32, 32);
      }
    };
  }, [scan, candidate, currentSlice]);

  return (
    <div className="w-full bg-[#06111f] border border-[#15273c] rounded-2xl p-4 flex flex-col select-none shadow-xl">
      <div className="flex items-center gap-1.5 mb-3">
        <h3 className="font-bold text-white text-xs tracking-wide">Multi-Planar View</h3>
        <span className="text-[11px] text-[#39c7ff] font-medium">(Synchronized)</span>
      </div>

      {/* 3 Synchronized Subpanels: Axial, Coronal, Sagittal */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Axial (XY) */}
        <div
          onClick={() => onSelectPlane("axial")}
          className={`rounded-xl border overflow-hidden bg-black flex flex-col cursor-pointer transition-all ${
            activePlane === "axial" ? "border-[#39c7ff] shadow-sm" : "border-[#15273c]"
          }`}
        >
          <div className="px-2 py-1 bg-[#091526] text-[10px] font-mono text-[#8fa6bf] border-b border-[#15273c]">
            Axial (XY)
          </div>
          <div className="w-full h-24 flex items-center justify-center overflow-hidden">
            <canvas ref={axialRef} className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Coronal (XZ) */}
        <div
          onClick={() => onSelectPlane("coronal")}
          className={`rounded-xl border overflow-hidden bg-black flex flex-col cursor-pointer transition-all ${
            activePlane === "coronal" ? "border-[#39c7ff] shadow-sm" : "border-[#15273c]"
          }`}
        >
          <div className="px-2 py-1 bg-[#091526] text-[10px] font-mono text-[#8fa6bf] border-b border-[#15273c]">
            Coronal (XZ)
          </div>
          <div className="w-full h-24 flex items-center justify-center overflow-hidden">
            <canvas ref={coronalRef} className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Sagittal (YZ) */}
        <div
          onClick={() => onSelectPlane("sagittal")}
          className={`rounded-xl border overflow-hidden bg-black flex flex-col cursor-pointer transition-all ${
            activePlane === "sagittal" ? "border-[#39c7ff] shadow-sm" : "border-[#15273c]"
          }`}
        >
          <div className="px-2 py-1 bg-[#091526] text-[10px] font-mono text-[#8fa6bf] border-b border-[#15273c]">
            Sagittal (YZ)
          </div>
          <div className="w-full h-24 flex items-center justify-center overflow-hidden">
            <canvas ref={sagittalRef} className="w-full h-full object-contain" />
          </div>
        </div>
      </div>
    </div>
  );
}
