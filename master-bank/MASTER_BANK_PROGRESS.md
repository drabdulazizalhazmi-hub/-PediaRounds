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
- Phase: **large-batch sparse-recall cleanup / image recovery / clinical verification**

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
- Completed a **direct source re-read of 59 sparse-recall questions** across the four largest priority groups:
  - Endocrinology: **17**
  - Genetics: **15**
  - Infectious Diseases: **14**
  - Neurology: **13**
- Within this 59-question batch, **21** have image/media dependencies; **Genetics Q10** is a zero-option incomplete recall with uncertain source answer and remains non-publishable.
- The exact 59-question reservation/index is stored in `review-queue/source-sparse-large-review-59-index-20260907.json` to prevent cross-chat duplication.
- Missing distractors remain unfilled; no answer choices, calculations, years, or images were invented.

## Largest remaining sparse-recall groups to prioritize

- Gastroenterology: 10
- Hematology: 9
- Metabolic Disorders: 9
- Nephrology/Urology: 7
- Medical Ethics/Patient Safety: 7
- Cardiology: 6
- Neonatology: 6
- Trauma and Accidents: 6
- Critical Care Medicine: 5
- Immunology: 5

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

1. Continue the sparse-recall queue in another **large batch**, prioritizing Gastroenterology + Hematology + Metabolic Disorders + Nephrology/Urology + Medical Ethics/Patient Safety.
2. For image/media sparse recalls, reconcile exact original source assets where available; keep unresolved items blocked.
3. Resolve `incomplete_recall` only where another permitted source/original wording supplies missing detail; otherwise preserve incompleteness.
4. Review `conflicting` / `outdated` records after source integrity is stable.
5. Advance `needs_verification` in controlled clinical batches using UpToDate → Nelson → current specialty guideline.

## Style contract between conversations

- Work in **large batches** when source quality permits.
- Report only work actually committed.
- Source completeness, image readiness, and clinical verification are separate gates.

---

**Handoff rule:** the numbered source bank is structurally covered. From here, optimize quality at scale—not by repeating completed sections.