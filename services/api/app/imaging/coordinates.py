"""
Coordinate transformation and conversion routines for 3D medical volumes.
Handles transformations between:
- Physical / World coordinates (x, y, z in mm)
- Continuous voxel indices (i, j, k float)
- Integer voxel indices (i, j, k int)
- NumPy array indexing coordinates (z, y, x / slice, row, col)

Crucial Note on Conventions:
SimpleITK uses (X, Y, Z) for physical points and continuous indices.
SimpleITK image buffer when accessed via GetArrayFromImage has shape (Z, Y, X),
i.e., array[slice_idx, row_idx, col_idx] = image[X, Y, Z].
We strictly encapsulate these mappings to eliminate axis permutation errors.
"""
from typing import Tuple, Sequence
import numpy as np
import SimpleITK as sitk

def physical_to_continuous_voxel(
    image: sitk.Image,
    physical_point: Sequence[float]
) -> Tuple[float, float, float]:
    """
    Convert a 3D physical world point (x, y, z) in mm to continuous voxel index (x_idx, y_idx, z_idx).
    Uses SimpleITK's TransformPhysicalPointToContinuousIndex to respect image origin,
    spacing, and direction cosine matrix.
    """
    if len(physical_point) != 3:
        raise ValueError(f"Physical point must have 3 coordinates (x, y, z), got {len(physical_point)}")
    
    pt = [float(c) for c in physical_point]
    cont_idx = image.TransformPhysicalPointToContinuousIndex(pt)
    return (float(cont_idx[0]), float(cont_idx[1]), float(cont_idx[2]))

def continuous_voxel_to_physical(
    image: sitk.Image,
    continuous_index: Sequence[float]
) -> Tuple[float, float, float]:
    """
    Convert continuous voxel index (x_idx, y_idx, z_idx) to 3D physical world point (x, y, z) in mm.
    """
    if len(continuous_index) != 3:
        raise ValueError(f"Continuous index must have 3 coordinates (x, y, z), got {len(continuous_index)}")
        
    c_idx = [float(c) for c in continuous_index]
    phys_pt = image.TransformContinuousIndexToPhysicalPoint(c_idx)
    return (float(phys_pt[0]), float(phys_pt[1]), float(phys_pt[2]))

def physical_to_voxel_index(
    image: sitk.Image,
    physical_point: Sequence[float],
    round_mode: str = "round"
) -> Tuple[int, int, int]:
    """
    Convert physical world point (x, y, z) in mm to integer voxel index (x_vox, y_vox, z_vox).
    round_mode: 'round', 'floor', or 'ceil'.
    """
    cont_idx = physical_to_continuous_voxel(image, physical_point)
    if round_mode == "round":
        vox = (int(np.round(cont_idx[0])), int(np.round(cont_idx[1])), int(np.round(cont_idx[2])))
    elif round_mode == "floor":
        vox = (int(np.floor(cont_idx[0])), int(np.floor(cont_idx[1])), int(np.floor(cont_idx[2])))
    elif round_mode == "ceil":
        vox = (int(np.ceil(cont_idx[0])), int(np.ceil(cont_idx[1])), int(np.ceil(cont_idx[2])))
    else:
        raise ValueError(f"Unsupported round_mode: {round_mode}")
    return vox

def voxel_index_to_physical(
    image: sitk.Image,
    voxel_index: Sequence[int]
) -> Tuple[float, float, float]:
    """
    Convert integer voxel index (x_vox, y_vox, z_vox) to physical world point (x, y, z) in mm.
    """
    if len(voxel_index) != 3:
        raise ValueError(f"Voxel index must have 3 coordinates (x, y, z), got {len(voxel_index)}")
    idx = [int(i) for i in voxel_index]
    phys_pt = image.TransformIndexToPhysicalPoint(idx)
    return (float(phys_pt[0]), float(phys_pt[1]), float(phys_pt[2]))

def sitk_index_to_numpy_indices(
    sitk_index: Tuple[int, int, int]
) -> Tuple[int, int, int]:
    """
    Convert SimpleITK voxel index (X, Y, Z) to NumPy array indices (Z, Y, X).
    """
    return (sitk_index[2], sitk_index[1], sitk_index[0])

def numpy_indices_to_sitk_index(
    numpy_indices: Tuple[int, int, int]
) -> Tuple[int, int, int]:
    """
    Convert NumPy array indices (Z, Y, X) to SimpleITK voxel index (X, Y, Z).
    """
    return (numpy_indices[2], numpy_indices[1], numpy_indices[0])

def is_voxel_inside_volume(
    voxel_index: Tuple[int, int, int],
    image_size: Tuple[int, int, int]
) -> bool:
    """
    Verify if SimpleITK voxel index (X, Y, Z) is strictly within image dimensions (size_x, size_y, size_z).
    """
    return (
        0 <= voxel_index[0] < image_size[0] and
        0 <= voxel_index[1] < image_size[1] and
        0 <= voxel_index[2] < image_size[2]
    )
