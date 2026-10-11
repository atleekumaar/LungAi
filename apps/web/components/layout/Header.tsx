"use client";

import React from "react";
import { Upload, Database } from "lucide-react";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  backendOnline: boolean;
  modelReady: boolean;
  datasetMode?: string;
  onUploadClick: () => void;
}

export function Header({
  activeTab,
  setActiveTab,
  backendOnline,
  modelReady,
  datasetMode = "synthetic_test_mode",
  onUploadClick,
}: HeaderProps) {
  const navTabs = [
    { id: "explore", label: "Explore" },
    { id: "3d", label: "3D View" },
    { id: "analytics", label: "Analytics" },
    { id: "about", label: "About" },
  ];

  const isRealData = datasetMode === "real_luna16_mode";
  const badgeTitle = isRealData ? "LUNA16 Dataset" : "Test Fixtures Only";
  const badgeSubtitle = isRealData ? "Real CT Scans Loaded" : "Synthetic Test Mode";
  const badgeColor = isRealData ? "text-[#35e0b0]" : "text-[#ff9b57]";

  return (
    <header className="w-full h-[68px] border-b border-[#15273c] bg-[#020712] px-6 flex items-center justify-between select-none">
      {/* LEFT: Logo & Brand Title */}
      <div className="flex items-center gap-3">
        {/* Anatomical Lungs Blue Icon */}
        <div className="w-9 h-9 flex items-center justify-center text-[#39c7ff]">
          <svg className="w-8 h-8 fill-current text-[#39c7ff]" viewBox="0 0 24 24">
            <path d="M12 3v9m0 0l-3 4m3-4l3 4M7 4.5C4.5 6 3 9 3 13c0 4.5 2.5 8 5 8 2 0 3-1.5 3-4V8c0-2-1.5-3.5-4-3.5zm10 0c2.5 1.5 4 4.5 4 8.5 0 4.5-2.5 8-5 8-2 0-3-1.5-3-4V8c0-2 1.5-3.5 4-3.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </div>
        <div>
          <div className="font-bold text-white text-base tracking-wide flex items-center gap-1.5 leading-none">
            LungAI
          </div>
          <div className="text-[11px] text-[#8fa6bf] tracking-normal mt-0.5 font-normal">
            Nodule Detection Prototype
          </div>
        </div>
      </div>

      {/* CENTER: Navigation Tabs matching reference */}
      <nav className="flex items-center gap-3">
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-medium tracking-wide transition-all cursor-pointer ${
                isActive
                  ? "bg-[#0b1d33] text-[#39c7ff] border border-[#1a385c] shadow-sm font-semibold"
                  : "text-[#8fa6bf] hover:text-[#eaf4ff] hover:bg-[#06111f]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* RIGHT: Badges & Upload Button */}
      <div className="flex items-center gap-3">
        {/* Honest Dataset Mode Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#06111f] border border-[#15273c] text-left">
          <Database className={`w-3.5 h-3.5 ${badgeColor}`} />
          <div>
            <div className={`text-[10px] font-bold ${isRealData ? "text-[#eaf4ff]" : "text-[#ffb380]"} leading-none`}>
              {badgeTitle}
            </div>
            <div className="text-[9px] text-[#8fa6bf] leading-none mt-0.5">{badgeSubtitle}</div>
          </div>
        </div>

        {/* Model Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#06111f] border border-[#15273c] text-left">
          <span
            className={`w-2 h-2 rounded-full ${
              modelReady ? "bg-[#35e0b0] animate-pulse" : "bg-amber-400"
            }`}
          />
          <div>
            <div className="text-[10px] font-bold text-[#eaf4ff] leading-none">
              {modelReady ? "Model Online" : "Model Loading"}
            </div>
            <div className="text-[9px] text-[#8fa6bf] leading-none mt-0.5">3D CNN Classifier</div>
          </div>
        </div>

        {/* Bright Blue/Cyan Upload Button */}
        <button
          onClick={onUploadClick}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2e7be5] hover:bg-[#256cd1] text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload CT Scan</span>
        </button>
      </div>
    </header>
  );
}
