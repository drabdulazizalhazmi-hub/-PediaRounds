# Patient Safety and Research/Communication — source review, 7 September 2026

## This batch

Source: `2026 PART Pediatric 3.pdf`, physical PDF pages 671–690.
SHA-256: `c27467c9992a5fb480fcaeb3d0b05b516678724f16999b03aa93e5773480e632`.

- Patient Safety Q12–Q34: 23 source records = 19 MCQ drafts + four recall cards.
- Research/Biostatistics/Communication Q1–Q13: 13 source records = eight MCQ drafts + five recall cards.
- Total: 36 source records, 27 MCQ drafts, nine recall cards. No record is clinically approved or publication-ready.
- All original surviving English stems/options, raw keys, years and page references are preserved; whitespace is normalized. Arabic scenario, explanation and option notes are source-derived, with explicit limits where the source is incomplete.
- All records retain `verifiedAnswer: null` and `publishable: false`.

Recall-only IDs: Ethics/Safety Q15, Q21, Q24, Q34; Research Q1, Q3, Q10, Q11, Q12. They are not scored as complete MCQs and have no fabricated distractors.

## Import paths and concurrent overlap

Use only the four explicit paths in `master-bank/tools/prepare_safety_research.py` for this package. The helper emits full English `tts.text` from the original stem and all surviving options. The compact `tts.readFrom` declaration is a preparation contract, not a claim that the live application already consumes it.

At the final repository read, overlapping sibling files had appeared:
- `master-bank/data/01-principles-of-paediatrics/patient-safety-part2-q12-q34.json`
- `master-bank/data/01-principles-of-paediatrics/research-communication-part2-q01-q13.json`

Do not glob all JSON shards or import overlapping variants as new questions. This package has zero duplicate IDs internally; this is NOT a global-bank deduplication certification or a claim of 36 net-new unique questions. Review divergent variants by stable ID without overwriting production answers, scores or progress. Concurrent sibling work was not deleted.

## Important review gates

- Safety Q12: institutional-role wording is incomplete.
- Safety Q16: uncertain chart-only reporting key is not evidence of an exemption from adverse-event reporting.
- Safety Q25–Q28: preserve the source emergency-consent framing and missing urgency details; do not generalize it to every refusal or every epidural hematoma.
- Safety Q31: the uncertain discharge key after refusal of experimental chemotherapy is not a supported rule for withdrawing care.
- Research Q5: the source does not fully describe the design.
- Research Q7: the appropriate statistical test depends on variable coding; no final key is supplied.
- Research Q9: the denominator is not identified as test-positive, so 23/30 alone does not establish PPV.
- Research Q10: numeric data are absent. The page-688 generic table has a cell-letter inconsistency in its specificity formula; it must remain labelled as an unverified source figure.
- Research Q11: direct arithmetic confirms mean 39.5, median 39, mode 38.
- Research Q12: the original small 2x2 table contains 30,20,10,40; direct arithmetic gives OR=6. The separate explanation example is not the question table.
- Research Q13: the key's wording conflicts with the open/closed-question comparison in the source figure.

## Local validation performed

- 36/36 stems, option arrays, source-key text and year tags matched a fresh extraction from the supplied PDF.
- 36/36 Arabic scenario/explanation/option notes and complete generated English narration passed structural checks.
- Eight negative tests rejected duplicate IDs, invented options, changed stems, changed raw source keys, premature publication, incomplete narration, missing Arabic explanation, and recall cards misclassified as MCQs.
- All 11 embedded image payloads matched their PDF extraction and SHA-256 values. Ten are explanation panels; one is the Research Q12 question table.
- Chromium DOM checks at 390x844 covered all 36 records, answer/figure reveal, navigation, filters, recall-card controls and all 11 image loads. No JavaScript error or horizontal overflow was found. The HTML was loaded with set_content because file URLs are blocked by this runtime browser policy.
- English speech requests were mocked and their full text checked. Actual audio, iPhone/Safari, authentication, backend, and the live website were NOT tested.
- GitHub blob SHAs for the four data/recall files matched the local payloads after upload.

## References and publication

External checks were deliberately limited: an FDA phase-definition page was read; CBAHI role information was available in a national-portal search result; the MOH consent item was an announcement, not the full guideline. The SFDA adverse-event guidance landing-page and national-portal direct opens failed. These are not counted as full guideline reviews. No independent UpToDate/Nelson verification was completed.

Original figures are provided in the private review ZIP, not uploaded to the public repository. Publication rights and clinical/legal approval remain outstanding. The PR was not merged and the Sites project was not deployed.
