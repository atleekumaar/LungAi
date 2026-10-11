"""
Tests for API endpoints, health check, and slice streaming.
"""
import pytest
from fastapi.testclient import TestClient

from services.api.app.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["imaging_backend"] == "SimpleITK"
    assert "model_status" in data
    assert "version" in data

def test_imaging_status(client):
    response = client.get("/api/imaging/status")
    assert response.status_code == 200
    data = response.json()
    assert "data_dir_exists" in data
    assert "total_mhd_scans" in data

def test_model_info_endpoint(client):
    response = client.get("/api/imaging/model")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "architecture" in data

def test_model_latency_endpoint(client):
    response = client.get("/api/imaging/model/latency?runs=3")
    assert response.status_code == 200
    data = response.json()
    assert "mean_latency_ms" in data
    assert data["mean_latency_ms"] > 0
    assert "device" in data

def test_window_presets(client):
    response = client.get("/api/imaging/presets")
    assert response.status_code == 200
    data = response.json()
    assert "lung" in data
    assert "mediastinum" in data
    assert data["lung"]["center"] == -600.0

def test_missing_scan_404(client):
    response = client.get("/api/imaging/scans/NON_EXISTENT_SCAN_XYZ")
    assert response.status_code == 404

def test_inference_lifecycle_on_scan(client):
    # Verify inference job submission and status polling on synthetic scan
    scans_res = client.get("/api/imaging/scans")
    assert scans_res.status_code == 200
    scans = scans_res.json()
    if "SYNTH_SCAN_001" in scans:
        # Submit inference job
        infer_res = client.post("/api/imaging/scans/SYNTH_SCAN_001/infer")
        assert infer_res.status_code == 200
        infer_data = infer_res.json()
        assert "job_id" in infer_data

        job_id = infer_data["job_id"]
        # Poll job status
        job_res = client.get(f"/api/imaging/jobs/{job_id}")
        assert job_res.status_code == 200
        job_data = job_res.json()
        assert job_data["status"] in ["running", "completed"]

        # Fetch scan candidates
        cands_res = client.get("/api/imaging/scans/SYNTH_SCAN_001/candidates")
        assert cands_res.status_code == 200
        cands = cands_res.json()
        assert len(cands) > 0
def test_evaluation_endpoints(client):
    res = client.get("/api/imaging/evaluation")
    assert res.status_code == 200
    data = res.json()
    assert "classification_metrics" in data
    assert "froc_evaluation" in data
    assert "failure_analysis" in data
    assert "cpm_score" in data["froc_evaluation"]

    # Test markdown report endpoint
    md_res = client.get("/api/imaging/evaluation/report")
    assert md_res.status_code == 200
    assert "text/markdown" in md_res.headers["content-type"]
    assert "# LungAI Model Evaluation" in md_res.text
