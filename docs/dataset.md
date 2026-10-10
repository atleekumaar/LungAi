# LUNA16 Dataset Setup & Verification Guide

## 1. Official Dataset Acquisition

The LUNA16 challenge dataset is derived from the LIDC-IDRI database and consists of 888 thoracic CT scans in MetaImage (`.mhd` / `.raw`) format across 10 subsets (subset0 to subset9).

- **Official Challenge Portal**: [https://luna16.grand-challenge.org/Data/](https://luna16.grand-challenge.org/Data/)
- **Evaluation Benchmark**: [https://luna16.grand-challenge.org/Evaluation/](https://luna16.grand-challenge.org/Evaluation/)

### Required CSV Files:
1. `annotations.csv`: Ground-truth nodule locations with columns:
   - `seriesuid`, `coordX`, `coordY`, `coordZ`, `diameter_mm`
2. `candidates.csv`: Pre-extracted candidate locations with columns:
   - `seriesuid`, `coordX`, `coordY`, `coordZ`, `class`

## 2. Directory Placement

Place your downloaded scans and CSV files in the configured `data/raw/` directory:

```
lungai/
└── data/
    └── raw/
        ├── annotations.csv
        ├── candidates.csv
        ├── subset0/
        │   ├── 1.3.6.1.4.1.3207.1.1.1.mhd
        │   └── 1.3.6.1.4.1.3207.1.1.1.raw
        └── ...
```

## 3. Automated Verification & CLI Commands

Verify scan integrity, annotation matching, and dataset splits using the built-in CLI:

```bash
# 1. Inspect dataset presence and scan counts
python scripts/cli.py inspect

# 2. Validate annotations and candidate CSV schemas
python scripts/cli.py validate-csv

# 3. Generate scan-level train/validation/test splits (zero leakage)
python scripts/cli.py create-splits --seed 42
```

## 4. Synthetic Scan Generation for Local Testing

If testing in an environment where the full 50GB LUNA16 dataset is not yet downloaded, generate synthetic non-clinical test scans:

```bash
python scripts/generate_synthetic_scan.py
```
This produces `SYNTH_SCAN_001.mhd` and `SYNTH_SCAN_002.mhd` in `data/raw/` with matching annotations for continuous verification.
