/**
 * PediaRounds Arabic scenario panel — local-first repair, v2.
 * Drop-in replacement for the createScenarioPanel export in the supplied archive.
 * This module never reads answer/rationale fields, submits answers, or writes progress.
 * Stored scenario fields and API responses must be reviewed for pre-answer suitability.
 */
const ARABIC_LETTER = /[\u0621-\u063A\u0641-\u064A\u066E-\u066F\u0671-\u06D3\u06FA-\u06FC]/;
const DEFAULT_TASK = "اقرأ السؤال واختر الإجابة الأنسب.";
const OPEN_LABEL = "شرح السيناريو بالعربي";
const CLOSE_LABEL = "إخفاء الشرح العربي";

/** Normalize explicitly designated scenario content, never general answer content. */
export function normalizeScenario(value, fallbackTask = DEFAULT_TASK) {
  if (value == null) return null;
  let paragraphs, task = fallbackTask;
  if (typeof value === "string") {
    paragraphs = value.split(/\r?\n+/);
  } else if (Array.isArray(value)) {
    paragraphs = value;
  } else if (typeof value === "object") {
    if (value.safeBeforeAnswer === false || value.safe_before_answer === false || value.contains_answer === true) return null;
    paragraphs = Array.isArray(value.paragraphs) ? value.paragraphs
      : typeof value.text === "string" ? value.text.split(/\r?\n+/) : null;
    if (value.task != null) {
      if (typeof value.task !== "string") return null;
      task = value.task;
    }
  }
  if (!Array.isArray(paragraphs) || !paragraphs.every(p => typeof p === "string")) return null;
  paragraphs = paragraphs.map(p => p.trim()).filter(Boolean);
  if (!paragraphs.length || paragraphs.length > 100) return null;
  if (!ARABIC_LETTER.test(paragraphs.join(" "))) return null;
  task = typeof task === "string" && task.trim() ? task.trim() : DEFAULT_TASK;
  if (paragraphs.join("\n").length + task.length > 30000) return null;
  return { paragraphs, task };
}

/** Only pre-answer fields are eligible. explanationAr is intentionally excluded. */
export function getStoredScenario(question) {
  if (!question || typeof question !== "object") return null;
  const fallbackTask = question.scenarioTaskAr || question.scenario_task_ar || DEFAULT_TASK;
  const candidates = [
    question.scenarioAr,
    question.scenario_ar,
    question.arabicScenario,
    question.before_answer?.scenario_ar,
    question.beforeAnswer?.scenarioAr
  ];
  for (const candidate of candidates) {
    const result = normalizeScenario(candidate, fallbackTask);
    if (result) return result;
  }
  return null;
}

function questionId(question) {
  for (const value of [question?.uid, question?.id]) {
    if ((typeof value === "string" || typeof value === "number") && String(value).trim()) return String(value);
  }
  return null;
}

function fingerprint(question) {
  if (!question) return null;
  return JSON.stringify([
    questionId(question), question.revision ?? question.updatedAt ?? "",
    question.text ?? question.before_answer?.question_en ?? "",
    question.options ?? question.before_answer?.options_en ?? []
  ]);
}

function failure(code, message, retryable = true, status = null) {
  return Object.assign(new Error(message), { code, retryable, status, isScenarioFailure: true });
}

function httpFailure(response, result) {
  const status = response.status;
  if (status === 401) return failure("unauthorized", "انتهت جلسة الدخول. سجّل الدخول مجددًا ثم افتح السؤال.", false, status);
  if (status === 403) return failure("forbidden", "لا تتوفر صلاحية الوصول إلى خدمة الشرح لهذا الحساب.", false, status);
  if (status === 404) return failure("not_found", "الشرح العربي غير متاح لهذا السؤال حاليًا. يجب إضافة سيناريو عربي محفوظ أو إتاحة خدمة الشرح.", false, status);
  if (result?.code === "not_configured") return failure("not_configured", "خدمة الشرح العربي غير مهيأة بعد، ولا يوجد سيناريو عربي محفوظ لهذا السؤال.", false, status);
  if (status === 429) return failure("rate_limited", "طلبات كثيرة في وقت قصير. انتظر قليلًا ثم أعد المحاولة.", true, status);
  return failure("http_error", "تعذر تحميل الشرح من الخدمة. حاول مرة أخرى بعد قليل.", status >= 500 || status === 408, status);
}

/** Same arguments and reset/load methods as the archived module; extra options are optional. */
export function createScenarioPanel({
  button, panel, status, content, retry, getQuestion,
  fetcher = globalThis.fetch?.bind(globalThis), timeoutMs = 12000, cacheLimit = 100
}) {
  for (const [name, element] of Object.entries({ button, panel, status, content, retry })) {
    if (!element || typeof element.setAttribute !== "function") throw new TypeError(`Missing scenario element: ${name}`);
  }
  if (typeof getQuestion !== "function") throw new TypeError("getQuestion must be a function");
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new RangeError("timeoutMs must be positive");
  if (!Number.isInteger(cacheLimit) || cacheLimit < 1) throw new RangeError("cacheLimit must be a positive integer");

  let epoch = 0, controller = null, timer = null, destroyed = false;
  const cache = new Map();
  // Do not allow these controls to submit a surrounding form.
  button.setAttribute("type", "button");
  retry.setAttribute("type", "button");
  panel.setAttribute("lang", "ar");
  panel.setAttribute("dir", "rtl");
  content.style.whiteSpace = "pre-line";
  content.style.unicodeBidi = "plaintext";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  if (panel.id) button.setAttribute("aria-controls", panel.id);

  function stopPending() {
    if (timer !== null) { clearTimeout(timer); timer = null; }
    controller?.abort();
    controller = null;
  }

  function reset() {
    epoch++;
    stopPending();
    panel.hidden = true;
    panel.setAttribute("aria-busy", "false");
    button.setAttribute("aria-expanded", "false");
    button.textContent = OPEN_LABEL;
    button.disabled = destroyed || !getQuestion();
    status.textContent = "";
    content.replaceChildren();
    retry.hidden = true;
  }

  function render(data) {
    content.replaceChildren();
    for (const text of data.paragraphs) {
      const paragraph = content.ownerDocument.createElement("p");
      paragraph.textContent = text;
      content.append(paragraph);
    }
    const task = content.ownerDocument.createElement("p");
    task.className = "scenario-task";
    task.textContent = `المطلوب: ${data.task}`;
    content.append(task);
  }

  async function request(id, signal) {
    if (typeof fetcher !== "function") throw failure("network_unavailable", "الاتصال بخدمة الشرح غير متاح في هذا المتصفح.", false);
    const response = await fetcher("/api/scenario", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ questionId: id }), signal
    });
    let result = null;
    try { result = await response.json(); }
    catch (error) {
      if (signal.aborted) throw error;
      // An HTML/error page must not conceal a useful 401/404/503 classification.
      if (response.ok) throw failure("invalid_json", "وصل رد غير صالح من خدمة الشرح. حاول مجددًا؛ وإذا تكرر الخطأ فتلزم مراجعة الخدمة.");
    }
    if (!response.ok) throw httpFailure(response, result);
    // Preserve the established endpoint contract: { paragraphs: string[], task: string }.
    if (!result || !Array.isArray(result.paragraphs) || typeof result.task !== "string") {
      throw failure("invalid_payload", "وصل شرح غير مكتمل من الخدمة. حاول مرة أخرى.");
    }
    if (result.questionId != null && String(result.questionId) !== id) {
      throw failure("wrong_question", "وصل شرح لا يطابق السؤال الحالي. حاول مرة أخرى.");
    }
    const data = normalizeScenario(result);
    if (!data) throw failure("invalid_payload", "لم يصل سيناريو عربي صالح من الخدمة. حاول مرة أخرى.");
    return data;
  }

  async function load() {
    if (destroyed) return;
    const question = getQuestion();
    if (!question) { reset(); return; }
    const token = ++epoch, key = fingerprint(question), id = questionId(question);
    stopPending();
    panel.hidden = false;
    panel.setAttribute("aria-busy", "true");
    button.setAttribute("aria-expanded", "true");
    button.textContent = CLOSE_LABEL;
    status.textContent = "جارٍ تجهيز شرح السيناريو…";
    content.replaceChildren();
    retry.hidden = true;

    try {
      // Saved content always takes precedence, including updated content for a cached ID.
      let data = getStoredScenario(question) || cache.get(key);
      if (!data) {
        if (id === null) throw failure("missing_id", "لا يوجد سيناريو عربي محفوظ، ومعرّف السؤال مفقود؛ تلزم مراجعة بيانات السؤال.", false);
        const activeController = new AbortController();
        controller = activeController;
        let abortListener;
        const deadline = new Promise((_, reject) => {
          abortListener = () => reject(Object.assign(new Error("Cancelled"), { name: "AbortError" }));
          activeController.signal.addEventListener("abort", abortListener, { once: true });
          timer = setTimeout(() => {
            // Reject as a timeout before the abort event, so the user sees a retry action.
            reject(failure("timeout", "استغرق الاتصال وقتًا طويلًا. تحقق من الاتصال ثم أعد المحاولة."));
            activeController.abort();
          }, timeoutMs);
        });
        try { data = await Promise.race([request(id, activeController.signal), deadline]); }
        finally { activeController.signal.removeEventListener("abort", abortListener); }
        if (token !== epoch) return;
        if (fingerprint(getQuestion()) !== key) { reset(); return; }
        cache.set(key, data);
        if (cache.size > cacheLimit) cache.delete(cache.keys().next().value);
      }
      if (token !== epoch) return;
      if (fingerprint(getQuestion()) !== key) { reset(); return; }
      render(data);
      status.textContent = "";
    } catch (error) {
      if (token !== epoch || error?.name === "AbortError") return;
      if (fingerprint(getQuestion()) !== key) { reset(); return; }
      // Never echo arbitrary backend errors or keys into the page.
      status.textContent = error?.isScenarioFailure ? error.message : "تعذر الاتصال بخدمة الشرح. تحقق من اتصال الإنترنت ثم أعد المحاولة.";
      retry.hidden = error?.isScenarioFailure === true && error.retryable === false;
    } finally {
      if (token === epoch) {
        if (timer !== null) { clearTimeout(timer); timer = null; }
        controller = null;
        panel.setAttribute("aria-busy", "false");
      }
    }
  }

  const onToggle = event => { event.preventDefault(); if (panel.hidden) void load(); else reset(); };
  const onRetry = event => { event.preventDefault(); void load(); };
  button.addEventListener("click", onToggle);
  retry.addEventListener("click", onRetry);
  reset();

  function destroy() {
    destroyed = true;
    reset();
    cache.clear();
    button.removeEventListener("click", onToggle);
    retry.removeEventListener("click", onRetry);
  }
  return { reset, load, destroy };
}
