"""
Unit tests for coordinate transformations:
- Physical to Continuous voxel
- Continuous voxel to Physical
- Integer voxel round-trip
- Non-unit spacing, non-zero origin, and non-identity direction cosines
"""
import pytest
import numpy as np
import SimpleITK as sitk

from services.api.app.imaging.coordinates import (
    physical_to_continuous_voxel,
    continuous_voxel_to_physical,
    physical_to_voxel_index,
    voxel_index_to_physical,
    sitk_index_to_numpy_indices,
    numpy_indices_to_sitk_index,
    is_voxel_inside_volume
)

@pytest.fixture
def complex_geometry_image():
    """
    Creates an image with non-trivial origin, non-isotropic spacing,
    and non-identity direction matrix (e.g., rotated by 90 degrees around Z).
    """
    img = sitk.Image(60, 80, 40, sitk.sitkFloat32)
    img.SetOrigin((-125.5, 45.2, -310.8))
    img.SetSpacing((0.75, 1.25, 2.5))
    
    # 90-degree rotation in XY plane:
    # cos(90) = 0, sin(90) = 1
    # [ 0, -1,  0,
    #   1,  0,  0,
    #   0,  0,  1 ]
    direction = (0.0, -1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0)
    img.SetDirection(direction)
    return img

def test_physical_continuous_round_trip(complex_geometry_image):
    test_points = [
        (-125.5, 45.2, -310.8),  # origin
        (-100.0, 60.0, -250.0),
        (-150.0, 20.0, -280.0),
    ]

    for pt in test_points:
        cont_vox = physical_to_continuous_voxel(complex_geometry_image, pt)
        rec_pt = continuous_voxel_to_physical(complex_geometry_image, cont_vox)
        np.testing.assert_allclose(rec_pt, pt, atol=1e-5)

def test_voxel_index_round_trip(complex_geometry_image):
    voxel_indices = [
        (0, 0, 0),
        (30, 40, 20),
        (59, 79, 39)
    ]

    for vox in voxel_indices:
        phys_pt = voxel_index_to_physical(complex_geometry_image, vox)
        rec_vox = physical_to_voxel_index(complex_geometry_image, phys_pt)
        assert rec_vox == vox

def test_sitk_to_numpy_permutation():
    # sitk index: (X=10, Y=20, Z=30) -> numpy index: (Z=30, Y=20, X=10)
    sitk_idx = (10, 20, 30)
    np_idx = sitk_index_to_numpy_indices(sitk_idx)
    assert np_idx == (30, 20, 10)
    assert numpy_indices_to_sitk_index(np_idx) == sitk_idx

def test_is_voxel_inside_volume():
    size = (100, 120, 50) # (X, Y, Z)
    assert is_voxel_inside_volume((0, 0, 0), size) is True
    assert is_voxel_inside_volume((99, 119, 49), size) is True
    assert is_voxel_inside_volume((-1, 10, 10), size) is False
    assert is_voxel_inside_volume((100, 10, 10), size) is False
    assert is_voxel_inside_volume((10, 120, 10), size) is False
    assert is_voxel_inside_volume((10, 10, 50), size) is False
