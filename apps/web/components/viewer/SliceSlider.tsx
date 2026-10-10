"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";

interface SliceSliderProps {
  currentSlice: number;
  totalSlices: number;
  onSliceChange: (slice: number) => void;
}

export function SliceSlider({ currentSlice, totalSlices, onSliceChange }: SliceSliderProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        onSliceChange((currentSlice + 1) % Math.max(1, totalSlices));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentSlice, totalSlices, onSliceChange]);

  return (
    <div className="bg-[#091426] border border-[#16243b] px-4 py-3 rounded-xl flex items-center gap-4">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onSliceChange(Math.max(0, currentSlice - 1))}
          disabled={currentSlice <= 0}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 rounded"
          title="Previous Slice (Arrow Up/Left)"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 rounded"
          title={isPlaying ? "Pause Cine" : "Play Cine Loop"}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <button
          onClick={() => onSliceChange(Math.min(totalSlices - 1, currentSlice + 1))}
          disabled={currentSlice >= totalSlices - 1}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 rounded"
          title="Next Slice (Arrow Down/Right)"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={Math.max(0, totalSlices - 1)}
          value={currentSlice}
          onChange={(e) => onSliceChange(parseInt(e.target.value, 10))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#38d9ff]"
        />
        <div className="font-mono text-xs text-slate-300 min-w-[70px] text-right">
          <span className="text-[#38d9ff] font-bold">{currentSlice + 1}</span> / {totalSlices}
        </div>
      </div>
    </div>
  );
}
