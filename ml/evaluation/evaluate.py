"""
Evaluation Runner Script for LUNA16 Candidate Classifier.
Executes locked test split or dataset evaluation, computes FROC/CPM,
runs failure analysis, and saves versioned JSON/CSV/MD evaluation artifacts.
"""
import os
import sys
import json
import glob
import time
import argparse
from typing import Dict, Any, List
import pandas as pd
import numpy as np

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from services.api.app.services.model_service import model_service
from services.api.app.services.volume_service import volume_service
from services.api.app.imaging.patch_extractor import extract_candidate_patch
from ml.data.luna16_parser import DatasetParser
from ml.data.manifest import create_scan_level_splits
from ml.evaluation.metrics import compute_classification_metrics, threshold_sweep
from ml.evaluation.froc import (
    Luna16FROCEvaluator,
    GroundTruthNodule,
    PredictedCandidate
)
from ml.evaluation.failure_analysis import (
    analyze_model_failures,
    generate_markdown_evaluation_report
)

def run_evaluation_pipeline(
    raw_dir: str = "./data/raw",
    annotations_csv: str = "./data/raw/annotations.csv",
    candidates_csv: str = "./data/raw/candidates.csv",
    output_dir: str = "./artifacts/evaluation",
    threshold: float = 0.5,
    split_manifest_path: str = "./data/splits_manifest.json"
) -> Dict[str, Any]:
    """
    Executes full evaluation on available test scans.
    """
    os.makedirs(output_dir, exist_ok=True)

    if not model_service.is_ready:
        raise RuntimeError("Model checkpoint is not loaded. Train a model first via `python ml/training/train.py`.")

    # 1. Discover CT scans
    mhd_files = glob.glob(os.path.join(raw_dir, "**", "*.mhd"), recursive=True)
    scan_paths = {os.path.splitext(os.path.basename(f))[0]: os.path.normpath(f) for f in mhd_files}

    if not scan_paths:
        raise FileNotFoundError(f"No CT scans found in {raw_dir}")

    # Determine test scans from splits manifest if available
    eval_scans = list(scan_paths.keys())
    if os.path.exists(split_manifest_path):
        try:
            with open(split_manifest_path, "r", encoding="utf-8") as f:
                split_data = json.load(f)
            test_scans = split_data.get("test", [])
            # If test split is non-empty, use test scans for locked evaluation
            if test_scans:
                eval_scans = [s for s in test_scans if s in scan_paths]
        except Exception:
            pass

    if not eval_scans:
        eval_scans = list(scan_paths.keys())

    # 2. Ingest annotations
    annotations, _ = DatasetParser.load_annotations(annotations_csv)
    gt_by_series: Dict[str, List[GroundTruthNodule]] = {}
    gt_dict_by_series: Dict[str, List[Dict[str, Any]]] = {}

    for a in annotations:
        if a.seriesuid not in eval_scans:
            continue
        if a.seriesuid not in gt_by_series:
            gt_by_series[a.seriesuid] = []
            gt_dict_by_series[a.seriesuid] = []

        gt_by_series[a.seriesuid].append(GroundTruthNodule(
            seriesuid=a.seriesuid,
            coord_x=a.coord_x,
            coord_y=a.coord_y,
            coord_z=a.coord_z,
            diameter_mm=a.diameter_mm
        ))
        gt_dict_by_series[a.seriesuid].append({
            "coord_x": a.coord_x,
            "coord_y": a.coord_y,
            "coord_z": a.coord_z,
            "diameter_mm": a.diameter_mm
        })

    # 3. Ingest candidates
    candidates, _ = DatasetParser.load_candidates(candidates_csv)
    cands_to_eval = [c for c in candidates if c.seriesuid in eval_scans]

    if not cands_to_eval:
        raise ValueError("No candidates found in evaluation scans.")

    # 4. Score all candidates using model
    print(f"Scoring {len(cands_to_eval)} candidate proposals across {len(eval_scans)} scan(s)...")
    predicted_candidates_by_series: Dict[str, List[PredictedCandidate]] = {}
    pred_dict_by_series: Dict[str, List[Dict[str, Any]]] = {}
    y_true = []
    y_scores = []
    scored_records = []

    for idx, c in enumerate(cands_to_eval):
        vol = volume_service.get_or_load_volume(c.seriesuid)
        patch_res = extract_candidate_patch(
            sitk_image=vol.sitk_image,
            center_physical=(c.coord_x, c.coord_y, c.coord_z),
            patch_size_voxels=(32, 32, 32),
            scan_id=c.seriesuid
        )
        score = model_service.score_patch(patch_res.patch_array)

        cand_obj = PredictedCandidate(
            candidate_id=f"CAND-{c.seriesuid[:6]}-{idx+1:03d}",
            seriesuid=c.seriesuid,
            coord_x=c.coord_x,
            coord_y=c.coord_y,
            coord_z=c.coord_z,
            score=score,
            diameter_mm=c.diameter_mm
        )

        if c.seriesuid not in predicted_candidates_by_series:
            predicted_candidates_by_series[c.seriesuid] = []
            pred_dict_by_series[c.seriesuid] = []

        predicted_candidates_by_series[c.seriesuid].append(cand_obj)
        pred_dict_by_series[c.seriesuid].append({
            "candidate_id": cand_obj.candidate_id,
            "coord_x": c.coord_x,
            "coord_y": c.coord_y,
            "coord_z": c.coord_z,
            "score": score
        })

        y_true.append(c.class_label)
        y_scores.append(score)
        scored_records.append({
            "candidate_id": cand_obj.candidate_id,
            "seriesuid": c.seriesuid,
            "coord_x": c.coord_x,
            "coord_y": c.coord_y,
            "coord_z": c.coord_z,
            "class_label": c.class_label,
            "model_score": score
        })

    # 5. Compute Classification Metrics
    class_metrics = compute_classification_metrics(np.array(y_true), np.array(y_scores), threshold=threshold)
    sweep_results = threshold_sweep(np.array(y_true), np.array(y_scores))

    # 6. Compute LUNA16 FROC & CPM
    froc_evaluator = Luna16FROCEvaluator()
    froc_results = froc_evaluator.evaluate_dataset(
        ground_truths=gt_by_series,
        predictions=predicted_candidates_by_series,
        num_total_scans=len(eval_scans)
    )

    # 7. Compute Failure Analysis
    failure_analysis = analyze_model_failures(
        ground_truth_nodules=gt_dict_by_series,
        predictions=pred_dict_by_series,
        threshold=threshold
    )

    # 8. Assemble Full Report Artifact
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
    metadata = {
        "timestamp": timestamp,
        "model_architecture": model_service.model_metadata.get("architecture"),
        "model_version": model_service.model_metadata.get("version"),
        "checkpoint_path": model_service.model_metadata.get("checkpoint_path"),
        "dataset_provenance": "LUNA16 Evaluation Protocol",
        "total_evaluated_scans": len(eval_scans),
        "total_candidates": len(cands_to_eval)
    }

    report_artifact = {
        "metadata": metadata,
        "classification_metrics": class_metrics,
        "threshold_sweep": sweep_results,
        "froc_evaluation": froc_results,
        "failure_analysis": failure_analysis
    }

    # Save outputs (JSON, CSV, MD)
    json_path = os.path.join(output_dir, "evaluation_summary.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report_artifact, f, indent=2)

    csv_path = os.path.join(output_dir, "scored_candidates.csv")
    pd.DataFrame(scored_records).to_csv(csv_path, index=False)

    md_path = os.path.join(output_dir, "evaluation_report.md")
    md_content = generate_markdown_evaluation_report(
        eval_summary={**class_metrics, **froc_results},
        failure_analysis=failure_analysis,
        metadata=metadata
    )
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)

    print(f"Evaluation complete! Results saved to {output_dir}")
    print(f"CPM: {froc_results.get('cpm_score')} | Accuracy: {class_metrics.get('accuracy'):.2f} | F1: {class_metrics.get('f1_score'):.2f}")
    return report_artifact

def main():
    parser = argparse.ArgumentParser(description="LungAI Research-Grade Evaluation Pipeline")
    parser.add_argument("--raw-dir", type=str, default="./data/raw")
    parser.add_argument("--annotations-csv", type=str, default="./data/raw/annotations.csv")
    parser.add_argument("--candidates-csv", type=str, default="./data/raw/candidates.csv")
    parser.add_argument("--output-dir", type=str, default="./artifacts/evaluation")
    parser.add_argument("--threshold", type=float, default=0.5)

    args = parser.parse_args()
    run_evaluation_pipeline(
        raw_dir=args.raw_dir,
        annotations_csv=args.annotations_csv,
        candidates_csv=args.candidates_csv,
        output_dir=args.output_dir,
        threshold=args.threshold
    )

if __name__ == "__main__":
    main()
