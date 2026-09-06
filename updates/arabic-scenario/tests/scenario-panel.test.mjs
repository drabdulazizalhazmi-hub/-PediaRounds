import test from 'node:test';
import assert from 'node:assert/strict';
import { createScenarioPanel, getStoredScenario, normalizeScenario } from '../public/scenario-panel.js';

const AR = 'هذا وصف عربي للسيناريو، دون كشف الإجابة.';
const ANSWER = 'ANSWER_MUST_NOT_APPEAR — الإجابة والتفسير بعد الحل فقط';
const DATA = { paragraphs: [AR], task: 'اختر الإجابة الأنسب.' };
const reply = (data = DATA, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
class Element {
  constructor() { this.attrs = {}; this.children = []; this.listeners = new Map(); this.style = {}; this.hidden = true; this.disabled = false; this._text = ''; this.id = ''; this.ownerDocument = { createElement: () => new Element() }; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  replaceChildren(...children) { this._text = ''; this.children = children; }
  append(child) { this.children.push(child); }
  addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn); }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
  click() { const e = { prevented: false, preventDefault() { this.prevented = true; } }; for (const fn of this.listeners.get('click') || []) fn(e); return e; }
}
function fixture(question = { uid: 'q-1', text: 'Scenario in English' }, fetcher = async () => reply(), extra = {}) {
  let q = question;
  const elements = Object.fromEntries(['button', 'panel', 'status', 'content', 'retry'].map(k => [k, new Element()]));
  elements.panel.id = 'arabicScenarioPanel';
  const api = createScenarioPanel({ ...elements, getQuestion: () => q, fetcher, ...extra });
  return { ...elements, api, setQuestion: value => { q = value; } };
}

test('stored scenario skips a failing backend entirely', async () => {
  let calls = 0;
  const f = fixture({ id: 1, scenarioAr: AR, explanationAr: ANSWER }, async () => { calls++; throw Error('offline'); });
  await f.api.load();
  assert.equal(calls, 0); assert.match(f.content.textContent, /وصف عربي/); assert.equal(f.status.textContent, ''); assert.ok(!f.content.textContent.includes(ANSWER));
});
for (const [name, question] of [
  ['scenario_ar', { scenario_ar: AR }], ['arabicScenario', { arabicScenario: DATA }],
  ['before_answer.scenario_ar', { before_answer: { scenario_ar: AR } }],
  ['beforeAnswer.scenarioAr', { beforeAnswer: { scenarioAr: AR } }],
  ['scenarioAr paragraph array', { scenarioAr: [AR] }]
]) test(`recognizes ${name}`, () => assert.deepEqual(getStoredScenario(question)?.paragraphs, [AR]));

test('answer and rationale fields never become scenarios', async () => {
  const q = { id: 'q1', explanationAr: ANSWER, explanation: ANSWER, rationale_ar: ANSWER, after_answer: { rationale_ar: ANSWER } };
  assert.equal(getStoredScenario(q), null);
  const f = fixture(q, async () => reply({ code: 'not_configured' }, 503));
  await f.api.load(); assert.equal(f.content.textContent, ''); assert.ok(!f.status.textContent.includes(ANSWER));
});

test('success uses established POST body and credentials', async () => {
  let seen;
  const f = fixture({ uid: 'uid1', id: 33 }, async (...args) => { seen = args; return reply(); });
  await f.api.load();
  assert.equal(seen[0], '/api/scenario'); assert.equal(seen[1].method, 'POST');
  assert.deepEqual(JSON.parse(seen[1].body), { questionId: 'uid1' }); assert.equal(seen[1].credentials, 'same-origin');
  assert.match(f.content.textContent, /وصف عربي/);
});

test('successful API response is cached in memory', async () => {
  let calls = 0; const f = fixture(undefined, async () => { calls++; return reply(); });
  await f.api.load(); f.api.reset(); await f.api.load(); assert.equal(calls, 1);
});

test('a new stored scenario supersedes cached API content', async () => {
  const f = fixture(); await f.api.load();
  f.setQuestion({ uid: 'q-1', text: 'Scenario in English', scenarioAr: 'سيناريو محلي محدث.' });
  await f.api.load(); assert.match(f.content.textContent, /محلي محدث/);
});

test('changed question text invalidates the cache', async () => {
  let calls = 0; const f = fixture(undefined, async () => { calls++; return reply(); });
  await f.api.load(); f.setQuestion({ uid: 'q-1', text: 'Revised question' }); await f.api.load(); assert.equal(calls, 2);
});

test('cache remains bounded', async () => {
  let calls = 0; const f = fixture({ id: 'a' }, async () => { calls++; return reply(); }, { cacheLimit: 1 });
  await f.api.load(); f.setQuestion({ id: 'b' }); await f.api.load(); f.setQuestion({ id: 'a' }); await f.api.load(); assert.equal(calls, 3);
});

for (const [status, payload, expected, retryable] of [
  [401, {}, /سجّل الدخول/, false], [403, {}, /صلاحية/, false],
  [404, {}, /غير متاح لهذا السؤال/, false], [503, { code: 'not_configured' }, /غير مهيأة/, false],
  [503, {}, /حاول مرة أخرى/, true], [429, {}, /انتظر قليلًا/, true], [500, {}, /تعذر تحميل/, true]
]) test(`handles HTTP ${status} ${payload.code || ''}`, async () => {
  const f = fixture(undefined, async () => reply(payload, status)); await f.api.load();
  assert.match(f.status.textContent, expected); assert.equal(f.retry.hidden, !retryable); assert.equal(f.panel.getAttribute('aria-busy'), 'false');
});

test('HTML 404 is classified without showing JSON parser errors', async () => {
  const f = fixture(undefined, async () => ({ ok: false, status: 404, json: async () => { throw new SyntaxError('Unexpected token <'); } }));
  await f.api.load(); assert.match(f.status.textContent, /غير متاح لهذا السؤال/); assert.ok(!f.status.textContent.includes('Unexpected'));
});

test('HTML returned as HTTP 200 gives a retryable invalid-response message', async () => {
  const f = fixture(undefined, async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token <'); } }));
  await f.api.load(); assert.match(f.status.textContent, /رد غير صالح/); assert.equal(f.retry.hidden, false);
});

test('invalid payloads and English-only content are rejected', async () => {
  for (const payload of [{ paragraphs: [], task: '' }, { paragraphs: ['English only'], task: '' }, { paragraphs: [AR, 4], task: '' }, { paragraphs: [AR] }]) {
    const f = fixture(undefined, async () => reply(payload)); await f.api.load(); assert.equal(f.content.textContent, ''); assert.equal(f.retry.hidden, false);
  }
});

test('payload for another question is rejected', async () => {
  const f = fixture(undefined, async () => reply({ ...DATA, questionId: 'wrong' })); await f.api.load(); assert.match(f.status.textContent, /لا يطابق/);
});

test('network failure has a retry action and never exposes raw errors', async () => {
  const f = fixture(undefined, async () => { throw new Error('SECRET_INTERNAL_MESSAGE'); });
  await f.api.load(); assert.match(f.status.textContent, /تعذر الاتصال/); assert.ok(!f.status.textContent.includes('SECRET')); assert.equal(f.retry.hidden, false);
});

test('timeout ends loading even when a fetcher ignores cancellation', async () => {
  const f = fixture(undefined, () => new Promise(() => {}), { timeoutMs: 15 });
  await f.api.load(); assert.match(f.status.textContent, /وقتًا طويلًا/); assert.equal(f.retry.hidden, false); assert.equal(f.panel.getAttribute('aria-busy'), 'false');
});

test('timeout also covers a stalled JSON body', async () => {
  const f = fixture(undefined, async () => ({ ok: true, status: 200, json: () => new Promise(() => {}) }), { timeoutMs: 15 });
  await f.api.load(); assert.match(f.status.textContent, /وقتًا طويلًا/);
});

test('reset cancels loading and a late response cannot reopen the panel', async () => {
  let finish; const f = fixture(undefined, () => new Promise(resolve => { finish = resolve; }));
  const pending = f.api.load(); await tick(); f.api.reset(); finish(reply()); await pending; await tick();
  assert.equal(f.panel.hidden, true); assert.equal(f.content.textContent, ''); assert.equal(f.status.textContent, '');
});

test('question change prevents a stale response from rendering', async () => {
  let finish; const f = fixture({ id: 'old' }, () => new Promise(resolve => { finish = resolve; }));
  const pending = f.api.load(); await tick(); f.setQuestion({ id: 'new' }); finish(reply()); await pending;
  assert.equal(f.content.textContent, ''); assert.equal(f.panel.hidden, true);
});

test('rapidly opening another question does not get overwritten', async () => {
  let finish; const f = fixture({ id: 'old' }, () => new Promise(resolve => { finish = resolve; }));
  const pending = f.api.load(); await tick(); f.setQuestion({ id: 'new', scenarioAr: 'هذا هو السيناريو الجديد.' });
  await f.api.load(); finish(reply()); await pending; await tick(); assert.match(f.content.textContent, /السيناريو الجديد/);
});

test('id zero remains a valid identifier', async () => {
  let id; const f = fixture({ id: 0 }, async (_, init) => { id = JSON.parse(init.body).questionId; return reply(); });
  await f.api.load(); assert.equal(id, '0');
});

test('missing ID never sends an undefined questionId', async () => {
  let called = false; const f = fixture({}, async () => { called = true; return reply(); }); await f.api.load();
  assert.equal(called, false); assert.match(f.status.textContent, /معرّف السؤال مفقود/);
});

test('local content works without an API question ID', async () => {
  const f = fixture({ scenarioAr: AR }); await f.api.load(); assert.match(f.content.textContent, /وصف عربي/);
});

test('empty question disables the button', async () => {
  const f = fixture(null); await f.api.load(); assert.equal(f.button.disabled, true); assert.equal(f.panel.hidden, true);
});

test('RTL and non-submitting controls are configured', () => {
  const f = fixture(); assert.equal(f.panel.getAttribute('dir'), 'rtl'); assert.equal(f.panel.getAttribute('lang'), 'ar');
  assert.equal(f.button.getAttribute('type'), 'button'); assert.equal(f.retry.getAttribute('type'), 'button'); assert.equal(f.status.getAttribute('aria-live'), 'polite');
});

test('button toggles without default form submission', async () => {
  const f = fixture({ scenarioAr: AR }); assert.equal(f.button.click().prevented, true); await tick(); assert.equal(f.panel.hidden, false);
  f.button.click(); assert.equal(f.panel.hidden, true);
});

test('retry can recover from a temporary error', async () => {
  let calls = 0; const f = fixture(undefined, async () => ++calls === 1 ? reply({}, 500) : reply());
  await f.api.load(); f.retry.click(); await tick(); assert.equal(f.status.textContent, ''); assert.match(f.content.textContent, /وصف عربي/);
});

test('text is rendered through textContent, not executable markup', async () => {
  const f = fixture({ scenarioAr: 'وصف عربي <img src=x onerror=alert(1)>' }); await f.api.load();
  assert.equal(f.content.children[0].textContent, 'وصف عربي <img src=x onerror=alert(1)>'); assert.equal(f.content.children[0].children.length, 0);
});

test('question object and progress-related fields remain unchanged', async () => {
  const q = { id: 1, scenarioAr: AR, answered: false, score: 9, explanationAr: ANSWER }; const before = JSON.stringify(q);
  const f = fixture(q); await f.api.load(); f.api.reset(); assert.equal(JSON.stringify(q), before);
});

test('explicitly unsafe scenarios and excessive data are rejected', () => {
  assert.equal(normalizeScenario({ ...DATA, safeBeforeAnswer: false }), null);
  assert.equal(normalizeScenario({ ...DATA, contains_answer: true }), null);
  assert.equal(normalizeScenario('ع'.repeat(30001)), null);
});

test('invalid earlier alias does not conceal a valid later alias', () => {
  assert.deepEqual(getStoredScenario({ scenarioAr: '   ', scenario_ar: AR })?.paragraphs, [AR]);
});

test('destroy removes event listeners and disables future loads', async () => {
  const f = fixture({ scenarioAr: AR }); f.api.destroy(); f.button.click(); await f.api.load();
  assert.equal(f.panel.hidden, true); assert.equal(f.button.disabled, true);
});

test('third-party errors with a code cannot expose internal details', async () => {
  const f = fixture(undefined, async () => { throw Object.assign(new Error('PRIVATE_ERROR_DETAILS'), { code: 'ETIMEDOUT' }); });
  await f.api.load(); assert.ok(!f.status.textContent.includes('PRIVATE')); assert.match(f.status.textContent, /تعذر الاتصال/);
});
