# PediaRounds cross-chat coordination state

Updated: 2026-09-07 10:15 +03:00
Active branch: `master-bank/post-merge-audit`
Active PR: #3 — `Continue PediaRounds post-merge audit`
Base: `main`

## Shared execution rules
- Use the 4th Edition (1 May 2026) Part II collection as source-of-record for the 1023-question bank.
- Do not invent missing options, images, answers, or years.
- Keep `recalledAnswer` separate from `verifiedAnswer`; unresolved answers remain unverified.
- Image-dependent questions remain blocked until their original source image is recovered, linked, clinically reviewed, and publication-approved.
- The repository is public: do not commit copyrighted PDF/image bytes; keep them in private review bundles and commit only linkage/hash metadata.
- Duplicate questions across years map to one canonical record while retaining all year tags.

## Current priority
1. Canonical 1023-ID coverage/duplicate audit.
2. Recover source images and attachments, link each to canonical question IDs/paths.
3. Resolve source-supported `incomplete_recall` items without inventing distractors.
4. Preserve conflicting/outdated source keys until independent verification.

## Latest synchronized work
- Early Gastro image linkage now covers **Q1/Q2, Q3, Q5, Q13, Q23, Q28/Q29** in addition to later Gastro image-linked questions.
- **Q5**: recovered the actual contrast-enema image from source page 200 (`p200-x748.jpeg`, SHA-256 `6bf2067646ae077ae5e7f1e06d270821d4a0f06b6ca9f7e2a02a1c4e29653f8f`) and linked it to canonical `part2-gi-q005`.
- **Q13**: recovered the actual chest radiograph for left-sided congenital diaphragmatic hernia from source page 205 (`p205-x766.jpeg`, SHA-256 `439b7b9fb7aaca79ac1db041ece5feab7002be8c3b9afde0d706b8f924266386`) and linked it to canonical `part2-gi-q013`.
- **Q8/Q9**: source stems say X-rays were provided, but rendered pages 202–203 contain only explanatory tables/TEF diagrams, not the question radiographs; both are `source_image_missing`.
- **Q10/Q11** remain `source_image_missing` for the same reason on page 204.
- **Q14/Q15** mention CDH X-ray findings, but page 206 contains explanatory Bochdalek/Morgagni graphics rather than the question radiograph; both remain `source_image_missing` instead of reusing an unproven image.
- Private early-Gastro bundle now contains six recovered source images and has SHA-256 `6d75c470486323c655b578389ab9fa7d5beadd0184a499c0474dce9a3611d942`.
- `master-bank/sources/gastro-early-source-image-review-20260907.json` and `master-bank/sources/question-image-linkage-20260907.json` were updated accordingly.
- Previously synchronized Gastro image-linked questions remain Q56, Q57, Q63, Q64, Q65, Q68, Q70, Q73, Q74/Q75, Q81.
- Pulmonary source-image review remains Q6, Q9, Q10, Q12; Pulmonary Q14 source image is absent.

## Known review gates
- Gastro Q8–Q11, Q14–Q15: source image referenced but absent from current source page.
- Gastro Q35, Q42, Q44–Q45, Q53, Q56–Q57 and selected later GI items retain source conflicts.
- Gastro Q73/Q74 remain incomplete recalls despite image recovery.
- Pulmonary Q9/Q10 and Sleep Q15 remain incomplete recalls.

## Coordination rule
GitHub is shared memory between chats. Read this file, `MASTER_BANK_PROGRESS.md`, and PR #3 before writes; update both handoff files after a successful batch.
