# PediaRounds cross-chat coordination state

Updated: 2026-09-07 10:08 +03:00
Active branch: `master-bank/post-merge-audit`
Active PR: #3 — `Continue PediaRounds post-merge audit`
Base: `main`
Previous PR #2 was merged into `main` on 2026-09-07.

## Shared execution rules
- Use the large Part II 4th Edition (1 May 2026) as the source-of-record for the 1023-question Part II bank.
- Do not invent missing options, images, answers, or years.
- Preserve `recalledAnswer` separately from `verifiedAnswer`.
- Keep `verifiedAnswer: null` until independent verification is recorded.
- Image-dependent questions remain blocked until the original image/attachment is linked and reviewed.
- Duplicate questions across years map to one canonical question while retaining all year tags.
- Prefer UpToDate, then Nelson, then current specialty guidelines for verification.
- The repository is public: do not commit copyrighted source PDFs or extracted source-image bytes unless publication rights are cleared. Private review extraction is allowed; public repo paths remain null until approved.

## Current priority — closure audit
1. Maintain a comprehensive 1023-question canonical manifest and identify true coverage gaps.
2. Resolve duplicate/overlapping exports and keep one canonical file per question range.
3. Recover source images/attachments into private review bundles, record hashes/source pages, and link each recovered asset to its canonical question record.
4. Resolve recoverable `incomplete_recall` records from the original source before adding new material.
5. Review clinically conflicting/outdated keys after structural/source integrity is stable.

## Latest synchronized work
- Active continuation branch/PR remains `master-bank/post-merge-audit` / PR #3.
- Pulmonary source-image review completed for Q6, Q9, Q10, Q12.
- Gastro source-image review now includes Q1/Q2, Q3, Q23, Q28/Q29, Q56, Q57, Q63, Q64, Q65, Q68, Q70, Q73, Q74/Q75 and Q81.
- New private review package `PediaRounds_gastro_early_source_image_review.zip` contains recovered early Gastro assets; current package hash is `f736a9858315d42a81c175b99036819e99c996e92eae0d8687fd28df7e5aa41e`.
- Q1 and Q2 share the single small-left-colon contrast-enema image on source page 197; Q3 has its own contrast-enema image on page 198.
- Q28 and Q29 share the dermatitis-herpetiformis photo on source page 216.
- `master-bank/sources/question-image-linkage-20260907.json` now links canonical IDs for Q1, Q2, Q3, Q23, Q28, Q29 plus the previously linked later Gastro questions.
- Gastro Q10 and Q11 explicitly reference X-ray pictures in the source stems, but no corresponding image is present on rendered source page 204; both are tracked as `source_image_missing` rather than fabricated.
- Gastro Q56/Q57 remain conflicting because the source itself questions image interpretation/definitive testing.
- Gastro Q73/Q74 remain incomplete recalls because missing distractors were not preserved; source images are linked but no options were invented.
- Pulmonary Q14 still references an X-ray not present as an embedded/raster asset in the current source page and remains `image_missing`.
- Q9/Q10 Pulmonary and Sleep Q15 remain incomplete single-option recalls despite image recovery where applicable.

## Previously synchronized coverage
- Dermatology Q1–Q22; Ophthalmology Q1–Q10; ENT Q1–Q9; Growth Q1–Q21.
- Neonatology Q1–Q43; Neurology Q1–Q50; Nephrology/Urology Q1–Q63.
- Rheumatology Q1–Q16; Musculoskeletal Q1–Q19; Critical Care Q1–Q55; Trauma Q1–Q44.
- Cardiology Q1–Q57; Endocrinology Q1–Q65; Hematology Q1–Q57; Oncology Q1–Q20.
- Infectious Diseases through Q125; Genetics through Q52 with source TOC discrepancy for missing Q53; Metabolic Q1–Q23.
- Gastroenterology/Nutrition source ranges are broadly covered but still require exact canonical-ID/duplicate audit.
- Sleep Q15 remains a single-option incomplete recall; Q16–Q18 are in canonical respiratory/sleep data.

## Coordination rule
GitHub is the shared memory between chats. Before any write, read this file plus `MASTER_BANK_PROGRESS.md` and the current PR #3 file list. Prefer updating canonical records over creating overlapping exports. After each successful batch, update both handoff files.
