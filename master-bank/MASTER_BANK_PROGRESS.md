# PediaRounds Master Bank — Shared Progress & Handoff

> Single source of truth for coordination between ChatGPT conversations.

## Repository / active work
- Repository: `drabdulazizalhazmi-hub/-PediaRounds`
- PR #2 has been merged into `main`.
- Active working branch: `master-bank/post-merge-audit`
- Active pull request: `#3 — Continue PediaRounds post-merge audit`
- Base branch: `main`
- Last synchronized: `2026-09-07 09:55 +03:00`

## Mandatory coordination protocol
1. Before work, read this file and `coordination/current-work-state.md`, then inspect PR #3.
2. Do not rely on old chat question pointers if GitHub is newer.
3. Use PR #3 for continued closure-audit work.
4. Do not create overlapping question-range exports without checking the branch first.
5. Preserve `recalledAnswer` separately from `verifiedAnswer`; do not silently repair source conflicts.
6. Image-dependent questions remain blocked until the original asset is linked and reviewed.
7. The repository is public: extracted copyrighted source images/PDFs are not committed until publication rights are cleared. Record source page/hash and keep private-review bundles separate.
8. After each successful batch, update both shared coordination files.

## Latest batch
Question/image linkage advanced:
- Gastro source-image review covers **Q56, Q57, Q63, Q64, Q65, Q68, Q70, Q73, Q74/Q75, Q81**.
- Added `master-bank/sources/question-image-linkage-20260907.json` to explicitly connect recovered source-image metadata to the canonical question IDs and JSON record paths.
- Canonical question linkage is now explicit for **Q56, Q57, Q64, Q65, Q68, Q70, Q73, Q74, Q75, Q81**.
- **Q63** image is recovered and hashed, but the exact canonical record path is still pending resolution and is not guessed.
- Public `assetPath` remains null because the repository is public; original source-image bytes stay in the private review package pending publication-rights and clinical review.
- Linking an image does not override review gates: Q56/Q57 remain conflicting, Q73/Q74 remain incomplete recalls, and Q81 remains image-needs-review.

## Strongly represented source ranges already on main
- Growth & Development Q1–Q21
- Dermatology Q1–Q22
- Ophthalmology Q1–Q10
- ENT Q1–Q9
- Neonatology Q1–Q43
- Neurology Q1–Q50
- Nephrology & Urologic Disorders Q1–Q63
- Rheumatology Q1–Q16
- Musculoskeletal & Sport Medicine Q1–Q19
- Critical Care Q1–Q55
- Trauma & Accidents Q1–Q44
- Substances Abuse & Toxicology Q1–Q15
- Behavioral Medicine & Psychiatric Disorders Q1–Q33
- Cardiology Q1–Q57
- Endocrinology Q1–Q65
- Hematology Q1–Q57; Oncology Q1–Q20
- Infectious Diseases through Q125
- Genetics Q1–Q52; do not fabricate Q53 because the source numbering ends at Q52 before Metabolic Disorders
- Metabolic Disorders Q1–Q23

## Requires exact canonical closure audit
- Gastroenterology Q1–Q86: explicit range files overlap older supported batches.
- Nutrition & Malnutrition Q1–Q23: supported/gap files may overlap.
- Pulmonary / Sleep / Asthma: canonical and legacy respiratory data overlap; some image and single-option recalls remain.
- Allergy / Immunology: data exists but canonical deduplication/verification remains.
- Medical Ethics / Patient Safety: structured records and incomplete-recall records must stay separated correctly.

## Known source/review gates
- Gastro Q35 conflicting differential without stool electrolytes.
- Gastro Q42 duplicate option label in source.
- Gastro Q44–Q45 sodium/cerebral-edema assumptions incomplete.
- Gastro Q53 achalasia vs eosinophilic esophagitis overlap.
- Gastro Q56–Q57 source image recovered privately; source itself questions interpretation/definitive study.
- Gastro Q63, Q64, Q65, Q68, Q70, Q73, Q74/Q75, Q81 source images recovered privately and remain publication/clinical-review gated.
- Pulmonary Q6/Q9/Q10/Q12 source images recovered privately; public publication and clinical-image review remain blocked.
- Pulmonary Q14 original image not present in current source file.
- Sleep Q15 single-option incomplete recall.

## Next action
1. Resolve the exact canonical record path for Gastro Q63 and add it to the question-image linkage index.
2. Continue linking recovered source images to canonical question IDs rather than keeping them only in image manifests.
3. Recover the next high-priority source images/attachments and resolve source-supported `incomplete_recall` items.
4. Only after structural integrity is stable, verify conflicting/outdated clinical keys using UpToDate, then Nelson, then current specialty guidance.

## Style contract
- Work in large batches where source quality permits.
- Report only what was actually committed.
- Never claim completion from filenames alone; exact ID coverage and review gates control completion.
- Preserve source gaps rather than inventing wording.
