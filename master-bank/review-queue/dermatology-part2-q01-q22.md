# Dermatology Part II — source recovery audit, 7 September 2026

Source: `2026 PART Pediatric 3.pdf`, physical PDF pages 637–650; SHA-256 `c27467c9992a5fb480fcaeb3d0b05b516678724f16999b03aa93e5773480e632`.

## Coverage now confirmed

All 22 source numbers are represented: **20 MCQ drafts and 2 incomplete recall cards**. This is source-import coverage, not clinical approval or website publication.

- Q7–Q20 have now been recovered from the original PDF: 13 MCQ drafts plus Q12 as an incomplete recall.
- The eight previously imported source records were rebuilt against the PDF. Original wording, surviving options, year tags and physical page references are retained.
- Q4 and Q12 have only one option in the source. They are stored in `derm-oph-20260907-incomplete-recalls.json` outside MCQ data. The previously fabricated Q4 distractor was removed; its ID is preserved in the recall queue.

## Image recovery

Original question photographs and explanatory graphics were extracted to the downloadable review bundle and indexed in `../sources/derm-oph-20260907-image-manifest.json`. They are **not uploaded to the repository or live website**. `image.assetPath` therefore remains null; `bundleAssetPaths` points to local bundle assets.

- The source question image for Q10 is not present on its page.
- Q17 has a labelled comparison graphic in the explanation, not an unlabelled original question image. It must remain explanation-only.
- Other required question images in this section were located in the PDF. The lowest-resolution original images remain low resolution; no generated replacements were used.
- Rights and clinical image review remain publication blockers.

## Priority editorial/clinical review

- Q7: preserve the source's erythema-multiforme framing; no silent reclassification or substitution from a different exam.
- Q10: source prints `B?` for magic mouthwash while its explanation cautions against routine use. Diagnosis and image are also uncertain. Keep conflicting.
- Q11: retain the printed `IV valganciclovir` option as a flagged source wording issue; no endorsement of that route.
- Q12: one surviving option, IV acyclovir; explanation discusses oral treatment generally. Review severity and route without assuming either is universally correct.
- Q13: source acknowledges nonsexual transmission of perianal warts and safeguarding concerns; lesions alone do not establish abuse.
- Q14: preserve and flag `Gram stain ... negative for any growth`; do not invent a culture result.
- Q15: the reassurance rationale relies on small/improving-patch details in the explanation that are absent from the brief stem.
- Q16: distinguish treatment of infected contacts from household shampoo measures.
- Q18–Q19: limited CDC checks address age, repeat-treatment timing and school policy, not a full Saudi-protocol verification.
- Q20: infant treatment option set lacks the preferred alternative discussed in the source and does not specify ivermectin route or weight. Keep conflicting; do not promote to a verified treatment recommendation.

## Verification status

All `verifiedAnswer` values remain null and all records have `publishable: false`. Direct UpToDate/Nelson verification has not been performed in this recovery pass. Five limited CDC/RCH/AAPOS checks across the combined dermatology/ophthalmology batch are recorded separately, with their exact scope.

Use the canonical files in `../sources/derm-oph-20260907-source-manifest.json`. This audit is scoped to this batch, not a full-bank deduplication or live-site test.
