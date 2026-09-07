# PediaRounds Master Bank — Shared Progress & Handoff

> **Single source of truth for coordination between ChatGPT conversations.** Read this file and `coordination/current-work-state.md` before work, then update both after every successful batch.

## Repository / active phase

- Repository: `drabdulazizalhazmi-hub/-PediaRounds`
- Base branch: `main`
- PR #2: merged
- PR #4: merged successfully as `c24996e32b4279f71518455483c45afb7da49bc7`
- PR #3: closed as superseded by PR #4
- Current working branch: `master-bank/review-images-verification`
- Current pull request: **PR #5 — Review images, incomplete recalls, and clinical verification**
- Phase: **image recovery / source-supported incomplete-recall cleanup / clinical verification**

## Source coverage milestone

Latest successful closure quality run reported:

- **Questions scanned: 1023**
- **Enumerated expected source slots: 1022**
- **Covered expected slots: 1022**
- **Missing expected slots: 0**
- **Exact duplicate IDs: 0**
- **Possible section/Q collisions: 0**
- **All canonical sections: full source-number coverage**

The 1023-vs-1022 discrepancy is a source numbering anomaly: the source TOC prints Genetics = 53, but the actual Genetics sequence ends at Q52 before Metabolic Disorders. **Do not fabricate Genetics Q53.**

## Current review-status baseline

From the closure audit before PR #5 cleanup:

- `needs_verification`: 585
- `image_missing`: 198
- `image_needs_review`: 10
- `incomplete_recall`: 77
- `conflicting`: 131
- `outdated`: 9
- `deduplicated`: 13

Image validation reported **249 image-dependent questions** and **0 public repository assetPaths**. Original images may exist in private/source bundles, but publication remains blocked until image association, clinical review, and rights/publication handling are completed.

## PR #5 quality work completed

- Pulmonary Q9 and Q10: reconciled with already recovered original microscopy assets in the private source-review bundle; stale missing-image blockers were corrected without publishing source image bytes.
- Added a **large-batch sparse-source audit covering 167 questions** whose 2026 Part II source text preserves only zero or one answer option.
- Sparse audit breakdown: **163 single-option recalls + 4 zero-option recalls**.
- **48/167** sparse recalls contain image/media cues and are explicitly grouped for original-asset reconciliation.
- **10/167** have uncertain/unclear source answer text and are explicitly flagged for source/clinical review.

### Direct source re-read batches completed

**Batch 59** — `review-queue/source-sparse-large-review-59-index-20260907.json`
- Endocrinology: 17
- Genetics: 15
- Infectious Diseases: 14
- Neurology: 13
- 21 image/media-dependent items

**Batch 42** — `review-queue/source-sparse-large-review-42-index-20260907.json`
- Gastroenterology: 10
- Hematology: 9
- Metabolic Disorders: 9
- Nephrology/Urology: 7
- Medical Ethics/Patient Safety: 7
- 9 image/media-dependent items
- 8 uncertain/conflicting source-answer items

**Batch 28** — `review-queue/source-sparse-large-review-28-index-20260907.json`
- Cardiology: 6
- Neonatology: 6
- Trauma and Accidents: 6
- Critical Care Medicine: 5
- Immunology: 5
- 9 image/media-dependent items
- Key retained gates: Neonatology Q7 zero-option image identification; Immunology Q4 wording conflict; Trauma Q37 antidote note; Critical Care Q34 image/context gate.

**Final Batch 38** — `review-queue/source-sparse-final-38-index-20260907.json`
- Pulmonary/Sleep: 4
- Allergy: 3
- Oncology: 3
- Nutrition and Malnutrition: 3
- Rheumatology: 4
- Musculoskeletal and Sport Medicine: 3
- Substances Abuse and Toxicology: 3
- Behavioral Medicine and Psychiatric Disorders: 4
- Growth and Development: 2
- Dermatology: 2
- Ophthalmology: 1
- ENT: 1
- Research, Biostatistics, and Communication Skills: 5
- Key retained gates include Allergy Q27 source nuance (exercise challenge preferred if offered), Dermatology Q12 IV-vs-oral antiviral source conflict, and Research Q10/Q12 missing calculation inputs.

### Aggregate sparse-recall review progress

- **167 / 167 sparse recalls** have now received a direct source re-read and cross-chat reservation.
- Remaining sparse recalls awaiting direct source re-read: **0**.
- No missing distractors were reconstructed.
- No missing calculations were invented.
- No `verifiedAnswer` was assigned solely from the recall source.

## Coordination protocol — mandatory

1. GitHub wins over chat memory.
2. Do not re-import already covered source-number ranges.
3. Preserve `recalledAnswer` separately from `verifiedAnswer`.
4. Keep `verifiedAnswer: null` until independent verification is explicitly recorded.
5. Do not invent missing distractors, images, years, stems, calculations, or answer keys.
6. Image-dependent questions stay blocked until an original source image is linked and reviewed; do not substitute generated images.
7. Maintain clean English stem/options/TTS plus clear Arabic clinical explanation with English medical terminology.
8. Preserve `conflicting`, `outdated`, `incomplete_recall`, `image_missing`, and `image_needs_review` until genuinely resolved.
9. Do not commit source PDFs, credentials, tokens, passwords, or secrets.
10. Before writing, refetch this file if another conversation may have advanced PR #5.

## Highest-priority next work

1. Reconcile image/media assets for the fully reviewed 167-question sparse set, prioritizing exact original assets already identified in source manifests/bundles.
2. Resolve `incomplete_recall` only where another permitted source/original wording supplies missing detail; otherwise preserve incompleteness.
3. Review `conflicting` / `outdated` records in large controlled batches after source integrity is stable.
4. Advance `needs_verification` in controlled clinical batches using UpToDate → Nelson → current specialty guideline.
5. Keep the same cross-chat handoff and do not restart completed sparse-review batches.

## Style contract between conversations

- Work in **large batches** when source quality permits.
- Report only work actually committed.
- Source completeness, image readiness, and clinical verification are separate gates.

---

**Handoff rule:** all 167 source-sparse recalls have now been re-read directly from the source. From here, optimize image readiness, unresolved recall quality, and clinical verification at scale.