"""
Candidate 3D Patch Extraction from CT Volumes.
Supports:
- Physical coordinates to continuous & discrete voxel coordinates.
- Centered 3D bounding box / patch sampling.
- Safe volume edge padding (constant, edge, or reflection) for candidates near borders.
- Accurate tracking of patch coordinate offsets and physical bounding extents.
"""
from dataclasses import dataclass
from typing import Tuple, Dict, Any, Optional
import numpy as np
import SimpleITK as sitk

from services.api.app.imaging.coordinates import (
    physical_to_continuous_voxel,
    physical_to_voxel_index,
    sitk_index_to_numpy_indices,
)

@dataclass
class PatchExtractionResult:
    patch_array: np.ndarray             # 3D array in HU (depth, height, width)
    scan_id: str
    center_physical: Tuple[float, float, float]
    center_voxel: Tuple[int, int, int]  # (X, Y, Z) in SimpleITK coordinates
    patch_size: Tuple[int, int, int]    # (depth, height, width)
    padding_applied: Dict[str, Tuple[int, int]]  # e.g. {'z': (pad_low, pad_high), ...}
    bbox_voxel_min: Tuple[int, int, int]
    bbox_voxel_max: Tuple[int, int, int]
    is_boundary_candidate: bool

def extract_candidate_patch(
    sitk_image: sitk.Image,
    center_physical: Tuple[float, float, float],
    patch_size_voxels: Tuple[int, int, int] = (32, 32, 32),
    scan_id: str = "unknown",
    pad_value: float = -1000.0,  # Air / vacuum in HU
) -> PatchExtractionResult:
    """
    Extracts a 3D candidate patch centered around physical coordinates (x, y, z).
    patch_size_voxels: (depth, height, width) in voxels -> corresponds to (Z, Y, X).
    """
    image_size_xyz = sitk_image.GetSize()  # (X, Y, Z)
    cont_xyz = physical_to_continuous_voxel(sitk_image, center_physical)
    center_vox_xyz = (
        int(np.round(cont_xyz[0])),
        int(np.round(cont_xyz[1])),
        int(np.round(cont_xyz[2]))
    )

    pad_z, pad_y, pad_x = patch_size_voxels
    half_z = pad_z // 2
    half_y = pad_y // 2
    half_x = pad_x // 2

    c_x, c_y, c_z = center_vox_xyz

    # Desired voxel bounding box in SimpleITK (X, Y, Z) space
    x_min, x_max = c_x - half_x, c_x - half_x + pad_x
    y_min, y_max = c_y - half_y, c_y - half_y + pad_y
    z_min, z_max = c_z - half_z, c_z - half_z + pad_z

    vol_arr = sitk.GetArrayFromImage(sitk_image)  # Shape (Z, Y, X)
    max_z, max_y, max_x = vol_arr.shape

    # Compute intersections and necessary paddings
    pad_z_before = max(0, -z_min)
    pad_z_after = max(0, z_max - max_z)
    pad_y_before = max(0, -y_min)
    pad_y_after = max(0, y_max - max_y)
    pad_x_before = max(0, -x_min)
    pad_x_after = max(0, x_max - max_x)

    is_boundary = any([
        pad_z_before > 0, pad_z_after > 0,
        pad_y_before > 0, pad_y_after > 0,
        pad_x_before > 0, pad_x_after > 0
    ])

    # Valid slice range inside the array
    valid_z_min = max(0, z_min)
    valid_z_max = min(max_z, z_max)
    valid_y_min = max(0, y_min)
    valid_y_max = min(max_y, y_max)
    valid_x_min = max(0, x_min)
    valid_x_max = min(max_x, x_max)

    valid_subvol = vol_arr[
        valid_z_min:valid_z_max,
        valid_y_min:valid_y_max,
        valid_x_min:valid_x_max
    ]

    # Pad if requested patch bounds extend past scan boundaries
    if is_boundary:
        patch_array = np.pad(
            valid_subvol,
            pad_width=(
                (pad_z_before, pad_z_after),
                (pad_y_before, pad_y_after),
                (pad_x_before, pad_x_after)
            ),
            mode='constant',
            constant_values=pad_value
        )
    else:
        patch_array = valid_subvol.copy()

    return PatchExtractionResult(
        patch_array=patch_array,
        scan_id=scan_id,
        center_physical=center_physical,
        center_voxel=center_vox_xyz,
        patch_size=patch_size_voxels,
        padding_applied={
            "z": (pad_z_before, pad_z_after),
            "y": (pad_y_before, pad_y_after),
            "x": (pad_x_before, pad_x_after),
        },
        bbox_voxel_min=(x_min, y_min, z_min),
        bbox_voxel_max=(x_max, y_max, z_max),
        is_boundary_candidate=is_boundary
    )
