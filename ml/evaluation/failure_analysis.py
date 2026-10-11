"""
Failure analysis and error reporting module:
- Categorization of false positives (high-score non-nodules)
- Missed reference nodules (false negatives)
- Performance stratified by nodule diameter bins (<5mm, 5-10mm, >10mm)
- Borderline / low-confidence candidate diagnosis
- JSON and Markdown reporting
"""
from typing import List, Dict, Any, Optional
import numpy as np

def analyze_model_failures(
    ground_truth_nodules: Dict[str, List[Dict[str, Any]]],
    predictions: Dict[str, List[Dict[str, Any]]],
    threshold: float = 0.5,
    match_radius_factor: float = 1.0
) -> Dict[str, Any]:
    """
    Performs deep clinical error categorization on predictions.
    """
    false_positives: List[Dict[str, Any]] = []
    detected_nodule_keys = set()
    all_gt_nodules: List[Dict[str, Any]] = []

    # Flatten and identify ground truth
    for sid, nodules in ground_truth_nodules.items():
        for i, n in enumerate(nodules):
            nodule_key = f"{sid}_nodule_{i}"
            all_gt_nodules.append({
                "key": nodule_key,
                "seriesuid": sid,
                "coord_x": n["coord_x"],
                "coord_y": n["coord_y"],
                "coord_z": n["coord_z"],
                "diameter_mm": n.get("diameter_mm", 0.0)
            })

    # Evaluate each prediction against ground truth
    for sid, preds in predictions.items():
        gts = [g for g in all_gt_nodules if g["seriesuid"] == sid]
        for p in preds:
            score = p.get("score", 0.0)
            if score < threshold:
                continue # Below operating threshold

            px, py, pz = p["coord_x"], p["coord_y"], p["coord_z"]
            matched_gt = None
            min_dist = float("inf")

            for gt in gts:
                dist = np.sqrt((px - gt["coord_x"])**2 + (py - gt["coord_y"])**2 + (pz - gt["coord_z"])**2)
                rad = max(gt["diameter_mm"] / 2.0, 1.0) * match_radius_factor
                if dist <= rad and dist < min_dist:
                    min_dist = dist
                    matched_gt = gt

            if matched_gt is not None:
                detected_nodule_keys.add(matched_gt["key"])
            else:
                false_positives.append({
                    "candidate_id": p.get("candidate_id", "unknown"),
                    "seriesuid": sid,
                    "coord_x": px,
                    "coord_y": py,
                    "coord_z": pz,
                    "model_score": score,
                    "category": "high_confidence_fp" if score >= 0.75 else "borderline_fp"
                })

    # Identify false negatives (missed nodules)
    missed_nodules: List[Dict[str, Any]] = []
    detected_nodules: List[Dict[str, Any]] = []

    for gt in all_gt_nodules:
        if gt["key"] in detected_nodule_keys:
            detected_nodules.append(gt)
        else:
            missed_nodules.append({
                "seriesuid": gt["seriesuid"],
                "coord_x": gt["coord_x"],
                "coord_y": gt["coord_y"],
                "coord_z": gt["coord_z"],
                "diameter_mm": gt["diameter_mm"],
                "reason": "Unmatched or candidate below classification threshold"
            })

    # Stratify sensitivity by diameter bins: Small (<5mm), Medium (5-10mm), Large (>=10mm)
    bins = {
        "small_lt_5mm": {"total": 0, "detected": 0},
        "medium_5_to_10mm": {"total": 0, "detected": 0},
        "large_gte_10mm": {"total": 0, "detected": 0}
    }

    for gt in all_gt_nodules:
        diam = gt["diameter_mm"]
        if diam < 5.0:
            b = "small_lt_5mm"
        elif diam < 10.0:
            b = "medium_5_to_10mm"
        else:
            b = "large_gte_10mm"

        bins[b]["total"] += 1
        if gt["key"] in detected_nodule_keys:
            bins[b]["detected"] += 1

    diameter_performance = {}
    for b_key, b_val in bins.items():
        total = b_val["total"]
        det = b_val["detected"]
        diameter_performance[b_key] = {
            "total_nodules": total,
            "detected_nodules": det,
            "sensitivity": float(det / total) if total > 0 else 0.0
        }

    return {
        "operating_threshold": threshold,
        "total_reference_nodules": len(all_gt_nodules),
        "total_detected_nodules": len(detected_nodules),
        "total_missed_nodules": len(missed_nodules),
        "total_false_positives": len(false_positives),
        "performance_by_diameter": diameter_performance,
        "false_positives": sorted(false_positives, key=lambda x: x["model_score"], reverse=True),
        "missed_nodules": missed_nodules
    }

def generate_markdown_evaluation_report(
    eval_summary: Dict[str, Any],
    failure_analysis: Dict[str, Any],
    metadata: Dict[str, Any]
) -> str:
    """
    Generates a human-readable clinical research report in Markdown.
    """
    lines = [
        "# LungAI Model Evaluation & Failure Analysis Report",
        f"**Date:** {metadata.get('timestamp', 'N/A')}",
        f"**Model Architecture:** `{metadata.get('architecture', 'N/A')}`",
        f"**Checkpoint Hash / Path:** `{metadata.get('checkpoint_path', 'N/A')}`",
        f"**Dataset Split / Provenance:** {metadata.get('dataset_provenance', 'N/A')}",
        "",
        "---",
        "## 1. Candidate Classification Metrics",
        f"- **Operating Threshold:** {eval_summary.get('threshold', 0.5):.2f}",
        f"- **Accuracy:** {eval_summary.get('accuracy', 0.0):.4f}",
        f"- **Sensitivity / Recall:** {eval_summary.get('recall', 0.0):.4f}",
        f"- **Precision:** {eval_summary.get('precision', 0.0):.4f}",
        f"- **F1 Score:** {eval_summary.get('f1_score', 0.0):.4f}",
        f"- **ROC-AUC:** {eval_summary.get('roc_auc', 'N/A')}",
        "",
        "---",
        "## 2. LUNA16 FROC & Competition Performance Metric (CPM)",
        f"- **CPM Score:** {eval_summary.get('cpm_score', 'N/A')}",
        "",
        "| Operating Point (FPs/Scan) | Sensitivity |",
        "|---|---|"
    ]

    sens_at_fps = eval_summary.get("sensitivities_at_fp_per_scan", {})
    for fp_pt, sens in sens_at_fps.items():
        lines.append(f"| {fp_pt} | {sens:.4f} |")

    lines.extend([
        "",
        "---",
        "## 3. Stratified Sensitivity by Nodule Diameter",
        "| Diameter Category | Reference Count | Detected | Sensitivity |",
        "|---|---|---|---|"
    ])

    diam_perf = failure_analysis.get("performance_by_diameter", {})
    for category, stats in diam_perf.items():
        lines.append(f"| {category} | {stats['total_nodules']} | {stats['detected_nodules']} | {stats['sensitivity']:.2%} |")

    lines.extend([
        "",
        "---",
        "## 4. Failure Summary & Diagnostic Limitations",
        f"- **Total False Positives:** {failure_analysis.get('total_false_positives', 0)}",
        f"- **Total Missed Nodules:** {failure_analysis.get('total_missed_nodules', 0)}",
        "",
        "> **Important Disclaimer:** LungAI is an academic research prototype. Evaluation results "
        "measure candidate-classification capabilities and do not represent autonomous whole-volume "
        "nodule detection or clinical diagnostic validity."
    ])

    return "\n".join(lines)
