# PediaRounds cross-chat coordination state

Updated: 2026-09-07 09:40 +03:00
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
3. Recover source images/attachments into private review bundles, record hashes/source pages, and keep public asset publication gated.
4. Resolve recoverable `incomplete_recall` records from the original source before adding new material.
5. Review clinically conflicting/outdated keys after structural/source integrity is stable.

## Latest synchronized work
- PR #2 merged; all earlier Master Bank work is now on `main`.
- New shared branch/PR for continued work: `master-bank/post-merge-audit` / PR #3.
- Pulmonary source-image review batch completed for Q6, Q9, Q10, Q12; source images were extracted into a private review bundle and hashed.
- `master-bank/sources/pulmonary-source-image-review-20260907.json` records the recovered assets and blockers.
- Pulmonary Q14 references a lytic-lesion X-ray in the stem, but the current source page contains no embedded/raster question image; keep `image_missing` and do not fabricate a substitute.
- Q9 and Q10 still have single-option/incomplete-recall blockers even though their source images were recovered.

## Previously synchronized coverage
- Dermatology Q1–Q22; Ophthalmology Q1–Q10; ENT Q1–Q9; Growth Q1–Q21.
- Neonatology Q1–Q43; Neurology files span Q1–Q50; Nephrology/Urology Q1–Q63.
- Rheumatology Q1–Q16; Musculoskeletal Q1–Q19; Critical Care Q1–Q55; Trauma Q1–Q44.
- Cardiology Q1–Q57; Endocrinology Q1–Q65; Hematology Q1–Q57; Oncology Q1–Q20.
- Infectious Diseases through Q125; Genetics through Q52 with source TOC discrepancy for missing Q53; Metabolic Q1–Q23.
- Gastroenterology/Nutrition source ranges are broadly covered but still require exact canonical-ID/duplicate audit.
- Sleep Q15 remains a single-option incomplete recall; Q16–Q18 are in canonical respiratory/sleep data.

## Coordination rule
GitHub is the shared memory between chats. Before any write, read this file plus `MASTER_BANK_PROGRESS.md` and the current PR #3 file list. Prefer updating canonical records over creating overlapping exports. After each successful batch, update both handoff files.
