"""
Evaluation Service loading persisted research evaluation artifacts
and running on-demand research evaluation jobs.
"""
from typing import Dict, Any, Optional
import os
import json

class EvaluationService:
    def __init__(self, artifacts_dir: str = "./artifacts/evaluation"):
        self.artifacts_dir = artifacts_dir

    def get_summary(self) -> Optional[Dict[str, Any]]:
        path = os.path.join(self.artifacts_dir, "evaluation_summary.json")
        if not os.path.exists(path):
            return None
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None

    def get_markdown_report(self) -> Optional[str]:
        path = os.path.join(self.artifacts_dir, "evaluation_report.md")
        if not os.path.exists(path):
            return None
        try:
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception:
            return None

    def get_scored_candidates_csv_path(self) -> Optional[str]:
        path = os.path.join(self.artifacts_dir, "scored_candidates.csv")
        return path if os.path.exists(path) else None

evaluation_service = EvaluationService()
