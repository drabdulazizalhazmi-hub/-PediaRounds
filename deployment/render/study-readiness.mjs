/** Fail-closed publication gate using existing source metadata, never a clinical review. */
const text = value => typeof value === 'string' ? value.trim() : '';
const meaningful = value => {
  const s = text(value);
  return !!s && !/^(?:n\/?a|none|unknown|missing|not[_ ](?:checked|available|provided)|pending|[.\s…-]+)[.!]?$/i.test(s);
};
export function publicationIssues(raw, {key, explanation} = {}) {
  const issues = [];
  // A verified answer is not the same as a fully approved, complete question.
  if (raw?.reviewStatus !== 'ready_for_publish') issues.push('publication_review_pending');
  if (raw?.publishable !== undefined && raw.publishable !== true) issues.push('publication_blocked');
  if (raw?.blockers != null && (!Array.isArray(raw.blockers) || raw.blockers.length)) issues.push('unresolved_source_blockers');
  if (!meaningful(explanation)) issues.push('original_english_explanation_missing');
  if (!Array.isArray(raw?.sourceRefs) || !raw.sourceRefs.some(ref => meaningful(ref?.sourceName))) issues.push('source_reference_missing');
  const verified = text(raw?.verifiedAnswer).toUpperCase();
  if (!/^[A-Z]$/.test(verified)) issues.push('verified_answer_missing');
  else if (verified !== key) issues.push('verified_answer_conflict');
  const verification = raw?.verification;
  const checks = ['upToDate', 'nelson', 'guideline'].map(name => verification?.[name]);
  if (checks.includes('conflicts')) issues.push('verification_conflict');
  if (!checks.includes('supports') || !meaningful(verification?.referenceNotes)) issues.push('verification_evidence_missing');
  return issues;
}
export const PUBLICATION_MESSAGES = Object.freeze({
  publication_review_pending: 'Publication review is not complete.',
  publication_blocked: 'The source record is explicitly blocked from publication.',
  unresolved_source_blockers: 'Source review blockers remain unresolved.',
  original_english_explanation_missing: 'The original English source explanation is missing.',
  source_reference_missing: 'A source reference is missing.',
  verified_answer_missing: 'The reviewed answer key is missing.',
  verified_answer_conflict: 'The reviewed and recorded answer keys conflict.',
  verification_conflict: 'A recorded reference check reports a conflict.',
  verification_evidence_missing: 'Supporting verification metadata is incomplete.'
});
