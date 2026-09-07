# Ethics / Safety / Research — source-review bundle integration

## Scope and existing records

The local `PediaRounds_47_Source_Review_2026-09-07` bundle reviews 47 source records: 34 Medical Ethics/Patient Safety and 13 Research/Biostatistics/Communication. It contains 35 MCQ drafts and 12 single-option or missing-option recall cards. Every record remains `publishable=false`, `verifiedAnswer=null`, and unscored.

A fresh PR read detected that concurrent work had already imported the same 47 IDs at head `7b5037cc1e5b309528fa0f9fe5487c7524ea6907`. This review therefore appended **zero duplicate question records**. Existing Dermatology, Ophthalmology, and ENT imports were likewise not appended again. The local bundle is a review source, not a byte-identical export of those concurrent files.

## Deliverables added by this review

- `master-bank/tools/import_source_review_bundle.py`: expands a source-review batch and compares it with an existing staging array. It retains existing content and IDs on conflict rather than overwriting them. It never contacts or publishes a Site.
- `master-bank/sources/ethics-research-review-bundle-validation-20260907.json`: records the source-fidelity, arithmetic, asset, and mobile-preview checks.
- The downloadable local bundle contains complete English question/option text, Arabic scenario and explanation notes, English TTS text, 14 extracted original image payloads, a self-contained review preview, and 16 integrity tests. Images were not uploaded to the public repository by this review.

## Integration

Use the original project's stable IDs. Never append all 47 source rows as new questions. Match `part2-ethics-q01`–`q34` and `part2-research-q01`–`q13`; resolve differences explicitly. Keep source-only recall cards out of the MCQ schema, which requires at least two options. Preserve user progress and existing record IDs. Full-bank semantic deduplication has not been certified.

The Python importer accepts the bundle's `source-review-batch.json`:

```bash
python master-bank/tools/import_source_review_bundle.py \
  --batch /path/to/bundle/source-review-batch.json \
  --out-dir /path/to/review-output \
  --existing /path/to/existing-staging-array.json
```

It creates a new `merged-staging.json` and a conflict report; it does not overwrite the original bank file. The local bundle includes the same importer as `import_source_review.py`.

## Important source limits

- Ethics Q11 retains two incompatible perioperative DNR rationales; do not turn the source's debate into a universal rule.
- Ethics Q34 does not clearly state whether the parent wants or refuses discharge and retains no options.
- Research Q7 lacks variable coding/distribution required to select a statistical test.
- Research Q9 does not define the test-positive denominator, so the tentative PPV key is not established by its numbers alone.
- Research Q10 has no numerical study counts. Its generic diagram also has an inconsistent numerator label. The unchanged diagram is provided as a review illustration after answer reveal, not as recovered study data.
- Research Q11 arithmetic matches mean 39.5, median 39, mode 38.
- Research Q12 uses the original small table [30,20;10,40], giving OR 6. Do not substitute the different example in the explanation panel.
- Research Q13's key does not fully agree with its open-/closed-question illustration.

The Saudi Ministry of Health informed-consent guideline (first edition 2019, physical pages 13–15) received a limited separate read. This does not certify every recalled option or the latest institutional policy. UpToDate and Nelson were not independently accessed in this review.

## Tested and not tested

The local preview navigated all 47 records and decoded all 14 images in headless Chromium at 390×844 with no JavaScript errors or horizontal overflow after corrections. Answer reveal, explanatory-image gating, search/filter states, and the 16 integrity tests passed. Audio playback and a physical iPhone were not tested.

This review did not merge PR #2, resolve its merge conflicts, obtain the original Sites authentication/backend source, or publish the live `appgprj_6a9b542a7a7c81919e2e97f30ed411bd` project. A successful content/import-tool commit must not be reported as live-site deployment.
