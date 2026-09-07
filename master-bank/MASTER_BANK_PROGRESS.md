# PediaRounds Master Bank — Shared Progress & Handoff

> Single source of truth for coordination between ChatGPT conversations.

## Repository / active work
- Repository: `drabdulazizalhazmi-hub/-PediaRounds`
- PR #2 merged into `main`; active continuation is PR #3.
- Working branch: `master-bank/post-merge-audit`
- Active PR: `#3 — Continue PediaRounds post-merge audit`
- Last synchronized: `2026-09-07 10:25 +03:00`

## Mandatory protocol
1. Read this file, `coordination/current-work-state.md`, and PR #3 before writes.
2. Do not invent source text, distractors, answers, years, or images.
3. Keep `recalledAnswer` separate from `verifiedAnswer`.
4. Image-dependent questions stay non-publishable until source asset recovery + clinical review + publication approval.
5. Public repo must not contain source PDF/image bytes; use private review bundles and committed linkage/hash metadata.
6. Update both handoff files after a successful batch.

## Latest completed batch — Gastro Q19/Q20 + Nutrition Q8 image recovery
- **Gastro Q19** source page 209: stem says a congenital diaphragmatic hernia picture was provided, but no question image is present on the rendered page. Marked `source_image_missing`.
- **Gastro Q20** source page 209: stem says a gastroschisis picture was provided, but no question image is present. The page-210 omphalocele/gastroschisis comparison is explanatory material only and was not substituted. Marked `source_image_missing`.
- Updated `master-bank/sources/gastro-early-source-image-review-20260907.json` and `master-bank/sources/question-image-linkage-20260907.json` for Q19/Q20.
- **Nutrition Q8**: recovered the actual embedded acanthocyte smear from source page 259 for `part2-nutrition-q008-abetalipoproteinemia-acanthocytes`.
  - canonical record: `master-bank/data/09-gastroenterology-hepatology-nutrition/nutrition-part2-q04-q12.json`
  - asset: `p259-000.jpg`
  - dimensions: 199×149
  - SHA-256: `1b394584e1cce65d81490b8754b2e6a120fb38515bfed2c4077f5cf49aaeb4df`
  - status: `image_needs_review`
- New files:
  - `master-bank/sources/nutrition-source-image-review-20260907.json`
  - `master-bank/sources/nutrition-question-image-linkage-20260907.json`
- Private Nutrition review package: `PediaRounds_nutrition_source_image_review.zip`; SHA-256 `bdf29e800855897a5a51a0d4abf2b8bb7cc3057ecbb3b42a1e037e1f2423abf7`.

## Previously recovered/linkable image assets
- Early Gastro: Q1/Q2, Q3, Q5, Q13, Q23, Q28/Q29.
- Later Gastro: Q56, Q57, Q63, Q64, Q65, Q68, Q70, Q73, Q74/Q75, Q81.
- Pulmonary: Q6, Q9, Q10, Q12.

## Source-image-missing gates
- Gastro Q8–Q11, Q14–Q15, Q19–Q20: source stem references an image, but the actual question image is absent from the current PDF page.
- Pulmonary Q14: source image absent.

## Strongly represented source ranges already on main
Growth Q1–Q21; Dermatology Q1–Q22; Ophthalmology Q1–Q10; ENT Q1–Q9; Neonatology Q1–Q43; Neurology Q1–Q50; Nephrology/Urology Q1–Q63; Rheumatology Q1–Q16; Musculoskeletal Q1–Q19; Critical Care Q1–Q55; Trauma Q1–Q44; Toxicology Q1–Q15; Behavioral/Psych Q1–Q33; Cardiology Q1–Q57; Endocrinology Q1–Q65; Hematology Q1–Q57; Oncology Q1–Q20; Infectious Diseases through Q125; Genetics Q1–Q52 with source Q53 discrepancy; Metabolic Q1–Q23.

## Still requires canonical closure audit
- Gastroenterology Q1–Q86 (overlap between explicit ranges and older supported batches).
- Nutrition Q1–Q23 (supported/gap overlap).
- Pulmonary/Sleep/Asthma legacy + canonical overlap.
- Allergy/Immunology canonical deduplication/verification.
- Medical Ethics/Patient Safety separation of structured MCQs vs incomplete recalls.

## Key review gates
- Gastro Q35/Q42/Q44–Q45/Q53/Q56–Q57 and selected later items retain source conflicts.
- Gastro Q73/Q74: incomplete recall despite recovered images.
- Nutrition Q8: image recovered, still pending clinical image review and publication approval.
- Pulmonary Q9/Q10 and Sleep Q15: incomplete recalls.

## Next action
1. Continue scanning Nutrition Q1–Q23 for any additional source images/attachments and link only actual embedded question assets.
2. Continue resolving source-supported `incomplete_recall` items without inventing distractors.
3. Continue canonical 1023-ID dedup/coverage audit in larger batches.
4. Independently verify clinical conflicts only after structural/source integrity is stable.
