import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createQuestionReader } from '../public/question-reader.js';
import { buildReviewRound } from '../public/study-session.js';

const appSource = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const answerStart = appSource.indexOf('function submitAnswer()');
assert.ok(answerStart >= 0);
const answerEnd = appSource.indexOf('  const pearl =', answerStart);
assert.ok(answerEnd > answerStart);
// Exercise the real grading, persistence and feedback code; omit later DOM-only panels.
const answerCode = appSource.slice(answerStart, answerEnd) + '\n}';
function submitFixture(question = {}, selected = 0, saved = {}) {
  const q = { uid: 'fixture', options: ['Option alpha', 'Option beta'], answer: 0,
    verification: { status: 'verified' }, ...question };
  const state = { selected, answered: false, imageReady: true, answeredIds: [],
    correctIds: [], wrongIds: [], score: 0, ...saved };
  const writes = [];
  const classList = () => ({ values: new Set(), add(x) { this.values.add(x); }, toggle() {} });
  const els = { options: { children: q.options.map(() => ({ classList: classList() })) },
    resultBanner: { classList: classList() }, resultTitle: {}, resultKicker: {}, resultPoints: {} };
  const context = { state, current: () => q, questionReader: null, els,
    questionKey: x => x.uid, writeStorage() {}, saveDoneProgress: rows => writes.push(...rows),
    explanationTools: { questionDisplayText: x => String(x ?? '').trim() } };
  vm.createContext(context);
  vm.runInContext(answerCode, context);
  context.submitAnswer();
  return { state, els, writes };
}

test('feedback and highlighting use the same source key as grading', () => {
  const { state, els, writes } = submitFixture({ answer: 0, sourceAnswer: 1 }, 0);
  assert.equal(writes[0].correct, false);
  assert.equal(state.score, 0);
  assert.ok(els.options.children[1].classList.values.has('correct'));
  assert.ok(els.resultTitle.textContent.endsWith('Option beta'));
});
for (const answer of [-1, 99]) {
  test(`out-of-range fallback key ${answer} is not scored or displayed as undefined`, () => {
    const { state, els, writes } = submitFixture({ answer });
    assert.equal(writes[0].correct, null);
    assert.equal(state.score, 0);
    assert.equal(state.wrongIds.length, 0);
    assert.doesNotMatch(els.resultTitle.textContent, /undefined/);
  });
}
test('a valid source key remains authoritative even when fallback key is invalid', () => {
  const { state, writes } = submitFixture({ answer: 99, sourceAnswer: 0 });
  assert.equal(writes[0].correct, true);
  assert.equal(state.score, 1);
});
test('a review of an already-mastered question cannot requeue or downgrade mastery', () => {
  const { state, writes } = submitFixture({}, 1, { answeredIds: ['fixture'], correctIds: ['fixture'], score: 1 });
  assert.equal(state.score, 1);
  assert.deepEqual(state.wrongIds, []);
  assert.deepEqual(writes, []);
});
test('incomplete original options stay unscored even with a source key', () => {
  const { state, writes } = submitFixture({ sourceAnswer: 0, options: ['Option alpha', '..'] });
  assert.equal(writes[0].correct, null);
  assert.equal(state.score, 0);
});
test('a mastered alias cannot reappear through the retry queue', () => {
  const questions = [ { uid: 'canonical', duplicateIds: ['old-id'] },
    ...Array.from({ length: 8 }, (_, i) => ({ uid: `fresh-${i}` })) ];
  const round = buildReviewRound(questions, ['old-id'], ['canonical'], ['canonical'], () => 0.5);
  assert.ok(!round.some(q => q.uid === 'canonical'));
});

const question = { text: 'Which option?', options: ['Option alpha', 'Option beta'] };
function audioFixture({ cancelEnds = false } = {}) {
  let sequence = 0;
  const timers = new Map(), spoken = [], states = [];
  const synth = { getVoices: () => [{ lang: 'en-US', localService: true }],
    speak: u => spoken.push(u),
    cancel() { if (cancelEnds) spoken.at(-1)?.onend?.(); } };
  class Utterance { constructor(text) { this.text = text; } }
  const reader = createQuestionReader({ synth, Utterance, onState: value => states.push(value),
    setTimer(fn) { const id = ++sequence; timers.set(id, fn); return id; },
    clearTimer(id) { timers.delete(id); } });
  function flush() { const callbacks = [...timers.values()]; timers.clear(); for (const fn of callbacks) fn(); }
  return { reader, spoken, states, timers, flush };
}
test('late errors from a completed chunk cannot stop the next chunk', () => {
  const { reader, spoken } = audioFixture();
  reader.start(question, 1);
  const old = spoken[0]; old.onend();
  old.onerror({ error: 'not-allowed' });
  assert.equal(reader.isActive(), true);
  spoken[1].onend();
  assert.equal(spoken.length, 3);
});
test('cancel end callback during retry does not advance the current chunk', () => {
  const { reader, spoken, flush } = audioFixture({ cancelEnds: true });
  reader.start(question, 1);
  spoken[0].onerror({ error: 'audio-busy' });
  assert.equal(spoken.length, 1);
  flush();
  assert.equal(spoken.length, 2);
  assert.equal(spoken[1].text, 'Which option?');
});
test('late failed-utterance callbacks cannot cancel a successful replacement', () => {
  const { reader, spoken, flush } = audioFixture();
  reader.start(question, 1);
  const old = spoken[0]; old.onerror({ error: 'network' }); flush();
  old.onerror({ error: 'synthesis-failed' });
  old.onend();
  assert.equal(reader.isActive(), true);
  assert.equal(spoken.length, 2);
});
test('stop cancels a pending transient retry without restarting speech', () => {
  const { reader, spoken, timers, flush } = audioFixture();
  reader.start(question, 1); spoken[0].onerror({ error: 'network' });
  assert.equal(timers.size, 1);
  reader.stop(); flush();
  assert.equal(timers.size, 0);
  assert.equal(reader.isActive(), false);
  assert.equal(spoken.length, 1);
});
test('transient recovery has one retry, not an infinite loop', () => {
  const { reader, spoken, timers, states, flush } = audioFixture();
  reader.start(question, 1); spoken[0].onerror({ error: 'network' }); flush();
  spoken[1].onerror({ error: 'network' }); flush();
  assert.equal(spoken.length, 2);
  assert.equal(timers.size, 0);
  assert.equal(reader.isActive(), false);
  assert.equal(states.at(-1).state, 'error');
});
test('pause clears a scheduled retry and resume keeps the original chunk', () => {
  const { reader, spoken, timers, flush } = audioFixture();
  reader.start(question, 1); spoken[0].onerror({ error: 'audio-busy' });
  reader.pause(); flush();
  assert.equal(timers.size, 0);
  assert.equal(spoken.length, 1);
  reader.resume();
  assert.equal(spoken[1].text, spoken[0].text);
});

test('an external interruption releases the active state instead of leaving a stuck reader', () => {
  const { reader, spoken, states } = audioFixture();
  reader.start(question, 1); spoken[0].onerror({ error: 'interrupted' });
  assert.equal(reader.isActive(), false);
  assert.equal(states.at(-1).state, 'idle');
});
