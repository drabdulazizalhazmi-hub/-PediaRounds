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
- Latest observed PR #5 head: `c397612baa53902e31d4fb38975c3431372bad85`
- Phase: **image recovery / incomplete-recall cleanup / clinical verification**

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

- Pulmonary Q9 (acute eosinophilic pneumonia) and Q10 (pulmonary alveolar proteinosis): corrected stale `original_image_missing` state because the original microscopy images had already been technically recovered into the private review bundle.
- Added exact private-review filenames and SHA-256 hashes to the canonical records.
- Kept `assetPath: null`, `publishable: false`, `incomplete_recall`, and image rights/clinical-review blockers. No source image bytes were committed publicly.
- Pulmonary Q7 remains incomplete because the source preserves only one option.

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

1. Reconcile more recoverable source-image records already identified in Neonatology, Dermatology, Ophthalmology, Gastroenterology, and Pulmonary manifests.
2. Resolve `incomplete_recall` only where original source text supplies missing detail; otherwise preserve incompleteness.
3. Review `conflicting` / `outdated` records after source integrity is stable.
4. Advance `needs_verification` in controlled clinical batches using UpToDate → Nelson → current specialty guideline.

## Style contract between conversations

- Work in large batches when source quality permits.
- Report only work actually committed.
- Source completeness, image readiness, and clinical verification are separate gates.

---

**Handoff rule:** the numbered source bank is structurally covered. From here, optimize quality—not quantity.