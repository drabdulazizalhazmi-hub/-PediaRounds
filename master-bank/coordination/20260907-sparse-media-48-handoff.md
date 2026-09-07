# Sparse media batch — 48 questions

Branch: `master-bank/review-images-verification`
PR: #5
Date: 2026-09-07

## Completed

All 48 sparse-recall questions previously flagged with image/media cues received a direct technical PDF media audit.

- 48/48 located in the 2026 Part II source by canonical section + question number.
- 34/48 have one or more embedded image/raster candidates in the question span (question start through the next question boundary, including page continuation).
- 14/48 have no suitable embedded raster candidate in that inspected span; this is a technical finding only and does not prove the original exam lacked an image.
- Exact private-bundle associations were already known for Neonatology Q25, Dermatology Q4, Dermatology Q12, and Ophthalmology Q5.
- Neonatology Q7 has nearby Ballard teaching images but the source does not uniquely identify the original question image; keep it blocked.

Machine-readable results: `master-bank/review-queue/sparse-media-triage-48-20260907.json`.

## Rules retained

- Candidate image blocks are not automatically treated as the clinical question image.
- `assetPath` remains null until rights/publication and clinical association review are complete.
- Do not substitute generated images.
- Do not remove `image_missing` / `image_needs_review` blockers solely because a page contains an image block.

## Next work

Prioritize the 34 candidate-present questions for exact image-to-question association, then the 14 no-candidate questions for original-image recovery from other permitted source bundles or retained originals. Continue in large batches and avoid re-reviewing the 167 sparse recall texts already completed.
