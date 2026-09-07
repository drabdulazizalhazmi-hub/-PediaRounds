# PediaRounds cross-chat coordination state

Updated: 2026-09-07 09:15 +03:00
Branch: `master-bank/scfhs-merge`
PR: #2 — `Initialize PediaRounds Master Bank`
Observed PR head before this sync: `925988c963a532fed9146d2a92e5869ff5f2b432`
Observed PR size: 264 commits / 206 changed files

## Shared execution rules
- Use the large Part II 4th Edition (1 May 2026) as the source-of-record for the 1023-question Part II bank.
- Do not invent missing options, images, answers, or years.
- Preserve `recalledAnswer` separately from `verifiedAnswer`.
- Keep `verifiedAnswer: null` until independent verification is recorded.
- Image-dependent questions remain blocked until the original image/attachment is linked and reviewed.
- Duplicate questions across years map to one canonical question while retaining all year tags.
- Prefer UpToDate, then Nelson, then current specialty guidelines for verification.

## Current priority — closure audit, not blind bulk re-import
1. Build/maintain a comprehensive 1023-question manifest and identify true coverage gaps.
2. Resolve duplicate/overlapping exports and keep one canonical file per question range.
3. Recover and link image/media assets already present in source bundles/PDFs.
4. Resolve recoverable `incomplete_recall` records from the original source before adding new material.
5. Review clinically conflicting/outdated keys after structural/source integrity is stable.

## Work synchronized across chats
- `MASTER_BANK_PROGRESS.md` is the primary handoff file; read it plus the current PR file list before work.
- QA/normalization automation has been added under `.github/workflows/` and `master-bank/tools/` (audit, manifest, duplicate detection, asset validation, answer normalization).
- Gastroenterology source coverage has been extended through Q86; Nutrition through Q23. Both still require exact canonical-ID/duplicate audit before a final completion claim.
- Infectious Diseases source coverage exists through Q125; do not re-import it blindly.
- Genetics overlapping exports were reduced. Source count discrepancy remains: TOC declares 53 but source numbering reaches Q52 before Metabolic Disorders; do not fabricate Q53.
- Neurology Q44 source text was recovered and restored.
- Ophthalmology duplicate exports and stale Q8–Q10 review artifacts were cleaned; canonical Q1–Q10 records remain under `data/04-general-paediatrics-outpatients`, with Q5 retained as an incomplete single-option review card.
- Sleep duplicate coverage was reduced. Q15 is preserved separately as a single-option incomplete recall; Q16–Q18 remain in the canonical respiratory/sleep batch.
- ENT canonical file is Q1–Q9; the old Q1–Q2 duplicate was removed.
- Infectious immunization canonical split is Q101–Q114 + Q115–Q125; older overlapping files were removed.
- Additional Genetics duplicate range exports were removed; retain only the canonical non-overlapping range files now visible in PR #2.

## Known structural/clinical gates
- Image-dependent records remain blocked until original assets are linked; do not substitute generated images for source images.
- Pulmonary/Sleep/Asthma contains legacy + canonical range overlap and incomplete image/single-option recalls; audit before any new import.
- Gastro generic `batch*-supported` files overlap newer explicit range files; deduplicate by canonical question ID, not filename alone.
- Medical Ethics/Patient Safety contains structured records plus incomplete-recall records; keep incomplete records outside normal publishable MCQs.
- Review statuses `conflicting`, `outdated`, `incomplete_recall`, `image_missing`, `image_needs_review` must survive cleanup until resolved.

## Parallel material not yet considered imported
- D2 2025 Q37–Q96 preview set (59 items) requires production-schema mapping and deduplication against the live bank before import.
- Additional local preview sets (including 30-question and 15-question ranges) are not considered published/imported until deduplicated, mapped, reviewed, and committed.

## Next action shared by all chats
1. Read this file, `MASTER_BANK_PROGRESS.md`, and current PR filenames.
2. Run/advance the canonical coverage audit and manifest rather than restarting a completed section.
3. Prioritize recoverable images/attachments and incomplete recalls already present in source material.
4. Remove only proven duplicate exports; never delete the sole source-backed canonical record.
5. After each successful batch, update this file with the new PR head/commit and exact completed work.

## Coordination rule
GitHub is the shared memory between chats. Prefer updating canonical records over creating another overlapping export. If another chat has advanced the branch, refetch before writing and merge the newer state rather than overwriting it.
