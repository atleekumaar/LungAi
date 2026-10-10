"""
REST API Router for Pulmonary CT Scans and Candidate Analysis.
"""
from fastapi import APIRouter, HTTPException, Query, Response
from typing import Optional, List
import io
import numpy as np

from services.api.app.services.volume_service import volume_service
from services.api.app.imaging.windowing import WINDOW_PRESETS
from services.api.app.imaging.patch_extractor import extract_candidate_patch
from services.api.app.schemas.imaging import (
    ScanInfo,
    CandidateItem,
    DatasetStatusResponse,
    PatchExtractRequest
)
from services.api.app.core.config import settings

router = APIRouter(prefix="/imaging", tags=["Medical Imaging"])

@router.get("/status", response_model=DatasetStatusResponse)
def get_imaging_status():
    """Inspect local dataset availability, scans count, and annotations."""
    return volume_service.get_dataset_status()

@router.get("/scans", response_model=List[str])
def list_available_scans():
    """Lists all available CT Scan IDs in the configured raw directory."""
    return volume_service.get_scan_list()

@router.get("/presets")
def get_window_presets():
    """Returns clinical window presets (Lung, Mediastinum, Bone, Nodule)."""
    return WINDOW_PRESETS

@router.get("/scans/{scan_id}", response_model=ScanInfo)
def get_scan_details(scan_id: str):
    """Retrieve metadata, volume dimensions, spacing, and candidates for a scan."""
    info = volume_service.get_scan_info(scan_id)
    if not info:
        raise HTTPException(
            status_code=404,
            detail=f"Scan '{scan_id}' not found. Please ensure the scan is present in {settings.raw_dir}"
        )
    return info

@router.get("/scans/{scan_id}/slice/{slice_idx}/raw")
def get_slice_raw_hu(
    scan_id: str,
    slice_idx: int,
    plane: str = Query("axial", pattern="^(axial|coronal|sagittal)$")
):
    """
    Returns un-windowed raw HU values as binary float32 buffer for client-side windowing
    (Cornerstone3D / WebGL / Canvas).
    """
    volume = volume_service.get_or_load_volume(scan_id)
    if not volume:
        raise HTTPException(status_code=404, detail=f"Scan '{scan_id}' not found.")

    try:
        if plane == "axial":
            if slice_idx < 0 or slice_idx >= volume.slice_count:
                raise HTTPException(status_code=400, detail=f"Slice index {slice_idx} out of range [0, {volume.slice_count-1}]")
            raw_slice = volume.array[slice_idx, :, :].astype(np.float32)
        elif plane == "coronal":
            if slice_idx < 0 or slice_idx >= volume.height:
                raise HTTPException(status_code=400, detail=f"Coronal index {slice_idx} out of range [0, {volume.height-1}]")
            raw_slice = volume.array[:, slice_idx, :].astype(np.float32)
        else: # sagittal
            if slice_idx < 0 or slice_idx >= volume.width:
                raise HTTPException(status_code=400, detail=f"Sagittal index {slice_idx} out of range [0, {volume.width-1}]")
            raw_slice = volume.array[:, :, slice_idx].astype(np.float32)

        return Response(
            content=raw_slice.tobytes(),
            media_type="application/octet-stream",
            headers={
                "X-Volume-Width": str(raw_slice.shape[1]),
                "X-Volume-Height": str(raw_slice.shape[0]),
                "X-Slice-Index": str(slice_idx),
                "X-Plane": plane
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error rendering raw slice: {str(e)}")

@router.get("/scans/{scan_id}/slice/{slice_idx}/windowed")
def get_slice_windowed_bytes(
    scan_id: str,
    slice_idx: int,
    plane: str = Query("axial", pattern="^(axial|coronal|sagittal)$"),
    wc: float = Query(-600.0, description="Window center HU"),
    ww: float = Query(1500.0, description="Window width HU"),
):
    """
    Returns windowed 8-bit grayscale pixels (uint8 array) suitable for direct HTML5 canvas/Cornerstone.
    """
    volume = volume_service.get_or_load_volume(scan_id)
    if not volume:
        raise HTTPException(status_code=404, detail=f"Scan '{scan_id}' not found.")

    try:
        if plane == "axial":
            slice_bytes = volume.get_axial_slice(slice_idx, window_center=wc, window_width=ww)
        elif plane == "coronal":
            slice_bytes = volume.get_coronal_slice(slice_idx, window_center=wc, window_width=ww)
        else:
            slice_bytes = volume.get_sagittal_slice(slice_idx, window_center=wc, window_width=ww)

        return Response(
            content=slice_bytes.tobytes(),
            media_type="application/octet-stream",
            headers={
                "X-Volume-Width": str(slice_bytes.shape[1]),
                "X-Volume-Height": str(slice_bytes.shape[0]),
                "X-Slice-Index": str(slice_idx),
                "X-Plane": plane
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting windowed slice: {str(e)}")

@router.post("/patch")
def extract_patch_endpoint(req: PatchExtractRequest):
    """
    Extracts a 3D candidate patch centered on physical coordinates.
    """
    volume = volume_service.get_or_load_volume(req.scan_id)
    if not volume:
        raise HTTPException(status_code=404, detail=f"Scan '{req.scan_id}' not found.")

    result = extract_candidate_patch(
        sitk_image=volume.sitk_image,
        center_physical=(req.coord_x, req.coord_y, req.coord_z),
        patch_size_voxels=req.patch_size,
        scan_id=req.scan_id
    )

    return {
        "scan_id": result.scan_id,
        "center_physical": result.center_physical,
        "center_voxel": result.center_voxel,
        "patch_shape": list(result.patch_array.shape),
        "is_boundary_candidate": result.is_boundary_candidate,
        "padding_applied": result.padding_applied,
        "patch_min_hu": float(np.min(result.patch_array)),
        "patch_max_hu": float(np.max(result.patch_array)),
        "patch_mean_hu": float(np.mean(result.patch_array)),
    }
