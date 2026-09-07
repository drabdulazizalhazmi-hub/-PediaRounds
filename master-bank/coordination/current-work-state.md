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

Largest groups:
- Endocrinology 17
- Genetics 15
- Infectious Diseases 14
- Neurology 13
- Gastroenterology 10
- Hematology 9
- Metabolic Disorders 9

This queue is for **quality recovery**, not new question import. Missing distractors must not be invented.

## PR #5 work already completed

- Pulmonary Q9 and Q10 original microscopy assets were reconciled with the private source-review bundle; their public assetPath remains null pending rights/clinical review.
- The 167-question sparse-recall audit now gives both chats the same large-batch worklist.

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

Work through the 167 sparse recalls in **large specialty batches**, beginning with Endocrinology + Genetics + Infectious Diseases + Neurology. For each item: recover only source-supported wording/assets, preserve incompleteness when distractors are absent, and separately queue clinical verification.

## Coordination rule

If another chat advances PR #5, refetch before writing and follow the newest GitHub state rather than chat history.