# PediaRounds cross-chat coordination state

Updated: 2026-09-07 10:25 +03:00
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
- Early Gastro image audit was extended through **Q19/Q20**. Both stems explicitly say a picture was provided, but rendered source page 209 contains no corresponding question image. They are tracked as `source_image_missing`; explanatory figures were not substituted.
- Existing early Gastro recovered/linkable images remain **Q1/Q2, Q3, Q5, Q13, Q23, Q28/Q29**; Q8–Q11, Q14–Q15, Q19–Q20 remain `source_image_missing` where the cited question image is absent.
- **Nutrition image-reference audit is now complete for Q1–Q23** using the source section pages 254–270. The targeted source-text audit found only one explicit image-dependent item: **Nutrition Q8**.
- **Nutrition Q8** (`part2-nutrition-q008-abetalipoproteinemia-acanthocytes`) has an actual embedded peripheral-smear image on source page 259. It was extracted directly from the PDF object as `p259-000.jpg` (199×149; SHA-256 `1b394584e1cce65d81490b8754b2e6a120fb38515bfed2c4077f5cf49aaeb4df`).
- Private Nutrition review bundle remains `PediaRounds_nutrition_source_image_review.zip`, SHA-256 `bdf29e800855897a5a51a0d4abf2b8bb7cc3057ecbb3b42a1e037e1f2423abf7`.
- Nutrition image metadata/linkage files:
  - `master-bank/sources/nutrition-source-image-review-20260907.json`
  - `master-bank/sources/nutrition-question-image-linkage-20260907.json`
- Nutrition Q8 canonical record path is `master-bank/data/09-gastroenterology-hepatology-nutrition/nutrition-part2-q04-q12.json`.
- No other Nutrition Q1–Q23 question stem in the indexed source text explicitly references picture/photo/smear/radiograph/X-ray terminology.
- Previously synchronized later Gastro image-linked questions remain Q56, Q57, Q63, Q64, Q65, Q68, Q70, Q73, Q74/Q75, Q81.
- Pulmonary source-image review remains Q6, Q9, Q10, Q12; Pulmonary Q14 source image is absent.

## Known review gates
- Gastro Q8–Q11, Q14–Q15, Q19–Q20: source image referenced but absent from current source page.
- Gastro Q35, Q42, Q44–Q45, Q53, Q56–Q57 and selected later GI items retain source conflicts.
- Gastro Q73/Q74 remain incomplete recalls despite image recovery.
- Nutrition Q8 image is recovered but remains `image_needs_review` and publication-gated.
- Pulmonary Q9/Q10 and Sleep Q15 remain incomplete recalls.

## Coordination rule
GitHub is shared memory between chats. Read this file, `MASTER_BANK_PROGRESS.md`, and PR #3 before writes; update both handoff files after a successful batch.
