// Keep the archived wording intact; hide copied answer-key symbols in the learning view.
export function questionDisplayText(value) {
  return String(value ?? '').replace(/[✅✔✓☑❌✗✘]\uFE0F?/gu, '').replace(/[ \t]{2,}/g, ' ').trim();
}


// Missing source options must stay visible as a data-quality gap, never as an
// empty/invisible answer button and never as an invented medical option.
export function isMissingOriginalOption(value) {
  const text = questionDisplayText(value);
  return !text || /^(?:\?|؟|\.{2,3}|…)$/.test(text);
}

export function hasCompleteOptionSet(options) {
  const list = Array.isArray(options) ? options : [];
  return list.length >= 2 && list.every(option => !isMissingOriginalOption(option));
}

export function hasMixedArabicEnglish(value) {
  const text = String(value ?? '');
  return /[\u0600-\u06FF]/u.test(text) && /[A-Za-z]/.test(text);
}
