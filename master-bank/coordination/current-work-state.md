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

## Large-batch sparse-recall queue now active

A source-wide scan of the 2026 Part II collection identified **167 source-sparse questions** where the source preserves zero or one answer option:

- 163 single-option recalls
- 4 zero-option recalls
- 48 include image/media cues
- 10 have uncertain/unclear source answer text

The grouped queue is committed at `master-bank/review-queue/source-sparse-recalls-20260907.json`.

## Large batch completed in PR #5

A direct re-read of the uploaded source has now been completed for **59 sparse recalls** across the four largest groups:

- Endocrinology: 17
- Genetics: 15
- Infectious Diseases: 14
- Neurology: 13

Within this batch:
- 21 items have image/media dependencies.
- Genetics Q10 remains a zero-option incomplete recall with uncertain source answer.
- Missing distractors were not reconstructed.
- No `verifiedAnswer` was assigned solely from the recall source.
- The batch is reserved at `master-bank/review-queue/source-sparse-large-review-59-index-20260907.json` so parallel chats do not repeat it.

## Remaining largest groups

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

## Next batch shared by all chats

Continue in a **large batch** with Gastroenterology + Hematology + Metabolic Disorders + Nephrology/Urology + Medical Ethics/Patient Safety. Recover only source-supported wording/assets, preserve incompleteness when distractors are absent, and separately queue clinical verification.

## Coordination rule

If another chat advances PR #5, refetch before writing and follow the newest GitHub state rather than chat history.