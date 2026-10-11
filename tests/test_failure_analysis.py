"""
Unit tests for Model Failure Analysis:
- High-confidence and borderline false positives
- Missed reference nodules
- Stratified sensitivity across nodule diameter bins (<5mm, 5-10mm, >=10mm)
"""
import pytest

from ml.evaluation.failure_analysis import (
    analyze_model_failures,
    generate_markdown_evaluation_report
)

def test_failure_analysis_categorization():
    gt = {
        "SCAN_1": [
            {"coord_x": 0.0, "coord_y": 0.0, "coord_z": 0.0, "diameter_mm": 4.0}, # small
            {"coord_x": 50.0, "coord_y": 50.0, "coord_z": 50.0, "diameter_mm": 12.0} # large (missed)
        ]
    }
    preds = {
        "SCAN_1": [
            # True positive on small nodule
            {"candidate_id": "C1", "coord_x": 0.5, "coord_y": 0.0, "coord_z": 0.0, "score": 0.9},
            # False positive far away
            {"candidate_id": "C2", "coord_x": 100.0, "coord_y": 100.0, "coord_z": 100.0, "score": 0.85}
        ]
    }

    res = analyze_model_failures(gt, preds, threshold=0.5)

    assert res["total_reference_nodules"] == 2
    assert res["total_detected_nodules"] == 1
    assert res["total_missed_nodules"] == 1
    assert res["total_false_positives"] == 1

    # Check diameter stratification
    diam_perf = res["performance_by_diameter"]
    assert diam_perf["small_lt_5mm"]["total_nodules"] == 1
    assert diam_perf["small_lt_5mm"]["detected_nodules"] == 1
    assert diam_perf["small_lt_5mm"]["sensitivity"] == 1.0

    assert diam_perf["large_gte_10mm"]["total_nodules"] == 1
    assert diam_perf["large_gte_10mm"]["detected_nodules"] == 0
    assert diam_perf["large_gte_10mm"]["sensitivity"] == 0.0

    # Test Markdown generation
    md = generate_markdown_evaluation_report(
        eval_summary={"threshold": 0.5, "cpm_score": 0.5},
        failure_analysis=res,
        metadata={"architecture": "3D CNN", "checkpoint_path": "model.pt"}
    )
    assert "# LungAI Model Evaluation & Failure Analysis Report" in md
    assert "large_gte_10mm" in md
