"""
Evaluation metrics for Pulmonary Nodule Candidate Classification.
Computes ROC-AUC, precision, recall, F1, confusion matrix, and threshold sweeps.
Explicitly distinguishes candidate-classification metrics from whole-volume LUNA16 FROC detection.
"""
from typing import Dict, Any, List, Optional
import numpy as np

def compute_classification_metrics(
    y_true: np.ndarray,
    y_scores: np.ndarray,
    threshold: float = 0.5
) -> Dict[str, Any]:
    """
    Computes candidate-level classification metrics:
    - true_positives, false_positives, true_negatives, false_negatives
    - accuracy, precision, recall, f1_score
    - roc_auc (when both classes are present)
    """
    y_true = np.asarray(y_true).astype(int).flatten()
    y_scores = np.asarray(y_scores).astype(float).flatten()

    if len(y_true) != len(y_scores):
        raise ValueError(f"Length mismatch: y_true ({len(y_true)}) != y_scores ({len(y_scores)})")

    n_samples = len(y_true)
    if n_samples == 0:
        return {
            "num_samples": 0,
            "error": "Empty evaluation dataset"
        }

    y_pred = (y_scores >= threshold).astype(int)

    tp = int(np.sum((y_pred == 1) & (y_true == 1)))
    fp = int(np.sum((y_pred == 1) & (y_true == 0)))
    tn = int(np.sum((y_pred == 0) & (y_true == 0)))
    fn = int(np.sum((y_pred == 0) & (y_true == 1)))

    precision = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
    recall = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
    f1 = float(2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    accuracy = float((tp + tn) / n_samples)

    # Compute ROC-AUC safely
    pos_count = int(np.sum(y_true == 1))
    neg_count = int(np.sum(y_true == 0))
    roc_auc = None

    if pos_count > 0 and neg_count > 0:
        # Rank-based Mann-Whitney U test calculation for AUC
        order = np.argsort(y_scores)
        ranks = np.empty_like(order, dtype=float)
        ranks[order] = np.arange(len(order)) + 1.0

        pos_ranks = ranks[y_true == 1]
        sum_pos_ranks = np.sum(pos_ranks)
        u_stat = sum_pos_ranks - (pos_count * (pos_count + 1)) / 2.0
        roc_auc = float(u_stat / (pos_count * neg_count))

    return {
        "num_samples": n_samples,
        "positive_count": pos_count,
        "negative_count": neg_count,
        "threshold": float(threshold),
        "true_positives": tp,
        "false_positives": fp,
        "true_negatives": tn,
        "false_negatives": fn,
        "precision": precision,
        "recall": recall,
        "f1_score": f1,
        "accuracy": accuracy,
        "roc_auc": roc_auc,
        "note": "Candidate-classification metrics only; does not represent full-volume detection or clinical risk."
    }

def threshold_sweep(
    y_true: np.ndarray,
    y_scores: np.ndarray,
    thresholds: Optional[List[float]] = None
) -> List[Dict[str, Any]]:
    """
    Evaluates candidate metrics across a range of classification thresholds.
    """
    if thresholds is None:
        thresholds = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]

    results = []
    for th in thresholds:
        metrics = compute_classification_metrics(y_true, y_scores, threshold=th)
        results.append(metrics)
    return results
