# PediaRounds Master Bank — Shared Progress & Handoff

> **Single source of truth for coordination between ChatGPT conversations.**
> Read this file and `coordination/current-work-state.md` before starting; update both after each successful batch.

## Repository / current continuation

- Repository: `drabdulazizalhazmi-hub/-PediaRounds`
- PR #2 `Initialize PediaRounds Master Bank` was **merged** into `main` on 2026-09-07.
- PR #2 merge commit: `8d73d387f4fe57410f10f4ec46c10ab6dd059765`
- Current continuation branch: `master-bank/part1-2025-batch01`
- Current continuation PR: `#6 — Import Part I 2025 Q1–Q30`
- Base branch: `main`
- Last synchronized: `2026-09-07 12:38 +03:00`
- Latest committed Part I 2025 coverage on this branch: `Q1–Q30`.

## Coordination protocol — mandatory

1. Before work, fetch this file, `coordination/current-work-state.md`, and inspect current branch/PR state.
2. GitHub wins over remembered chat pointers.
3. Before creating a new question-data file, check whether the exact source/range already exists.
4. Preserve `recalledAnswer` separately from `verifiedAnswer`.
5. Keep `verifiedAnswer: null` until independent verification is actually completed.
6. Image-dependent questions remain blocked until the original image is linked and reviewed.
7. Keep English question/TTS plus clear Arabic clinical explanation with English medical terminology.
8. Do not silently correct source conflicts; mark and document them.
9. Do not commit source PDFs, credentials, tokens, passwords, or secrets.
10. After a successful batch, update both coordination files.

## Latest handoff

The initial Part II Master Bank has been merged. Part I 2025 import is now underway on PR #6.

### Part I 2025 imported on PR #6
- `master-bank/data/part1-2025/part1-2025-q01-q15.json`
- `master-bank/data/part1-2025/part1-2025-q16-q30.json`
- Review queues for both ranges are present.
- All 30 records retain `verifiedAnswer: null`.
- Stems are transformed/paraphrased for public-repository use.

### Important Part I 2025 gates through Q30
- Q2 severe asthma escalation — current PICU/severe-asthma verification.
- Q3 asthma RSI regimen — current pediatric airway verification.
- Q4 familial short stature inheritance — source framing conflict + missing growth-chart image.
- Q5 infant of diabetic mother — outcome wording requires current neonatal review.
- Q6 neonatal lupus — source rash image missing.
- Q7 NAIT — verify preferred platelet product.
- Q8 Kawasaki — verify current aspirin-dose convention.
- Q9 gastroschisis — source image missing.
- Q11 congenital varicella — maternal infection timing conflict.
- Q13 recurrent NTD prevention — source dose 4 mg/day; verify current Saudi/local recommendation.
- Q14 DKA initial fluid — current ISPAD/local verification.
- Q15 DKA neurologic deterioration — current terminology/management verification.
- Q16 Enterobius microscopy image — missing.
- Q18 enuresis — source gives inconsistent family-history percentages.
- Q19 juvenile MG — source chooses neostigmine; compare with current pyridostigmine-based practice.
- Q25 late-preterm apnea — source uses broad full-sepsis-workup/empiric-antibiotic rule; verify risk-based current guidance.
- Q28 congenital glaucoma — original eye image missing.
- Q29 abetalipoproteinemia — source smear terminology conflicts (burr cells vs acanthocytes) and original smear image is missing.

## Strongly represented Part II ranges inherited from main

- Growth & Development `Q1–Q21`
- Dermatology `Q1–Q22`
- Ophthalmology `Q1–Q10`
- ENT `Q1–Q9`
- Neonatology `Q1–Q43`
- Neurology `Q1–Q50`
- Nephrology & Urologic Disorders `Q1–Q63`
- Rheumatology `Q1–Q16`
- Musculoskeletal & Sport Medicine `Q1–Q19`
- Critical Care Medicine `Q1–Q55`
- Trauma & Accidents `Q1–Q44`
- Substances Abuse & Toxicology `Q1–Q15`
- Behavioral Medicine & Psychiatric Disorders `Q1–Q33`
- Cardiology `Q1–Q57`
- Endocrinology `Q1–Q65`
- Hematology `Q1–Q57`; Oncology `Q1–Q20`
- Infectious Diseases major subsections through `Q125`
- Genetics `Q1–Q52` (TOC/source numbering discrepancy for 53; do not fabricate Q53)
- Metabolic Disorders `Q1–Q23`

## Part II areas still requiring exact canonical audit

- Gastroenterology Q1–Q86 — overlapping generic/specific exports.
- Nutrition & Malnutrition Q1–Q23 — possible overlap.
- Pulmonary / Sleep / Asthma — legacy/canonical overlap plus incomplete image/single-option recalls.
- Allergy / Immunology — canonical deduplication and verification required.
- Medical Ethics & Patient Safety — structured records and incomplete-recall queues must remain separated.

## Next action

1. Continue **Part I 2025** with the next recoverable IDs after Q30, in a large batch.
2. The Rapid Review is specialty-grouped rather than sorted numerically; search exact IDs (`Q31`, `Q32`, etc.) before importing.
3. Recover full stem/options from source; never infer missing wording.
4. Preserve image gates and source conflicts.
5. Keep `verifiedAnswer` null until independent UpToDate/Nelson/current-guideline review.
6. Update PR #6 and both handoff files after the next batch.

---

**Handoff rule:** GitHub wins over chat memory. Work forward from the current branch and leave the next conversation a clean state.
