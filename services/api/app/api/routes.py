"""
REST API Router for Pulmonary CT Scans, Candidate Inference, and Evaluation.
"""
from fastapi import APIRouter, HTTPException, Query, Response, BackgroundTasks
from typing import Optional, List, Dict, Any
import io
import time
import numpy as np

from services.api.app.services.volume_service import volume_service
from services.api.app.services.model_service import model_service
from services.api.app.services.job_manager import job_manager
from services.api.app.imaging.windowing import WINDOW_PRESETS
from services.api.app.imaging.patch_extractor import extract_candidate_patch
from services.api.app.schemas.imaging import (
    ScanInfo,
    CandidateItem,
    DatasetStatusResponse,
    PatchExtractRequest,
    ModelInfoResponse,
    LatencyResponse,
    InferRequest,
    InferJobResponse,
    JobStatusResponse
)
from services.api.app.core.config import settings

router = APIRouter(prefix="/imaging", tags=["Medical Imaging & Inference"])

@router.get("/model", response_model=ModelInfoResponse)
def get_model_info():
    """Returns currently loaded candidate classifier architecture, version, and status."""
    meta = model_service.model_metadata
    return ModelInfoResponse(
        status=meta.get("status", "unavailable"),
        architecture=meta.get("architecture"),
        version=meta.get("version"),
        patch_size=list(meta.get("patch_size", (32, 32, 32))) if meta.get("patch_size") else None,
        device=meta.get("device"),
        best_val_loss=meta.get("best_val_loss"),
        input_normalization=meta.get("input_normalization")
    )

@router.get("/model/latency", response_model=LatencyResponse)
def benchmark_model_latency(runs: int = Query(10, ge=1, le=50)):
    """Profiles real candidate scoring latency on the server's device."""
    res = model_service.measure_latency(num_runs=runs)
    if "error" in res:
        raise HTTPException(status_code=503, detail=res["error"])
    return res

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

@router.get("/scans/{scan_id}/candidates", response_model=List[CandidateItem])
def get_scan_candidates(scan_id: str):
    """Retrieve all candidates and scored predictions for a scan."""
    info = volume_service.get_scan_info(scan_id)
    if not info:
        raise HTTPException(status_code=404, detail=f"Scan '{scan_id}' not found.")
    return volume_service.get_candidates(scan_id)

@router.get("/scans/{scan_id}/slice/{slice_idx}/raw")
def get_slice_raw_hu(
    scan_id: str,
    slice_idx: int,
    plane: str = Query("axial", pattern="^(axial|coronal|sagittal)$")
):
    """
    Returns un-windowed raw HU values as binary float32 buffer for client-side windowing.
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
    Returns windowed 8-bit grayscale pixels (uint8 array) suitable for direct HTML5 canvas.
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

def _execute_scoring_task(job_id: str, scan_id: str, target_candidates: List[CandidateItem]):
    volume = volume_service.get_or_load_volume(scan_id)
    if not volume:
        raise ValueError(f"Scan {scan_id} not found during scoring")

    scored_results = []
    total = len(target_candidates)

    for i, cand in enumerate(target_candidates):
        try:
            patch_res = extract_candidate_patch(
                sitk_image=volume.sitk_image,
                center_physical=(cand.coord_x, cand.coord_y, cand.coord_z),
                patch_size_voxels=(32, 32, 32),
                scan_id=scan_id
            )
            score = model_service.score_patch(patch_res.patch_array)
            cand.model_score = round(float(score), 4)
            cand.status = "scored"
            cand.source = "model_prediction"
        except Exception as e:
            cand.status = f"failed: {str(e)}"

        scored_results.append(cand)
        job_manager.update_progress(job_id, i + 1)

    # Persist updated candidates in VolumeService registry
    existing = volume_service.get_candidates(scan_id)
    scored_dict = {c.candidate_id: c for c in scored_results}
    merged = [scored_dict.get(c.candidate_id, c) for c in existing]
    volume_service.update_candidates(scan_id, merged)
    return scored_results

@router.post("/scans/{scan_id}/infer", response_model=InferJobResponse)
def start_candidate_inference(scan_id: str, req: InferRequest = InferRequest()):
    """
    Initiates candidate scoring job for supplied locations using the 3D CNN model.
    Clarification: Scores candidate proposals; does not perform whole-volume nodule detection.
    """
    if not model_service.is_ready:
        raise HTTPException(status_code=503, detail="Inference model is not ready or checkpoint is missing.")

    volume = volume_service.get_or_load_volume(scan_id)
    if not volume:
        raise HTTPException(status_code=404, detail=f"Scan '{scan_id}' not found.")

    candidates = volume_service.get_candidates(scan_id)
    if not candidates:
        raise HTTPException(
            status_code=400,
            detail=f"No candidate proposals found for scan '{scan_id}' to score."
        )

    job_id = job_manager.create_job(scan_id, len(candidates))
    job_manager.submit_job(job_id, _execute_scoring_task, scan_id, candidates)

    return InferJobResponse(
        job_id=job_id,
        scan_id=scan_id,
        status="running",
        total_candidates=len(candidates),
        message=f"Started candidate classification inference job for {len(candidates)} candidate(s)."
    )

@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
def get_inference_job_status(job_id: str):
    """Polls async inference job progress and results."""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    return JobStatusResponse(**job)
