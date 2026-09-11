const text = value => typeof value === 'string' ? value.trim() : '';
const ARABIC = /[\u0621-\u064a]/u;

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

function englishSourceText(value) {
  const result = explanationText(value);
  return result && !ARABIC.test(result) ? result : '';
}

/**
 * Return only an English explanation that is already attached to the source
 * question. Do not translate, paraphrase, or promote Arabic teaching text.
 *
 * Priority:
 *  1. originalExplanation: verbatim explanation imported with this question.
 *  2. explanation: legacy imports where the source explanation lived here.
 *  3. source-review sourceExplanation: original English text recovered in review.
 *  4. linkedSourceExplanation: explicit linked source discussion.
 *  5. duplicate/source-variant originalExplanation.
 */
export function sourceExplanation(question) {
  const direct = englishSourceText(question?.originalExplanation);
  if (direct) return { text: direct, language: 'en', sourceReview: false, status: 'text' };

  const legacy = englishSourceText(question?.explanation);
  if (legacy) return { text: legacy, language: 'en', sourceReview: false, status: 'text' };

  const recovered = question?.githubReviews?.find(review =>
    !['conflicting', 'outdated', 'incomplete_recall'].includes(review.reviewStatus) &&
    englishSourceText(review.sourceExplanation));
  if (recovered) return {
    text: englishSourceText(recovered.sourceExplanation),
    language: 'en', sourceReview: true, status: 'linked-text'
  };

  const linked = englishSourceText(question?.linkedSourceExplanation);
  if (linked) return { text: linked, language: 'en', sourceReview: true, status: 'linked-text' };

  const variants = [...(question?.sourceVariants || []), ...(question?.additionalSourceVariants || [])];
  const variant = variants.find(item => englishSourceText(item?.originalExplanation));
  if (variant) return {
    text: englishSourceText(variant.originalExplanation),
    language: 'en', sourceReview: true, status: 'variant-text'
  };

  return { text: '', language: 'en', sourceReview: false, status: 'unavailable' };
}

// Main post-answer explanation is source-first and English-only.
export function answerExplanation(question) {
  return sourceExplanation(question);
}

export { questionDisplayText } from './question-display.js';
