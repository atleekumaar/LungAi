# LungAI Model Evaluation & Failure Analysis Report
**Date:** 2026-10-11 17:06:38 UTC
**Model Architecture:** `N/A`
**Checkpoint Hash / Path:** `checkpoints\best_candidate_classifier.pt`
**Dataset Split / Provenance:** LUNA16 Evaluation Protocol

---
## 1. Candidate Classification Metrics
- **Operating Threshold:** 0.50
- **Accuracy:** 0.0059
- **Sensitivity / Recall:** 1.0000
- **Precision:** 0.0059
- **F1 Score:** 0.0117
- **ROC-AUC:** 0.4

---
## 2. LUNA16 FROC & Competition Performance Metric (CPM)
- **CPM Score:** 0.0

| Operating Point (FPs/Scan) | Sensitivity |
|---|---|
| 0.125 | 0.0000 |
| 0.25 | 0.0000 |
| 0.5 | 0.0000 |
| 1.0 | 0.0000 |
| 2.0 | 0.0000 |
| 4.0 | 0.0000 |
| 8.0 | 0.0000 |

---
## 3. Stratified Sensitivity by Nodule Diameter
| Diameter Category | Reference Count | Detected | Sensitivity |
|---|---|---|---|
| small_lt_5mm | 1 | 1 | 100.00% |
| medium_5_to_10mm | 0 | 0 | 0.00% |
| large_gte_10mm | 1 | 1 | 100.00% |

---
## 4. Failure Summary & Diagnostic Limitations
- **Total False Positives:** 505
- **Total Missed Nodules:** 0

> **Important Disclaimer:** LungAI is an academic research prototype. Evaluation results measure candidate-classification capabilities and do not represent autonomous whole-volume nodule detection or clinical diagnostic validity.