import test from 'node:test';
import assert from 'node:assert/strict';
import { answerExplanation, explanationText, sourceExplanation } from '../public/answer-explanation.js';

test('original English source explanation is primary', () => {
  const q = {
    originalExplanation: 'Original source wording exactly as attached.',
    explanation: 'Edited English explanation',
    explanationAr: 'شرح عربي لاحق'
  };
  const result = answerExplanation(q);
  assert.equal(result.text, q.originalExplanation);
  assert.equal(result.language, 'en');
});

test('legacy English source explanation is accepted', () => {
  const q = { explanation: 'Stored English source explanation.', explanationAr: 'شرح عربي' };
  assert.equal(answerExplanation(q).text, q.explanation);
});

test('Arabic or mixed-language text is not promoted', () => {
  assert.equal(answerExplanation({originalExplanation:'Asthma غير المسيطر عليه with brown sputum.'}).text, '');
  assert.equal(answerExplanation({explanationAr:'شرح عربي فقط'}).text, '');
  assert.equal(answerExplanation({explanation:'English البداية mixed'}).text, '');
});

test('reviewed or linked English source text can be used', () => {
  const q = { githubReviews:[{reviewStatus:'supported', sourceExplanation:'Original recovered source discussion.'}] };
  assert.equal(sourceExplanation(q).text, 'Original recovered source discussion.');
  assert.equal(sourceExplanation({linkedSourceExplanation:'Original related discussion'}).text, 'Original related discussion');
  assert.equal(sourceExplanation({githubReviews:[{reviewStatus:'conflicting', sourceExplanation:'Do not promote'}]}).text, '');
});

test('source variant original explanation is final fallback', () => {
  const q = {sourceVariants:[{originalExplanation:'Verbatim explanation from linked duplicate source.'}]};
  assert.equal(sourceExplanation(q).text, 'Verbatim explanation from linked duplicate source.');
});

test('known placeholders are not explanations', () => {
  assert.equal(explanationText('See previous question.'), '');
  assert.equal(explanationText("Didn't find an answer for this question."), '');
  assert.equal(explanationText('Review developmental milestones. [Developmental Milestones - AAP]'), '');
});
