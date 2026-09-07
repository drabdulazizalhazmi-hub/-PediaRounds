# PediaRounds Master Bank — Shared Progress & Handoff

> **Single source of truth for coordination between ChatGPT conversations.** Read this file and `coordination/current-work-state.md` before work, then update both after every successful batch.

## Repository / active phase
- Repository: `drabdulazizalhazmi-hub/-PediaRounds`
- Base: `main`
- Working branch: `master-bank/review-images-verification`
- Active PR: **#5 — Review images, incomplete recalls, and clinical verification**

## Structural/source milestone
- **1023 records scanned**.
- **1022/1022 enumerated source slots covered; 0 missing**.
- Genetics source anomaly: TOC says 53 but sequence ends at Q52; do not fabricate Q53.
- Exact duplicate IDs: 0; section/Q structural collisions: 0.

## Completed quality work
- Sparse recall: **167/167 directly re-read**.
- Sparse media: **48/48 audited**.
- Outdated queue: **9/9 reviewed**.
- Conflicting queue assignment: **131/131 assigned; 0 unassigned**.

## Clinical conflict resolution — underway
Latest resolution files include:
- `review-queue/conflicting-clinical-resolution-batch11-12-20260907.json`
- `review-queue/conflicting-clinical-resolution-batch12-gastro-trauma-8-20260907.json`
- `review-queue/conflicting-clinical-resolution-batch13-trauma-derm-4-20260907.json`

### Current-guidance resolution progress
- **111 / 131 conflicting records resolution-reviewed**.
- **29 clean modern answers** supported by retained stems/options in review overlays.
- **82 retained non-publishable** because of under-specification, missing best option, image dependence, version sensitivity, multiple plausible answers, or internal source defects.
- **20 conflicts remain not yet resolution-reviewed**.
- **0 recalledAnswer values overwritten**.

### Latest batch13
- Trauma Q16: EDH diagnosis supported, but evacuation versus observation/referral depends on omitted CT and neurologic severity details; original image remains missing.
- Trauma Q22: CT versus surgery depends on hemodynamic response after resuscitation; retained stem does not provide it.
- Dermatology Q10: original lesion image/diagnosis is uncertain; current HSV gingivostomatitis management emphasizes hydration and analgesia, so no retained option is a clean universal treatment.
- Dermatology Q20: current CDC guidance favors permethrin 5% for infants/young children; oral ivermectin safety is not established below 15 kg and permethrin is absent from the retained choices.

## Baseline review-status inventory from closure
- `needs_verification`: 585
- `image_missing`: 198
- `image_needs_review`: 10
- `incomplete_recall`: 77
- `conflicting`: 131
- `outdated`: 9
- `deduplicated`: 13

Baseline canonical counts do not automatically decrement when review-overlay files are added; canonical record changes require an explicit safe update pass.

## Coordination protocol
1. GitHub wins over chat memory.
2. Do not repeat completed numbered/source/sparse/media/outdated/conflict-assignment or already committed clinical-resolution work.
3. Keep `recalledAnswer` separate from `verifiedAnswer`.
4. Do not invent missing options, images, calculations, years, stems, or answer keys.
5. Original source images only for source-dependent MCQs.
6. Policy-sensitive Saudi questions require current jurisdictional/institutional references.
7. Source PDFs and secrets must not be committed.

## Highest-priority next work
Continue through the **remaining 20 / 131 conflicts**. Prioritize complete retained stems/options and defer jurisdiction-sensitive items until the appropriate current Saudi source is available. Resolve only where retained choices and current evidence support a clean single-best answer; otherwise document the blocker. After all conflict-resolution passes, move to large `needs_verification` batches.

---

**Handoff rule:** source coverage is complete; sparse/media/outdated work is complete; all 131 conflicting records are assigned; **111 clinical conflicts have now been resolution-reviewed**, with **29 clean modern answer resolutions**, **82 correctly retained as non-publishable**, and **20 remaining for resolution review**.
