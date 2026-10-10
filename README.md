# LungAI — Pulmonary CT Imaging Workstation & Research Prototype

> **Disclaimer:** LungAI is an academic and engineering research software prototype. It is not approved by regulatory bodies (e.g., FDA, CE-IVD) for clinical diagnostic, therapeutic, or patient management purposes.

---

## Overview

**LungAI** is an AI pulmonary CT research platform built around a dark radiology workstation interface. It implements Phases 1 through 3 of the pulmonary nodule detection pipeline based on the **LUNA16 (LUng Nodule Analysis 2016)** Grand Challenge benchmark.

- **Phase 1: Architecture & Engineering Foundation** — Monorepo layout, FastAPI backend, SimpleITK imaging core, Pydantic schemas, and robust error handling.
- **Phase 2: Cinematic Frontend Workstation** — Interactive CT viewport with zoom/pan, multiplanar views (axial, coronal, sagittal), Hounsfield Unit windowing presets, candidate overlay, nodule magnifier, and Cine loop playback.
- **Phase 3: LUNA16 Data Pipeline** — MetaImage (`.mhd`/`.raw`) volume loading, coordinate geometry (physical mm ↔ continuous voxel ↔ array indexing), 3D patch extraction with edge padding, and scan-level zero-leakage splits.

---

## Technology Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript (Strict), Tailwind CSS, Lucide icons.
- **Backend:** Python 3.12, FastAPI, SimpleITK, NumPy, SciPy, pandas, Uvicorn, Pydantic.
- **Testing:** Pytest, TypeScript compiler (`tsc`), Next.js production build (`next build`).

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
│       │   ├── services/      # Volume service & caching
│       │   └── main.py        # FastAPI app entrypoint
│       └── tests/             # API integration tests
├── ml/
│   └── data/                  # LUNA16 parser, dataset manifest, split manager
├── scripts/
│   ├── cli.py                 # Dataset CLI (inspect, validate-csv, create-splits)
│   └── generate_synthetic_scan.py # Synthetic scan test fixture generator
├── tests/                     # Unit tests (coordinates, windowing, patches, splits)
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

### 2. Backend Setup

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

Generate synthetic verification scans for immediate testing without downloading 50GB LUNA16:
```bash
python scripts/generate_synthetic_scan.py
```

Start the FastAPI backend:
```bash
python -m uvicorn services.api.app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation is available at: [http://localhost:8000/docs](http://localhost:8000/docs)
Health check endpoint: [http://localhost:8000/health](http://localhost:8000/health)

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
# Run all 18 unit and integration tests
pytest -v
```
Tests cover:
- Coordinate conversion round-trips with non-trivial spacing and direction matrices.
- Hounsfield Unit windowing and model normalization separation.
- Centered 3D candidate patch extraction and edge padding.
- Scan-level split leakage prevention.
- API health and binary slice streaming endpoints.

### Frontend Typecheck & Production Build
```bash
cd apps/web
npm run build
```

---

## Known Limitations & ML Integration Roadmap

1. **Phases 1–3 Scope:** This prototype includes dataset ingestion, coordinate transformations, candidate patch extraction, and the workstation interface. Model training and automated candidate detection are part of Phase 4.
2. **Analytics & Scores:** Metric dashboards (FROC, CPM) display an explicit "Evaluation Pending" state; no fabricated accuracy scores or predictions are presented.
3. **Phase 4 Roadmap:**
   - Integrate 3D CNN / UNet nodule classification checkpoints via PyTorch.
   - Run candidate scoring inference directly over extracted 3D patches.
   - Compute official LUNA16 FROC curves across predefined false-positive rates.
