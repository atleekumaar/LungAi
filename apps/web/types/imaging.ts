export interface Candidate {
  candidate_id: string;
  seriesuid: string;
  coord_x: number;
  coord_y: number;
  coord_z: number;
  slice_index: number;
  voxel_x: number;
  voxel_y: number;
  diameter_mm?: number | null;
  model_score?: number | null; // probability in [0.0, 1.0] from Phase 4 3D CNN
  is_reference: boolean;
  class_label?: number | null;
  source: string; // 'reference_annotation' | 'supplied_candidate' | 'model_prediction'
  status: string;
}

export interface ScanInfo {
  scan_id: string;
  file_path: string;
  size_xyz: [number, number, number];
  spacing_xyz: [number, number, number];
  origin_xyz: [number, number, number];
  num_slices: number;
  width: number;
  height: number;
  min_hu: number;
  max_hu: number;
  mean_hu: number;
  annotations_count: number;
  candidates: Candidate[];
}

export interface DatasetStatus {
  data_dir_exists: boolean;
  raw_dir_exists: boolean;
  annotations_file_exists: boolean;
  candidates_file_exists: boolean;
  total_mhd_scans: number;
  scans: ScanInfo[];
  message: string;
}

export interface WindowPreset {
  center: number;
  width: number;
  description: string;
}

export interface ModelInfo {
  status: string;
  architecture?: string | null;
  version?: string | null;
  patch_size?: number[] | null;
  device?: string | null;
  best_val_loss?: number | null;
  input_normalization?: { min_hu: number; max_hu: number } | null;
  note: string;
}

export interface LatencyBenchmark {
  device: string;
  batch_size: number;
  patch_size: number[];
  runs: number;
  mean_latency_ms: number;
  median_latency_ms: number;
  p95_latency_ms: number;
  min_latency_ms: number;
  max_latency_ms: number;
}

export interface InferJobStatus {
  job_id: string;
  scan_id: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  processed_count: number;
  total_count: number;
  results: Candidate[];
  error?: string | null;
  created_at: number;
  completed_at?: number | null;
}
