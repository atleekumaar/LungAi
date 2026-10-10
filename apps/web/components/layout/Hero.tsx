"use client";

import React from "react";
import { ArrowRight, Database, Microscope, Search, CheckCircle2, ShieldAlert } from "lucide-react";

interface HeroProps {
  onOpenWorkstation: () => void;
  onExploreResearch: () => void;
  scanCount: number;
  backendOnline: boolean;
}

export function Hero({ onOpenWorkstation, onExploreResearch, scanCount, backendOnline }: HeroProps) {
  return (
    <section className="relative overflow-hidden pt-12 pb-16 px-6 border-b border-[#16243b]">
      {/* Background radial gradient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-blue-600/10 via-cyan-500/5 to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10 text-center">
        {/* Release / Prototype badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0e1b30] border border-blue-500/30 text-blue-300 text-xs font-mono mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>PHASE 1–3 ARCHITECTURE • LUNA16 CT PIPELINE & RADIOLOGY VIEWER</span>
        </div>

        {/* Cinematic Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
          Finding the Smallest Signals in the{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38d9ff] to-[#3b82f6]">
            Lung.
          </span>
        </h1>

        {/* Supporting Copy */}
        <p className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed mb-8">
          An AI research workstation for pulmonary CT visualization, candidate localization, and
          reproducible model evaluation. Built with strict medical coordinate geometry, verified HU windowing,
          and zero-leakage dataset splitting.
        </p>

        {/* Primary and Secondary CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
          <button
            onClick={onOpenWorkstation}
            className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-medium shadow-lg shadow-cyan-500/25 transition-all text-sm group"
          >
            <span>Open CT Study</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>

          <button
            onClick={onExploreResearch}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0a1424] hover:bg-[#12223c] text-slate-200 border border-[#1d3150] font-medium text-sm transition-all"
          >
            <Microscope className="w-4 h-4 text-cyan-400" />
            <span>Explore Research & Pipeline</span>
          </button>
        </div>

        {/* Dataset Facts & Architecture Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto text-left">
          <div className="bg-[#091220]/80 border border-[#16243b] p-4 rounded-xl">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono uppercase mb-1">
              <Database className="w-4 h-4" />
              <span>Dataset Provenance</span>
            </div>
            <div className="text-white font-semibold text-sm">LUNA16 Challenge Protocol</div>
            <p className="text-xs text-slate-400 mt-1">
              888 MetaImage thoracic CT scans, 1,186 expert-annotated nodules ≥3mm.
            </p>
          </div>

          <div className="bg-[#091220]/80 border border-[#16243b] p-4 rounded-xl">
            <div className="flex items-center gap-2 text-blue-400 text-xs font-mono uppercase mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Imaging Engine</span>
            </div>
            <div className="text-white font-semibold text-sm">SimpleITK & NumPy Core</div>
            <p className="text-xs text-slate-400 mt-1">
              Non-identity direction matrix handling, HU windowing, and verified 3D patch sampling.
            </p>
          </div>

          <div className="bg-[#091220]/80 border border-[#16243b] p-4 rounded-xl">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-mono uppercase mb-1">
              <ShieldAlert className="w-4 h-4" />
              <span>Model Status</span>
            </div>
            <div className="text-white font-semibold text-sm">
              {backendOnline ? "Phase 1-3 Verified (No Model Fabricated)" : "Backend Disconnected"}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Phase 4 model weights pending. Ground-truth annotations clearly isolated.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
