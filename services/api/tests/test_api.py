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
    assert "version" in data

def test_imaging_status(client):
    response = client.get("/api/imaging/status")
    assert response.status_code == 200
    data = response.json()
    assert "data_dir_exists" in data
    assert "total_mhd_scans" in data

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

def test_synthetic_scan_endpoints(client):
    # Verify synthetic scan generated in data/raw
    scans_res = client.get("/api/imaging/scans")
    assert scans_res.status_code == 200
    scans = scans_res.json()
    if "SYNTH_SCAN_001" in scans:
        scan_info = client.get("/api/imaging/scans/SYNTH_SCAN_001")
        assert scan_info.status_code == 200
        info_data = scan_info.json()
        assert info_data["num_slices"] > 0
        
        # Test axial slice binary streaming
        slice_res = client.get("/api/imaging/scans/SYNTH_SCAN_001/slice/10/windowed")
        assert slice_res.status_code == 200
        assert slice_res.headers["content-type"] == "application/octet-stream"
        assert int(slice_res.headers["x-slice-index"]) == 10
