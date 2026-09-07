# PediaRounds cross-chat coordination state

Updated: 2026-09-07 12:38 +03:00
Repository: `drabdulazizalhazmi-hub/-PediaRounds`
PR #2: merged into `main` (merge commit `8d73d387f4fe57410f10f4ec46c10ab6dd059765`)
Current continuation branch: `master-bank/part1-2025-batch01`
Current batch: Part I 2025 `Q1–Q15`

## Shared execution rules
- Use the large Part II 4th Edition (1 May 2026) as the source-of-record for the 1023-question Part II bank.
- Use the uploaded Part I yearly Rapid Review files as source material for Part I imports.
- Do not invent missing options, images, answers, or years.
- Preserve `recalledAnswer` separately from `verifiedAnswer`.
- Keep `verifiedAnswer: null` until independent verification is recorded.
- Image-dependent questions remain blocked until the original image/attachment is linked and reviewed.
- Duplicate questions across years should map to a canonical question while retaining provenance/year tags when deduplication is proven.
- Prefer UpToDate, then Nelson, then current specialty guidelines for verification.
- Do not commit source PDFs or secrets.

## Current priority
1. Continue importing **Part I 2025** in large, source-backed batches now that the initial Part II Master Bank PR has been merged.
2. Preserve original Rapid Review question IDs even though the PDF is organized by specialty rather than numeric sequence.
3. Search/retrieve full source text before each import; do not infer missing question numbers from page order.
4. Keep structural/image/clinical conflicts explicit.
5. Continue Part II canonical audit in parallel only when it avoids duplicate work.

## Latest successful work
- Added `master-bank/data/part1-2025/part1-2025-q01-q15.json`.
- Added `master-bank/review-queue/part1-2025-q01-q15.md`.
- All 15 records keep `verifiedAnswer: null`.
- Stems are transformed/paraphrased for public-repository use; full source PDFs are not committed.
- Image gates currently include Part I 2025 Q4, Q6, and Q9.
- Clinical/source conflict gates currently include Q2, Q3, Q4, Q5, Q7, Q8, Q11, Q13, Q14, and Q15 as documented in the review queue.

## Existing Part II state inherited from main
- Dermatology Q1–Q22 and Ophthalmology Q1–Q10 already exist; do not re-import.
- ENT Q1–Q9 exists.
- Neonatology Q1–Q43 exists.
- Neurology files span Q1–Q50.
- Critical Care Q1–Q55, Trauma Q1–Q44, Substances/Toxicology Q1–Q15, Behavioral/Psych Q1–Q33 exist.
- Cardiology, Endocrinology, Hematology/Oncology, Nephrology/Urology, Rheumatology, Musculoskeletal and Infectious major ranges are already represented.
- Gastro/Nutrition and Pulmonary/Sleep/Asthma still need canonical overlap audits rather than blind re-import.
- Genetics source numbering reaches Q52 although TOC says 53; do not fabricate Q53.
- Pulmonary Q7/Q9/Q10 and Sleep Q15 incomplete recalls are already preserved in review/canonical incomplete-recall files; do not duplicate them as normal MCQs.

## Next action shared by all chats
1. Continue **Part I 2025** with the next recoverable question IDs after Q15, preferably a large batch.
2. Because the source PDF is specialty-grouped, use exact source-ID searches (`Q16`, `Q17`, etc.) and retrieve the surrounding question text/options before writing.
3. Flag source images as publication blockers until linked.
4. Keep source answers unverified until current evidence is actually checked.
5. After each successful batch, update this file and `MASTER_BANK_PROGRESS.md`.

## Coordination rule
GitHub is the shared memory between chats. Prefer canonical additions over overlapping exports. If another chat advances the continuation branch or opens a new PR, refetch before writing and merge the newer state rather than overwriting it.
