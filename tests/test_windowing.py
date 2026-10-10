"""
Tests for CT windowing, Hounsfield Unit mapping, and model normalization.
"""
import pytest
import numpy as np

from services.api.app.imaging.windowing import apply_ct_window, normalize_hu_for_model

def test_windowing_bounds():
    # Test values across typical CT spectrum: Air (-1000), Fat (-100), Water (0), Muscle (40), Bone (+1000)
    hu_vals = np.array([-1500.0, -1000.0, -600.0, 150.0, 1000.0, 2000.0], dtype=np.float32)
    
    # Lung window: Center -600, Width 1500 -> min = -1350, max = 150
    windowed = apply_ct_window(hu_vals, window_center=-600.0, window_width=1500.0, out_dtype=np.uint8)
    
    assert windowed.dtype == np.uint8
    # -1500 is below -1350 -> should be 0
    assert windowed[0] == 0
    # -600 is exactly center -> should be 127 or 128
    assert abs(int(windowed[2]) - 127) <= 1
    # 150 is exactly upper bound -> 255
    assert windowed[3] == 255
    # 1000 is above upper bound -> clipped to 255
    assert windowed[4] == 255

def test_invalid_window_width():
    with pytest.raises(ValueError):
        apply_ct_window(np.zeros((10, 10)), window_width=0)

def test_model_normalization_separation():
    # Ensures normalization for model inputs is strictly [0.0, 1.0] float32
    raw_hu = np.array([-1200.0, -1000.0, -300.0, 400.0, 800.0], dtype=np.float32)
    norm = normalize_hu_for_model(raw_hu, min_bound=-1000.0, max_bound=400.0)
    
    assert norm.dtype == np.float32
    assert norm[0] == 0.0 # clipped from -1200
    assert norm[1] == 0.0 # exactly min_bound
    assert norm[3] == 1.0 # exactly max_bound
    assert norm[4] == 1.0 # clipped from 800
    assert 0.0 <= norm.min() and norm.max() <= 1.0

def test_nan_and_inf_handling():
    arr_with_nans = np.array([np.nan, np.inf, -np.inf, -600.0], dtype=np.float32)
    windowed = apply_ct_window(arr_with_nans, window_center=-600.0, window_width=1500.0)
    assert not np.isnan(windowed).any()
    assert windowed.dtype == np.uint8
