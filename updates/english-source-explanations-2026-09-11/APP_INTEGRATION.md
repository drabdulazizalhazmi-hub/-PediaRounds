# Integration into the current PediaRounds Sites checkout

Use the current deployed checkout as the base. Do not restore the 2026-09-07 backup over production.

## 1. Replace explanation selection logic

Port `public/answer-explanation.js` from this folder into the current source. The exported `answerExplanation(question)` must return the original English source explanation only, with this priority:

1. `originalExplanation`
2. legacy English `explanation`
3. supported review `sourceExplanation`
4. `linkedSourceExplanation`
5. source-variant `originalExplanation`

Any candidate containing Arabic characters is rejected from the primary explanation panel.

## 2. Update the post-answer panel

In the current `public/app.js` (or equivalent current component), after answer submission:

- set the main explanation text from `answerExplanation(q).text`
- use `Original source explanation` as the panel title
- set `lang="en"` and `dir="ltr"`
- when empty, display `Original source explanation is not available for this question.`
- do not promote `explanationAr`, Arabic distractor notes, or mixed-language teaching text into the main explanation panel

Supplemental audit/source-review data can remain available separately, but the learner-facing primary explanation must remain source-first and English-only.

## 3. Preserve unrelated behavior

Do not change:

- question IDs
- answer keys
- user progress / DONE lists
- retry scheduling for incorrectly answered questions
- exam scoring
- image associations
- authentication

## 4. Verification

Before publishing the Sites version, run the current test/build suite plus a regression test confirming:

- English original source text wins over authored Arabic teaching
- mixed Arabic-English text is rejected from the primary explanation
- missing source explanations render the explicit unavailable message
- Trial Exam / My Exam continue to reveal saved explanations only at the intended phase
