"use client";

import React from "react";
import { Activity, Database, Layers, BarChart2, Cpu, Info, ShieldAlert } from "lucide-react";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  backendOnline: boolean;
  scanCount: number;
}

export function Header({ activeTab, setActiveTab, backendOnline, scanCount }: HeaderProps) {
  const navItems = [
    { id: "explore", label: "Explore", icon: Activity },
    { id: "workstation", label: "Workstation", icon: Layers },
    { id: "analytics", label: "Analytics", icon: BarChart2 },
    { id: "dataset", label: "Dataset Lab", icon: Database },
    { id: "model", label: "Model Lab", icon: Cpu },
    { id: "about", label: "About", icon: Info },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[#16243b] bg-[#050b14]/90 backdrop-blur-md px-6 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#38d9ff] flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-lg">LungAI</span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-800/60">
                PROTOTYPE v0.1
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono tracking-tight">PULMONARY CT RESEARCH WORKSTATION</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-[#091220] border border-[#16243b] p-1 rounded-xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-[#182844] text-[#38d9ff] shadow-sm border border-cyan-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#38d9ff]" : "text-slate-400"}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Telemetry Status Bar */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#091220] border border-[#16243b] px-3 py-1.5 rounded-lg text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                backendOnline ? "bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" : "bg-red-500"
              }`}
            />
            <span className="text-slate-300">
              {backendOnline ? `API Online (${scanCount} Scans)` : "API Offline"}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1 text-[11px] text-amber-400/90 bg-amber-950/30 border border-amber-900/40 px-2.5 py-1 rounded-md">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Research Prototype • Non-diagnostic</span>
          </div>
        </div>
      </div>
    </header>
  );
}
