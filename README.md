# PediaRounds — integration repairs

**Status: repair code staged in this repository; NOT deployed to the existing website.**

This repository was empty when inspected on 6 September 2026. It does not contain the original PediaRounds application, authentication/backend code, database, or hosting configuration. Do not treat these files as a source-project export or deploy this repository as a replacement website.

## Arabic scenario repair

`updates/arabic-scenario/public/scenario-panel.js` is a drop-in module prepared from the interface in the supplied website archive. It displays a saved pre-answer Arabic scenario first, then falls back to the existing authenticated `POST /api/scenario` endpoint. It handles connection errors, timeouts, stale responses, missing content, and expired sign-in. It never substitutes an answer explanation for a pre-answer scenario and does not modify question IDs, answer selections, scores, DONE lists, or saved progress.

Arabic content still needs to exist in the question data or the backend response. This code does not generate translations, clinically validate questions, or repair an unconfigured backend.

## Verification

Run the dependency-free tests from the repository root:

```sh
node --test updates/arabic-scenario/tests/scenario-panel.test.mjs
```

The corresponding local repair passed 42 Node.js tests and 8 mocked Chromium DOM checks on 6 September 2026. These are fixture tests, not tests of the live website or iOS Safari. Test sources and results accompany the repair.

## Safe integration

The original application source must be imported separately, without passwords, API keys, session cookies, `.env` files, or production database exports. Keep this repair directory separate from that source. Compare the current module against the original archived SHA-256 before replacing it:

```
c881e187903648cb32f7f14e59eae7353a79084ad6dca184ce2a3d26eee26b66
```

If the current version differs, review and merge manually; do not overwrite a newer module. Preserve the original `createScenarioPanel` integration, refresh the asset version, test with an authorized account in staging, and deploy only through the existing site's hosting workflow. No deployment workflow is configured here.

## Remaining website work

- Connect the original source project and its deployment workflow.
- Integrate the Arabic repair and verify scenario coverage without revealing answers early.
- Verify the current/total question counter and Back to Bank navigation across categories.
- Merge the saved question additions as drafts, review missing images and answer conflicts, and deduplicate against the actual bank while preserving existing IDs and study progress.
- Test sign-in and protected access end to end without replacing the existing authentication system.

The question bank, source PDFs, clinical images, private accounts, and progress data are intentionally NOT published in this public repository.

## الحالة بالعربي

هذه حزمة إصلاح محفوظة في المستودع، وليست تحديثًا منشورًا للموقع. يلزم مصدر المشروع الأصلي وربطه بآلية النشر لتطبيق التغييرات على الموقع القائم. لم تُرفع الأسئلة أو بيانات المستخدمين إلى هذا المستودع العام.
