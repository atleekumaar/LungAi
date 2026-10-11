"use client";

import React from "react";
import { Edit2 } from "lucide-react";
import { ScanInfo } from "@/types/imaging";
import { getSliceWindowedUrl } from "@/lib/api";

interface SliceStripProps {
  scan: ScanInfo | null;
  currentSlice: number;
  totalSlices: number;
  onSliceChange: (slice: number) => void;
}

export function SliceStrip({
  scan,
  currentSlice,
  totalSlices,
  onSliceChange,
}: SliceStripProps) {
  // Generate a window of 9 neighboring thumbnail slices centered on currentSlice
  const thumbnailCount = 9;
  const half = Math.floor(thumbnailCount / 2);
  let startIdx = Math.max(0, currentSlice - half);
  let endIdx = Math.min(totalSlices - 1, startIdx + thumbnailCount - 1);

  if (endIdx - startIdx < thumbnailCount - 1) {
    startIdx = Math.max(0, endIdx - thumbnailCount + 1);
  }

  const thumbIndices = [];
  for (let i = startIdx; i <= endIdx; i++) {
    thumbIndices.push(i);
  }

  return (
    <div className="w-full h-full bg-[#06111f] border border-[#15273c] rounded-2xl p-4 flex flex-col justify-between select-none shadow-xl">
      {/* Header with Title and Edit / Config icon */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-white text-xs tracking-wide">Slice Navigation</h3>
        <Edit2 className="w-3.5 h-3.5 text-[#8fa6bf] hover:text-white cursor-pointer" />
      </div>

      {/* Slice Counter */}
      <div className="text-xl font-extrabold text-white font-mono mb-2">
        {currentSlice + 1} <span className="text-xs text-[#8fa6bf] font-normal">/ {totalSlices}</span>
      </div>

      {/* Blue Slider Track with Glowing Handle */}
      <div className="relative w-full mb-3">
        <input
          type="range"
          min={0}
          max={Math.max(0, totalSlices - 1)}
          value={currentSlice}
          onChange={(e) => onSliceChange(parseInt(e.target.value, 10))}
          className="w-full h-1 bg-[#10243d] rounded-lg appearance-none cursor-pointer accent-[#39c7ff]"
        />
      </div>

      {/* Row of Neighboring CT Thumbnails matching reference */}
      <div className="grid grid-cols-9 gap-1.5 items-end">
        {thumbIndices.map((idx) => {
          const isSelected = idx === currentSlice;
          return (
            <div
              key={idx}
              onClick={() => onSliceChange(idx)}
              className="flex flex-col items-center cursor-pointer group"
            >
              <div
                className={`w-full aspect-square rounded-lg overflow-hidden bg-black transition-all ${
                  isSelected
                    ? "ring-2 ring-[#39c7ff] scale-105 shadow-md shadow-cyan-500/30"
                    : "border border-[#15273c] opacity-60 hover:opacity-100"
                }`}
              >
                {scan ? (
                  <img
                    src={getSliceWindowedUrl(scan.scan_id, idx, "axial", -600, 1500)}
                    alt={`Slice ${idx}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-[#0a182b]" />
                )}
              </div>
              <span
                className={`text-[9px] font-mono mt-1 ${
                  isSelected ? "text-[#39c7ff] font-bold" : "text-[#8fa6bf] group-hover:text-white"
                }`}
              >
                {idx + 1}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
