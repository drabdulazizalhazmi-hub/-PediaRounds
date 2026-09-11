# Remaining-fixes hardening — 11 September 2026

**Status: tested on an older source fixture; staged for integration, NOT a live-site update.**

This directory contains additional repairs discovered while reviewing the separately supplied
`PediaRounds_remaining_fixes_2026-09-11.zip`. It is not a source-project export,
a complete deployment, or a substitute for the original repair bundle.

## Repairs

- Keep the score, option highlight and wrong-answer feedback aligned with the same valid source key.
- Reject out-of-range fallback answer indexes and avoid displaying `undefined` as an answer.
- Do not downgrade mastered progress or requeue mastered questions through legacy/duplicate IDs.
- Ignore late speech callbacks from retired utterances, including callbacks emitted during cancellation.
- Recover from transient speech failures at most once; respect Stop and Pause during recovery.
- Release the active state after a current external speech interruption.

These changes do not clinically validate a source answer, restore missing original images,
or complete the English-explanation content audit. Preserve the newer English-only explanation
work in this repository when merging into the current application.

## Exact test scope

The 7 September source backup at commit `6f2e93930db2a57d81971accaa3cbf3f5271f52a`
was restored locally, and the original 11 September remaining-fixes patch applied cleanly.
Thirteen new regression checks initially reproduced eight failures. After the changes here,
fourteen new regression checks plus nineteen existing targeted checks passed: **33 passed,
0 failed, 0 skipped**, on Node.js v22.16.0.

See `verification.json` for the command, original-input fingerprints and limitations.
No full application build, live login, production database or real iPhone/Safari test was run.
The tests use synthetic question and speech fixtures, not production account records.

## Safe integration

1. Obtain the latest application source using its existing authorized project connection.
   Do not restore the old backup over production or replace the authentication system.
2. Review the separately supplied original repair bundle. Its patch is a prerequisite for
   this incremental patch and is not duplicated in this directory.
3. On a disposable source copy, run this read-only guard with an explicit source directory:

   ```sh
   node updates/remaining-fixes-render-2026-09-11/check-source.mjs /absolute/path/to/source-copy
   ```

   It checks only three known fixture files and performs `git apply --check` without applying
   anything. Any missing, different or mixed source revision stops the check. A match does
   not establish that the entire app is current or deployable.
4. For a newer source revision, merge the equivalent changes manually rather than forcing
   a patch or replacing files. Preserve newer English explanations, IDs, DONE state,
   account data and progress.
5. Add `tests/remaining-fixes-hardening.test.mjs` from this directory to the application's
   root `tests/` directory; its imports intentionally target the real application's `public/` files.
   Run the following from that source copy:

   ```sh
   node --test tests/question-reader.test.mjs tests/review-rotation.test.mjs tests/source-answer-markers.test.mjs tests/remaining-fixes-hardening.test.mjs
   ```

6. Run the complete build and authorized staging tests before any production deployment.

## Render boundary

The concurrently added `deployment/render/DEPLOYMENT-RECEIPT.json` records a
**hosting probe only**, not an account/question/progress migration. This repair does not
change that service, deploy configuration or any production datastore.

The inspected old source imports `cloudflare:workers` and expects a D1 `DB` binding.
Those application dependencies must be inspected in the latest source and deliberately
adapted or retained behind authenticated services before a Render application deployment.
A healthy hosting probe is not evidence that PediaRounds sign-in or questions work.

This directory intentionally includes no production question bank, source PDFs, images,
user data, credentials, runtime environment files or private content-gap exports.
