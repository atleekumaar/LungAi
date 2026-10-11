"""
Tests for Candidate Evaluation Metrics:
- Accuracy, Precision, Recall, F1 score
- ROC-AUC calculation
- Threshold sweep evaluation
- Single-class and edge cases
"""
import pytest
import numpy as np

from ml.evaluation.metrics import compute_classification_metrics, threshold_sweep

def test_metrics_perfect_predictions():
    y_true = np.array([1, 1, 0, 0])
    y_scores = np.array([0.9, 0.8, 0.1, 0.2])

    res = compute_classification_metrics(y_true, y_scores, threshold=0.5)
    assert res["accuracy"] == 1.0
    assert res["precision"] == 1.0
    assert res["recall"] == 1.0
    assert res["f1_score"] == 1.0
    assert res["roc_auc"] == 1.0
    assert res["true_positives"] == 2
    assert res["true_negatives"] == 2

def test_metrics_imperfect_predictions():
    y_true = np.array([1, 1, 0, 0])
    y_scores = np.array([0.9, 0.3, 0.8, 0.1]) # one FN (score 0.3), one FP (score 0.8)

    res = compute_classification_metrics(y_true, y_scores, threshold=0.5)
    assert res["true_positives"] == 1
    assert res["false_positives"] == 1
    assert res["true_negatives"] == 1
    assert res["false_negatives"] == 1
    assert res["precision"] == 0.5
    assert res["recall"] == 0.5
    assert res["f1_score"] == 0.5

def test_single_class_auc_safe_handling():
    # Only negatives present
    y_true = np.array([0, 0, 0])
    y_scores = np.array([0.1, 0.2, 0.3])

    res = compute_classification_metrics(y_true, y_scores)
    # AUC should be None because positive rank cannot be compared
    assert res["roc_auc"] is None
    assert res["num_samples"] == 3

def test_threshold_sweep():
    y_true = np.array([1, 1, 0, 0])
    y_scores = np.array([0.9, 0.7, 0.4, 0.2])

    sweep = threshold_sweep(y_true, y_scores, thresholds=[0.3, 0.5, 0.8])
    assert len(sweep) == 3
    # At th=0.3, FP is 1
    assert sweep[0]["threshold"] == 0.3
    # At th=0.5, TP is 2, FP is 0
    assert sweep[1]["true_positives"] == 2
    assert sweep[1]["false_positives"] == 0
