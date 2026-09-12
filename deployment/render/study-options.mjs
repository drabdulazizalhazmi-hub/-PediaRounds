/** Presentation-only source-option repair. Never infer an option or an answer key. */
const text = value => typeof value === 'string' ? value : '';
const marker = /^(?:\(([A-Fa-f])\)|([A-Fa-f])([.):]))(?=\s|$)\s*/u;
const correctnessMarks = /[✓✔☑✅✗✘❌]\uFE0F?/gu;
const missingNotice = 'Original option missing from source — not scored';

function leadingLabel(value) {
  const match = marker.exec(value.trimStart());
  return match ? {key:(match[1] || match[2]).toUpperCase(),length:match[0].length} : null;
}
function label(value, fallback) {
  const raw = text(value).trim();
  if (!raw) return fallback;
  const match = /^(?:\(([A-Fa-f])\)|([A-Fa-f])[.):]?)$/u.exec(raw);
  return match ? (match[1] || match[2]).toUpperCase() : raw;
}
function cleanDisplay(value) {
  // Remove copied correctness symbols, not clinical signs such as ↑, ↓, ± or ≥.
  return text(value).replace(correctnessMarks,'').replace(/^[ \t]+|[ \t]+$/g,'');
}
export function missingOption(value) {
  let valueText = cleanDisplay(value).replace(/[\u200B-\u200D\uFEFF]/gu,'').trim();
  const prefix = leadingLabel(valueText);
  if (prefix) valueText = valueText.slice(prefix.length).trim();
  if (!valueText || /^[\s.?…_\-–—]+$/u.test(valueText)) return true;
  return /^(?:(?:not available|missing|not recalled)[.!]?|(?:original\s+)?(?:option|choice)(?:\s+[A-F])?\s+(?:is\s+)?(?:missing|not\s+(?:recalled|provided|available))(?:\s+(?:from|in)\s+(?:the\s+)?(?:original\s+)?source)?(?:\s*[—–-]\s*not scored)?[.!]?|not\s+(?:provided|recalled|available)\s+in\s+(?:the\s+)?(?:original\s+)?source[.!]?)$/iu.test(valueText);
}

function labelledRun(value) {
  // Four to six *explicit*, consecutive, consistently punctuated labels only.
  // Spaces, medical vocabulary, doses and slashes alone never create boundaries.
  const source = text(value).replace(/<br\s*\/?\s*>/giu,'\n').trim();
  const matches = [...source.matchAll(/(?:^|\s)(\(([A-Fa-f])\)|([A-Fa-f])([.):]))(?=\s|$)/gu)];
  if (matches.length < 4 || matches.length > 6 || matches[0].index !== 0) return null;
  const style = m => m[2] ? 'parentheses' : m[4];
  const originalCase = m => (m[2] || m[3]) === (m[2] || m[3]).toUpperCase();
  const options = [];
  for (let i=0;i<matches.length;i++) {
    const match=matches[i], key=(match[2] || match[3]).toUpperCase();
    if (key !== String.fromCharCode(65+i) || style(match)!==style(matches[0]) || originalCase(match)!==originalCase(matches[0])) return null;
    const valueText=cleanDisplay(source.slice(match.index+match[0].length,matches[i+1]?.index ?? source.length)).trim();
    options.push({key,text:valueText});
  }
  return options;
}

export function normalizeSourceOptions(input) {
  const rows = Array.isArray(input) ? input : typeof input === 'string' ? [input] : [];
  const options = rows.map((row,index) => {
    const object = row && typeof row === 'object' && !Array.isArray(row) ? row : null;
    return {key:label(object?.key ?? object?.label,String.fromCharCode(65+index)),
      text:cleanDisplay(typeof row === 'string' ? row : object?.text)};
  });
  const issues = new Set();
  const runs = options.map(option=>labelledRun(option.text));
  const nonMissing = options.map((option,index)=>!missingOption(option.text) ? index : -1).filter(index=>index>=0);
  let separated = false;
  if (nonMissing.length === 1 && nonMissing[0] === 0 && options[0].key === 'A' && runs[0]) {
    // Keep repaired layouts review-only until their source is reviewed. Do not
    // silently promote a previously malformed record into scored practice.
    options.splice(0,options.length,...runs[0]);
    separated = true;
    issues.add('separated_labels_require_review');
  } else if (runs.some(Boolean)) {
    // A joined list plus other substantive choices has two competing layouts.
    issues.add('ambiguous_option_layout');
  }

  if (!separated && options.length > 1) {
    const heads=options.map(option=>leadingLabel(option.text));
    const structural = heads.every(Boolean) && new Set(heads.map(head=>head.key)).size===heads.length &&
      [...heads.map(head=>head.key)].sort().join('')==='ABCDEF'.slice(0,heads.length);
    if (structural) {
      options.forEach((option,index)=>{
        const row=rows[index], explicit=row && typeof row==='object' && !Array.isArray(row) && text(row.key ?? row.label).trim();
        if (explicit && option.key!==heads[index].key) {
          issues.add('conflicting_option_labels');
          return;
        }
        option.key=heads[index].key;
        option.text=option.text.trimStart().slice(heads[index].length);
      });
    } else if (heads.some((head,index)=>head && head.key!==options[index].key &&
      !(rows[index] && typeof rows[index]==='object' && text(rows[index].key ?? rows[index].label).trim()))) {
      // Without explicit source keys, a partial contrary label cannot safely
      // be graded by array position. Keep the wording, including abbreviations.
      issues.add('ambiguous_option_layout');
    }
  }
  if (options.length < 2 || options.length > 6) issues.add('invalid_option_count');
  for (const option of options) {
    if (missingOption(option.text)) {
      issues.add('missing_option_text');
      option.text=missingNotice;
    }
    if (!/^[A-F]$/u.test(option.key)) issues.add('invalid_option_label');
  }
  if (new Set(options.map(option=>option.key)).size!==options.length) issues.add('duplicate_option_labels');
  const content=options.filter(option=>!missingOption(option.text)).map(option=>option.text.trim().replace(/\s+/gu,' '));
  if (new Set(content).size!==content.length) issues.add('duplicate_option_text');
  return {options,issues:[...issues]};
}
