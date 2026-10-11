from pydantic import BaseModel, Field
from typing import List, Optional, Tuple, Dict, Any

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str
    environment: str
    imaging_backend: str = "SimpleITK"
    model_status: str = "unavailable"
    model_architecture: Optional[str] = None
    available_scans_count: int = 0
    message: str = "LungAI Medical Imaging API running"

class ModelInfoResponse(BaseModel):
    status: str
    architecture: Optional[str] = None
    version: Optional[str] = None
    patch_size: Optional[List[int]] = None
    device: Optional[str] = None
    best_val_loss: Optional[float] = None
    input_normalization: Optional[Dict[str, float]] = None
    note: str = "Candidate classification model only. Evaluates supplied locations; not whole-volume autonomous detector."

class LatencyResponse(BaseModel):
    device: str
    batch_size: int
    patch_size: List[int]
    runs: int
    mean_latency_ms: float
    median_latency_ms: float
    p95_latency_ms: float
    min_latency_ms: float
    max_latency_ms: float

class SliceMetadata(BaseModel):
    scan_id: str
    slice_index: int
    total_slices: int
    plane: str = "axial"
    window_center: float
    window_width: float
    width: int
    height: int

class PatchExtractRequest(BaseModel):
    scan_id: str
    coord_x: float
    coord_y: float
    coord_z: float
    patch_size: Tuple[int, int, int] = (32, 32, 32)

class CandidateItem(BaseModel):
    candidate_id: str
    seriesuid: str
    coord_x: float
    coord_y: float
    coord_z: float
    slice_index: int
    voxel_x: int
    voxel_y: int
    diameter_mm: Optional[float] = None
    model_score: Optional[float] = None # None until scored by candidate classifier
    is_reference: bool = True
    class_label: Optional[int] = None
    source: str = "reference_annotation" # "reference_annotation", "supplied_candidate", or "model_prediction"
    status: str = "pending"

class ScanInfo(BaseModel):
    scan_id: str
    file_path: str
    size_xyz: Tuple[int, int, int]
    spacing_xyz: Tuple[float, float, float]
    origin_xyz: Tuple[float, float, float]
    num_slices: int
    width: int
    height: int
    min_hu: float
    max_hu: float
    mean_hu: float
    annotations_count: int
    candidates: List[CandidateItem] = []

class DatasetStatusResponse(BaseModel):
    data_dir_exists: bool
    raw_dir_exists: bool
    annotations_file_exists: bool
    candidates_file_exists: bool
    total_mhd_scans: int
    scans: List[ScanInfo] = []
    message: str

class InferRequest(BaseModel):
    score_all_candidates: bool = True
    candidate_ids: Optional[List[str]] = None
    custom_candidates: Optional[List[Dict[str, float]]] = None # list of {"coord_x": ..., "coord_y": ..., "coord_z": ...}

class InferJobResponse(BaseModel):
    job_id: str
    scan_id: str
    status: str
    total_candidates: int
    message: str

class JobStatusResponse(BaseModel):
    job_id: str
    scan_id: str
    status: str
    progress: float
    processed_count: int
    total_count: int
    results: List[CandidateItem] = []
    error: Optional[str] = None
    created_at: float
    completed_at: Optional[float] = None
