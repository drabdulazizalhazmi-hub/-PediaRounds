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

## Large-batch sparse-recall queue

A source-wide scan of the 2026 Part II collection identified **167 source-sparse questions** where the source preserves zero or one answer option:

- 163 single-option recalls
- 4 zero-option recalls
- 48 include image/media cues
- 10 have uncertain/unclear source answer text

The grouped queue is committed at `master-bank/review-queue/source-sparse-recalls-20260907.json`.

## Direct source re-read progress

### Completed batch 59
- Endocrinology 17
- Genetics 15
- Infectious Diseases 14
- Neurology 13

### Completed batch 42
- Gastroenterology 10
- Hematology 9
- Metabolic Disorders 9
- Nephrology/Urology 7
- Medical Ethics/Patient Safety 7

### Completed batch 28
- Cardiology 6
- Neonatology 6
- Trauma and Accidents 6
- Critical Care Medicine 5
- Immunology 5

### Completed final batch 38
- Pulmonary/Sleep 4
- Allergy 3
- Oncology 3
- Nutrition and Malnutrition 3
- Rheumatology 4
- Musculoskeletal and Sport Medicine 3
- Substances Abuse and Toxicology 3
- Behavioral Medicine and Psychiatric Disorders 4
- Growth and Development 2
- Dermatology 2
- Ophthalmology 1
- ENT 1
- Research, Biostatistics, and Communication Skills 5

Batch files:
- `review-queue/source-sparse-large-review-59-index-20260907.json`
- `review-queue/source-sparse-large-review-42-index-20260907.json`
- `review-queue/source-sparse-large-review-28-index-20260907.json`
- `review-queue/source-sparse-final-38-index-20260907.json`

## Aggregate status

- **167/167 sparse recalls reviewed directly against the source**.
- **0 sparse recalls remain awaiting direct source re-read**.
- No missing distractors were reconstructed.
- No missing calculations were invented.
- No source image was replaced by a generated substitute.
- No `verifiedAnswer` was assigned solely from recall-source text.

## Important retained source gates from final batch

- Allergy Q27: source gives methacholine challenge but explicitly says exercise challenge is more direct/preferred if offered.
- Dermatology Q12: printed key says IV acyclovir while source explanation says immediate oral antiviral therapy; keep `conflicting` until independently verified.
- Research Q10: specificity cannot be calculated because the underlying table/numbers are absent; source prints `X`.
- Research Q12: source preserves odds ratio = 6 but not the underlying numbers; keep non-publishable until inputs are recovered.
- Image-dependent sparse questions remain blocked pending original-image association/review and publication-rights handling.

## Shared execution rules

- GitHub is the shared memory across chats.
- Read this file and `MASTER_BANK_PROGRESS.md` before writes.
- Do not restart completed numbered sections or completed sparse batches.
- Keep `recalledAnswer` separate from `verifiedAnswer`; independent verification is a separate gate.
- Do not invent missing options, calculations, images, years, or answers.
- Original source images only; generated substitutes are not acceptable for image-dependent MCQs.
- Technical image extraction does not equal publication permission or clinical image approval.
- Keep English TTS and Arabic explanations with English medical terminology.
- Source PDFs and secrets must never be committed to the public repository.

## Next shared batch

Move to **large-batch original-image/media reconciliation** across the 48 sparse image/media questions and other existing image manifests. After image-state cleanup, start large controlled batches for `conflicting`, `outdated`, and `needs_verification` records.

## Coordination rule

If another chat advances PR #5, refetch before writing and follow the newest GitHub state rather than chat history.