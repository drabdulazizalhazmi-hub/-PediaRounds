# Tail Sections Source Coverage Audit — 2026-09-07

Scope: structural/source coverage only. This audit does **not** mark answers as clinically verified and does not make image-gated questions publishable.

Source of record: *Pediatric Saudi Board Exams Question Collection, 4th Edition, 1/May/2026* (Part II 2025–2017).

## Audited sections

| Section | Source count | Canonical PR coverage observed | Structural result | Important gates |
|---|---:|---|---|---|
| Dermatology | 22 | Q1–Q6 + Q7–Q20 + Q21–Q22 | 22/22 IDs represented | Image-dependent questions remain gated; Q10 is internally conflicting in the source |
| Ophthalmology | 10 | Q1–Q8 + Q9–Q10 | 10/10 IDs represented | Q2–Q3 source options are incomplete vs the preferred referral action; Q5 is a single-option recall; Q8 remains uncertain/conflicting |
| ENT | 9 | Q1–Q9 | 9/9 IDs represented | Image/source completeness still governs publishability where applicable |
| Medical Ethics | 11 | Q1–Q11 | 11/11 IDs represented | Several recalled keys are tentative/conflicting and remain unverified |
| Patient Safety | 23 | Q12–Q34, with Q15/Q21/Q24/Q34 held in the incomplete-recall file | 23/23 IDs represented structurally | Q15, Q21, Q24 and Q34 are source-constrained incomplete recalls and must remain non-publishable |
| Research / Biostatistics / Communication | 13 | Q1–Q13 | 13/13 IDs represented | Clinical/statistical answer verification remains separate from source coverage |

**Total audited structural IDs: 88/88 across these six tail sections.**

## Source-constrained incomplete Patient Safety recalls

These are not missing imports; the source itself is incomplete or unclear:

- **Q15** — only one option survives: “It will improve the quality of care”; source key is `A?` and the source states it did not find a definitive answer.
- **Q21** — only `A. Report?` survives; source key is `X`; no usable answer is preserved.
- **Q24** — only one option survives: “It is always needed except for unstable patients in ER”; source key is `A?`; the supporting explanation is broader than the abbreviated option.
- **Q34** — stem itself preserves contradictory wording (“wants (or does not want) to take him home”), has no options, and the source explicitly says the question is not clear.

These four records belong in `contentType: source_recall`, `reviewStatus: incomplete_recall`, `publishable: false` until a better original recall is found. They should **not** be padded with invented options.

## Dermatology source closure notes

- Q7–Q20 were checked against source pages 640–649 and match the canonical range file.
- Q10 must remain `conflicting`: the source prints `B?` for magic mouthwash, then its own explanation says routine magic mouthwash is not suggested because evidence of benefit is lacking and potential harm exists.
- Image-dependent dermatology items remain blocked until the original source image is linked and reviewed.

## Ophthalmology source closure notes

- Source pages 651–656 confirm Q1–Q10 numbering.
- Q2–Q3: the recalled options are CT/TORCH, while the source explanation states urgent ophthalmology referral for leukocoria is the best action; do not silently replace the recalled option set.
- Q5: the source only preserves `A. Osteosarcoma`; this remains a single-option recall even though the source explanation supports the association with hereditary retinoblastoma.
- Q8: the source itself notes uncertainty between congenital/infantile nystagmus and spasmus nutans; preserve the conflict.

## Canonicalization implications

1. Do not re-import Dermatology, Ophthalmology, ENT, Medical Ethics, Patient Safety, or Research merely because an older chat pointer says they are next.
2. Preserve the four Patient Safety incomplete recalls outside normal publishable MCQs.
3. Continue the global 1023-ID manifest/duplicate audit and prioritize true gaps, image recovery, and source-constrained incomplete recalls.
4. `verifiedAnswer` remains `null` until independent verification is explicitly recorded.
