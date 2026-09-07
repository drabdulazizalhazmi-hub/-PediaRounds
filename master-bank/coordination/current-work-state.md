# PediaRounds cross-chat coordination state

Updated: 2026-09-07 12:06 +03:00
Branch: `master-bank/scfhs-merge`
Historical PR: #2 — `Initialize PediaRounds Master Bank`
PR #2 status: **merged/closed**
PR #2 merged head: `490b30faa61a71e8999f717167dfb80f96a32900`
PR #2 merge commit: `8d73d387f4fe57410f10f4ec46c10ab6dd059765`
Post-merge tail-audit commit: `805d3b3309c1e45c4818232cf8977385e1eb60d5`
Handoff-update commit: `f93b8e97814af6c14e1f2220206f5002f390e142`

> Commits made on `master-bank/scfhs-merge` after PR #2 was merged are not part of PR #2/main until a later integration step is explicitly requested.

## Shared execution rules
- Use the large Part II 4th Edition (1 May 2026) as the source-of-record for the 1023-question Part II bank.
- Do not invent missing options, images, answers, or years.
- Preserve `recalledAnswer` separately from `verifiedAnswer`.
- Keep `verifiedAnswer: null` until independent verification is recorded.
- Image-dependent questions remain blocked until the original image/attachment is linked and reviewed.
- Duplicate questions across years map to one canonical question while retaining all year tags.
- Prefer UpToDate, then Nelson, then current specialty guidelines for verification.
- Do not open another Master Bank PR unless the user explicitly requests a new integration PR.

## Current priority — closure audit, not blind bulk re-import
1. Build/maintain a comprehensive 1023-question manifest and identify true coverage gaps.
2. Resolve duplicate/overlapping exports and keep one canonical file per question range.
3. Recover and link image/media assets already present in source bundles/PDFs.
4. Resolve recoverable `incomplete_recall` records from the original source before adding new material.
5. Review clinically conflicting/outdated keys after structural/source integrity is stable.

## Work synchronized across chats
- `MASTER_BANK_PROGRESS.md` is the primary handoff file; read it plus the current branch/file state before work.
- Tail-section source audit added at `master-bank/audit/tail-sections-source-coverage-20260907.md`.
- The audit checked **88 structural IDs** across Dermatology (22), Ophthalmology (10), ENT (9), Medical Ethics (11), Patient Safety (23), and Research/Communication (13). This is structural/source coverage, not answer verification.
- Patient Safety Q15, Q21, Q24 and Q34 remain deliberately separated as `incomplete_recall` because the source itself lacks sufficient options/clarity; do not invent replacements.
- Dermatology Q10 remains internally conflicting; image-dependent Dermatology/Ophthalmology records remain gated.
- Ophthalmology Q5 is a source single-option recall; Q8 remains uncertain/conflicting in the source discussion.
- QA/normalization automation exists under `.github/workflows/` and `master-bank/tools/` (audit, manifest, duplicate detection, asset validation, answer normalization).
- Gastroenterology source coverage has been extended through Q86; Nutrition through Q23. Both still require exact canonical-ID/duplicate audit before a final completion claim.
- Infectious Diseases source coverage exists through Q125; do not re-import it blindly.
- Genetics overlapping exports were reduced. Source count discrepancy remains: TOC declares 53 but source numbering reaches Q52 before Metabolic Disorders; do not fabricate Q53.
- Neurology Q44 source text was recovered and restored.
- Sleep duplicate coverage was reduced. Q15 is preserved separately as a single-option incomplete recall; Q16–Q18 remain in the canonical respiratory/sleep batch.
- ENT canonical file is Q1–Q9; the old Q1–Q2 duplicate was removed.
- Infectious immunization canonical split is Q101–Q114 + Q115–Q125; older overlapping files were removed.

## Known structural/clinical gates
- Image-dependent records remain blocked until original assets are linked; do not substitute generated images for source images.
- Pulmonary/Sleep/Asthma contains legacy + canonical range overlap and incomplete image/single-option recalls; audit before any new import.
- Gastro generic `batch*-supported` files overlap newer explicit range files; deduplicate by canonical question ID, not filename alone.
- Nutrition generic supported files may overlap newer explicit gap files; deduplicate by canonical question ID.
- Patient Safety Q15/Q21/Q24/Q34 remain source-constrained and non-publishable.
- Review statuses `conflicting`, `outdated`, `incomplete_recall`, `image_missing`, `image_needs_review` must survive cleanup until resolved.

## Parallel material not yet considered imported
- D2 2025 Q37–Q96 preview set (59 items) requires production-schema mapping and deduplication against the canonical bank before import.
- Additional local preview sets (including 30-question and 15-question ranges) are not considered published/imported until deduplicated, mapped, reviewed, and committed.

## Next action shared by all chats
1. Read this file, `MASTER_BANK_PROGRESS.md`, and current branch filenames.
2. Continue the canonical coverage audit / 1023-ID manifest rather than restarting completed tail sections.
3. Prioritize **Pulmonary/Sleep/Asthma** and **Gastroenterology/Nutrition** overlap cleanup in large batches.
4. Recover original images/attachments and only genuinely recoverable incomplete recalls.
5. Remove only proven duplicate exports; never delete the sole source-backed canonical record.
6. Do not open a new PR unless the user explicitly requests one.
7. After each successful batch, update this file and `MASTER_BANK_PROGRESS.md`.

## Coordination rule
GitHub is the shared memory between chats. Prefer updating canonical records over creating another overlapping export. If another chat has advanced the branch, refetch before writing and merge the newer state rather than overwriting it.
