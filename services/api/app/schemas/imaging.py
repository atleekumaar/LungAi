from pydantic import BaseModel, Field
from typing import List, Optional, Tuple, Dict, Any

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str
    environment: str
    imaging_backend: str = "SimpleITK"
    available_scans_count: int = 0
    message: str = "LungAI Medical Imaging API running"

class SliceMetadata(BaseModel):
    scan_id: str
    slice_index: int
    total_slices: int
    plane: str = "axial"
    window_center: float
    window_width: float
    width: int
    height: int

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
    model_score: Optional[float] = None  # None when no real prediction model is run
    is_reference: bool = True
    class_label: Optional[int] = None
    status: str = "reference_annotation"

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

class PatchExtractRequest(BaseModel):
    scan_id: str
    coord_x: float
    coord_y: float
    coord_z: float
    patch_size: Tuple[int, int, int] = (32, 32, 32)
