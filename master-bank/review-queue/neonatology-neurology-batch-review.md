# Neonatology and Neurology batch review

Batch label: 2026-09-06. Destination: PR #2, branch `master-bank/scfhs-merge`.

## Imported source positions

- Neonatology Q1-Q43: all 43 source positions preserved.
- 37 neonatal MCQ drafts have at least two original source options. This is not a claim that every stem, option, image or answer is complete or verified.
- Six neonatal recalls (Q7, Q17, Q25, Q29, Q33, Q42) have fewer than two original options and are stored separately in `neonatology-part2-incomplete.json`, outside the MCQ data directory. No distractors were invented.
- Automatically advanced to Neurology: Febrile Convulsions Q1-Q4 added.
- Total for this batch: 47 records, comprising 41 MCQ drafts and six incomplete-option recall cards. All have `verifiedAnswer: null` and `publishable: false`.
- English stems, actual options, recalled keys, year tags and physical PDF page references are retained. Arabic scenario summaries, Arabic explanations and full English TTS strings are included. Missing source explanations are stated explicitly rather than invented.

Source: *Pediatric Saudi Board Exams Question Collection*, 4th Edition, 1 May 2026; supplied file `2026 PART Pediatric 3.pdf`. Neonatology questions occupy physical PDF pages 456-481; Neurology Q1-Q4 occupy pages 483-485.

Source SHA-256: `c27467c9992a5fb480fcaeb3d0b05b516678724f16999b03aa93e5773480e632`.

## Review items that remain open

| Source position | Issue retained for review |
| --- | --- |
| Neonatology Q3 | Option B is incomplete; initial steps are not explicit. |
| Neonatology Q6, Q7, Q12 | Required original exam image is missing or not uniquely identified. Teaching figures are not substituted. |
| Neonatology Q9 | Platelet availability and urgency affect interpretation of the recalled treatment choice. |
| Neonatology Q11 | Recalled disease-risk percentage is not established by the inheritance discussion. |
| Neonatology Q19 | Maternal regimen, infant evaluation/titer and treatment timing are insufficient for a unique answer. |
| Neonatology Q21 | DNA-only key is not uniquely supported; the source and targeted NIH check also allow suitable RNA NAT. |
| Neonatology Q23 | Source acknowledges uncertainty in the dissemination workup. |
| Neonatology Q26 | Original sodium unit is retained and flagged, not silently corrected. |
| Neonatology Q28 | Referenced creatinine values were omitted from the recall. |
| Neonatology Q36 | C5-T1 answer choice conflicts with the C5-C6 explanation. |
| Neonatology Q40 | Warm/cold compress advice requires condition-specific review; no automatic replacement answer assigned. |
| Neurology Q1 | The source provides no unique answer; missing risk details are not inferred. |

Six neonatal records are explicitly `conflicting`: Q11, Q19, Q21, Q23, Q36 and Q40. Other record-level blockers remain in the JSON, including jurisdiction-sensitive screening, feeding assessment and answer cues already embedded in the source.

## Original images and local preview

27 original embedded image files were extracted: 11 question-image files for nine neonatal questions, plus 16 explanation figures/tables. Question images are associated with Q14, Q16, Q18, Q24, Q25, Q35, Q37, Q42 and Q43. Q25 has three images.

Every extracted image has a source page, PDF image-object reference, pixel dimensions and SHA-256. Original image bytes were preserved. Several source images are low-resolution; no synthetic detail was added. Clinical image review and reuse-rights review remain pending.

The images are included in the downloadable local bundle and embedded in its standalone `preview.html`. Only the image manifest was committed to GitHub in this batch; no binary images were uploaded to the repository. Repository question records therefore use asset IDs and do not falsely claim that their image paths are deployed.

The preview includes source-question counters, section filters, neutral pre-answer image labels, image zoom, an Arabic scenario toggle, source explanations after answering, and English reading controls. Explanation figures appear after answering, not as substitute question images. In the all-sections view, Next advances from Neonatology Q43 to Neurology Q1.

## Validation and delivery status

- 18 of 18 local structural/content-integrity checks passed.
- 16 of 16 headless Chromium preview checks passed, including rendering all 47 records, decoding embedded images, answer-reveal behavior, automatic section transition and a 390-pixel viewport without horizontal overflow.
- The 11 committed data/metadata files were read back through the GitHub tree at commit `ef3307b42f6cd357635bf60cd55df7edec73858f`; all 11 local Git blob hashes matched GitHub.
- Browser tests used `set_content` because direct file-URL navigation is blocked in the test environment. The reading invocation was tested with a stub for the exact English text; audible playback, iPhone/Safari voice support and live-site integration were not tested.
- Targeted primary-source checks are documented separately in `neonatology-reference-checks.json`. They are not full independent verification of the batch. UpToDate full text was unavailable for the attempted thrombocytopenia check; Nelson was not independently checked.
- PR #2 was confirmed open and unmerged. No live website was updated or deployed by this batch.
- These counts describe this batch only. Global bank deduplication and the entire source-bank ingestion are not complete.

Next unprocessed source position: **Neurology Q5 — Seizures and Conditions That Mimic Seizures**. No background ingestion job is running.
