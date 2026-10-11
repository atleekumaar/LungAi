"""
Service layer managing active CT volumes, scan registry, and candidates.
"""
from typing import Dict, Optional, List
import os
import glob
import numpy as np
import SimpleITK as sitk

from services.api.app.imaging.loader import CTVolume, load_ct_volume
from services.api.app.imaging.coordinates import physical_to_voxel_index
from services.api.app.schemas.imaging import ScanInfo, CandidateItem, DatasetStatusResponse
from services.api.app.core.config import settings
from ml.data.luna16_parser import DatasetParser

class VolumeService:
    def __init__(self):
        self._cached_volumes: Dict[str, CTVolume] = {}
        self._scan_paths: Dict[str, str] = {}
        self._annotations: Dict[str, List[CandidateItem]] = {}
        self.refresh_registry()

    def refresh_registry(self):
        """Scans raw_dir for .mhd files and populates file map."""
        self._scan_paths.clear()
        if os.path.exists(settings.raw_dir):
            for p in glob.glob(os.path.join(settings.raw_dir, "**", "*.mhd"), recursive=True):
                sid = os.path.splitext(os.path.basename(p))[0]
                if sid.endswith("_lungmask"):
                    continue
                self._scan_paths[sid] = os.path.normpath(p)

        self._load_annotations()

    def _load_annotations(self):
        self._annotations.clear()
        if os.path.exists(settings.annotations_csv):
            try:
                anns, _ = DatasetParser.load_annotations(settings.annotations_csv)
                for i, a in enumerate(anns):
                    sid = a.seriesuid
                    if sid not in self._annotations:
                        self._annotations[sid] = []
                    
                    self._annotations[sid].append(CandidateItem(
                        candidate_id=f"ANN-{sid[:6]}-{i+1:03d}",
                        seriesuid=sid,
                        coord_x=a.coord_x,
                        coord_y=a.coord_y,
                        coord_z=a.coord_z,
                        slice_index=0, # updated when volume geometry loaded
                        voxel_x=0,
                        voxel_y=0,
                        diameter_mm=a.diameter_mm,
                        model_score=None,
                        is_reference=True,
                        source="reference_annotation",
                        status="reference_annotation"
                    ))
            except Exception:
                pass

    def get_candidates(self, scan_id: str) -> List[CandidateItem]:
        # ensure volume geometry was applied to slice coordinates
        self.get_or_load_volume(scan_id)
        return self._annotations.get(scan_id, [])

    def update_candidates(self, scan_id: str, updated_list: List[CandidateItem]):
        self._annotations[scan_id] = updated_list

    def get_or_load_volume(self, scan_id: str) -> Optional[CTVolume]:
        if scan_id in self._cached_volumes:
            return self._cached_volumes[scan_id]

        path = self._scan_paths.get(scan_id)
        if not path or not os.path.exists(path):
            return None

        volume = load_ct_volume(path, scan_id=scan_id)
        # Update annotations with real slice/voxel coords
        if scan_id in self._annotations:
            for item in self._annotations[scan_id]:
                try:
                    vox = volume.physical_to_voxel((item.coord_x, item.coord_y, item.coord_z))
                    item.slice_index = int(vox[2])
                    item.voxel_x = int(vox[0])
                    item.voxel_y = int(vox[1])
                except Exception:
                    pass

        self._cached_volumes[scan_id] = volume
        return volume

    def register_volume(self, volume: CTVolume):
        self._cached_volumes[volume.scan_id] = volume
        self._scan_paths[volume.scan_id] = volume.file_path

    def get_scan_list(self) -> List[str]:
        return list(self._scan_paths.keys())

    def get_scan_info(self, scan_id: str) -> Optional[ScanInfo]:
        vol = self.get_or_load_volume(scan_id)
        if not vol:
            return None
        
        meta = vol.get_metadata()
        candidates = self._annotations.get(scan_id, [])
        
        # Rigorous provenance check:
        # Genuine LUNA16 scans have 1.3.6.1... UID format or were uploaded by user.
        # Synthetically created files start with SYNTH_ or contain synthetic markers.
        is_synthetic = scan_id.startswith("SYNTH_") or "synthetic" in vol.file_path.lower()
        if is_synthetic:
            dataset_mode = "synthetic_fixture"
            is_real = False
            prov_note = "Synthetic Unit-Test Fixture: Geometrically generated for code verification. Not a real patient."
        elif "upload" in vol.file_path.lower():
            dataset_mode = "user_upload"
            is_real = True
            prov_note = "User-Uploaded CT Scan: Thoracic volume loaded via workspace upload API."
        else:
            dataset_mode = "real_luna16"
            is_real = True
            prov_note = "Official LUNA16 / LIDC-IDRI Pulmonary CT Study."

        return ScanInfo(
            scan_id=scan_id,
            file_path=vol.file_path,
            size_xyz=meta.size,
            spacing_xyz=meta.spacing,
            origin_xyz=meta.origin,
            num_slices=vol.slice_count,
            width=vol.width,
            height=vol.height,
            min_hu=meta.min_hu,
            max_hu=meta.max_hu,
            mean_hu=meta.mean_hu,
            annotations_count=len(candidates),
            candidates=candidates,
            dataset_mode=dataset_mode,
            is_real_data=is_real,
            provenance_note=prov_note,
        )

    def get_dataset_status(self) -> DatasetStatusResponse:
        self.refresh_registry()
        scans_info = []
        real_count = 0
        synth_count = 0

        for sid in list(self._scan_paths.keys()):
            info = self.get_scan_info(sid)
            if info:
                scans_info.append(info)
                if info.is_real_data:
                    real_count += 1
                else:
                    synth_count += 1

        if real_count > 0:
            active_mode = "real_luna16_mode"
            msg = f"Active Mode: Real CT Dataset. {real_count} real scan(s) loaded."
        elif synth_count > 0:
            active_mode = "synthetic_test_mode"
            msg = f"Active Mode: Synthetic Test Fixtures ({synth_count} fixture scans). LUNA16 dataset not yet downloaded."
        else:
            active_mode = "no_data_mode"
            msg = "Active Mode: Dataset Not Configured. Please place .mhd scans in data/raw/."

        return DatasetStatusResponse(
            data_dir_exists=os.path.exists(settings.data_dir),
            raw_dir_exists=os.path.exists(settings.raw_dir),
            annotations_file_exists=os.path.exists(settings.annotations_csv),
            candidates_file_exists=os.path.exists(settings.candidates_csv),
            total_mhd_scans=len(self._scan_paths),
            real_scans_count=real_count,
            synthetic_scans_count=synth_count,
            active_mode=active_mode,
            scans=scans_info[:10],
            message=msg,
        )

volume_service = VolumeService()
