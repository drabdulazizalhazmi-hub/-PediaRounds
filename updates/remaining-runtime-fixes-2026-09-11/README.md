# PediaRounds remaining runtime fixes — 11 September 2026

This is an integration handoff, not a deployed website. It continues the English-source explanation handoff in PR #7 without replacing its selection logic or importing an old website over production.

## Included

- `public/question-reader.js`: bounded retry of transient speech failures; invalidate old utterances before cancel; ignore stale end/error callbacks; recover from external cancellation; permit an initially empty voice list; block mixed-language read units even when the languages are in separate fields.
- `public/question-display.js`: keep source wording and clinical symbols while removing copied correctness marks; recognize original-option placeholders rather than invent options.
- `integration.patch`: targeted changes to the reference app, study session, question-store counters, and server mock/custom scoring. It preserves manual Previous after accidental Next, saves unresolved wrong answers per account, reinserts wrong items at a randomized 3–5-position gap where the remaining round permits, and gives the requested correction message. Source-answer grading and the displayed result now use the same validated key; invalid fallback indices remain non-scoring. Incomplete options are visibly review-only and excluded from new scored exams. Existing pinned exam attempts are not rewritten.
- `tests/runtime.test.mjs`: 14 dependency-free, synthetic-fixture regressions for option handling, speech content, and speech lifecycle races.

The PR also supplies the missing `question-display.js` dependency and explicit module package metadata for the earlier English explanation handoff, making its existing six tests runnable in this repository. Its original English-only explanation selection logic is unchanged.

## Run repository checks

From the repository root, with Node 22.13 or later:

```sh
npm --prefix updates/remaining-runtime-fixes-2026-09-11 test
git apply --stat updates/remaining-runtime-fixes-2026-09-11/integration.patch
```

No installation, paid service, credentials, or medical source PDFs are required. GitHub Actions runs the same standalone runtime and English explanation tests. These checks do NOT exercise production authentication, a real browser speech engine, or the full Sites application.

## Port into the current Sites checkout

1. Use the CURRENT complete Sites source and its own integration branch. Do not deploy the 7 Sep backup. This GitHub repository contains the question bank and update handoffs, not that current runtime.
2. Keep PR #7's `answer-explanation.js` and post-answer English-only panel integration. This patch must not restore mixed-language explanations or an older audio-provider/voice-selection implementation. Port the lifecycle fixes into the current voice controller if its architecture has changed.
3. Review and port both supplied public modules, preserving any newer public exports and settings. Then run `git apply --check /path/to/integration.patch` from the Sites root. Apply only if it matches; otherwise port the hunks manually. Do not force application or copy the old app wholesale. The patch was tested against source commit `6f2e93930db2a57d81971accaa3cbf3f5271f52a` and its original app file hash, not an assumed live revision.
4. Preserve question IDs, aliases, existing DONE/correct history, exam snapshots, current image associations, authentication, and DB configuration. All existing image and clinical-review publication gates stay in place. Do not fabricate missing original images, options, explanations, or clinical verification.
5. Run the current full build and regression suite. Smoke-test unanswered Next/Previous, wrong retry/correction, source-answer conflict feedback, incomplete-option non-scoring, image-required submission, My Exam, cross-account progress isolation, and current voice selection on a real iPhone/Safari.
6. Publish from Sites only after those checks. Merging this handoff to GitHub does not publish the chatgpt.site website.

## Verification and boundaries

Local reference-source regression: 32 passed, 0 failed, 0 skipped. New standalone runtime regression: 14 passed, 0 failed. `verification.json` records the exact reference SHA, test command and patch digest. See GitHub Actions for the combined repository-suite result.

Still unresolved here: access to and integration into the current Sites checkout; production login/account diagnosis; actual iPhone audio behavior; recovery and clinical/source review of missing content. No account, database, source question, original image, or live deployment was changed by this handoff.

Speech event semantics: https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisErrorEvent/error and https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/cancel . Retry delays are implementation choices, not guarantees of real-device behavior.
