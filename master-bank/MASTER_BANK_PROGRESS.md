# PediaRounds Master Bank — Shared Progress & Handoff

> **Single source of truth for coordination between ChatGPT conversations.** Read this file and `coordination/current-work-state.md` before work, then update both after every successful batch.

## Repository / active phase

- Repository: `drabdulazizalhazmi-hub/-PediaRounds`
- Base branch: `main`
- PR #2: merged
- PR #4: merged successfully as `c24996e32b4279f71518455483c45afb7da49bc7`
- PR #3: closed as superseded
- Current working branch: `master-bank/review-images-verification`
- Current pull request: **PR #5 — Review images, incomplete recalls, and clinical verification**
- Phase: **quality cleanup after full numbered-source coverage**

## Source coverage milestone

Latest closure QA:
- **1023 records scanned**
- **1022/1022 enumerated source slots covered**
- **0 missing source slots**
- **0 duplicate IDs**
- **0 section/Q structural collisions**

The 1023-vs-1022 discrepancy is the source's Genetics numbering anomaly: TOC prints 53 but actual Genetics sequence ends at Q52. Do not fabricate Q53.

## Sparse-recall quality milestone

The source-wide sparse set contained **167 questions** where the source preserved zero or one answer option:
- 163 single-option recalls
- 4 zero-option recalls
- 48 image/media cues
- 10 uncertain/unclear source-answer texts

All **167/167** have now received a direct source re-read in four large batches (59 + 42 + 28 + 38). Remaining sparse recalls awaiting direct source re-read: **0**.

No missing distractors or calculation inputs were invented, and no `verifiedAnswer` was assigned solely from recall-source text.

## Sparse image/media milestone — 48/48 complete

Files:
- `review-queue/sparse-media-triage-48-20260907.json`
- `review-queue/sparse-image-association-34-20260907.json`
- `review-queue/sparse-media-missing14-audit-20260907.json`

Final media results:
- **48/48 media cues audited**.
- **23 questions** have exact pre-answer original-image associations; **28 original embedded image files** are identified by PDF xref, bbox, dimensions and SHA-256.
- **10 questions** had embedded candidates proven to be post-answer/explanation/reference graphics; these are explicitly blocked from pre-answer display.
- **1 question — Neonatology Q7** has nearby Ballard teaching images but no uniquely identifiable original question image.
- **8 questions** explicitly reference media whose original image is absent from the current PDF extraction: Oncology Q15; Cardiology Q32; Endocrinology Q17/Q48; Infectious Q67; Nephrology Q46; Neurology Q14/Q34.
- **6 prior media cues are actually text-only questions** and should not carry an image-required blocker: Immunology Q4; Metabolic Q15; Nephrology Q6; Neurology Q8; Trauma Q2/Q29.

No source image bytes were committed publicly; publication rights and clinical image review remain separate gates.

## Important retained source/clinical gates

- Allergy Q27: source gives methacholine challenge but explicitly says exercise challenge is more direct/preferred if offered.
- Dermatology Q12: source key says IV acyclovir while source explanation says oral antiviral therapy; keep `conflicting` until independently verified.
- Research Q10: specificity cannot be calculated because source data are absent; source prints `X`.
- Research Q12: source preserves OR=6 without underlying numbers.
- Nephrology Q46: original renal ultrasound missing and source answer unresolved (`X`).
- Neonatology Q7: question image not uniquely identifiable.

## Current review-status baseline inherited from closure

Before PR #5 cleanup:
- `needs_verification`: 585
- `image_missing`: 198
- `image_needs_review`: 10
- `incomplete_recall`: 77
- `conflicting`: 131
- `outdated`: 9
- `deduplicated`: 13

These counts are a baseline, not the final post-cleanup state; media audit has now refined many image assumptions without silently changing clinical verification status.

## Coordination protocol — mandatory

1. GitHub wins over chat memory.
2. Do not re-import completed numbered ranges or re-run completed sparse/media batches unless validating a specific finding.
3. Preserve `recalledAnswer` separately from `verifiedAnswer`.
4. Keep `verifiedAnswer: null` until independent verification is recorded.
5. Do not invent missing distractors, images, years, stems, calculations or keys.
6. Original source images only for source-dependent MCQs; no generated substitutes.
7. Keep English stem/options/TTS and clear Arabic explanation with English medical terminology.
8. Preserve unresolved `conflicting`, `outdated`, `incomplete_recall`, `image_missing`, and `image_needs_review` states until genuinely resolved.
9. Do not commit source PDFs, credentials, tokens, passwords or secrets.
10. Refetch coordination state before writing if another chat may have advanced PR #5.

## Highest-priority next work

1. Start **large controlled batches of `conflicting` and `outdated` records** now that sparse source/media integrity is stable.
2. Where conflicts can be resolved, verify against UpToDate → Nelson → current specialty guideline and document support/conflict explicitly.
3. Keep source keys unchanged in provenance even when a verified answer differs.
4. Then move into large `needs_verification` batches.

## Style contract between conversations

- Work in large batches when source quality permits.
- Report only work actually committed.
- Source completeness, media readiness, publication permission, and clinical verification are separate gates.

---

**Handoff rule:** numbered source coverage is complete, all 167 sparse recalls are directly reviewed, and all 48 sparse media cues are technically reconciled. Next phase is clinical conflict/outdated-key resolution at scale.
