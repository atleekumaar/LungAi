"use client";

import React, { useEffect, useState } from "react";
import { Database, FileCheck, RefreshCw, FolderSearch, AlertTriangle } from "lucide-react";
import { fetchDatasetStatus } from "@/lib/api";
import { DatasetStatus } from "@/types/imaging";

export function DatasetLab() {
  const [status, setStatus] = useState<DatasetStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadStatus = async () => {
    setLoading(true);
    const data = await fetchDatasetStatus();
    setStatus(data);
    setLoading(false);
  };

  useEffect(() => {
    loadStatus();
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-[#16243b]">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Dataset Lab & LUNA16 Registry</h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            GROUND-TRUTH NODULE ANNOTATIONS • CANDIDATE VALIDATION • SCAN-LEVEL SPLITS
          </p>
        </div>
        <button
          onClick={loadStatus}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0d1a2d] hover:bg-[#152744] text-cyan-300 border border-blue-900/50 text-xs font-mono transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Directory and Files Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#070e1b] border border-[#16243b] p-4 rounded-xl">
          <div className="text-xs text-slate-400 font-mono">Scans Directory</div>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`w-2 h-2 rounded-full ${
                status?.raw_dir_exists ? "bg-emerald-400" : "bg-rose-500"
              }`}
            />
            <span className="text-sm font-semibold text-white">
              {status?.raw_dir_exists ? "Present" : "Missing"}
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-1">./data/raw</p>
        </div>

        <div className="bg-[#070e1b] border border-[#16243b] p-4 rounded-xl">
          <div className="text-xs text-slate-400 font-mono">annotations.csv</div>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`w-2 h-2 rounded-full ${
                status?.annotations_file_exists ? "bg-emerald-400" : "bg-rose-500"
              }`}
            />
            <span className="text-sm font-semibold text-white">
              {status?.annotations_file_exists ? "Loaded" : "Missing"}
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-1">LUNA16 Ground Truth</p>
        </div>

        <div className="bg-[#070e1b] border border-[#16243b] p-4 rounded-xl">
          <div className="text-xs text-slate-400 font-mono">candidates.csv</div>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`w-2 h-2 rounded-full ${
                status?.candidates_file_exists ? "bg-emerald-400" : "bg-rose-500"
              }`}
            />
            <span className="text-sm font-semibold text-white">
              {status?.candidates_file_exists ? "Loaded" : "Missing"}
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-1">Candidate Proposals</p>
        </div>

        <div className="bg-[#070e1b] border border-[#16243b] p-4 rounded-xl">
          <div className="text-xs text-slate-400 font-mono">Verified Scans (.mhd)</div>
          <div className="text-2xl font-bold text-[#38d9ff] mt-1 font-mono">
            {status?.total_mhd_scans || 0}
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-0.5">MetaImage Volumes</p>
        </div>
      </div>

      {/* Dataset Acquisition Guidance */}
      <div className="bg-[#070e1b] border border-[#16243b] rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <FolderSearch className="w-4 h-4 text-cyan-400" />
          <span>LUNA16 Acquisition & Directory Setup</span>
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          To inspect real thoracic scans from the Grand Challenge, place subset folders (e.g. subset0 to subset9)
          and metadata files in <code className="bg-[#12223a] text-cyan-300 px-1 py-0.5 rounded font-mono">data/raw/</code>.
        </p>

        <div className="bg-[#050b14] border border-[#16243b] rounded-xl p-4 font-mono text-xs text-slate-300 space-y-2">
          <div className="text-slate-500"># Verify dataset and candidate metadata:</div>
          <div className="text-cyan-400">python scripts/cli.py inspect</div>
          <div className="text-cyan-400">python scripts/cli.py validate-csv</div>
          <div className="text-slate-500 mt-2"># Create scan-level splits (train/val/test with 0 leakage):</div>
          <div className="text-cyan-400">python scripts/cli.py create-splits --seed 42</div>
        </div>
      </div>
    </div>
  );
}
