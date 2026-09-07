# PediaRounds cross-chat coordination state

Updated: 2026-09-07
Branch: `master-bank/scfhs-merge`
PR: #2 — `Initialize PediaRounds Master Bank`

## Shared execution rules
- Use the large Part II 4th Edition (1 May 2026) as the source-of-record for the 1023-question Part II bank.
- Do not invent missing options, images, answers, or years.
- Preserve `recalledAnswer` separately from `verifiedAnswer`.
- Keep `verifiedAnswer: null` until independent verification is recorded.
- Image-dependent questions remain blocked until the original image/attachment is linked and reviewed.
- Duplicate questions across years map to one canonical question while retaining all year tags.
- Prefer UpToDate, then Nelson, then current specialty guidelines for verification.

## Current priority — closure audit, not bulk re-import
1. Build/maintain a comprehensive 1023-question manifest and identify true coverage gaps.
2. Resolve duplicate/overlapping exports and keep one canonical file per question range.
3. Recover and link image/media assets already present in source bundles/PDFs.
4. Resolve recoverable `incomplete_recall` records from the original source before adding new material.
5. Review clinically conflicting/outdated keys after structural/source integrity is stable.

## Work already synchronized in this branch
- Gastroenterology coverage completed through Q86; Nutrition coverage completed through Q23.
- Infectious Diseases source coverage exists through Q125; avoid re-importing it blindly.
- Genetics overlapping exports have been reduced; source count discrepancy remains: TOC declares 53, actual source numbering reaches Q52 before Metabolic Disorders.
- Neurology Q44 source text was recovered and restored.
- Ophthalmology duplicate exports and stale Q8–Q10 review artifacts were cleaned; canonical Q1–Q10 records remain under `data/04-general-paediatrics-outpatients` plus the incomplete-recall review card for Q5.
- Sleep duplicate coverage was reduced; Q15 remains a single-option incomplete recall and Q16–Q18 stay in the canonical respiratory/sleep batch.
- ENT canonical file is Q1–Q9; do not re-add the old Q1–Q2 duplicate.
- Infectious immunization canonical split is Q101–Q114 + Q115–Q125; older overlapping files were removed.

## Parallel material not yet considered imported
- D2 2025 Q37–Q96 preview set (59 items) requires production-schema mapping and deduplication against the live bank before import.
- Additional local preview sets (including 30-question and 15-question ranges) are not considered published/imported until deduplicated, mapped, reviewed, and committed.

## Coordination rule for all chats
Before any bulk add/update, read this file and the current PR file list. Prefer updating canonical records over creating another overlapping export. Record any new cross-chat handoff here so the next chat can continue without repeating completed work.
