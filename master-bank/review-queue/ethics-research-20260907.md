# Ethics, patient safety, research and communication — 7 September 2026

## Actual scope

47 newly imported source records: Medical Ethics and Patient Safety Q1–Q34, followed by Research/Biostatistics/Communication Q1–Q13. These are **35 MCQ drafts and 12 separate incomplete MCQ recalls**, not 47 publication-ready questions. Existing Dermatology, Ophthalmology and ENT files were inspected and were not imported again.

Source: Pediatric Saudi Board Exams Question Collection, 4th edition, 1 May 2026; physical PDF pages 666–681 and 683–690. No whole source PDF is committed. Original English stems/options and uncertain keys are preserved; Arabic explanations identify the limits of the source. Every verifiedAnswer remains null and every publishable flag is false.

## Incomplete MCQ recalls

- Ethics/Safety: Q1, Q3, Q4, Q15, Q21, Q24, Q34.
- Research: Q1, Q3, Q10, Q11, Q12.

The single/zero-option records are in the separate JSON review queue. No '?' distractors were invented to pass the MCQ schema. Q11 and Q12 research are useful arithmetic exercises even though their distractors are missing.

## Priority review

- Ethics Q6: the tentative HIV confidentiality key is not reconciled with the preceding disclosure exceptions.
- Q7: only a suggested course answer is supplied; no supporting answer explanation was found by the compiler.
- Q8: source notes an ambiguous 50-or-500-riyal threshold; do not implement it as a regulation.
- Q10: key says three consultants; quoted explanation says attending consultant plus two specialist physicians.
- Q11: source explicitly preserves C versus D for perioperative DNR. No current perioperative policy has been independently approved here.
- Q12: authority-role stem is abbreviated and the key is tentative.
- Q16: source key A? (chart only) is retained. A separate SFDA reporting check contradicts the non-seriousness rationale for not reporting; do not grade A as verified.
- Q17–Q18, Q22–Q23, Q31 and Q33: tentative keys or incomplete supporting explanations remain visible.
- Q20: supporting quotation concerns an infected colleague rather than directly addressing needlestick exposure; reporting alone is not a complete exposure-management pathway.
- Q25–Q28: distinguish unavailable guardian, guardian refusal and an immediately life/organ-threatening emergency; do not generalize all shortened recalls into blanket overrides.
- Q30: source explains competent maternal consent; the selected option does not establish that vaginal delivery is medically safe in the described condition.
- Q32: source frames discharge through home palliative care, not abandonment of ongoing care.
- Research Q5 and Q7: study-design and variable-coding details remain insufficient.
- Research Q9: the denominator is not explicitly test-positive; PPV cannot be inferred solely from '23 of 30'.
- Research Q10: no numerical results are supplied. The symbolic specificity diagram has an internal numerator-label inconsistency.
- Research Q13: original answer choices conflict with the accompanying open/closed-question comparison. Choices were not silently repaired.

## Images and calculation checks

14 original figures were extracted into the downloadable local review package: one question image and 13 supporting figures. They are **not uploaded to this public repository**; public redistribution rights are unestablished. Use the image manifest as the canonical filename/extension mapping. Some raw export references have a provisional extension; the hydration tool resolves it by exact page/xref basename and refuses unknown images.

Research Q12's actual page689 image contains rows [30,20] and [10,40]. Direct arithmetic gives OR=(30*40)/(20*10)=6. Research Q11's eight original values give mean39.5, median39, mode38. Arithmetic agreement is not clinical/legal approval.

## Integration and tests

Run:

```sh
python master-bank/tools/hydrate_ethics_research_20260907.py --root . --output dist/ethics-research-hydrated.json
```

The loader uses only manifest-listed files, validates exactly47 unique IDs with35 MCQ drafts and12 recalls, reconstructs English TTS from unchanged stems/options, resolves image paths and leaves grading/publication disabled. Do not concatenate every overlapping historical export using a glob.

The downloadable package passed local JSON/required-field checks, 47-ID and TTS-text checks, 14 image hashes, direct arithmetic checks and Node JavaScript syntax checking. Its self-contained HTML was tested in headless Chromium with all47 records, Arabic-explanation reveal, section/type counters, image separation and a390px-wide viewport. The HTML was loaded from generated in-memory content; this is not a live-site test. Audible speech, iPhone hardware, authentication and actual Sites integration were not tested.

**This commit sequence does not deploy the ChatGPT Sites project, merge PR2, or resolve its existing merge conflicts.** Full-bank consolidation and independent content review remain separate work.
