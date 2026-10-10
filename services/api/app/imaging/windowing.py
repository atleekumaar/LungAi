"""
CT Windowing, Hounsfield Unit (HU) mapping, and normalization routines.
"""
from typing import Tuple, Optional
import numpy as np

# Clinically standard CT window presets
# Center (Level) and Width in Hounsfield Units (HU)
WINDOW_PRESETS = {
    "lung": {"center": -600.0, "width": 1500.0, "description": "Standard pulmonary parenchyma window"},
    "mediastinum": {"center": 40.0, "width": 400.0, "description": "Soft tissue and mediastinal window"},
    "bone": {"center": 300.0, "width": 1500.0, "description": "Thoracic cage / high attenuation osseous window"},
    "nodule": {"center": -500.0, "width": 1000.0, "description": "Targeted solitary pulmonary nodule visualizer"},
}

def apply_ct_window(
    volume_hu: np.ndarray,
    window_center: float = -600.0,
    window_width: float = 1500.0,
    out_dtype: np.dtype = np.uint8
) -> np.ndarray:
    """
    Applies CT Window/Level linear transformation to Hounsfield Units and scales to [0, 255] (or [0, 1] if float).
    Lower bound: center - (width / 2)
    Upper bound: center + (width / 2)
    """
    if window_width <= 0:
        raise ValueError(f"window_width must be positive, got {window_width}")

    # Clean NaNs or Infs if present
    cleaned = np.nan_to_num(volume_hu, nan=-1000.0, posinf=3000.0, neginf=-1000.0)

    min_val = window_center - (window_width / 2.0)
    max_val = window_center + (window_width / 2.0)

    clipped = np.clip(cleaned, min_val, max_val)
    normalized = (clipped - min_val) / (max_val - min_val)

    if out_dtype == np.uint8:
        return (normalized * 255.0).astype(np.uint8)
    elif np.issubdtype(out_dtype, np.floating):
        return normalized.astype(out_dtype)
    else:
        return (normalized * 255.0).astype(out_dtype)

def normalize_hu_for_model(
    volume_hu: np.ndarray,
    min_bound: float = -1000.0,
    max_bound: float = 400.0
) -> np.ndarray:
    """
    Standard preprocessing for deep learning models on pulmonary CT.
    Clips HU between [min_bound, max_bound] (typically -1000 to +400 HU)
    and rescales to [0.0, 1.0] float32.
    Separated from display windowing so viewer settings do not alter ML tensors.
    """
    cleaned = np.nan_to_num(volume_hu, nan=min_bound, posinf=max_bound, neginf=min_bound)
    clipped = np.clip(cleaned, min_bound, max_bound)
    normalized = (clipped - min_bound) / (max_bound - min_bound)
    return normalized.astype(np.float32)
