// Reads only the English stem and options. Explanations and keys are never queued.
import { questionDisplayText, hasMixedArabicEnglish } from './question-display.js';

export function speechSegments(question) {
  const options = Array.isArray(question?.options) ? question.options : [];
  const rawParts = [question?.text, ...options];
  // The product requirement is explicit: mixed Arabic/English blocks get no
  // read-aloud path. This prevents an Arabic voice reading English (or vice versa).
  if (hasMixedArabicEnglish(rawParts.join(" "))) return [];
  const text = [questionDisplayText(question?.text), ...options.map((option, index) => `Option ${String.fromCharCode(65 + index)}. ${questionDisplayText(option)}`)];
  return text.filter(Boolean).flatMap(part => {
    const words = String(part).replace(/\s+/g, " ").trim().split(" ");
    const chunks = []; let chunk = "";
    for (const word of words) {
      if (chunk && chunk.length + word.length > 200) { chunks.push(chunk); chunk = ""; }
      chunk += (chunk ? " " : "") + word;
    }
    if (chunk) chunks.push(chunk);
    return chunks;
  });
}

export function selectEnglishVoice(voices = []) {
  const available = Array.from(voices || []);
  return available.find(v => /^en-US$/i.test(v.lang) && v.localService !== false)
    || available.find(v => /^en-US$/i.test(v.lang))
    || available.find(v => /^en(?:[-_]|$)/i.test(v.lang) && v.localService !== false)
    || available.find(v => /^en(?:[-_]|$)/i.test(v.lang))
    || null;
}

export function createQuestionReader({ synth, Utterance, onState, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let generation = 0, segments = [], index = 0, rate = .85, paused = false, active = false, utterance = null;
  let restartTimer = null, retryCount = 0;
  const notify = (state, message) => onState({ state, message });
  const clearRestart = () => { if (restartTimer !== null) { clearTimer(restartTimer); restartTimer = null; } };
  const isBusy = () => Boolean(active || synth?.speaking || synth?.pending);
  function cancelEngine() { try { synth.cancel(); } catch { /* Some embedded browsers throw while the engine is warming up. */ } }
  function reset({ cancel = true, notifyIdle = true } = {}) {
    generation++; active = false; paused = false; utterance = null; segments = []; index = 0; retryCount = 0; clearRestart();
    if (cancel) cancelEngine();
    if (notifyIdle) notify("idle", "السؤال والخيارات بالإنجليزية");
  }
  function stop() { reset(); }
  function scheduleNext(delay = 0) {
    clearRestart();
    if (!delay) { speakNext(); return; }
    const token = generation;
    restartTimer = setTimer(() => {
      restartTimer = null;
      if (token === generation) speakNext();
    }, delay);
  }
  function retryCurrent(token) {
    if (token !== generation || retryCount >= 1) return false;
    retryCount += 1;
    utterance = null; // Invalidate callbacks before cancel(), including synchronous callbacks.
    cancelEngine();
    notify("speaking", "جارٍ إعادة تهيئة الصوت…");
    scheduleNext(90);
    return true;
  }
  function speakNext() {
    if (!active || paused) return;
    if (index >= segments.length) { active = false; utterance = null; notify("idle", "اكتملت قراءة السؤال والخيارات"); return; }
    const token = generation;
    const u = new Utterance(segments[index]); utterance = u;
    u.lang = "en-US"; u.rate = rate;
    let voices = [];
    try { voices = synth.getVoices?.() || []; } catch { /* Default system voice is still usable. */ }
    u.voice = selectEnglishVoice(voices);
    u.onend = () => {
      if (token !== generation || utterance !== u) return;
      retryCount = 0; index++; utterance = null; speakNext();
    };
    u.onerror = event => {
      if (token !== generation || utterance !== u) return;
      if (["canceled", "interrupted"].includes(event?.error)) {
        active = false; paused = false; utterance = null; clearRestart();
        notify("idle", "توقفت القراءة؛ اضغط زر القراءة لبدء الصوت مجددًا.");
        return;
      }
      const transient = ["audio-busy", "network", "synthesis-failed"].includes(event?.error);
      if (transient && retryCurrent(token)) return;
      active = false; paused = false; utterance = null;
      notify("error", event?.error === "not-allowed"
        ? "لم يسمح الجهاز ببدء الصوت. اضغط Read in English مرة أخرى بعد لمس الصفحة."
        : "تعذرت القراءة. جرّب مرة أخرى وتحقق من الصوت في جهازك.");
    };
    notify("speaking", "جارٍ قراءة السؤال والخيارات…");
    try {
      // Safari can remain internally paused after an interruption or phone call.
      if (synth.paused && typeof synth.resume === "function") synth.resume();
      synth.speak(u);
    } catch {
      if (!retryCurrent(token)) {
        active = false; paused = false; utterance = null;
        notify("error", "تعذر بدء الصوت. اضغط Read in English مرة أخرى.");
      }
    }
  }
  return {
    start(question, speed) {
      const busy = isBusy();
      reset({ cancel: busy, notifyIdle: false });
      segments = speechSegments(question); rate = Number(speed) || .85;
      if (!segments.length) { notify("error", "لا يوجد نص قابل للقراءة في هذا السؤال."); return; }
      active = true;
      // WebKit is prone to dropping a new utterance when cancel() and speak()
      // happen in the same tick. Delay only when replacing an active queue so
      // the first user-initiated read remains immediate.
      scheduleNext(busy ? 60 : 0);
    },
    pause() {
      if (!active || paused) return;
      generation++; paused = true; clearRestart(); cancelEngine(); notify("paused", "القراءة متوقفة مؤقتًا");
    },
    resume() { if (!active || !paused) return; paused = false; speakNext(); },
    setRate(speed) {
      rate = Number(speed) || .85;
      if (active && !paused) { generation++; clearRestart(); cancelEngine(); scheduleNext(60); }
    },
    stop,
    isActive() { return active; },
    isPaused() { return paused; },
  };
}
