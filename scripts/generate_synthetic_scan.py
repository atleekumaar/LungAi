"""
Generates synthetic, anatomically approximated CT scans in MetaImage (.mhd/.raw) format
strictly for testing, unit-test fixtures, and local verification without downloading 50GB LUNA16.
Clearly flagged as synthetic non-clinical data.
"""
import os
import sys
import numpy as np
import SimpleITK as sitk
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

def create_synthetic_scan(
    output_dir: str,
    scan_id: str = "SYNTH_SCAN_001",
    shape: tuple = (64, 128, 128),  # (slices_Z, height_Y, width_X)
    spacing: tuple = (1.5, 0.75, 0.75), # (sp_X, sp_Y, sp_Z)
    origin: tuple = (-100.0, -100.0, -200.0) # (orig_X, orig_Y, orig_Z)
) -> str:
    """
    Creates a synthetic 3D CT volume:
    - Background: Air (-1000 HU)
    - Thoracic wall / Soft tissue: (~40 HU)
    - Lung parenchyma: (-750 HU)
    - Synthetic pulmonary nodule spherical insert: (~ -100 to 0 HU)
    """
    os.makedirs(output_dir, exist_ok=True)
    depth_z, height_y, width_x = shape

    # Initialize with air (-1000 HU)
    vol = np.full(shape, -1000.0, dtype=np.float32)

    # Elliptical thoracic cylinder across all slices
    y_coords = np.arange(height_y)
    x_coords = np.arange(width_x)
    cy, cx = height_y / 2.0, width_x / 2.0
    r_body_y, r_body_x = height_y * 0.42, width_x * 0.42

    y_grid_2d, x_grid_2d = np.meshgrid(y_coords, x_coords, indexing="ij")
    body_mask_2d = ((y_grid_2d - cy)**2 / r_body_y**2 + (x_grid_2d - cx)**2 / r_body_x**2) <= 1.0
    vol[:, body_mask_2d] = 40.0  # soft tissue HU

    # Left & Right lung cavities (-750 HU)
    r_lung_y, r_lung_x = height_y * 0.30, width_x * 0.18
    left_cx, right_cx = cx - (width_x * 0.20), cx + (width_x * 0.20)

    left_lung_2d = ((y_grid_2d - cy)**2 / r_lung_y**2 + (x_grid_2d - left_cx)**2 / r_lung_x**2) <= 1.0
    right_lung_2d = ((y_grid_2d - cy)**2 / r_lung_y**2 + (x_grid_2d - right_cx)**2 / r_lung_x**2) <= 1.0

    vol[:, left_lung_2d] = -750.0
    vol[:, right_lung_2d] = -750.0

    # Insert a synthetic nodule in right lung
    z_coords = np.arange(depth_z)
    z_grid_3d, y_grid_3d, x_grid_3d = np.meshgrid(z_coords, y_coords, x_coords, indexing="ij")
    nodule_z = depth_z // 2
    nodule_y = int(cy)
    nodule_x = int(right_cx)
    nodule_r = 5.0 # voxels

    nodule_mask = (
        (z_grid_3d - nodule_z)**2 +
        (y_grid_3d - nodule_y)**2 +
        (x_grid_3d - nodule_x)**2
    ) <= nodule_r**2
    vol[nodule_mask] = -120.0 # soft tissue nodule attenuation

    # Add Gaussian noise
    noise = np.random.normal(0, 15.0, size=shape).astype(np.float32)
    vol += noise

    # Build SimpleITK image
    # Note: sitk expects input array in (Z, Y, X) and interprets size as (X, Y, Z)
    sitk_img = sitk.GetImageFromArray(vol)
    sitk_img.SetSpacing((spacing[0], spacing[1], spacing[2]))
    sitk_img.SetOrigin((origin[0], origin[1], origin[2]))
    # Direction matrix: identity by default
    sitk_img.SetDirection((1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0))

    mhd_path = os.path.join(output_dir, f"{scan_id}.mhd")
    sitk.WriteImage(sitk_img, mhd_path)

    # Compute physical coordinates of nodule for reference annotation
    phys_nodule = sitk_img.TransformIndexToPhysicalPoint((int(nodule_x), int(nodule_y), int(nodule_z)))

    return mhd_path, phys_nodule

def main():
    out_raw = os.path.join("data", "raw")
    os.makedirs(out_raw, exist_ok=True)
    
    print("Generating synthetic CT test scans for development and verification...")
    mhd_1, nodule_pt_1 = create_synthetic_scan(out_raw, scan_id="SYNTH_SCAN_001")
    mhd_2, nodule_pt_2 = create_synthetic_scan(out_raw, scan_id="SYNTH_SCAN_002")

    # Generate sample annotations.csv and candidates.csv for synthetic test scans
    annotations_data = [
        {
            "seriesuid": "SYNTH_SCAN_001",
            "coordX": nodule_pt_1[0],
            "coordY": nodule_pt_1[1],
            "coordZ": nodule_pt_1[2],
            "diameter_mm": 10.5
        },
        {
            "seriesuid": "SYNTH_SCAN_002",
            "coordX": nodule_pt_2[0],
            "coordY": nodule_pt_2[1],
            "coordZ": nodule_pt_2[2],
            "diameter_mm": 8.2
        }
    ]
    df_ann = pd.DataFrame(annotations_data)
    df_ann.to_csv(os.path.join(out_raw, "annotations.csv"), index=False)

    candidates_data = [
        {
            "seriesuid": "SYNTH_SCAN_001",
            "coordX": nodule_pt_1[0],
            "coordY": nodule_pt_1[1],
            "coordZ": nodule_pt_1[2],
            "class": 1
        },
        {
            "seriesuid": "SYNTH_SCAN_001",
            "coordX": nodule_pt_1[0] - 20.0,
            "coordY": nodule_pt_1[1] + 15.0,
            "coordZ": nodule_pt_1[2],
            "class": 0
        },
        {
            "seriesuid": "SYNTH_SCAN_002",
            "coordX": nodule_pt_2[0],
            "coordY": nodule_pt_2[1],
            "coordZ": nodule_pt_2[2],
            "class": 1
        }
    ]
    df_cand = pd.DataFrame(candidates_data)
    df_cand.to_csv(os.path.join(out_raw, "candidates.csv"), index=False)

    print(f"Generated: {mhd_1} & {mhd_2}")
    print(f"Generated test CSVs in: {out_raw}")

if __name__ == "__main__":
    main()
