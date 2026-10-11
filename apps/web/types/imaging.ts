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
  is_synthetic?: boolean;
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
  dataset_mode?: "real_luna16" | "user_upload" | "synthetic_fixture";
  is_real_data?: boolean;
  provenance_note?: string;
}

export interface DatasetStatus {
  data_dir_exists: boolean;
  raw_dir_exists: boolean;
  annotations_file_exists: boolean;
  candidates_file_exists: boolean;
  total_mhd_scans: number;
  real_scans_count?: number;
  synthetic_scans_count?: number;
  active_mode?: "real_luna16_mode" | "synthetic_test_mode" | "no_data_mode";
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
export interface FROCPoint {
  threshold: number;
  false_positives_per_scan: number;
  sensitivity: number;
  tp_count: number;
  fp_count: number;
}

export interface FailureAnalysis {
  operating_threshold: number;
  total_reference_nodules: number;
  total_detected_nodules: number;
  total_missed_nodules: number;
  total_false_positives: number;
  performance_by_diameter: Record<string, { total_nodules: number; detected_nodules: number; sensitivity: number }>;
  false_positives: Array<{
    candidate_id: string;
    seriesuid: string;
    coord_x: number;
    coord_y: number;
    coord_z: number;
    model_score: number;
    category: string;
  }>;
  missed_nodules: Array<{
    seriesuid: string;
    coord_x: number;
    coord_y: number;
    coord_z: number;
    diameter_mm: number;
    reason: string;
  }>;
}

export interface EvaluationSummary {
  metadata: {
    timestamp: string;
    model_architecture: string;
    model_version: string;
    checkpoint_path: string;
    dataset_provenance: string;
    total_evaluated_scans: number;
    total_candidates: number;
  };
  classification_metrics: {
    num_samples: number;
    threshold: number;
    true_positives: number;
    false_positives: number;
    true_negatives: number;
    false_negatives: number;
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    roc_auc?: number | null;
  };
  threshold_sweep: Array<{
    threshold: number;
    precision: number;
    recall: number;
    f1_score: number;
    accuracy: number;
  }>;
  froc_evaluation: {
    total_scans: number;
    total_ground_truth_nodules: number;
    cpm_score: number;
    sensitivities_at_fp_per_scan: Record<string, number>;
    froc_operating_points: number[];
    froc_curve: FROCPoint[];
    per_scan_stats: Record<string, {
      seriesuid: string;
      ground_truth_count: number;
      predictions_count: number;
      true_positives: number;
      false_positives: number;
      scan_sensitivity: number;
    }>;
  };
  failure_analysis: FailureAnalysis;
}
