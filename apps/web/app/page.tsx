"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { HeroLeft } from "@/components/layout/HeroLeft";
import { AxialViewer } from "@/components/viewer/AxialViewer";
import { NoduleZoom } from "@/components/candidates/NoduleZoom";
import { MultiPlanarView } from "@/components/viewer/MultiPlanarView";
import { SliceStrip } from "@/components/viewer/SliceStrip";
import { Lung3DReconstruction } from "@/components/viewer/Lung3DReconstruction";
import { ModelPerformanceCard } from "@/components/analytics/ModelPerformanceCard";
import { BottomPipelineStrip } from "@/components/layout/BottomPipelineStrip";
import { AnalyticsPanel } from "@/components/analytics/AnalyticsPanel";
import { DatasetLab } from "@/components/analytics/DatasetLab";
import {
  fetchHealth,
  fetchScans,
  fetchScanDetails,
  fetchScanCandidates,
  fetchModelInfo,
  fetchModelLatency,
  fetchEvaluationSummary,
} from "@/lib/api";
import {
  ScanInfo,
  Candidate,
  ModelInfo,
  LatencyBenchmark,
  EvaluationSummary,
} from "@/types/imaging";

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("explore");
  const [backendOnline, setBackendOnline] = useState<boolean>(true);
  const [modelReady, setModelReady] = useState<boolean>(true);
  const [scans, setScans] = useState<string[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<string>("");
  const [scanInfo, setScanInfo] = useState<ScanInfo | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [currentSlice, setCurrentSlice] = useState<number>(181); // 182 / 512 default matching reference
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [activePlane, setActivePlane] = useState<"axial" | "coronal" | "sagittal">("axial");
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [latency, setLatency] = useState<LatencyBenchmark | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationSummary | null>(null);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);

  // Initialize and poll status
  const initializeWorkspace = async () => {
    const [health, scanList, mInfo, lat, evalSum] = await Promise.all([
      fetchHealth(),
      fetchScans(),
      fetchModelInfo(),
      fetchModelLatency(5),
      fetchEvaluationSummary(),
    ]);

    if (health) {
      setBackendOnline(true);
      setModelReady(health.model_status === "ready");
    }
    if (scanList.length > 0) {
      setScans(scanList);
      if (!selectedScanId) {
        setSelectedScanId(scanList[0]);
      }
    }
    setModelInfo(mInfo);
    setLatency(lat);
    setEvaluation(evalSum);
  };

  useEffect(() => {
    initializeWorkspace();
  }, []);

  // Fetch scan details & candidates when selected scan changes
  useEffect(() => {
    if (!selectedScanId) return;

    fetchScanDetails(selectedScanId).then((info) => {
      setScanInfo(info);
      if (info) {
        setCurrentSlice(Math.min(181, info.num_slices - 1));
      }
    });

    fetchScanCandidates(selectedScanId).then((cands) => {
      setCandidates(cands);
      if (cands.length > 0) {
        setSelectedCandidate(cands[0]);
        setCurrentSlice(cands[0].slice_index);
      }
    });
  }, [selectedScanId]);

  return (
    <div className="min-h-screen bg-[#020712] text-[#eaf4ff] flex flex-col font-sans select-none antialiased">
      {/* Top Application Header matching reference */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backendOnline={backendOnline}
        modelReady={modelReady}
        onUploadClick={() => setShowUploadModal(true)}
      />

      {/* Main Explore Workspace matching reference desktop screenshot */}
      {activeTab === "explore" && (
        <main className="flex-1 max-w-[1536px] w-full mx-auto px-6 py-4 flex flex-col gap-4">
          {/* ROW 1: Hero Left, Large Axial CT Viewer, Right Zoom & Multiplanar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch min-h-[460px]">
            {/* 1. Left: Hero Content & Summary Stats (3.5 cols) */}
            <div className="lg:col-span-4 xl:col-span-3 h-full">
              <HeroLeft
                onTryDemo={() => {
                  if (scans.length > 0) setSelectedScanId(scans[0]);
                }}
                onLearnMore={() => setActiveTab("about")}
              />
            </div>

            {/* 2. Center: Large Axial CT Viewer (5.5 cols) */}
            <div className="lg:col-span-5 xl:col-span-6 h-full min-h-[440px]">
              <AxialViewer
                scan={scanInfo}
                currentSlice={currentSlice}
                totalSlices={scanInfo?.num_slices || 512}
                onSliceChange={setCurrentSlice}
                selectedCandidate={selectedCandidate}
                onSelectCandidate={setSelectedCandidate}
                candidates={candidates}
                windowWidth={1500}
                windowLevel={-600}
              />
            </div>

            {/* 3. Right: Nodule Zoom & Multi-Planar View (3 cols) */}
            <div className="lg:col-span-3 flex flex-col gap-3 justify-between h-full">
              <NoduleZoom
                scan={scanInfo}
                candidate={selectedCandidate}
                onViewIn3D={() => setActiveTab("3d")}
              />

              <MultiPlanarView
                scan={scanInfo}
                candidate={selectedCandidate}
                currentSlice={currentSlice}
                activePlane={activePlane}
                onSelectPlane={setActivePlane}
              />
            </div>
          </div>

          {/* ROW 2: Slice Navigation, 3D Lung Reconstruction, Model Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch min-h-[240px]">
            {/* Slice Navigation Strip (3.5 cols) */}
            <div className="lg:col-span-4 xl:col-span-3 h-full">
              <SliceStrip
                scan={scanInfo}
                currentSlice={currentSlice}
                totalSlices={scanInfo?.num_slices || 512}
                onSliceChange={setCurrentSlice}
              />
            </div>

            {/* 3D Lung Reconstruction (5.5 cols) */}
            <div className="lg:col-span-5 xl:col-span-6 h-full min-h-[230px]">
              <Lung3DReconstruction
                candidates={candidates}
                selectedCandidate={selectedCandidate}
              />
            </div>

            {/* Model Performance LUNA16 Card (3 cols) */}
            <div className="lg:col-span-3 h-full min-h-[230px]">
              <ModelPerformanceCard evaluation={evaluation} />
            </div>
          </div>

          {/* ROW 3: Connected Pipeline Stages & GPU Latency Strip */}
          <div className="w-full">
            <BottomPipelineStrip latency={latency} />
          </div>
        </main>
      )}

      {/* Secondary Tabs */}
      {activeTab === "3d" && (
        <main className="flex-1 max-w-[1536px] w-full mx-auto px-6 py-6 h-[780px]">
          <Lung3DReconstruction
            candidates={candidates}
            selectedCandidate={selectedCandidate}
          />
        </main>
      )}

      {activeTab === "analytics" && (
        <main className="flex-1 max-w-[1536px] w-full mx-auto px-6 py-6">
          <AnalyticsPanel />
        </main>
      )}

      {activeTab === "about" && (
        <main className="flex-1 max-w-4xl mx-auto py-12 px-6">
          <div className="bg-[#06111f] border border-[#15273c] rounded-2xl p-8 space-y-5">
            <h2 className="text-xl font-bold text-white">LungAI System Architecture</h2>
            <p className="text-xs text-[#8fa6bf] leading-relaxed">
              LungAI is a research-grade pulmonary nodule analysis platform reproducing the LUNA16 benchmark.
              It features a 3D CNN candidate classifier, verified coordinate transformations, real HU windowing,
              and FROC/CPM evaluation.
            </p>
            <div className="bg-amber-950/20 border border-amber-900/40 p-4 rounded-xl text-amber-300 text-xs">
              <strong>Clinical Research Disclaimer:</strong> LungAI is designed exclusively for engineering and research
              evaluation and is not certified for clinical diagnostic use.
            </div>
          </div>
        </main>
      )}

      {/* Upload CT Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#06111f] border border-[#15273c] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="font-bold text-white text-sm mb-2">Upload CT Study</h3>
            <p className="text-xs text-[#8fa6bf] mb-4">
              Supported formats: MetaImage (.mhd/.raw), DICOM (.dcm), or NIfTI (.nii).
            </p>
            <div className="border-2 border-dashed border-[#1b3a5c] rounded-xl p-8 text-center text-xs text-[#8fa6bf] mb-4">
              Drag & drop thoracic scan files here or click to browse
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 rounded-xl bg-[#091526] hover:bg-[#10243d] text-xs font-mono"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 rounded-xl bg-[#2e7be5] hover:bg-[#256cd1] text-white text-xs font-semibold"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
