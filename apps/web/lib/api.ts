import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ModelInfo, LatencyBenchmark, InferJobStatus, Candidate } from "@/types/imaging";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchHealth(): Promise<{
  status: string;
  imaging_backend: string;
  model_status: string;
  model_architecture?: string;
  available_scans_count: number;
} | null> {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function fetchModelInfo(): Promise<ModelInfo | null> {
  try {
    const res = await fetch(`${API_BASE}/api/imaging/model`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchModelLatency(runs: number = 10): Promise<LatencyBenchmark | null> {
  try {
    const res = await fetch(`${API_BASE}/api/imaging/model/latency?runs=${runs}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchScans(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/api/imaging/scans`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchScanDetails(scanId: string) {
  try {
    const res = await fetch(`${API_BASE}/api/imaging/scans/${scanId}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchScanCandidates(scanId: string): Promise<Candidate[]> {
  try {
    const res = await fetch(`${API_BASE}/api/imaging/scans/${scanId}/candidates`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchDatasetStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/imaging/status`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function triggerInference(scanId: string): Promise<{ job_id: string } | null> {
  try {
    const res = await fetch(`${API_BASE}/api/imaging/scans/${scanId}/infer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score_all_candidates: true }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchJobStatus(jobId: string): Promise<InferJobStatus | null> {
  try {
    const res = await fetch(`${API_BASE}/api/imaging/jobs/${jobId}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function getSliceWindowedUrl(
  scanId: string,
  sliceIdx: number,
  plane: string = "axial",
  wc: number = -600,
  ww: number = 1500
) {
  return `${API_BASE}/api/imaging/scans/${scanId}/slice/${sliceIdx}/windowed?plane=${plane}&wc=${wc}&ww=${ww}`;
}
