"""
LUNA16 Official Evaluation Protocol: Candidate Matching & FROC/CPM Evaluator.

Standard LUNA16 matching criteria:
- Reference nodules: nodules >= 3mm annotated by radiologists.
- Detection match condition: Euclidean distance between prediction physical (x, y, z)
  and reference nodule physical (x, y, z) <= max(radius, 5.0 mm) or radius_mm (diameter / 2).
  In standard LUNA16 evaluation, a detection is considered a True Positive if the distance to
  the center of a reference nodule is less than the nodule radius R = diameter_mm / 2.
- Duplicate rule: If multiple predictions match the same reference nodule, only the prediction
  with the highest confidence is considered True Positive. All other hits to that same nodule
  are ignored (do not count as false positives) or counted per official competition protocol.
- Predictions not matching any reference nodule count as False Positives (FPs).
- Evaluation operating points (FPs per scan): [0.125, 0.25, 0.5, 1, 2, 4, 8].
- Competition Performance Metric (CPM): Mean sensitivity across the 7 predefined operating points.
"""
from dataclasses import dataclass
from typing import List, Dict, Any, Tuple, Optional
import numpy as np

@dataclass
class GroundTruthNodule:
    seriesuid: str
    coord_x: float
    coord_y: float
    coord_z: float
    diameter_mm: float

    @property
    def radius_mm(self) -> float:
        return max(self.diameter_mm / 2.0, 1.0)

@dataclass
class PredictedCandidate:
    candidate_id: str
    seriesuid: str
    coord_x: float
    coord_y: float
    coord_z: float
    score: float
    diameter_mm: Optional[float] = None

@dataclass
class MatchResult:
    predicted_candidate_id: str
    seriesuid: str
    score: float
    is_tp: bool
    matched_nodule_id: Optional[str]
    distance_to_nodule_mm: Optional[float]
    is_duplicate: bool

class Luna16FROCEvaluator:
    """
    Evaluates nodule candidates against ground-truth annotations using the official LUNA16
    free-response ROC (FROC) methodology.
    """
    FROC_FP_POINTS: List[float] = [0.125, 0.25, 0.5, 1.0, 2.0, 4.0, 8.0]

    def __init__(self, match_radius_factor: float = 1.0):
        """
        match_radius_factor: Multiplier for nodule radius. Default 1.0 (distance <= radius_mm).
        """
        self.match_radius_factor = match_radius_factor

    def match_scan_predictions(
        self,
        gt_nodules: List[GroundTruthNodule],
        predictions: List[PredictedCandidate]
    ) -> Tuple[List[MatchResult], int]:
        """
        Matches candidates in a single scan to ground-truth nodules.
        Returns match results list and total ground truth nodules for this scan.
        """
        # Sort predictions by descending confidence score
        sorted_preds = sorted(predictions, key=lambda p: p.score, reverse=True)
        detected_nodules = set()
        results: List[MatchResult] = []

        for p in sorted_preds:
            best_dist = float("inf")
            best_gt_idx = None

            for idx, gt in enumerate(gt_nodules):
                dist = np.sqrt(
                    (p.coord_x - gt.coord_x) ** 2 +
                    (p.coord_y - gt.coord_y) ** 2 +
                    (p.coord_z - gt.coord_z) ** 2
                )
                match_threshold = gt.radius_mm * self.match_radius_factor
                if dist <= match_threshold:
                    if dist < best_dist:
                        best_dist = dist
                        best_gt_idx = idx

            if best_gt_idx is not None:
                nodule_id = f"{best_gt_idx}"
                if nodule_id not in detected_nodules:
                    # First and highest-score hit for this reference nodule -> True Positive
                    detected_nodules.add(nodule_id)
                    results.append(MatchResult(
                        predicted_candidate_id=p.candidate_id,
                        seriesuid=p.seriesuid,
                        score=p.score,
                        is_tp=True,
                        matched_nodule_id=nodule_id,
                        distance_to_nodule_mm=float(best_dist),
                        is_duplicate=False
                    ))
                else:
                    # Subsequent hit for an already detected nodule -> Duplicate detection
                    results.append(MatchResult(
                        predicted_candidate_id=p.candidate_id,
                        seriesuid=p.seriesuid,
                        score=p.score,
                        is_tp=False,
                        matched_nodule_id=nodule_id,
                        distance_to_nodule_mm=float(best_dist),
                        is_duplicate=True
                    ))
            else:
                # Unmatched -> False Positive
                results.append(MatchResult(
                    predicted_candidate_id=p.candidate_id,
                    seriesuid=p.seriesuid,
                    score=p.score,
                    is_tp=False,
                    matched_nodule_id=None,
                    distance_to_nodule_mm=None,
                    is_duplicate=False
                ))

        return results, len(gt_nodules)

    def evaluate_dataset(
        self,
        ground_truths: Dict[str, List[GroundTruthNodule]],
        predictions: Dict[str, List[PredictedCandidate]],
        num_total_scans: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Aggregates matches across all scans and calculates sensitivity at fixed FP/scan rates and CPM.
        """
        all_series = set(ground_truths.keys()).union(set(predictions.keys()))
        n_scans = num_total_scans or max(len(all_series), 1)

        total_gt_nodules = sum(len(gts) for gts in ground_truths.values())
        all_matches: List[MatchResult] = []
        per_scan_stats: Dict[str, Dict[str, Any]] = {}

        for sid in all_series:
            gts = ground_truths.get(sid, [])
            preds = predictions.get(sid, [])
            matches, n_gt = self.match_scan_predictions(gts, preds)
            all_matches.extend(matches)

            tp_count = sum(1 for m in matches if m.is_tp)
            fp_count = sum(1 for m in matches if not m.is_tp and not m.is_duplicate)
            per_scan_stats[sid] = {
                "seriesuid": sid,
                "ground_truth_count": n_gt,
                "predictions_count": len(preds),
                "true_positives": tp_count,
                "false_positives": fp_count,
                "duplicates": sum(1 for m in matches if m.is_duplicate),
                "scan_sensitivity": float(tp_count / n_gt) if n_gt > 0 else (1.0 if tp_count == 0 else 0.0)
            }

        if total_gt_nodules == 0:
            return {
                "error": "No ground-truth nodules present in evaluation set.",
                "total_scans": n_scans,
                "total_ground_truth_nodules": 0,
                "cpm_score": None,
                "froc_curve": [],
                "per_scan_stats": per_scan_stats
            }

        # Sort all candidates by descending score to generate FROC curve
        # Discard duplicate hits from false-positive accumulation (official protocol ignores duplicates)
        eval_candidates = [m for m in all_matches if not m.is_duplicate]
        eval_candidates.sort(key=lambda x: x.score, reverse=True)

        tp_accum = 0
        fp_accum = 0
        froc_points: List[Dict[str, float]] = []

        for c in eval_candidates:
            if c.is_tp:
                tp_accum += 1
            else:
                fp_accum += 1
            sens = tp_accum / total_gt_nodules
            fp_per_scan = fp_accum / n_scans
            froc_points.append({
                "threshold": c.score,
                "false_positives_per_scan": float(fp_per_scan),
                "sensitivity": float(sens),
                "tp_count": tp_accum,
                "fp_count": fp_accum
            })

        # Calculate sensitivities at the 7 predefined operating points
        sens_at_fp: Dict[str, float] = {}
        cpm_sum = 0.0

        for target_fp in self.FROC_FP_POINTS:
            # Find the highest sensitivity where fp_per_scan <= target_fp
            sens = 0.0
            for pt in froc_points:
                if pt["false_positives_per_scan"] <= target_fp:
                    sens = max(sens, pt["sensitivity"])
                else:
                    break
            sens_at_fp[f"{target_fp}"] = float(sens)
            cpm_sum += sens

        cpm_score = float(cpm_sum / len(self.FROC_FP_POINTS))

        return {
            "total_scans": n_scans,
            "total_ground_truth_nodules": total_gt_nodules,
            "total_evaluated_candidates": len(eval_candidates),
            "total_true_positives": tp_accum,
            "total_false_positives": fp_accum,
            "cpm_score": cpm_score,
            "sensitivities_at_fp_per_scan": sens_at_fp,
            "froc_operating_points": self.FROC_FP_POINTS,
            "froc_curve": froc_points,
            "per_scan_stats": per_scan_stats
        }
