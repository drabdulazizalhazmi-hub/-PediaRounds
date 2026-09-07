# Ophthalmology Part II — source recovery audit, 7 September 2026

Source: `2026 PART Pediatric 3.pdf`, physical PDF pages 652–657.

## Coverage and counting

**10 existing source records updated, not 10 newly added questions:** 9 MCQ drafts plus Q5 as a single-option incomplete recall card. Q5 is preserved in `derm-oph-20260907-incomplete-recalls.json`, outside MCQ data. No missing distractors were invented.

Use the canonical Q1–Q8 and Q9–Q10 files in `data/04-general-paediatrics-outpatients`, together with the source manifest. Four older overlapping exports elsewhere in the branch remain pending full-bank consolidation and are explicitly excluded from this batch's import selection. Do not concatenate every file with an ophthalmology filename.

## Source corrections and outstanding issues

- Q1: original forceps/absent-red-reflex vignette restored. The source provides only a cross-reference, not enough question-specific reasoning to independently exclude alternative causes.
- Q2–Q3: original `best next step` wording restored. The source itself prefers urgent ophthalmology referral/EUA, which is absent from the two recalled choices. Both remain conflicting rather than being reframed as questions about the printed key.
- Q3: original question photograph recovered from PDF page 653 into the review bundle.
- Q4: source explanation is empty; no detailed rationale falsely attributed to it.
- Q5: original leukocoria photograph recovered, but only option A survives. The source's subsequent-tumor discussion specifically concerns hereditary RB1-associated retinoblastoma.
- Q6–Q7: source wording, examination clues and Arabic source-based explanations retained.
- Q8: source key is `A?`, and both options are printed with label A. The second technical option key is B while `sourceKey: A` preserves the original label. The richer PREP spasmus-nutans vignette is not substituted for this recall.
- Q9: preserve referral for individualized amblyopia evaluation rather than prescribing an unspecified patching regimen.
- Q10: restore the printed option `Chalazion (Hordeolum)` and flag the conflation instead of silently repairing it. The original question photo and two explanation graphics are separated. A limited AAPOS terminology check is recorded; no image diagnosis or full-answer verification is claimed.

## Publication gates

All answers remain unverified (`verifiedAnswer: null`; `publishable: false`). Image bytes are available in the downloadable review bundle only, not in the repository or live website; `image.assetPath` remains null. Source provenance, publication rights, clinical review and final editorial approval remain separate requirements.

The retained source wording is for auditable draft review. Public reuse and any approved rewriting must be reviewed separately without changing clinical meaning or silently repairing defective choices.
