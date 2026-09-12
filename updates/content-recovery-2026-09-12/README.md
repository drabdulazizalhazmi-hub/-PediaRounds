# PediaRounds content recovery — 12 September 2026

## Source-image continuation

The image continuation restores **71 files for 50 existing questions** (72 associations):
**34 question figures and 37 explanation figures**. This includes the previous 28 files
and **43 additional recovered files**. All files match the original manifest's SHA-256,
page and dimensions. Both image entries listed as unresolved in the historical receipt
below are now recovered, including the PNG image from Dermatology Q14. The source is
the uploaded `2026 PART Pediatric 3.pdf`, SHA-256
`c27467c9992a5fb480fcaeb3d0b05b516678724f16999b03aa93e5773480e632`.
The source PDF itself is not added or changed by this continuation.

`master-bank/sources/recovered-study-images.json` is the additive runtime attachment
registry. It covers all 71 assets in the existing Dermatology/Ophthalmology,
Neonatology/Neurology, and Ethics/Research manifests. Earlier question-level recovery
metadata and `verification.json` describe the first 28-image pass; use
`remaining-images-verification.json` for the complete image continuation.

The Render study interface now renders the mapped figures with neutral English
captions, aspect-ratio preservation, full-size links, and an image retry control.
Image bytes require verified sign-in. Explanation-image URLs are issued only after
answer submission/reveal and require expiring signatures bound to the authenticated
session. Direct guesses, altered signatures, and other-session requests are rejected.
Figures are removed from the DOM during question changes and logout. Existing question
text, options, answer keys, review state, account data and progress remain unchanged.
Attaching an image does not promote an unreviewed question into scored practice.

The 71 assets and their placement roles were visually inspected. Automated checks cover
asset integrity, canonical mappings, image authentication, pre-answer data separation,
expiry/tampering, binary MIME/HEAD responses, invalid paths, and client image cleanup.
The existing Render build gate includes the image checks. Local browser navigation was
blocked by the browser runtime (`ERR_BLOCKED_BY_CLIENT`), so a new real-browser or
iPhone visual verification is not claimed.

This is **not** restoration of every missing original examination image on the full
Sites platform. The inspected v87 export's 67-record missing-original list remains
unresolved; earlier source-variant checks document missing originals and explanation-only
figures. The separate GitHub bank contains 1,053 records, not the complete v87 application.
No replacement diagnostic image is fabricated and no original-image-missing flag is
cleared by this continuation. No deployment, account migration or traffic switch occurs.

Reproduce the additional extraction from the already supplied source file:

```sh
python updates/content-recovery-2026-09-12/recover_remaining_images.py --pdf '/path/to/2026 PART Pediatric 3.pdf' --apply
node --test deployment/render/server.test.mjs
```

The original extraction description below is retained as the historical first pass.

Status: scoped recovery and integration repair on an isolated GitHub branch. NOT a deployment to the existing ChatGPT Sites website. Do not restore the September 7 backup over the current live source.

## What was actually inspected

The public homepage at `https://pediarounds-alhazmi.dr-abdulazizalhazmi.chatgpt.site/` returned HTTP 200. Unauthenticated requests to `/questions`, `/exam`, `/exam/custom`, `/resources`, and `/nelson` returned HTTP 307 to the site's ChatGPT sign-in route. This is a public-route check, not an authenticated end-to-end or iPhone audio test.

The audited GitHub baseline is `6615071313c75646fbeb8b7428f5036015291116`. Its master bank contains 1,053 distinct records. This is NOT the total question count of the existing website. The repository does not contain the complete current Sites source or a working deployment connection to that site.

## Recovered batch

This batch covers the existing 32 Dermatology and Ophthalmology records, not the whole platform.

- 27 substantive original English source explanations recovered directly from the supplied source PDF.
- 1 explicit previous-question explanation link recovered for `part2-ophthalmology-q03`, following the source's instruction to refer to the preceding question.
- 28 original image files recovered with exact SHA-256, source-page and dimension matches to the pre-existing image manifest: 21 question images and 7 explanation images.
- 24 Python recovery tests and 17 Node explanation-selector tests passed in the isolated work copy. These 41 targeted tests are not a full live-site test suite.

The initial text extraction found 28 direct text blocks. One was only `Similar question (question 188) in volume collection.` It was excluded, leaving 27 actual direct explanations. Cross-reference notes are not counted as explanations.

Question IDs, stems, options, source keys, verified keys, duplicate links, publication flags and clinical review/conflict states are preserved. No account, user-progress, exam-result or production-database writes are performed.

## Provenance and safety

Input PDF, already present in the repository:
`master-bank/sources/original-pdfs/Pediatric-Saudi-Board-Exams-Question-Collection-4th-ED-1-May-2026.pdf`

SHA-256: `85f22dabc1e7f434bc39c49efecb2dcb7f4caadc63ac2abb93f6124a96b370b3`.

Its object numbers differ from the older manifest's PDF. The recovery matches exact image bytes on the expected page, rather than blindly copying old PDF object numbers. Images remain `needs_review`, with publication rights and independent clinical verification explicitly unresolved. Restoring a source explanation does not verify the medical correctness of the source answer. Existing source conflicts are not silently resolved.

Explanation images are kept separate from question images. They must not be displayed before answer submission. Neutral English question-image captions do not add a diagnosis. Source text is stored in `sourceExplanationEn` with page, source-question and checksum provenance; linked text uses `linkedSourceExplanation` and separate link provenance.

The English selector now recognizes the explicit recovered source fields, rejects Arabic-script text and placeholders, handles malformed review arrays safely, and preserves the full explicit English source text rather than applying legacy truncation to it.

Do not use the older `derm-oph-source-images-20260907.json` attachment bundle to repair this batch: it has six mappings but only two supplied assets, and those decoded asset hashes do not match the original-image manifest.

## Unresolved within this batch

Four records still lack a substantive direct or explicitly linked textual source explanation:
- `part2-derm-q05`: source explanation graphics.
- `part2-ophthalmology-q01`: only an unresolved reference to another collection question.
- `part2-ophthalmology-q04`: no substantive source explanation text.
- `part2-ophthalmology-q10`: source explanation graphics.

Two image-manifest entries are not recovered by the exact-byte stream extractor:
- `part2-derm-q05-p639-x4909`
- `part2-derm-q14-p645-x4945`

They remain explicitly unresolved. No replacement image or invented source explanation is supplied.

## Reproduce and integrate

Install the pinned `pypdf` dependency, then run:

```sh
python updates/content-recovery-2026-09-12/recover.py
python updates/content-recovery-2026-09-12/test_recover.py
node --test updates/english-source-explanations-2026-09-11/tests/answer-explanation.test.mjs updates/content-recovery-2026-09-12/source-selector.test.mjs
```

`recover.py` defaults to a dry-run. `--apply` and the integration tests write the verified recovered files to the checkout; neither publishes a website. The generated `verification.json` enumerates recovered text, images, remaining gaps and protected-field checks.

Integrate only into the current authorized Sites checkout, joining by existing question identifiers. Import image bytes through its existing protected asset mechanism and keep explanation-image gating. Merge the English selector into the current source, not into an old backup. Run authenticated staging checks before publication. A commit or PR in this repository alone does not mean the live website changed.
