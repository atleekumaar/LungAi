"""
CLI tools for dataset inspection, validation, coordinate testing, and patch extraction.
"""
import argparse
import sys
import os
import json
import numpy as np

# Ensure project root is in PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.api.app.core.config import settings
from services.api.app.imaging.loader import load_ct_volume
from services.api.app.imaging.patch_extractor import extract_candidate_patch
from ml.data.luna16_parser import DatasetParser
from ml.data.manifest import generate_dataset_manifest, create_scan_level_splits

def cmd_inspect_dataset(args):
    print("=== LungAI Dataset Inspection ===")
    print(f"Configured Raw Directory: {settings.raw_dir}")
    print(f"Configured Annotations CSV: {settings.annotations_csv}")
    print(f"Configured Candidates CSV: {settings.candidates_csv}")

    manifest = generate_dataset_manifest(settings.raw_dir, settings.annotations_csv)
    print(f"\nTotal Scans Found: {manifest.get('total_scans_found', 0)}")
    print(f"Verified Scans: {manifest.get('verified_scans', 0)}")
    print(f"Total Annotations Linked: {manifest.get('total_annotations_linked', 0)}")

    if manifest.get('total_scans_found', 0) == 0:
        print("\n[NOTE] No raw CT scans currently present in data/raw.")
        print("Run 'python scripts/generate_synthetic_scan.py' to generate a verified test scan,")
        print("or see docs/dataset.md for instructions on obtaining the official LUNA16 dataset.")

def cmd_validate_csvs(args):
    print("=== Validating LUNA16 CSVs ===")
    if os.path.exists(settings.annotations_csv):
        anns, stats = DatasetParser.load_annotations(settings.annotations_csv)
        print(f"Annotations CSV: Valid={stats['valid_records']}, Rejected={stats['rejected_rows']}, Series={stats['unique_series']}")
    else:
        print(f"[!] Annotations CSV missing at {settings.annotations_csv}")

    if os.path.exists(settings.candidates_csv):
        cands, stats = DatasetParser.load_candidates(settings.candidates_csv, max_records=1000)
        print(f"Candidates CSV (First 1k): Valid={stats['valid_records']}, Positives={stats['positive_candidates']}, Negatives={stats['negative_candidates']}")
    else:
        print(f"[!] Candidates CSV missing at {settings.candidates_csv}")

def cmd_generate_splits(args):
    manifest_path = args.manifest or "./data/dataset_manifest.json"
    if not os.path.exists(manifest_path):
        print(f"Generating manifest first at {manifest_path}...")
        manifest = generate_dataset_manifest(settings.raw_dir, settings.annotations_csv, manifest_path)
    else:
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)

    scan_ids = [s["seriesuid"] for s in manifest.get("scans", []) if s.get("status") == "verified"]
    if not scan_ids:
        print("[!] No verified scans found to split.")
        return

    splits = create_scan_level_splits(scan_ids, seed=args.seed)
    out_file = args.output or "./data/splits_manifest.json"
    os.makedirs(os.path.dirname(os.path.abspath(out_file)), exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(splits, f, indent=2)

    print(f"Splits generated successfully -> {out_file}")
    print(f"Counts: Train={splits['counts']['train']}, Val={splits['counts']['val']}, Test={splits['counts']['test']}")

def main():
    parser = argparse.ArgumentParser(description="LungAI Medical Imaging CLI")
    subparsers = parser.add_subparsers(dest="command", help="Sub-commands")

    inspect_p = subparsers.add_parser("inspect", help="Inspect local dataset availability")
    inspect_p.set_defaults(func=cmd_inspect_dataset)

    validate_p = subparsers.add_parser("validate-csv", help="Validate annotations & candidates CSVs")
    validate_p.set_defaults(func=cmd_validate_csvs)

    split_p = subparsers.add_parser("create-splits", help="Generate scan-level train/val/test splits")
    split_p.add_argument("--manifest", type=str, default=None)
    split_p.add_argument("--output", type=str, default="./data/splits_manifest.json")
    split_p.add_argument("--seed", type=int, default=42)
    split_p.set_defaults(func=cmd_generate_splits)

    args = parser.parse_args()
    if hasattr(args, "func"):
        args.func(args)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
