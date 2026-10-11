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
  uploadScanFile,
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
  const [currentSlice, setCurrentSlice] = useState<number>(63);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [activePlane, setActivePlane] = useState<"axial" | "coronal" | "sagittal">("axial");
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [latency, setLatency] = useState<LatencyBenchmark | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationSummary | null>(null);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
        <main className="flex-1 max-w-5xl w-full mx-auto py-8 px-6 space-y-6">
          <div className="bg-[#06111f] border border-[#15273c] rounded-2xl p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#15273c] pb-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">LungAI System Architecture & Research Scope</h2>
                <p className="text-xs text-[#8fa6bf] mt-1 font-mono">
                  3D CONVOLUTIONAL CANDIDATE CLASSIFICATION • HU PREPROCESSING • LUNA16 FROC BENCHMARK
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#0b1d33] border border-[#1a385c] text-[#39c7ff] text-xs font-mono font-semibold">
                Prototype v1.0.0
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#030914] border border-[#15273c] space-y-2">
                <h4 className="text-white text-xs font-bold uppercase tracking-wider text-[#39c7ff]">1. Scope Distinction</h4>
                <p className="text-[11px] text-[#8fa6bf] leading-relaxed">
                  LungAI operates as a <strong>3D candidate classifier</strong> that scores supplied candidate coordinates. It is not an autonomous whole-volume detector or clinical diagnostic device.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#030914] border border-[#15273c] space-y-2">
                <h4 className="text-white text-xs font-bold uppercase tracking-wider text-[#39c7ff]">2. Coordinate Integrity</h4>
                <p className="text-[11px] text-[#8fa6bf] leading-relaxed">
                  Converts millimeter physical space into continuous voxel indices using full origin, spacing, and direction matrices via SimpleITK with sub-voxel accuracy.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#030914] border border-[#15273c] space-y-2">
                <h4 className="text-white text-xs font-bold uppercase tracking-wider text-[#39c7ff]">3. Evaluation Protocol</h4>
                <p className="text-[11px] text-[#8fa6bf] leading-relaxed">
                  Evaluated strictly on official LUNA16 operating points (0.125 to 8 FPs/scan) with patient/scan-level isolation to prevent train/val leakage.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#030914] border border-[#15273c] space-y-3">
              <h4 className="text-white text-xs font-bold uppercase tracking-wider">LUNA16 Dataset Setup & Verification</h4>
              <p className="text-xs text-[#8fa6bf] leading-relaxed">
                To test with full LIDC-IDRI data, download the 10 subsets from the official challenge portal and place `.mhd` / `.raw` files into <code className="text-[#39c7ff] font-mono">data/raw/</code>. The application automatically indexes scanned volumes, parses <code className="text-[#39c7ff] font-mono">annotations.csv</code>, and computes slice-level coordinates.
              </p>
              <div className="flex gap-2">
                <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-[#091526] text-[#8fa6bf] border border-[#15273c]">
                  Supported Formats: MetaImage (.mhd/.raw), NIfTI (.nii/.nii.gz), DICOM (.dcm)
                </span>
              </div>
            </div>

            <div className="bg-amber-950/20 border border-amber-900/40 p-4 rounded-xl text-amber-300 text-xs flex items-start gap-3">
              <span className="text-amber-400 font-bold text-sm">⚠</span>
              <div>
                <strong>Clinical Research Disclaimer:</strong> LungAI is designed exclusively for engineering verification and medical imaging machine learning research. It is not FDA/CE cleared and must not be used for diagnostic or clinical decision-making.
              </div>
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
              Supported formats: MetaImage (.mhd/.raw), NIfTI (.nii/.nii.gz), or DICOM (.dcm).
            </p>
            
            <label className="border-2 border-dashed border-[#1b3a5c] hover:border-[#39c7ff] rounded-xl p-8 text-center text-xs text-[#8fa6bf] hover:text-white mb-4 block cursor-pointer transition-all bg-[#030914]/60">
              <input
                type="file"
                className="hidden"
                accept=".mhd,.raw,.nii,.gz,.dcm"
                disabled={uploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  setUploadError(null);
                  const res = await uploadScanFile(file);
                  setUploading(false);
                  if (res && res.status === "success") {
                    setShowUploadModal(false);
                    const freshScans = await fetchScans();
                    setScans(freshScans);
                    setSelectedScanId(res.scan_id);
                  } else {
                    setUploadError("Upload failed. Verify scan format (.mhd, .nii, .dcm).");
                  }
                }}
              />
              <div className="space-y-2">
                <div className="text-[#39c7ff] font-semibold">
                  {uploading ? "Ingesting and indexing CT volume..." : "Click to select or drag & drop scan file"}
                </div>
                <div className="text-[10px] text-[#607996]">
                  File will be parsed with SimpleITK and registered in the workspace
                </div>
              </div>
            </label>

            {uploadError && (
              <div className="text-red-400 text-[11px] mb-3 bg-red-950/40 p-2 rounded-lg border border-red-900/50">
                {uploadError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                disabled={uploading}
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadError(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#091526] hover:bg-[#10243d] text-xs font-mono text-[#8fa6bf]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
