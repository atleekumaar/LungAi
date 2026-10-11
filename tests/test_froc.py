"""
Unit tests for LUNA16 FROC & CPM Evaluation Protocol:
- Physical distance matching logic
- Multiple detection / duplicate detection handling
- False positive counting
- Per-scan aggregation
- Empty scan and empty predictions edge cases
- Free-response ROC curve and CPM score calculation
"""
import pytest
import numpy as np

from ml.evaluation.froc import (
    Luna16FROCEvaluator,
    GroundTruthNodule,
    PredictedCandidate,
    MatchResult
)

def test_single_nodule_exact_hit():
    gt = [GroundTruthNodule(seriesuid="SCAN_1", coord_x=10.0, coord_y=20.0, coord_z=30.0, diameter_mm=6.0)]
    preds = [PredictedCandidate(candidate_id="C1", seriesuid="SCAN_1", coord_x=10.0, coord_y=20.0, coord_z=30.0, score=0.95)]

    evaluator = Luna16FROCEvaluator()
    matches, n_gt = evaluator.match_scan_predictions(gt, preds)

    assert n_gt == 1
    assert len(matches) == 1
    assert matches[0].is_tp is True
    assert matches[0].is_duplicate is False
    assert matches[0].distance_to_nodule_mm == 0.0

def test_multiple_hits_duplicate_detection():
    # If two predictions match the same nodule, highest score is TP, second is duplicate
    gt = [GroundTruthNodule(seriesuid="SCAN_1", coord_x=0.0, coord_y=0.0, coord_z=0.0, diameter_mm=10.0)] # radius 5mm
    preds = [
        PredictedCandidate(candidate_id="C1", seriesuid="SCAN_1", coord_x=1.0, coord_y=0.0, coord_z=0.0, score=0.9),
        PredictedCandidate(candidate_id="C2", seriesuid="SCAN_1", coord_x=2.0, coord_y=0.0, coord_z=0.0, score=0.6)
    ]

    evaluator = Luna16FROCEvaluator()
    matches, n_gt = evaluator.match_scan_predictions(gt, preds)

    assert len(matches) == 2
    # C1 is highest score -> TP
    assert matches[0].predicted_candidate_id == "C1"
    assert matches[0].is_tp is True
    assert matches[0].is_duplicate is False

    # C2 is duplicate -> not TP and flagged duplicate
    assert matches[1].predicted_candidate_id == "C2"
    assert matches[1].is_tp is False
    assert matches[1].is_duplicate is True

def test_unmatched_prediction_is_false_positive():
    gt = [GroundTruthNodule(seriesuid="SCAN_1", coord_x=0.0, coord_y=0.0, coord_z=0.0, diameter_mm=4.0)] # radius 2mm
    # Candidate far away (dist = 50mm)
    preds = [PredictedCandidate(candidate_id="C1", seriesuid="SCAN_1", coord_x=50.0, coord_y=0.0, coord_z=0.0, score=0.8)]

    evaluator = Luna16FROCEvaluator()
    matches, n_gt = evaluator.match_scan_predictions(gt, preds)

    assert len(matches) == 1
    assert matches[0].is_tp is False
    assert matches[0].is_duplicate is False
    assert matches[0].matched_nodule_id is None

def test_empty_predictions_and_scans():
    evaluator = Luna16FROCEvaluator()

    # Empty predictions
    gt = [GroundTruthNodule(seriesuid="SCAN_1", coord_x=0.0, coord_y=0.0, coord_z=0.0, diameter_mm=5.0)]
    matches, n_gt = evaluator.match_scan_predictions(gt, [])
    assert len(matches) == 0
    assert n_gt == 1

    # Empty ground truth
    preds = [PredictedCandidate(candidate_id="C1", seriesuid="SCAN_1", coord_x=0.0, coord_y=0.0, coord_z=0.0, score=0.5)]
    matches, n_gt = evaluator.match_scan_predictions([], preds)
    assert len(matches) == 1
    assert matches[0].is_tp is False

def test_dataset_froc_cpm_calculation():
    # 2 scans, each with 1 nodule
    gt_map = {
        "S1": [GroundTruthNodule("S1", 0.0, 0.0, 0.0, 6.0)],
        "S2": [GroundTruthNodule("S2", 10.0, 10.0, 10.0, 6.0)]
    }

    # S1 has TP at score 0.9. S2 has TP at score 0.8 and 1 FP at score 0.4
    pred_map = {
        "S1": [PredictedCandidate("C1", "S1", 0.0, 0.0, 0.0, 0.9)],
        "S2": [
            PredictedCandidate("C2", "S2", 10.0, 10.0, 10.0, 0.8),
            PredictedCandidate("C3", "S2", 100.0, 100.0, 100.0, 0.4)
        ]
    }

    evaluator = Luna16FROCEvaluator()
    res = evaluator.evaluate_dataset(gt_map, pred_map, num_total_scans=2)

    assert res["total_ground_truth_nodules"] == 2
    assert res["total_true_positives"] == 2
    assert res["total_false_positives"] == 1
    assert res["cpm_score"] is not None
    # Both nodules detected at high thresholds before FP
    assert res["cpm_score"] == 1.0
