# PediaRounds cross-chat coordination state

Updated: 2026-09-07
Branch: `master-bank/review-images-verification`
Base: `main`

## Current shared state

- PR #2 merged the initial Master Bank.
- PR #4 merged the source-coverage closure work; PR #3 was closed as superseded.
- Latest successful closure audit scanned **1023 records**.
- Canonical enumerated Part II source coverage is **1022/1022 with 0 missing source slots**.
- The source itself prints Genetics = 53 but actually numbers Genetics only through Q52 before Metabolic Disorders. Never create a fake Q53 to make the printed total fit.
- Exact duplicate IDs: 0.
- Structural section/Q collisions: 0.

## Quality phase now active

The project is no longer in bulk-import mode. Current priorities are:

1. Reconcile original source images for the **249 image-dependent questions**.
2. Resolve **77 incomplete recalls** only when the source provides missing details.
3. Review **131 conflicting** and **9 outdated** records.
4. Advance **585 needs_verification** records using independent reference checks, keeping source citations distinct from independent verification.
5. Preserve all source provenance and year tags while avoiding new overlapping exports.

## Shared execution rules

- GitHub is the shared memory across chats.
- Read this file and `MASTER_BANK_PROGRESS.md` before writes.
- Do not restart completed numbered sections.
- `recalledAnswer` and `verifiedAnswer` remain separate.
- `verifiedAnswer` stays null until independent verification evidence is recorded.
- Do not invent missing options, calculations, images, years, or answers.
- Original source images only; generated substitutes are not acceptable for image-dependent MCQs.
- Technical image extraction does not equal publication permission or clinical image approval.
- Keep English TTS and Arabic explanations with English medical terminology.
- Source PDFs and secrets must never be committed to the public repository.

## Next batch

Start with recoverable image-linked and incomplete records where source manifests already identify the exact original embedded image or exact missing source wording. Work in large, source-safe batches and update both coordination files after each batch.

## Coordination rule

If another chat advances this branch or opens a newer quality-phase PR, refetch before writing and follow the newest GitHub state rather than chat history.