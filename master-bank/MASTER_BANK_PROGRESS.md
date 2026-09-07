# PediaRounds Master Bank — Shared Progress & Handoff

> **Single source of truth for PediaRounds cross-chat work.** Read this file, `coordination/current-work-state.md`, and the latest CI conflict-resolution coverage report before modifying the review queue.

## Repository / active phase
- Repository: `drabdulazizalhazmi-hub/-PediaRounds`
- Base: `main`
- Working branch: `master-bank/review-images-verification`
- Active PR: **#5 — Review images, incomplete recalls, and clinical verification**

## Structural/source milestone
- **1023 records scanned**.
- **1022/1022 enumerated source slots covered; 0 missing**.
- Genetics TOC anomaly: TOC says 53 but actual sequence ends at Q52; do not fabricate Q53.
- Exact duplicate IDs: 0; section/Q structural collisions: 0.

## Completed quality work
- Sparse recall: **167/167 directly re-read**.
- Sparse media: **48/48 audited**.
- Outdated queue: **9/9 reviewed**.

## Conflict-resolution progress — unique-ID counter
`master-bank/tools/audit_conflict_resolution_coverage.py` is authoritative. Batch summary totals must not be added because some IDs were reviewed more than once.

After the completed 10-item non-policy clinical/source overlay batch:
- **131 canonical `conflicting` records**.
- **Expected 114 / 131 unique canonical conflicts resolution-reviewed** (next CI run must confirm; CI wins if different).
- **35 clean modern answer resolutions** in review overlays.
- **79 unique reviewed conflicts retained non-publishable**.
- **17 canonical conflicts remain without a clinical-resolution overlay**.
- **0 recalled answers overwritten**.

Known duplicate resolution passes remain excluded from unique progress. `part2-nephro-cystic-q46` remains overlay-only and does not advance the conflict counter.

## Exact remaining conflict work — 17 Saudi/policy-sensitive records
- Ethics Q6, Q7, Q8, Q10, Q11
- Patient Safety Q12, Q16, Q17, Q18, Q20, Q22, Q23, Q25, Q26, Q28, Q31, Q33

These must be checked against current Saudi jurisdiction-specific sources (MOH/SCFHS/SPSC/SFDA/institutional policy as appropriate). Preserve unresolved ambiguity rather than manufacturing a single-best answer.

## Completed non-policy clinical/source batch
The prior remaining 10 clinical/source conflicts now all have resolution overlays in `review-queue/conflicting-clinical-resolution-batch15-clinical-10-20260907.json`:
- 6 support clean modern verified answers.
- 4 remain non-publishable due to insufficient/ambiguous retained context.
- `recalledAnswer` was not overwritten.

## Baseline review-status inventory from closure
- `needs_verification`: 585
- `image_missing`: 198
- `image_needs_review`: 10
- `incomplete_recall`: 77
- `conflicting`: 131
- `outdated`: 9
- `deduplicated`: 13

Baseline canonical counts do not automatically decrement when an overlay is created; canonical changes require an explicit safe update pass.

## Parallel Part I import
PR **#6 — Import Part I 2025 Q1–Q30** is open on `master-bank/part1-2025-batch01`. It is a separate import stream from PR #5 quality resolution. Coordinate via GitHub before overlapping writes or merges.

## Coordination protocol
1. GitHub + the CI unique-ID audit win over chat memory.
2. Before a conflict batch, verify every ID appears in the exact remaining list.
3. Preserve `recalledAnswer` separately from `verifiedAnswer`.
4. Do not invent missing options, images, calculations, years, stems, or keys.
5. Original source images only for source-dependent MCQs.
6. Saudi policy-sensitive questions require current jurisdiction-specific sources.
7. Source PDFs, credentials, tokens, and secrets must not be committed.

## Highest-priority next work
1. Resolve/document the **17 Saudi/policy-sensitive** conflicts with current authoritative Saudi sources.
2. Re-run the unique-ID audit; only after it reaches **131/131** move to large `needs_verification` batches.
3. Keep PR #6 Part I import moving independently, without duplicating PR #5 work.

---

**Handoff rule:** source coverage is structurally complete. Expected conflict counter after batch15 is **114/131 unique reviewed, 17 remaining**; CI is authoritative and raw batch totals must never be used.

## Published Site integration — 2026-09-07, version 17

The user confirmed all other conversations have stopped updates and this continuation owns the Site integration. The previous active batch claims are retained above as history, not authorization for parallel work. Do not restart source extraction or create another Site.

- Existing Site: [PediaRounds](https://pediarounds-alhazmi.dr-abdulazizalhazmi.chatgpt.site)
- Project: `appgprj_6a9b542a7a7c81919e2e97f30ed411bd`
- Published version: **17**; deployment status: **succeeded**.
- Site source commit: `61a630836df5da91013b47a86a2a837cb8c704e7` (Sites source repository).
- Source snapshots used: PR #5 content commit `9160263aa5de9851f8558ddf6bb33959ca61be5d`; Part I 2025 Q1–Q30 commit `a814696035376e64a6b89b0e9c43c351df2da55d`.
- **1053 source records accounted for**: **993 linked records**, **60 new non-scoring source-review records**. Linked count includes canonical duplicate resolution; it is not a new-question count.
- **1851 original bank questions preserved unchanged**, including stable UIDs, stems, choices, source keys and protected original figures. No progress schema migration or DONE/checkpoint reset.
- **889 existing main-bank questions** receive supplemental source reviews; **960 existing records** are enriched when existing review items are included.
- Source-review total is now **440 records** before existing hidden-image filters. This includes incomplete recalls and is not a count of complete scored MCQs.
- Saved Arabic pre-answer scenarios increased from **50 to 116**, each tied to an exact original bank stem. Existing curated explanations retain priority.
- **0 new scored questions**. Source-only keys without existing verified/corroborated/corrected status are displayed as unscored source review. Clinical overlay notes are shown explicitly; imported source keys are not silently promoted to verified answers.
- New review UI supports source options, saved Arabic scenarios, submission before key reveal, counters, filters, and visible conflict-resolution notes. Original source options remain with their own review wording.
- Validation: production build succeeded; 17 scenario, media, navigation and DONE regression checks passed; original-bank equality, unique IDs, complete source accounting, and clean Git diff checks passed. No browser QA was performed in this run.

### Remaining work, without re-importing completed ranges
The Site integration is published; independent clinical verification and missing original-image resolution remain governed by the queues above. The 60 additional review records require final equivalence/completeness checks before any promotion into scored sessions. No claim is made that the medical verification queues are closed. Continue Part I only after the committed Q1–Q30 range; use the integration mapping in the Site source (`data/import-audit/github-integration.json`) before adding records. D2 Q37–Q96 from prior bundles was not imported by this deployment.
