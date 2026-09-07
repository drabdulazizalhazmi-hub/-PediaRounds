# PediaRounds Master Bank — Shared Progress & Handoff

> Single source of truth for coordination between ChatGPT conversations.

## Repository / active work
- Repository: `drabdulazizalhazmi-hub/-PediaRounds`
- PR #2 has been merged into `main`.
- Active working branch: `master-bank/post-merge-audit`
- Active pull request: `#3 — Continue PediaRounds post-merge audit`
- Base branch: `main`
- Last synchronized: `2026-09-07 10:08 +03:00`

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
Early Gastro source-image recovery and canonical linkage advanced:
- Recovered and linked **Gastro Q1/Q2** to the shared small-left-colon contrast-enema image from source page 197.
- Recovered and linked **Gastro Q3** to its separate contrast-enema image from source page 198.
- Recovered and linked **Gastro Q23** to the abdominal radiograph on source page 212.
- Recovered and linked **Gastro Q28/Q29** to the shared dermatitis-herpetiformis photo on source page 216.
- Created/expanded `master-bank/sources/gastro-early-source-image-review-20260907.json` with source page, dimensions, SHA-256 and shared-image mappings.
- Updated `master-bank/sources/question-image-linkage-20260907.json` with canonical IDs and record paths for Q1, Q2, Q3, Q23, Q28 and Q29.
- **Gastro Q10 and Q11** explicitly reference X-ray pictures in the source stems, but no matching image is present on rendered source page 204; both are preserved as `source_image_missing` rather than receiving invented substitutes.
- Current private early-Gastro review package: `PediaRounds_gastro_early_source_image_review.zip`, SHA-256 `f736a9858315d42a81c175b99036819e99c996e92eae0d8687fd28df7e5aa41e`.
- Previously linked Gastro source images remain Q56, Q57, Q63, Q64, Q65, Q68, Q70, Q73, Q74/Q75 and Q81.
- Public `assetPath` remains null because the repository is public; source-image bytes stay in private review packages pending publication-rights and clinical review.

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
- Gastro Q10/Q11: stem references X-ray images, but source image is absent from current source page; keep `source_image_missing`.
- Gastro Q35 conflicting differential without stool electrolytes.
- Gastro Q42 duplicate option label in source.
- Gastro Q44–Q45 sodium/cerebral-edema assumptions incomplete.
- Gastro Q53 achalasia vs eosinophilic esophagitis overlap.
- Gastro Q56–Q57 source image recovered privately; source itself questions interpretation/definitive study.
- Gastro Q1/Q2, Q3, Q23, Q28/Q29, Q63, Q64, Q65, Q68, Q70, Q73, Q74/Q75, Q81 source images are recovered privately and linked to canonical question records; they remain publication/clinical-review gated.
- Pulmonary Q6/Q9/Q10/Q12 source images recovered privately; public publication and clinical-image review remain blocked.
- Pulmonary Q14 original image not present in current source file.
- Sleep Q15 single-option incomplete recall.

## Next action
1. Continue inspecting early Gastro image-dependent questions (notably Q5, Q8, Q9 and nearby congenital-GI items) and link recoverable source images to canonical records.
2. Preserve source-image-missing status when the stem references a picture but no picture is present in the PDF page.
3. Continue resolving source-supported `incomplete_recall` records without inventing distractors.
4. Continue the canonical 1023-ID duplicate/coverage audit.
5. Only after structural integrity is stable, verify conflicting/outdated clinical keys using UpToDate, then Nelson, then current specialty guidance.

## Style contract
- Work in large batches where source quality permits.
- Report only what was actually committed.
- Never claim completion from filenames alone; exact ID coverage and review gates control completion.
- Preserve source gaps rather than inventing wording.
