# LungAI — Pulmonary CT Imaging Workstation & Research Prototype

> **Disclaimer:** LungAI is an academic and engineering research software prototype. It is not approved by regulatory bodies (e.g., FDA, CE-IVD) for clinical diagnostic, therapeutic, or patient management purposes.

---

## Overview

**LungAI** is an AI pulmonary CT research platform built around a dark radiology workstation interface. It implements Phases 1 through 6 of the pulmonary nodule candidate analysis pipeline based on the **LUNA16 (LUng Nodule Analysis 2016)** Grand Challenge benchmark.

- **Phase 1: Architecture & Engineering Foundation** — Monorepo layout, FastAPI backend, SimpleITK imaging core, Pydantic schemas, and robust error handling.
- **Phase 2: Cinematic Frontend Workstation** — Interactive CT viewport with zoom/pan, multiplanar views (axial, coronal, sagittal), Hounsfield Unit windowing presets, candidate overlay, nodule magnifier, and Cine loop playback.
- **Phase 3: LUNA16 Data Pipeline** — MetaImage (`.mhd`/`.raw`) volume loading, coordinate geometry (physical mm ↔ continuous voxel ↔ array indexing), 3D patch extraction with edge padding, and scan-level zero-leakage splits.
- **Phase 4: PyTorch 3D CNN Candidate Classifier** — 3D convolutional neural network (`NoduleCandidateClassifier3D`), weighted BCE loss, versioned checkpointing, and evaluation metrics (ROC-AUC, Precision, Recall, F1).
- **Phase 5: FastAPI Inference API** — Singleton model service, in-process async job manager, latency benchmarking, and candidate scoring endpoints.
- **Phase 6: Real CT Localization & Visualization** — Synchronized candidate overlays, score threshold filtering, 4x nodule magnifier with live probabilities, and multiplanar navigation.

> **Important Scope Distinction:** The model is a **Candidate Classifier** scoring supplied 3D candidate locations. It is not an autonomous full-volume detector searching unseeded volumes.

---

## Technology Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript (Strict), Tailwind CSS, Lucide icons.
- **Backend:** Python 3.12, FastAPI, PyTorch 2.14, SimpleITK, NumPy, SciPy, pandas, Uvicorn, Pydantic.
- **Testing:** Pytest (29 automated tests), TypeScript compiler (`tsc`), Next.js production build (`next build`).

---

## Repository Structure

```
LungAI/
├── apps/
│   └── web/                   # Next.js radiology workstation frontend
│       ├── app/               # App Router pages and global dark styling
│       ├── components/
│       │   ├── layout/        # Header, Hero
│       │   ├── viewer/        # CTViewer, SliceSlider
│       │   ├── candidates/    # CandidatePanel, NoduleMagnifier
│       │   └── analytics/     # WorkflowStatus, AnalyticsPanel, DatasetLab
│       ├── lib/               # API clients & utilities
│       └── types/             # TypeScript interfaces
├── services/
│   └── api/                   # FastAPI medical imaging service
│       ├── app/
│       │   ├── api/           # REST & binary slice streaming routes
│       │   ├── core/          # Settings & environment configuration
│       │   ├── imaging/       # Coordinates, CT loader, windowing, 3D patch extractor
│       │   ├── schemas/       # Pydantic request/response schemas
│       │   ├── services/      # VolumeService, ModelService, JobManager
│       │   └── main.py        # FastAPI app entrypoint
│       └── tests/             # API integration tests
├── ml/
│   ├── data/                  # LUNA16 parser, dataset manifest, split manager
│   ├── models/                # PyTorch 3D CNN baseline classifier
│   ├── candidates/            # CandidatePatchDataset with 3D patch sampling
│   ├── training/              # Training pipeline and checkpoint generator
│   └── evaluation/            # ROC-AUC, F1, confusion matrix, threshold sweeps
├── checkpoints/               # Versioned model weights outside Git (.pt)
├── scripts/
│   ├── cli.py                 # Dataset CLI (inspect, validate-csv, create-splits)
│   └── generate_synthetic_scan.py # Synthetic scan test fixture generator
├── tests/                     # Unit tests (coordinates, windowing, patches, model, metrics)
├── docs/                      # Architecture, dataset, and coordinate documentation
├── .env.example               # Configurable environment settings
└── README.md
```

---

## Quickstart & Installation

### Prerequisites
- Python 3.10+ (Python 3.12 recommended)
- Node.js 18+ (Node.js 20+ recommended)
- npm 9+

### 1. Environment Setup

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 2. Backend Setup & Training

```bash
# Create and activate virtual environment
python -m venv .venv

# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Generate synthetic verification scans:
```bash
python scripts/generate_synthetic_scan.py
```

Train or generate candidate classifier checkpoint:
```bash
python ml/training/train.py --epochs 3 --batch-size 2
```

Start the FastAPI backend:
```bash
python -m uvicorn services.api.app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)  
Health Check: [http://localhost:8000/health](http://localhost:8000/health)

### 3. Frontend Setup

In a separate terminal:
```bash
cd apps/web
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the workstation.

---

## Dataset Management CLI

```bash
# Inspect dataset status and scanned .mhd volumes
python scripts/cli.py inspect

# Validate annotations.csv and candidates.csv schemas
python scripts/cli.py validate-csv

# Generate scan-level train/validation/test splits (zero scan leakage)
python scripts/cli.py create-splits --seed 42
```

---

## Verification & Automated Tests

### Python Backend & ML Tests
```bash
# Run all 29 unit and integration tests
pytest -v
```
Tests cover:
- Coordinate conversion round-trips with non-trivial spacing and direction matrices.
- Hounsfield Unit windowing and model normalization separation.
- Centered 3D candidate patch extraction and edge padding.
- PyTorch 3D CNN forward pass, logit output range, backward pass, and serialization.
- Candidate classification metrics (ROC-AUC, Precision, Recall, F1) and threshold sweeps.
- Scan-level split leakage prevention.
- FastAPI model info, latency profiling, and async candidate inference jobs.

### Frontend Typecheck & Production Build
```bash
cd apps/web
npm run build
```
