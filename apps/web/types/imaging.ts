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
  model_score?: number | null; // null when no trained model run
  is_reference: boolean;
  class_label?: number | null;
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
