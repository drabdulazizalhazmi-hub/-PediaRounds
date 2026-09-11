import test from 'node:test';
import assert from 'node:assert/strict';
import { createQuestionReader, speechSegments } from '../public/question-reader.js';
import { questionDisplayText, hasCompleteOptionSet, isMissingOriginalOption, hasMixedArabicEnglish } from '../public/question-display.js';
const q = { text: 'Which option?', options: ['Alpha', 'Beta'], answer: 1, explanation: 'SECRET_EXPLANATION' };
function fixture(voices = []) {
  const spoken = [], states = [], timers = new Map(); let sequence = 0, cancellations = 0;
  const synth = { getVoices: () => voices, speak: u => spoken.push(u), cancel() { cancellations++; } };
  class Utterance { constructor(text) { this.text = text; } }
  const reader = createQuestionReader({ synth, Utterance, onState: s => states.push(s),
    setTimer: fn => { const id = ++sequence; timers.set(id, fn); return id; }, clearTimer: id => timers.delete(id) });
  const tick = () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); };
  return { reader, spoken, states, timers, synth, tick, cancellations: () => cancellations };
}
test('correctness markers disappear but clinical symbols remain', () => {
  assert.equal(questionDisplayText('Alpha ✅'), 'Alpha');
  assert.equal(questionDisplayText('Na+ 125; K+ 7; anti-dsDNA negative; NOT indicated'), 'Na+ 125; K+ 7; anti-dsDNA negative; NOT indicated');
});
test('original option gaps stay non-scoring', () => {
  for (const value of ['', ' ', null, '?', '؟', '..', '...', '…']) assert.equal(isMissingOriginalOption(value), true);
  assert.equal(hasCompleteOptionSet(['Alpha', '...']), false);
  assert.equal(hasCompleteOptionSet(['Alpha']), false);
  assert.equal(hasCompleteOptionSet(['Alpha', 'Beta']), true);
});
test('mixed-language detection', () => {
  assert.equal(hasMixedArabicEnglish('طفل with fever'), true);
  assert.equal(hasMixedArabicEnglish('English only'), false);
});
test('speech includes only stem and options', () => {
  assert.equal(speechSegments(q).join(' '), 'Which option? Option A. Alpha Option B. Beta');
  assert.doesNotMatch(speechSegments(q).join(' '), /SECRET|answer/);
});
test('a mixed unit is blocked even when languages occupy separate fields', () => {
  assert.deepEqual(speechSegments({ text: 'طفل لديه حمى', options: ['Alpha', 'Beta'] }), []);
  assert.deepEqual(speechSegments({ text: 'Which test?', options: ['خيار mixed', 'Beta'] }), []);
});
test('first user-initiated read is immediate even before voices load', () => {
  const f = fixture(); f.reader.start(q, .85);
  assert.equal(f.spoken.length, 1); assert.equal(f.cancellations(), 0);
  assert.equal(f.spoken[0].voice, null); assert.equal(f.spoken[0].lang, 'en-US');
});
test('replacing an active queue is deferred and ignores the old queue', () => {
  const f = fixture(); f.reader.start(q); const old = f.spoken[0];
  f.reader.start({ ...q, text: 'Next question' }); old.onend(); old.onerror({error:'network'});
  assert.equal(f.spoken.length, 1); f.tick(); assert.equal(f.spoken.length, 2);
  assert.equal(f.spoken[1].text, 'Next question');
});
test('a transient failure retries only once', () => {
  const f = fixture(); f.reader.start(q); f.spoken[0].onerror({error:'audio-busy'}); f.tick();
  assert.equal(f.spoken.length, 2); assert.equal(f.spoken[1].text, f.spoken[0].text);
  f.spoken[1].onerror({error:'audio-busy'}); f.tick();
  assert.equal(f.spoken.length, 2); assert.equal(f.states.at(-1).state, 'error'); assert.equal(f.reader.isActive(), false);
});
test('late callbacks from the failed utterance cannot skip or kill its retry', () => {
  const f = fixture(); f.reader.start(q); const failed = f.spoken[0];
  failed.onerror({error:'network'}); failed.onend(); f.tick();
  assert.equal(f.spoken.length, 2); assert.equal(f.spoken[1].text, q.text);
  failed.onerror({error:'synthesis-failed'}); failed.onend();
  assert.equal(f.reader.isActive(), true); assert.equal(f.spoken.length, 2);
});
test('synchronous cancel callbacks cannot advance a retry', () => {
  const f = fixture(); f.reader.start(q); const failed = f.spoken[0];
  f.synth.cancel = () => failed.onend(); failed.onerror({error:'network'}); f.tick();
  assert.equal(f.spoken.length, 2); assert.equal(f.spoken[1].text, q.text);
});
test('stop clears a scheduled retry', () => {
  const f = fixture(); f.reader.start(q); const old = f.spoken[0]; old.onerror({error:'network'});
  f.reader.stop(); f.tick(); old.onend(); old.onerror({error:'synthesis-failed'});
  assert.equal(f.spoken.length, 1); assert.equal(f.reader.isActive(), false); assert.equal(f.timers.size, 0);
});
test('pause and resume keep the current chunk and updated rate', () => {
  const f = fixture([{lang:'ar-SA'}, {lang:'en-US',localService:true}]); f.reader.start(q, .85);
  f.reader.pause(); f.spoken[0].onend(); assert.equal(f.reader.isPaused(), true);
  f.reader.setRate(1.2); f.reader.resume(); assert.equal(f.spoken[1].text, q.text);
  assert.equal(f.spoken[1].rate, 1.2); assert.equal(f.spoken[1].voice.lang, 'en-US');
});
test('external interruption leaves a usable idle state instead of a stuck player', () => {
  const f = fixture(); f.reader.start(q); f.spoken[0].onerror({error:'interrupted'});
  assert.equal(f.reader.isActive(), false); assert.equal(f.states.at(-1).state, 'idle');
});
test('permission failure is not retried automatically', () => {
  const f = fixture(); f.reader.start(q); f.spoken[0].onerror({error:'not-allowed'}); f.tick();
  assert.equal(f.spoken.length, 1); assert.equal(f.states.at(-1).state, 'error');
});
