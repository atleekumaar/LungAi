"""
Tests for LUNA16 dataset parsing, manifest generation, and scan-level splits (data leakage check).
"""
import pytest
import os
import tempfile
import pandas as pd

from ml.data.luna16_parser import DatasetParser
from ml.data.manifest import create_scan_level_splits, generate_dataset_manifest

def test_annotation_csv_parsing():
    with tempfile.TemporaryDirectory() as tmpdir:
        csv_path = os.path.join(tmpdir, "annotations.csv")
        data = {
            "seriesuid": ["1.3.6.1.4.1", "1.3.6.1.4.2", "invalid_row"],
            "coordX": [10.5, -20.0, None],
            "coordY": [20.5, 30.0, 40.0],
            "coordZ": [-100.0, -120.0, 50.0],
            "diameter_mm": [12.4, 0.0, 5.0]  # second has 0.0 (non-positive), third has None
        }
        pd.DataFrame(data).to_csv(csv_path, index=False)

        anns, stats = DatasetParser.load_annotations(csv_path)
        assert len(anns) == 1
        assert anns[0].seriesuid == "1.3.6.1.4.1"
        assert stats["rejected_rows"] == 2

def test_scan_level_splits_leakage_prevention():
    scan_ids = [f"SCAN_{i:03d}" for i in range(100)]
    
    splits = create_scan_level_splits(scan_ids, train_ratio=0.7, val_ratio=0.15, test_ratio=0.15, seed=123)
    
    train_set = set(splits["train"])
    val_set = set(splits["val"])
    test_set = set(splits["test"])

    # Strict isolation: intersection must be completely empty
    assert len(train_set.intersection(val_set)) == 0
    assert len(train_set.intersection(test_set)) == 0
    assert len(val_set.intersection(test_set)) == 0

    assert len(train_set) == 70
    assert len(val_set) == 15
    assert len(test_set) == 15

def test_missing_csv_handling():
    with pytest.raises(FileNotFoundError):
        DatasetParser.load_annotations("non_existent_annotations.csv")
