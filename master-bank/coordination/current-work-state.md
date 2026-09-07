# PediaRounds cross-chat coordination state

Updated: 2026-09-07 12:38 +03:00
Repository: `drabdulazizalhazmi-hub/-PediaRounds`
PR #2: merged into `main` (merge commit `8d73d387f4fe57410f10f4ec46c10ab6dd059765`)
Current continuation branch: `master-bank/part1-2025-batch01`
Current continuation PR: `#6 — Import Part I 2025 Q1–Q30`
Current Part I 2025 imported range: `Q1–Q30`

## Shared execution rules
- Use the large Part II 4th Edition (1 May 2026) as the source-of-record for the 1023-question Part II bank.
- Use uploaded Part I yearly Rapid Review files as the source for Part I imports.
- Do not invent missing options, images, answers, years, or question IDs.
- Preserve `recalledAnswer` separately from `verifiedAnswer`.
- Keep `verifiedAnswer: null` until independent verification is recorded.
- Image-dependent questions remain blocked until the original image/attachment is linked and reviewed.
- Keep English TTS and Arabic explanation with English medical terminology.
- Do not commit source PDFs or secrets.

## Latest successful work
- Added Part I 2025 `Q1–Q15` dataset + review queue.
- Added Part I 2025 `Q16–Q30` dataset + review queue.
- All 30 imported records remain unverified (`verifiedAnswer: null`).
- Stems are transformed/paraphrased for public-repository use.
- Q16, Q28, and Q29 add new source-image gates in the second batch.
- Q18, Q19, Q25, and Q29 are specifically flagged for source/clinical conflict review.

## Current priority
1. Continue Part I 2025 after Q30 in large source-backed batches.
2. Because the source PDF is organized by specialty rather than numeric order, search exact question IDs before writing.
3. Retrieve full stem/options from the source; do not infer missing text.
4. Keep all source images as publication gates until original assets are linked.
5. Verify medically only after structural/source integrity is preserved, prioritizing UpToDate, Nelson, then current specialty guidelines.

## Existing Part II state inherited from main
- Dermatology Q1–Q22 and Ophthalmology Q1–Q10 already exist; do not re-import.
- ENT Q1–Q9 exists.
- Neonatology Q1–Q43 exists.
- Neurology Q1–Q50 exists by source-backed files.
- Critical Care Q1–Q55, Trauma Q1–Q44, Substances/Toxicology Q1–Q15, Behavioral/Psych Q1–Q33 exist.
- Cardiology, Endocrinology, Hematology/Oncology, Nephrology/Urology, Rheumatology, Musculoskeletal and Infectious major ranges are represented.
- Gastro/Nutrition and Pulmonary/Sleep/Asthma still need canonical overlap audits rather than blind re-import.
- Genetics source numbering reaches Q52 although TOC says 53; do not fabricate Q53.
- Pulmonary Q7/Q9/Q10 and Sleep Q15 incomplete recalls are already preserved in review/canonical incomplete-recall files; do not duplicate them as normal MCQs.

## Next action shared by all chats
1. Continue Part I 2025 with exact source IDs beginning at Q31.
2. Prefer a large next batch when full source data is recoverable.
3. Update PR #6 rather than opening another overlapping continuation PR.
4. After the batch, update this file and `MASTER_BANK_PROGRESS.md`.

## Coordination rule
GitHub is the shared memory between chats. If another chat advances PR #6 or the branch, refetch before writing and merge the newer state rather than overwriting it.

## Current Site integration owner — user handoff, 2026-09-07
The user asked one continuation conversation to take over, avoid restarting, stop parallel work, and finish the existing Site quickly. This conversation cannot technically stop other conversations. Please do not begin another source import, rewrite question ranges, or deploy the Site concurrently. Continue from the committed records; preserve any work already completed.

Active work: connect the current Master Bank and Part I 2025 Q1–Q30 to the existing PediaRounds Site (`appgprj_6a9b542a7a7c81919e2e97f30ed411bd`). The original Site source is now accessible; integration uses existing Site question UIDs, keeps DONE/checkpoints, preserves original images and source keys, and separates unresolved source reviews from scored questions. No source re-extraction is being restarted. Publishing and the final receipt will be handled by the current continuation conversation.
