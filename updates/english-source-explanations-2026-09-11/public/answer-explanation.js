const text = value => typeof value === 'string' ? value.trim() : '';
const ARABIC = /\p{Script=Arabic}/u;
const array = value => Array.isArray(value) ? value : [];

export function explanationText(value) {
  let result = text(value).split(/\s*~\*~/)[0];
  result = result.replace(/^See (?:the )?previous questions?[^.]*\.\s*/i, '');
  result = result.replace(/(?:Immunology|Cardiology|Endocrinology|Gastroenterology|Genetics|Metabolic Disorders|Rheumatology|Neonatology|Musculoskeletal and Sport Medicine|Critical Care Medicine|Behavioral Medicine and Psychiatric Disorders|Dermatology|Ophthalmology|ENT)\s+Total Number of Questions[\s\S]*$/i, '');
  if (/Total Number of Questions/.test(result)) return '';
  if (/^راجع الإجابة الصحيحة واربطها بالـ clinical clues الواردة في السؤال\.?$/u.test(result.trim())) return '';
  if (/^Didn't find an answer for this question\.?$/i.test(result.trim())) return '';
  if (/^Review developmental milestones\.?(?:\s*\[Developmental Milestones - (?:AAP|Nelson)\])?$/i.test(result.trim())) return '';
  return result.trim();
}

function englishSourceText(value, legacy = false) {
  const result = legacy ? explanationText(value) : text(value);
  if (!/[A-Za-z]/.test(result) || ARABIC.test(result)) return '';
  if (/^Similar question\b/i.test(result)) return '';
  if (/^(?:See (?:the )?previous questions?\.?|Didn't find an answer for this question\.?|Original source explanation is not available for this question\.?)$/i.test(result)) return '';
  if (/^Review developmental milestones\.?(?:\s*\[Developmental Milestones - (?:AAP|Nelson)\])?$/i.test(result)) return '';
  return result;
}

/**
 * Return only an English explanation already attached to the source question.
 * Priority: original, explicit recovered source, legacy source field, reviewed
 * source discussion, explicit linked source, then a source variant.
 * Do not translate, paraphrase, or promote Arabic teaching text.
 */
export function sourceExplanation(question) {
  for (const value of [question?.originalExplanation, question?.sourceExplanationEn, question?.source_explanation_en, question?.sourceExplanation]) {
    const direct = englishSourceText(value);
    if (direct) return { text: direct, language: 'en', sourceReview: false, status: 'text' };
  }

  const legacy = englishSourceText(question?.explanation, true);
  if (legacy) return { text: legacy, language: 'en', sourceReview: false, status: 'text' };

  const recovered = array(question?.githubReviews).find(review =>
    !['conflicting', 'outdated', 'incomplete_recall'].includes(review?.reviewStatus) &&
    englishSourceText(review?.sourceExplanation));
  if (recovered) return {
    text: englishSourceText(recovered.sourceExplanation),
    language: 'en', sourceReview: true, status: 'linked-text'
  };

  const linked = englishSourceText(question?.linkedSourceExplanation);
  if (linked) return { text: linked, language: 'en', sourceReview: true, status: 'linked-text' };

  const variants = [...array(question?.sourceVariants), ...array(question?.additionalSourceVariants)];
  const variant = variants.find(item => englishSourceText(item?.originalExplanation));
  if (variant) return {
    text: englishSourceText(variant.originalExplanation),
    language: 'en', sourceReview: true, status: 'variant-text'
  };

  return { text: '', language: 'en', sourceReview: false, status: 'unavailable' };
}

export function answerExplanation(question) {
  return sourceExplanation(question);
}

export { questionDisplayText } from './question-display.js';
