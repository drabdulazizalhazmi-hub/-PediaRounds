/** Browser-only English reader. No credentials, network calls, or text persistence. */
export function canReadEnglish(text) {
  return typeof text === 'string' && /\p{Script=Latin}/u.test(text) && !/\p{Script=Arabic}/u.test(text);
}
export function englishVoices(synth = globalThis.speechSynthesis) {
  try { return Array.from(synth?.getVoices() || []).filter(v => /^en(?:[-_]|$)/i.test(v.lang)); }
  catch { return []; }
}
export function speechChunks(text, limit = 240) {
  if (!Number.isSafeInteger(limit) || limit < 32) throw new RangeError('Invalid speech chunk limit.');
  const chunks = []; let part = '';
  // Only speech whitespace is normalized. Source display text is never rewritten.
  for (const word of String(text).trim().split(/\s+/u).filter(Boolean)) {
    if (part && part.length + word.length + 1 > limit) { chunks.push(part); part = ''; }
    part += (part ? ' ' : '') + word;
  }
  if (part) chunks.push(part);
  return chunks;
}
export function createEnglishReader({
  synth = globalThis.speechSynthesis,
  Utterance = globalThis.SpeechSynthesisUtterance,
  onError = () => {},
  schedule = globalThis.setTimeout,
  unschedule = globalThis.clearTimeout,
} = {}) {
  const supported = !!synth && typeof synth.speak === 'function' && typeof synth.cancel === 'function' && typeof Utterance === 'function';
  const transient = new Set(['audio-busy', 'network', 'synthesis-failed']);
  let generation = 0, active = null, timer = null;
  function cancelEngine() { try { synth?.cancel(); } catch {} }
  function stop() {
    // Invalidate BEFORE cancel(): some engines invoke onerror synchronously.
    generation++; active = null;
    if (timer !== null) { unschedule(timer); timer = null; }
    cancelEngine();
  }
  function speak(text, {voiceURI = ''} = {}) {
    stop();
    if (!supported || !canReadEnglish(text)) return false;
    const ticket = generation, chunks = speechChunks(text);
    const voices = englishVoices(synth);
    const voice = voices.find(v => v.voiceURI === voiceURI) || voices[0];
    let index = 0, retries = 0;
    function issue() {
      if (ticket !== generation || index >= chunks.length) return;
      const attempt = {settled:false, utterance:null}; active = attempt;
      const isCurrent = () => ticket === generation && active === attempt && !attempt.settled;
      function failed(code) {
        if (!isCurrent()) return;
        attempt.settled = true; active = null;
        if (transient.has(code) && retries < 1) {
          retries++; cancelEngine();
          timer = schedule(() => { timer = null; issue(); }, 180);
        } else {
          cancelEngine(); onError(code);
        }
      }
      try {
        const utterance = new Utterance(chunks[index]); attempt.utterance = utterance;
        utterance.lang = voice?.lang || 'en-US';
        if (voice) utterance.voice = voice;
        utterance.onend = () => {
          if (!isCurrent()) return;
          attempt.settled = true; active = null; index++; retries = 0; issue();
        };
        utterance.onerror = event => failed(event?.error || 'synthesis-failed');
        // A prior paused engine can otherwise leave a new explicit Read click silent.
        if (synth.paused && typeof synth.resume === 'function') synth.resume();
        // Keep the first speak() in the user's click, without waiting for voiceschanged.
        synth.speak(utterance);
      } catch { failed('synthesis-failed'); }
    }
    issue(); return true;
  }
  return Object.freeze({supported, speak, stop});
}
