# PediaRounds Master Bank — Shared Progress & Handoff

> **Single source of truth for coordination between ChatGPT conversations.** Read this file and `coordination/current-work-state.md` before work, then update both after every successful batch.

## Repository / active phase
- Repository: `drabdulazizalhazmi-hub/-PediaRounds`
- Base: `main`
- PR #2 merged initial Master Bank.
- PR #4 merged source-coverage closure.
- PR #3 closed as superseded.
- Working branch: `master-bank/review-images-verification`
- Active PR: **#5 — Review images, incomplete recalls, and clinical verification**

## Structural/source milestone
- **1023 records scanned**.
- **1022/1022 enumerated source slots covered; 0 missing**.
- Genetics source anomaly: TOC says 53 but sequence ends at Q52; do not fabricate Q53.
- Exact duplicate IDs: 0; section/Q structural collisions: 0.

## Completed quality work

### Sparse recall
- 167 source-sparse questions identified (163 single-option, 4 zero-option).
- **167/167 directly re-read against source**.
- 0 missing distractors/calculations invented.
- 0 verified answers assigned solely from recall-source text.

### Sparse media
- **48/48 media cues audited**.
- 23 questions have exact pre-answer original-image associations representing 28 embedded images.
- 10 embedded candidates are post-answer/reference graphics and must not be exposed before answering.
- Neonatology Q7: nearby Ballard teaching images, but no uniquely identifiable question image.
- 8 explicitly media-dependent items have no recoverable original media in current PDF extraction.
- 6 prior media flags were false-positive/text-only.

### Outdated queue
- **9/9 reviewed against current guidance**.
- Recalled keys preserved.
- Most remain historical/non-publishable where current answer/context differs or is absent from retained options.

## Conflicting queue — in progress
Baseline: **131 canonical conflicting records**.

### Conflict Batch 1 — 30 reviewed
File: `review-queue/conflicting-batch01-triage-30-20260907.json`

Breakdown:
- **17** jurisdiction/policy-sensitive Medical Ethics & Patient Safety records.
- **4** under-specified Research/Communication records.
- **9** clinical source/option conflicts across Trauma, Dermatology, Ophthalmology.

Outcome:
- **30/131 conflict records reviewed and classified**.
- **101 remaining** for controlled conflict review.
- 0 recalled answers overwritten.
- 0 verified answers forced when source/options are insufficient.
- All 30 retain non-publishable status until the recorded verification action is completed.

Important examples:
- Ethics Q6–Q11: confidentiality, sponsored education, DNR and perioperative DNR depend on current Saudi policy; compilation alone is insufficient.
- Research Q5/Q7/Q9/Q13: study design/statistical metric/options are under-specified; missing data must not be inferred.
- Trauma Q10: source key selects CT but source explanation says CT is not indicated in the retained low-risk scenario.
- Dermatology Q12: IV-vs-oral acyclovir conflict is preserved.
- Ophthalmology Q2: best next step is absent from retained choices.

## Baseline review-status inventory from closure
- `needs_verification`: 585
- `image_missing`: 198
- `image_needs_review`: 10
- `incomplete_recall`: 77
- `conflicting`: 131
- `outdated`: 9
- `deduplicated`: 13

These baseline counts are not automatically decremented by review-index work; canonical status changes require explicit safe resolution.

## Coordination protocol
1. GitHub wins over chat memory.
2. Do not repeat completed numbered/source/sparse/media/outdated/conflict batches.
3. Keep `recalledAnswer` separate from `verifiedAnswer`.
4. Do not invent missing options, images, calculations, years, stems, or answer keys.
5. Original source images only for source-dependent MCQs.
6. Current policy-sensitive Saudi questions require current jurisdictional/institutional references.
7. Source PDFs and secrets must not be committed.

## Highest-priority next work
Continue the remaining **101 conflicting records** in large batches. Prefer clinically resolvable conflicts first with UpToDate → Nelson → current specialty guideline; keep policy-sensitive and under-specified items non-publishable when a clean modern answer cannot be supported.

---

**Handoff rule:** source coverage is complete; sparse/media/outdated work is complete; conflicting queue is now **30/131 reviewed**, with **101 remaining**.
