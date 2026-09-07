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
- **Nutrition Q1–Q23 image-reference audit is complete** for source pages 254–270. The only explicit image-dependent item found is **Nutrition Q8**.
- **Nutrition Q8** (`part2-nutrition-q008-abetalipoproteinemia-acanthocytes`) has the actual acanthocyte smear recovered from source page 259 and linked to `nutrition-part2-q04-q12.json`; no other Nutrition Q1–Q23 question stem explicitly references picture/photo/smear/radiograph/X-ray terminology.
- Nutrition image manifest was updated to record the full-section audit status: `master-bank/sources/nutrition-source-image-review-20260907.json`.
- **Infectious Diseases image audit has now started.** A targeted search across pages 270–349 identified multiple image-dependent recalls; the first early viral batch Q8–Q19 was processed.
- Recovered and privately packaged early Infectious source images:
  - Q8 papular-purpuric gloves-and-socks syndrome — page 274.
  - Q9 cold panniculitis of the cheeks — page 275.
  - Q12 infectious-mononucleosis oropharyngeal image — page 276.
  - Q17 two measles images: Koplik spots + exanthem — page 279.
  - Q18 reuses the measles exanthem image referenced immediately after Q17 in the source text.
  - Q19 chest radiograph in the human-metapneumovirus vignette — page 280.
- Private Infectious review package: `PediaRounds_infectious_early_source_image_review.zip`, SHA-256 `ce650f6e0df395421a76e0266b5b5f7ff707cabd6b1f24b26f86f2161eaafab6`.
- New Infectious linkage metadata:
  - `master-bank/sources/infectious-early-source-image-review-20260907.json`
  - `master-bank/sources/infectious-question-image-linkage-20260907.json`
- The source also contains explanatory graphics on pages 277–278; these were explicitly excluded rather than substituted for question images.
- Early Gastro linkage remains Q1/Q2, Q3, Q5, Q13, Q23, Q28/Q29; Gastro Q8–Q11, Q14–Q15, Q19–Q20 remain `source_image_missing` where their referenced question image is absent.
- Later Gastro image-linked questions remain Q56, Q57, Q63, Q64, Q65, Q68, Q70, Q73, Q74/Q75, Q81.
- Pulmonary source-image review remains Q6, Q9, Q10, Q12; Pulmonary Q14 source image is absent.

## Known review gates
- Gastro Q8–Q11, Q14–Q15, Q19–Q20: source image referenced but absent from current source page.
- Gastro Q35, Q42, Q44–Q45, Q53, Q56–Q57 and selected later GI items retain source conflicts.
- Gastro Q73/Q74 remain incomplete recalls despite image recovery.
- Nutrition Q8 image is recovered but remains `image_needs_review` and publication-gated.
- Infectious Q8/Q9/Q12/Q17/Q18/Q19 images are recovered privately and remain `image_needs_review` until clinical review/publication approval.
- Pulmonary Q9/Q10 and Sleep Q15 remain incomplete recalls.

## Coordination rule
GitHub is shared memory between chats. Read this file, `MASTER_BANK_PROGRESS.md`, and PR #3 before writes; update both handoff files after a successful batch.
