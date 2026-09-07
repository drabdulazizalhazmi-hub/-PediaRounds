# PediaRounds cross-chat coordination state

Updated: 2026-09-07
Branch: `master-bank/review-images-verification`
PR: **#5 — Review images, incomplete recalls, and clinical verification**
Base: `main`

## Current shared state

- PR #2 merged the initial Master Bank.
- PR #4 merged the source-coverage closure work.
- PR #3 was closed as superseded by PR #4.
- Closure QA scanned **1023 records** and confirmed **1022/1022 enumerated source slots covered, 0 missing**.
- The Genetics 53-vs-Q52 discrepancy is in the source itself; do not fabricate Q53.
- Exact duplicate IDs: 0; structural section/Q collisions: 0.

## Quality phase now active

Baseline review inventory before PR #5 cleanup:
- 249 image-dependent questions without public assetPath
- 77 incomplete recalls
- 131 conflicting
- 9 outdated
- 585 needs_verification

## Work completed in PR #5

- Pulmonary Q9 and Q10 original microscopy images were already recovered into the private source-review bundle; canonical records now store the exact private-review filenames and hashes.
- Their stale `original_image_missing` blockers were replaced with `image_not_publicly_attached` plus rights/clinical-review blockers.
- No source image bytes were committed to the public repository.
- Both questions remain `incomplete_recall` because the source retains only one answer option.

## Shared execution rules

- GitHub is the shared memory across chats.
- Read this file and `MASTER_BANK_PROGRESS.md` before writes.
- Do not restart completed numbered sections.
- Keep `recalledAnswer` separate from `verifiedAnswer`; independent verification is a separate gate.
- Do not invent missing options, calculations, images, years, or answers.
- Original source images only; generated substitutes are not acceptable for image-dependent MCQs.
- Technical image extraction does not equal publication permission or clinical image approval.
- Keep English TTS and Arabic explanations with English medical terminology.
- Source PDFs and secrets must never be committed to the public repository.

## Next batch

Continue source-image reconciliation using existing manifests/bundles, prioritizing records where the exact original image is already identified. Then resolve source-supported incomplete recalls and clinical conflicts in controlled batches.

## Coordination rule

If another chat advances PR #5, refetch before writing and follow the newest GitHub state rather than chat history.