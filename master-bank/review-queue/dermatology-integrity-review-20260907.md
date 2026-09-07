# Dermatology: source coverage and integrity review — 2026-09-07

## Coverage

Source: `2026 PART Pediatric 3.pdf`, physical pages 637–650.
Source SHA-256: `c27467c9992a5fb480fcaeb3d0b05b516678724f16999b03aa93e5773480e632`.

The section contains 22 source-numbered records, not 22 complete, clinically approved MCQs:
- 20 MCQ drafts: Q1–Q3, Q5–Q11, Q13–Q22.
- Two single-option recall cards: Q4 and Q12. Do not fabricate distractors or score these as MCQs.
- The Q7–Q20 continuation accounts for 14 source numbers: 13 MCQ drafts plus Q12 in the review queue.

The PR was reread while work was continuing. Its Q7–Q20 shard and shared incomplete-recalls file already existed; no duplicate replacement import was forced. The earlier Q1–Q6/Q21–Q22 shard was reread and Q4 is no longer between Q3 and Q5. Preserve the stable IDs when merging.

Canonical repository paths:
- `master-bank/data/04-general-paediatrics-outpatients/dermatology-part2-q01-q06-q21-q22.json`
- `master-bank/data/04-general-paediatrics-outpatients/dermatology-part2-q07-q20.json`
- `master-bank/review-queue/derm-oph-20260907-incomplete-recalls.json` (filter Dermatology IDs; also contains an ophthalmology card).

## Local source-review package checks

A separate review bundle was built from the original PDF. It is not a byte-for-byte export of the concurrently edited PR; its editorial wording and image identifiers differ. Never append both packages as new questions.

Local results:
- 22/22 normalized English stems, original options, exam year tags and raw answer keys matched the source extraction.
- 20 MCQ objects passed the question schema; Q4 and Q12 were kept outside the MCQ schema/scoring path.
- Zero duplicate IDs within this Dermatology package. This does not certify global-bank deduplication.
- All 22 have Arabic scenario/explanation/option notes and full English TTS text.
- Six negative tests rejected a duplicate ID, invented option, premature publication, incomplete TTS, missing Arabic explanation, and changed source stem.
- 25 original embedded image payloads were extracted and SHA-256 checked: 19 question images and six explanation panels.
- Headless Chromium at 390×844 tested all 22 records, navigation, answer reveal, recall-card controls, and all 25 image payloads. No JavaScript errors or horizontal overflow were observed.
- Actual audio playback and an iPhone device were NOT tested.

## Publication gates

All records in the local review package remain `verifiedAnswer: null` and `publishable: false`.

- Q10: uncertain source key B? conflicts with its own explanation about routine magic mouthwash. The referenced original question image is absent at the source location.
- Q17: only an answer-labelled kerion/tinea teaching panel is available. It is shown after answer reveal, not as a neutral examination image.
- Q20: an infant question with an unspecified ivermectin formulation/route and no permethrin option remains a safety/context conflict.
- Q4 and Q12: preserve the single surviving choice; no invented alternatives.

Four limited external reference pages were read: CDC scabies care, CDC head-lice treatment, CDC head-lice clinical care, and RCH HSV gingivostomatitis. These checks do not amount to independent UpToDate/Nelson verification or full clinical approval. A NICE page retrieval failed and was not counted as checked.

Original image files are included in the local review ZIP. Repository image upload, image-publication rights, clinical approval, PR merge and live-site deployment are not certified by this report. Existing overlapping Ophthalmology files were not counted as newly added questions.

## Repeatable check

`master-bank/tools/check_dermatology_integrity.py` validates the canonical Dermatology files. Supply the original PDF locally for source comparison; do not commit it:

```sh
python master-bank/tools/check_dermatology_integrity.py --root . --pdf '/path/to/2026 PART Pediatric 3.pdf' --report /tmp/dermatology-check.json
```

Dependencies: Python 3.10+, jsonschema; PyMuPDF for the optional PDF check. The script never edits source data, bypasses publication gates, merges the PR, or deploys the website.
