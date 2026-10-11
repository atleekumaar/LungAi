"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Hero } from "@/components/layout/Hero";
import { CTViewer } from "@/components/viewer/CTViewer";
import { SliceSlider } from "@/components/viewer/SliceSlider";
import { CandidatePanel } from "@/components/candidates/CandidatePanel";
import { NoduleMagnifier } from "@/components/candidates/NoduleMagnifier";
import { WorkflowStatus } from "@/components/analytics/WorkflowStatus";
import { AnalyticsPanel } from "@/components/analytics/AnalyticsPanel";
import { DatasetLab } from "@/components/analytics/DatasetLab";
import {
  fetchHealth,
  fetchScans,
  fetchScanDetails,
  fetchScanCandidates,
  triggerInference,
  fetchJobStatus,
  fetchModelInfo
} from "@/lib/api";
import { ScanInfo, Candidate, ModelInfo } from "@/types/imaging";
import { Layers, Box, Cpu, AlertCircle, Info, RefreshCw } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("explore");
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [modelReady, setModelReady] = useState<boolean>(false);
  const [scans, setScans] = useState<string[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<string>("");
  const [scanInfo, setScanInfo] = useState<ScanInfo | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [currentSlice, setCurrentSlice] = useState<number>(0);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [windowPreset, setWindowPreset] = useState<string>("lung");
  const [activePlane, setActivePlane] = useState<"axial" | "coronal" | "sagittal">("axial");
  const [showCandidates, setShowCandidates] = useState<boolean>(true);
  const [scoreThreshold, setScoreThreshold] = useState<number>(0.0);
  const [isInferring, setIsInferring] = useState<boolean>(false);
  const [inferProgress, setInferProgress] = useState<number>(0.0);

  // Poll backend health and retrieve scan list on mount
  const checkStatus = async () => {
    const health = await fetchHealth();
    if (health) {
      setBackendOnline(true);
      setModelReady(health.model_status === "ready");
      const scanList = await fetchScans();
      setScans(scanList);
      if (scanList.length > 0 && !selectedScanId) {
        setSelectedScanId(scanList[0]);
      }
    } else {
      setBackendOnline(false);
      setModelReady(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch scan details and candidates when selectedScanId changes
  useEffect(() => {
    if (!selectedScanId) return;
    fetchScanDetails(selectedScanId).then((info) => {
      setScanInfo(info);
      if (info) {
        setCurrentSlice(Math.floor(info.num_slices / 2));
      }
    });

    fetchScanCandidates(selectedScanId).then((cands) => {
      setCandidates(cands);
      if (cands.length > 0) {
        setSelectedCandidate(cands[0]);
        setCurrentSlice(cands[0].slice_index);
      } else {
        setSelectedCandidate(null);
      }
    });
  }, [selectedScanId]);

  // When candidate is clicked, jump viewport slice to candidate slice
  const handleSelectCandidate = (cand: Candidate) => {
    setSelectedCandidate(cand);
    if (activePlane === "axial") {
      setCurrentSlice(cand.slice_index);
    } else if (activePlane === "coronal") {
      setCurrentSlice(cand.voxel_y);
    } else if (activePlane === "sagittal") {
      setCurrentSlice(cand.voxel_x);
    }
  };

  // Run async candidate inference job
  const handleRunInference = async () => {
    if (!selectedScanId || isInferring) return;
    setIsInferring(true);
    setInferProgress(0.0);

    const job = await triggerInference(selectedScanId);
    if (!job) {
      setIsInferring(false);
      return;
    }

    const pollInterval = setInterval(async () => {
      const status = await fetchJobStatus(job.job_id);
      if (status) {
        setInferProgress(status.progress);
        if (status.status === "completed") {
          clearInterval(pollInterval);
          setIsInferring(false);
          // Refresh candidates list with model scores
          const updated = await fetchScanCandidates(selectedScanId);
          setCandidates(updated);
          if (updated.length > 0) {
            setSelectedCandidate(updated[0]);
          }
        } else if (status.status === "failed") {
          clearInterval(pollInterval);
          setIsInferring(false);
        }
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#050b14] text-slate-100 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backendOnline={backendOnline}
        scanCount={scans.length}
      />

      {activeTab === "explore" && (
        <main className="flex-1">
          <Hero
            onOpenWorkstation={() => setActiveTab("workstation")}
            onExploreResearch={() => setActiveTab("dataset")}
            scanCount={scans.length}
            backendOnline={backendOnline}
          />

          <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[#070e1b] border border-[#16243b] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-cyan-400" />
                    <h3 className="font-semibold text-white">Interactive CT Workstation Preview</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab("workstation")}
                    className="text-xs font-mono text-[#38d9ff] hover:underline"
                  >
                    Open Full Workstation →
                  </button>
                </div>
                <div className="h-[420px]">
                  <CTViewer
                    scan={scanInfo}
                    currentSlice={currentSlice}
                    totalSlices={scanInfo?.num_slices || 1}
                    onSliceChange={setCurrentSlice}
                    selectedCandidate={selectedCandidate}
                    candidates={candidates}
                    showCandidates={showCandidates}
                    scoreThreshold={scoreThreshold}
                    windowPreset={windowPreset}
                    onWindowPresetChange={setWindowPreset}
                    activePlane={activePlane}
                    setActivePlane={setActivePlane}
                  />
                </div>
                <div className="mt-4">
                  <SliceSlider
                    currentSlice={currentSlice}
                    totalSlices={scanInfo?.num_slices || 1}
                    onSliceChange={setCurrentSlice}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <WorkflowStatus />
              <CandidatePanel
                candidates={candidates}
                selectedCandidate={selectedCandidate}
                onSelectCandidate={handleSelectCandidate}
                showCandidates={showCandidates}
                setShowCandidates={setShowCandidates}
                scoreThreshold={scoreThreshold}
                setScoreThreshold={setScoreThreshold}
                onRunInference={handleRunInference}
                isInferring={isInferring}
                inferProgress={inferProgress}
                modelReady={modelReady}
              />
            </div>
          </div>
        </main>
      )}

      {activeTab === "workstation" && (
        <main className="flex-1 p-6 max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Scan Selector & Candidates */}
          <div className="lg:col-span-3 space-y-6 flex flex-col">
            <div className="bg-[#070e1b] border border-[#16243b] rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#16243b] mb-3">
                <h3 className="font-semibold text-white text-xs uppercase font-mono tracking-wider">
                  CT Studies ({scans.length})
                </h3>
                <button
                  onClick={checkStatus}
                  className="p-1 text-slate-400 hover:text-slate-200"
                  title="Refresh Scans"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                {scans.length === 0 ? (
                  <div className="text-xs text-slate-500 font-mono py-2">No CT scans detected.</div>
                ) : (
                  scans.map((sid) => (
                    <button
                      key={sid}
                      onClick={() => setSelectedScanId(sid)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono transition-all truncate ${
                        selectedScanId === sid
                          ? "bg-[#182844] text-[#38d9ff] font-semibold border border-cyan-500/30"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                      }`}
                    >
                      {sid}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="flex-1 min-h-[420px]">
              <CandidatePanel
                candidates={candidates}
                selectedCandidate={selectedCandidate}
                onSelectCandidate={handleSelectCandidate}
                showCandidates={showCandidates}
                setShowCandidates={setShowCandidates}
                scoreThreshold={scoreThreshold}
                setScoreThreshold={setScoreThreshold}
                onRunInference={handleRunInference}
                isInferring={isInferring}
                inferProgress={inferProgress}
                modelReady={modelReady}
              />
            </div>
          </div>

          {/* Center Column: Large CT Viewport & Slice Slider */}
          <div className="lg:col-span-6 flex flex-col space-y-4">
            <div className="flex-1 min-h-[580px]">
              <CTViewer
                scan={scanInfo}
                currentSlice={currentSlice}
                totalSlices={
                  activePlane === "axial"
                    ? scanInfo?.num_slices || 1
                    : activePlane === "coronal"
                    ? scanInfo?.height || 1
                    : scanInfo?.width || 1
                }
                onSliceChange={setCurrentSlice}
                selectedCandidate={selectedCandidate}
                candidates={candidates}
                showCandidates={showCandidates}
                scoreThreshold={scoreThreshold}
                windowPreset={windowPreset}
                onWindowPresetChange={setWindowPreset}
                activePlane={activePlane}
                setActivePlane={setActivePlane}
              />
            </div>

            <SliceSlider
              currentSlice={currentSlice}
              totalSlices={
                activePlane === "axial"
                  ? scanInfo?.num_slices || 1
                  : activePlane === "coronal"
                  ? scanInfo?.height || 1
                  : scanInfo?.width || 1
              }
              onSliceChange={setCurrentSlice}
            />
          </div>

          {/* Right Column: Nodule Magnifier & Workflow Status */}
          <div className="lg:col-span-3 space-y-6">
            <NoduleMagnifier
              scan={scanInfo}
              candidate={selectedCandidate}
              onClearCandidate={() => setSelectedCandidate(null)}
            />
            <WorkflowStatus />
          </div>
        </main>
      )}

      {activeTab === "analytics" && <AnalyticsPanel />}
      {activeTab === "dataset" && <DatasetLab />}
      {activeTab === "model" && <AnalyticsPanel />}

      {activeTab === "about" && (
        <main className="flex-1 max-w-4xl mx-auto py-12 px-6">
          <div className="bg-[#070e1b] border border-[#16243b] rounded-2xl p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                <Layers className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">LungAI System Architecture (Phases 1–6)</h2>
                <p className="text-xs font-mono text-cyan-400">Pulmonary CT Workstation & PyTorch Candidate Classifier</p>
              </div>
            </div>

            <div className="prose prose-invert text-xs text-slate-300 space-y-4">
              <p>
                LungAI implements a complete research pipeline for pulmonary CT visualization, candidate patch extraction,
                and 3D deep-learning candidate classification.
              </p>
              <h4 className="text-sm font-semibold text-white">Candidate Classifier vs Whole-Volume Detection</h4>
              <p>
                The implemented PyTorch 3D CNN baseline evaluates candidate proposal locations (e.g. from LUNA16 candidates.csv).
                It is not an autonomous full-volume detector searching unseeded volumes.
              </p>
              <div className="bg-amber-950/20 border border-amber-900/40 p-4 rounded-xl text-amber-300">
                <span className="font-bold">Notice:</span> LungAI is an academic research software prototype and
                is not approved for diagnostic or clinical treatment planning.
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
