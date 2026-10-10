"""
Tests for 3D candidate patch extraction and boundary padding.
"""
import pytest
import numpy as np
import SimpleITK as sitk

from services.api.app.imaging.patch_extractor import extract_candidate_patch
from services.api.app.imaging.loader import load_ct_volume

def test_patch_extraction_interior():
    # 50x50x50 image with spacing (1, 1, 1) and origin (0, 0, 0)
    arr = np.arange(50*50*50, dtype=np.float32).reshape(50, 50, 50)
    img = sitk.GetImageFromArray(arr)
    img.SetSpacing((1.0, 1.0, 1.0))
    img.SetOrigin((0.0, 0.0, 0.0))

    # Center at physical (25, 25, 25)
    patch_res = extract_candidate_patch(
        sitk_image=img,
        center_physical=(25.0, 25.0, 25.0),
        patch_size_voxels=(16, 16, 16),
        scan_id="TEST_SCAN"
    )

    assert patch_res.patch_array.shape == (16, 16, 16)
    assert patch_res.is_boundary_candidate is False
    assert patch_res.padding_applied["z"] == (0, 0)
    assert patch_res.padding_applied["y"] == (0, 0)
    assert patch_res.padding_applied["x"] == (0, 0)

def test_patch_extraction_boundary_padding():
    # Corner candidate at (0, 0, 0)
    arr = np.ones((40, 40, 40), dtype=np.float32) * 50.0
    img = sitk.GetImageFromArray(arr)
    img.SetSpacing((1.0, 1.0, 1.0))
    img.SetOrigin((0.0, 0.0, 0.0))

    patch_res = extract_candidate_patch(
        sitk_image=img,
        center_physical=(0.0, 0.0, 0.0),
        patch_size_voxels=(20, 20, 20),
        scan_id="TEST_CORNER",
        pad_value=-1000.0
    )

    # Patch shape must remain strictly 20x20x20
    assert patch_res.patch_array.shape == (20, 20, 20)
    assert patch_res.is_boundary_candidate is True
    # Air padding value should be present in padded regions
    assert (patch_res.patch_array == -1000.0).any()
