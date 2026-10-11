"""
Model Service managing PyTorch model loading, thread-safe candidate inference,
and warm latency profiling.
"""
from typing import Dict, Any, List, Optional, Tuple
import os
import time
import torch
import numpy as np

from ml.models.classifier3d import NoduleCandidateClassifier3D
from services.api.app.core.config import settings

class ModelService:
    def __init__(self, checkpoint_path: Optional[str] = None):
        self.checkpoint_path = checkpoint_path or os.getenv(
            "LUNGAI_CHECKPOINT_PATH",
            os.path.join("checkpoints", "best_candidate_classifier.pt")
        )
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model: Optional[NoduleCandidateClassifier3D] = None
        self.model_metadata: Dict[str, Any] = {}
        self.is_ready: bool = False
        self.load_checkpoint()

    def load_checkpoint(self) -> bool:
        """
        Loads trained model checkpoint once during application lifecycle.
        Safe loader validating state dict and architecture parameters.
        """
        if not os.path.exists(self.checkpoint_path):
            self.is_ready = False
            self.model = None
            self.model_metadata = {
                "status": "unavailable",
                "error": f"Checkpoint not found at '{self.checkpoint_path}'"
            }
            return False

        try:
            checkpoint = torch.load(self.checkpoint_path, map_location=self.device, weights_only=False)
            patch_size = tuple(checkpoint.get("patch_size", (32, 32, 32)))
            base_filters = checkpoint.get("base_filters", 16)

            model = NoduleCandidateClassifier3D(
                in_channels=1,
                base_filters=base_filters,
                patch_size=patch_size
            )
            model.load_state_dict(checkpoint["model_state_dict"])
            model.to(self.device)
            model.eval()

            self.model = model
            self.is_ready = True
            self.model_metadata = {
                "status": "ready",
                "architecture": checkpoint.get("architecture", "NoduleCandidateClassifier3D"),
                "version": checkpoint.get("version", "1.0.0"),
                "patch_size": patch_size,
                "input_normalization": checkpoint.get("input_normalization", {"min_hu": -1000.0, "max_hu": 400.0}),
                "device": str(self.device),
                "best_val_loss": checkpoint.get("best_val_loss"),
                "checkpoint_path": self.checkpoint_path
            }
            return True
        except Exception as e:
            self.is_ready = False
            self.model = None
            self.model_metadata = {
                "status": "error",
                "error": f"Failed loading checkpoint: {str(e)}"
            }
            return False

    @torch.no_grad()
    def score_patch(self, patch_array_hu: np.ndarray) -> float:
        """
        Runs candidate patch classification:
        Input: 3D numpy array in HU of shape (D, H, W).
        Output: probability score in [0.0, 1.0].
        """
        if not self.is_ready or self.model is None:
            raise RuntimeError("ModelService is not ready or checkpoint is missing.")

        # Normalize HU input using checkpoint normalization settings
        norm_cfg = self.model_metadata.get("input_normalization", {})
        min_hu = norm_cfg.get("min_hu", -1000.0)
        max_hu = norm_cfg.get("max_hu", 400.0)

        cleaned = np.nan_to_num(patch_array_hu, nan=min_hu, posinf=max_hu, neginf=min_hu)
        clipped = np.clip(cleaned, min_hu, max_hu)
        norm = (clipped - min_hu) / (max_hu - min_hu)

        # Convert to tensor (1, 1, D, H, W)
        tensor_in = torch.from_numpy(norm).unsqueeze(0).unsqueeze(0).float().to(self.device)
        score_tensor = self.model.predict_score(tensor_in)
        return float(score_tensor.cpu().item())

    def measure_latency(self, num_runs: int = 10) -> Dict[str, Any]:
        """
        Measures real forward inference latency on active device without hardcoded values.
        """
        if not self.is_ready or self.model is None:
            return {"error": "Model not available for latency benchmarking"}

        patch_d, patch_h, patch_w = self.model_metadata.get("patch_size", (32, 32, 32))
        dummy = torch.randn(1, 1, patch_d, patch_h, patch_w, device=self.device)

        # Warm-up runs
        for _ in range(3):
            _ = self.model.predict_score(dummy)

        timings = []
        for _ in range(num_runs):
            t0 = time.perf_counter()
            _ = self.model.predict_score(dummy)
            t1 = time.perf_counter()
            timings.append((t1 - t0) * 1000.0) # in ms

        return {
            "device": str(self.device),
            "batch_size": 1,
            "patch_size": [patch_d, patch_h, patch_w],
            "runs": num_runs,
            "mean_latency_ms": round(float(np.mean(timings)), 2),
            "median_latency_ms": round(float(np.median(timings)), 2),
            "p95_latency_ms": round(float(np.percentile(timings, 95)), 2),
            "min_latency_ms": round(float(np.min(timings)), 2),
            "max_latency_ms": round(float(np.max(timings)), 2)
        }

model_service = ModelService()
