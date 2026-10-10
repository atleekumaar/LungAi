import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchHealth(): Promise<{ status: string; imaging_backend: string; available_scans_count: number } | null> {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
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

export async function fetchDatasetStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/imaging/status`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function getSliceWindowedUrl(scanId: string, sliceIdx: number, plane: string = "axial", wc: number = -600, ww: number = 1500) {
  return `${API_BASE}/api/imaging/scans/${scanId}/slice/${sliceIdx}/windowed?plane=${plane}&wc=${wc}&ww=${ww}`;
}
