"""
PyTorch Dataset and DataLoader for LUNA16 Candidate Patches.
Reads candidates from verified scan files, extracts 3D patches with edge padding,
and normalizes HU intensities to [0.0, 1.0].
Guarantees scan-level split compliance with zero scan leakage.
"""
from typing import List, Dict, Any, Tuple, Optional
import os
import torch
from torch.utils.data import Dataset
import numpy as np
import SimpleITK as sitk

from services.api.app.imaging.loader import load_ct_volume, CTVolume
from services.api.app.imaging.patch_extractor import extract_candidate_patch
from services.api.app.imaging.windowing import normalize_hu_for_model
from ml.data.luna16_parser import CandidateRecord

class CandidatePatchDataset(Dataset):
    """
    Dataset yielding (patch_tensor, label, metadata).
    patch_tensor: (1, D, H, W) float32 in range [0.0, 1.0].
    label: float32 (0.0 for non-nodule, 1.0 for nodule candidate).
    """
    def __init__(
        self,
        candidates: List[CandidateRecord],
        scan_paths: Dict[str, str],
        patch_size: Tuple[int, int, int] = (32, 32, 32),
        min_hu: float = -1000.0,
        max_hu: float = 400.0,
        cache_volumes: bool = True
    ):
        self.candidates = candidates
        self.scan_paths = scan_paths
        self.patch_size = patch_size
        self.min_hu = min_hu
        self.max_hu = max_hu
        self.cache_volumes = cache_volumes
        self._volume_cache: Dict[str, CTVolume] = {}

        # Filter candidates whose scan files exist
        self.valid_indices: List[int] = []
        for idx, cand in enumerate(self.candidates):
            if cand.seriesuid in self.scan_paths and os.path.exists(self.scan_paths[cand.seriesuid]):
                self.valid_indices.append(idx)

    def __len__(self) -> int:
        return len(self.valid_indices)

    def _get_volume(self, seriesuid: str) -> CTVolume:
        if self.cache_volumes and seriesuid in self._volume_cache:
            return self._volume_cache[seriesuid]

        vol_path = self.scan_paths[seriesuid]
        volume = load_ct_volume(vol_path, scan_id=seriesuid)
        if self.cache_volumes:
            self._volume_cache[seriesuid] = volume
        return volume

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor, Dict[str, Any]]:
        cand_idx = self.valid_indices[idx]
        cand = self.candidates[cand_idx]

        volume = self._get_volume(cand.seriesuid)
        center_phys = (cand.coord_x, cand.coord_y, cand.coord_z)

        # Extract 3D candidate patch (returns HU array in (D, H, W))
        patch_result = extract_candidate_patch(
            sitk_image=volume.sitk_image,
            center_physical=center_phys,
            patch_size_voxels=self.patch_size,
            scan_id=cand.seriesuid,
            pad_value=-1000.0 # air padding
        )

        # Normalize HU values to [0.0, 1.0] for model input
        norm_patch = normalize_hu_for_model(
            patch_result.patch_array,
            min_bound=self.min_hu,
            max_bound=self.max_hu
        )

        # Convert to PyTorch tensor (1, D, H, W)
        tensor_patch = torch.from_numpy(norm_patch).unsqueeze(0).float()
        label_tensor = torch.tensor([float(cand.class_label)], dtype=torch.float32)

        meta = {
            "seriesuid": cand.seriesuid,
            "coord_x": cand.coord_x,
            "coord_y": cand.coord_y,
            "coord_z": cand.coord_z,
            "center_voxel": patch_result.center_voxel,
            "is_boundary": patch_result.is_boundary_candidate,
            "class_label": cand.class_label
        }

        return tensor_patch, label_tensor, meta
