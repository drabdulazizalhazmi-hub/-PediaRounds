# PediaRounds — English original-source explanation patch

Prepared: 2026-09-11
Base inspected: PediaRounds complete backup created 2026-09-07
Base backup commit: 6f2e93930db2a57d81971accaa3cbf3f5271f52a
Base source commit recorded by backup manifest: fe5fa4c72090b317861dc48c8c246a443f342a14

## Requested behavior

After the learner submits an answer, the explanation panel displays the original English source explanation already attached to the question. Arabic teaching text, mixed Arabic-English explanation text, and generated/paraphrased fallback text are not promoted into the primary explanation panel.

Priority:
1. `originalExplanation`
2. legacy English `explanation` when the import stored the source explanation there
3. reviewed `sourceExplanation` recovered from the source
4. `linkedSourceExplanation`
5. a linked source variant's `originalExplanation`

If no eligible English source explanation exists, show:
`Original source explanation is not available for this question.`

No translation is generated.

## Verification on the restored backup

- `node --check public/answer-explanation.js`: PASS
- `node --check public/app.js`: PASS
- `node --test tests/answer-explanation.test.mjs`: 7/7 PASS
- merged-bank source explanation scan: 2,014 questions
- English source explanation available: 1,463
- missing English source explanation: 551
- Arabic characters leaked into the selected explanation text: 0

A broader test invocation could not run fully because the restored checkout does not include `node_modules` or a built `dist/server`; failures were missing `typescript`, `react`, and `dist/server/index.js`, not assertion failures from this patch.

## Important deployment note

Do NOT replace the current live site with the 2026-09-07 backup. A later audit identifies a newer deployed source revision/site version from 2026-09-10. Merge this logic into the current Sites checkout and run its normal build/checkpoint workflow.

## GitHub publication status

This folder is the reviewed handoff committed to GitHub. The connected repository currently has no workflow that deploys to the existing `chatgpt.site` project, so a GitHub merge by itself does not prove that the live Sites deployment changed.
