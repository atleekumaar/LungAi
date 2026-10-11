"""
In-process inference job manager for candidate classification jobs.
Provides bounded concurrent execution, status tracking (queued, running, completed, failed),
and error reporting without unbounded GPU/CPU queuing.
"""
from typing import Dict, Any, Optional, List
import uuid
import time
from concurrent.futures import ThreadPoolExecutor

class InferenceJobManager:
    def __init__(self, max_workers: int = 2):
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.jobs: Dict[str, Dict[str, Any]] = {}

    def create_job(self, scan_id: str, total_candidates: int) -> str:
        job_id = f"job-{uuid.uuid4().hex[:8]}"
        self.jobs[job_id] = {
            "job_id": job_id,
            "scan_id": scan_id,
            "status": "queued",
            "progress": 0.0,
            "processed_count": 0,
            "total_count": total_candidates,
            "created_at": time.time(),
            "completed_at": None,
            "results": [],
            "error": None
        }
        return job_id

    def submit_job(self, job_id: str, task_fn, *args, **kwargs):
        self.jobs[job_id]["status"] = "running"
        self.executor.submit(self._run_job_wrapper, job_id, task_fn, *args, **kwargs)

    def _run_job_wrapper(self, job_id: str, task_fn, *args, **kwargs):
        try:
            results = task_fn(job_id, *args, **kwargs)
            self.jobs[job_id]["status"] = "completed"
            self.jobs[job_id]["progress"] = 1.0
            self.jobs[job_id]["results"] = results
            self.jobs[job_id]["completed_at"] = time.time()
        except Exception as e:
            self.jobs[job_id]["status"] = "failed"
            self.jobs[job_id]["error"] = str(e)
            self.jobs[job_id]["completed_at"] = time.time()

    def update_progress(self, job_id: str, processed_count: int):
        if job_id in self.jobs:
            total = self.jobs[job_id]["total_count"]
            self.jobs[job_id]["processed_count"] = processed_count
            self.jobs[job_id]["progress"] = round(processed_count / max(1, total), 2)

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        return self.jobs.get(job_id)

job_manager = InferenceJobManager()
