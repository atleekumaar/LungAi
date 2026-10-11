"""
CT Volume container and loader supporting MetaImage (.mhd/.raw) and DICOM.
"""
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List, Sequence
import os
import numpy as np
import SimpleITK as sitk

from services.api.app.imaging.coordinates import (
    physical_to_continuous_voxel,
    continuous_voxel_to_physical,
    physical_to_voxel_index,
    voxel_index_to_physical,
    is_voxel_inside_volume,
)
from services.api.app.imaging.windowing import apply_ct_window, normalize_hu_for_model

@dataclass
class CTMetadata:
    scan_id: str
    file_path: str
    size: Tuple[int, int, int]             # (size_x, size_y, size_z) in voxels
    spacing: Tuple[float, float, float]    # (spacing_x, spacing_y, spacing_z) in mm
    origin: Tuple[float, float, float]     # (origin_x, origin_y, origin_z) in mm
    direction: Tuple[float, ...]           # 9-element direction cosine matrix
    dtype: str
    min_hu: float
    max_hu: float
    mean_hu: float

class CTVolume:
    """
    Robust medical imaging container representing a 3D pulmonary CT scan.
    Wraps SimpleITK image, stores raw array, and exposes verified coordinate mappings.
    """
    def __init__(self, sitk_image: sitk.Image, scan_id: str, file_path: str = ""):
        self.sitk_image = sitk_image
        self.scan_id = scan_id
        self.file_path = file_path
        
        # SimpleITK size: (X, Y, Z)
        self.size: Tuple[int, int, int] = self.sitk_image.GetSize()
        self.spacing: Tuple[float, float, float] = self.sitk_image.GetSpacing()
        self.origin: Tuple[float, float, float] = self.sitk_image.GetOrigin()
        self.direction: Tuple[float, ...] = self.sitk_image.GetDirection()
        
        # NumPy array shape: (Z, Y, X) -> (slices, height, width)
        self._array: Optional[np.ndarray] = None

    @property
    def array(self) -> np.ndarray:
        """Cached numpy array representation in HU (Z, Y, X)."""
        if self._array is None:
            self._array = sitk.GetArrayFromImage(self.sitk_image)
        return self._array

    @property
    def slice_count(self) -> int:
        return self.size[2]  # Z dimension

    @property
    def width(self) -> int:
        return self.size[0]  # X dimension

    @property
    def height(self) -> int:
        return self.size[1]  # Y dimension

    def get_metadata(self) -> CTMetadata:
        arr = self.array
        return CTMetadata(
            scan_id=self.scan_id,
            file_path=self.file_path,
            size=self.size,
            spacing=self.spacing,
            origin=self.origin,
            direction=self.direction,
            dtype=str(arr.dtype),
            min_hu=float(np.min(arr)),
            max_hu=float(np.max(arr)),
            mean_hu=float(np.mean(arr)),
        )

    def get_axial_slice(
        self,
        slice_idx: int,
        window_center: float = -600.0,
        window_width: float = 1500.0,
        as_uint8: bool = True
    ) -> np.ndarray:
        """
        Extracts 2D axial slice (XY plane) with specified window/level settings.
        slice_idx ranges from 0 to size_z - 1.
        """
        if slice_idx < 0 or slice_idx >= self.slice_count:
            raise IndexError(f"Slice index {slice_idx} out of range [0, {self.slice_count - 1}]")
        
        slice_hu = self.array[slice_idx, :, :]
        return apply_ct_window(
            slice_hu,
            window_center=window_center,
            window_width=window_width,
            out_dtype=np.uint8 if as_uint8 else np.float32
        )

    def get_coronal_slice(
        self,
        y_idx: int,
        window_center: float = -600.0,
        window_width: float = 1500.0,
    ) -> np.ndarray:
        """Coronal slice (XZ plane, across Y axis) with true anatomical aspect ratio."""
        if y_idx < 0 or y_idx >= self.height:
            raise IndexError(f"Y index {y_idx} out of range [0, {self.height - 1}]")
        # Flip vertically so cranial (head) is UP, caudal (feet) is DOWN
        slice_hu = np.flipud(self.array[:, y_idx, :])
        win_slice = apply_ct_window(slice_hu, window_center, window_width, out_dtype=np.uint8)
        
        # Rescale vertical dimension according to slice spacing (Z) vs pixel spacing (X)
        from PIL import Image
        aspect_ratio_z = self.spacing[2] / self.spacing[0]
        target_height = int(round(win_slice.shape[0] * aspect_ratio_z))
        pil_img = Image.fromarray(win_slice)
        rescaled = pil_img.resize((win_slice.shape[1], target_height), Image.Resampling.BILINEAR)
        return np.array(rescaled)

    def get_sagittal_slice(
        self,
        x_idx: int,
        window_center: float = -600.0,
        window_width: float = 1500.0,
    ) -> np.ndarray:
        """Sagittal slice (YZ plane, across X axis) with true anatomical aspect ratio."""
        if x_idx < 0 or x_idx >= self.width:
            raise IndexError(f"X index {x_idx} out of range [0, {self.width - 1}]")
        # Flip vertically so cranial is UP
        slice_hu = np.flipud(self.array[:, :, x_idx])
        win_slice = apply_ct_window(slice_hu, window_center, window_width, out_dtype=np.uint8)
        
        from PIL import Image
        aspect_ratio_z = self.spacing[2] / self.spacing[1]
        target_height = int(round(win_slice.shape[0] * aspect_ratio_z))
        pil_img = Image.fromarray(win_slice)
        rescaled = pil_img.resize((win_slice.shape[1], target_height), Image.Resampling.BILINEAR)
        return np.array(rescaled)

    def physical_to_voxel(self, physical_point: Sequence[float]) -> Tuple[int, int, int]:
        return physical_to_voxel_index(self.sitk_image, physical_point)

    def voxel_to_physical(self, voxel_index: Sequence[int]) -> Tuple[float, float, float]:
        return voxel_index_to_physical(self.sitk_image, voxel_index)

    def is_inside(self, voxel_index: Tuple[int, int, int]) -> bool:
        return is_voxel_inside_volume(voxel_index, self.size)


def load_ct_volume(file_path: str, scan_id: Optional[str] = None) -> CTVolume:
    """
    Loads a 3D medical volume (.mhd, .raw, .nii, etc.) via SimpleITK.
    Validates file existence and extracts complete geometry.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"CT volume file not found: {file_path}")

    derived_scan_id = scan_id or os.path.splitext(os.path.basename(file_path))[0]
    sitk_image = sitk.ReadImage(file_path)
    return CTVolume(sitk_image=sitk_image, scan_id=derived_scan_id, file_path=file_path)
