# PediaRounds cross-chat coordination state

Updated: 2026-09-07 10:32 +03:00
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
2. Recover source images/attachments and link them to canonical questions.
3. Resolve source-supported `incomplete_recall` items without inventing distractors.
4. Preserve conflicting/outdated source keys until independent verification.

## Latest synchronized work
- Nutrition Q1–Q23 image-reference audit remains complete; only Nutrition Q8 is explicitly image-dependent.
- Infectious image audit advanced substantially beyond the early viral batch.
- New committed batch: `master-bank/sources/infectious-mid-source-image-review-20260907.json`.
- Recovered actual Infectious source images in this batch:
  - Q27/Q28 shared scarlet-fever rash — page 285.
  - Q37 splinter hemorrhage — page 292.
  - Q42 pneumonia chest radiograph — page 294.
  - Q57 gram-negative coccobacilli Gram stain — page 305.
  - Q66 erythema-multiforme targetoid lesions — page 311.
  - Q78 steeple-sign radiograph — page 316.
  - Q81 retropharyngeal-abscess lateral neck radiograph — page 319.
  - Q83 thumb-sign radiograph — page 320.
  - Q94 periorbital-redness photograph — page 329.
  - Q96 oral-thrush photograph — page 331.
  - Q97 candidal diaper-rash photograph — page 331.
  - Q98 perianal-streptococcal dermatitis photograph — page 332.
  - Q99 hepatic hydatid-cyst CT — page 332.
  - Q107 slapped-cheek erythema-infectiosum photograph — page 337.
- New private batch package: `PediaRounds_infectious_mid_source_image_review.zip`, SHA-256 `65120722be6287b65f757ead683a4d8fb17b166c5f8ea3f338fd947e97ee54c2`.
- Infectious Q30 remains `source_image_missing`: the recall says a picture was provided, but page 287 contains an explanatory table rather than the original question image.
- Infectious Q67 remains `source_image_missing`: the recall says a chest X-ray was provided, but page 311 contains the Q66 skin image and no matching question radiograph.
- Earlier Infectious recovered images remain Q8, Q9, Q12, Q17, Q18 and Q19.
- Early Gastro recovered/linkable images remain Q1/Q2, Q3, Q5, Q13, Q23, Q28/Q29; Gastro Q8–Q11, Q14–Q15, Q19–Q20 remain `source_image_missing` where referenced assets are absent.
- Later Gastro image-linked questions remain Q56, Q57, Q63, Q64, Q65, Q68, Q70, Q73, Q74/Q75, Q81.
- Pulmonary source-image review remains Q6, Q9, Q10, Q12; Pulmonary Q14 source image is absent.

## Known review gates
- Gastro Q8–Q11, Q14–Q15, Q19–Q20: referenced question image absent.
- Gastro Q35, Q42, Q44–Q45, Q53, Q56–Q57 and selected later GI items retain source conflicts.
- Gastro Q73/Q74 remain incomplete recalls despite image recovery.
- Nutrition Q8 image recovered but publication/clinical review remains pending.
- Infectious recovered images remain `image_needs_review`; Q30/Q67 are `source_image_missing`.
- Pulmonary Q9/Q10 and Sleep Q15 remain incomplete recalls.

## Coordination rule
GitHub is shared memory between chats. Read this file, `MASTER_BANK_PROGRESS.md`, and PR #3 before writes; update both handoff files after each successful batch.
