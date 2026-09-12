/** Targeted clinical errata, not original-source explanations or a whole-bank validation. */
import {toxicologyReviewEntries} from './study-toxicology-content.mjs';
const reviewedOn = '2026-09-12';
const referenceTemplates = [
  {sourceName:'UCSF Hospital Handbook: Algorithm for Acid-Base Disorders',part:'Clinical review reference',page:null,questionNumber:null,url:'https://hospitalhandbook.ucsf.edu/01-algorithm-acid-base-disorders/01-algorithm-acid-base-disorders'},
  {sourceName:'Royal Children\'s Hospital: Salicylates poisoning',part:'Clinical review reference',page:null,questionNumber:null,url:'https://www.rch.org.au/clinicalguide/guideline_index/Salicylates_Posioning/'}
];
const corrections = new Map([
  ...toxicologyReviewEntries,
  ['part2-toxicology-q14', {
    stem:'Which arterial blood gas pattern best matches aspirin toxicity among the listed options?',
    options:[['A','pH 7.25, pCO2 20, HCO3 8'],['B','pH 7.20, pCO2 45, HCO3 20'],['C','pH 7.50, pCO2 40, HCO3 30'],['D','pH 7.60, pCO2 40, HCO3 40']],
    sourceKey:'A',reviewOnly:false,
    note:'The recorded source answer remains A. However, the previous mixed-disorder explanation is incorrect for the stated values. With HCO3 8 mmol/L, Winter\'s formula gives an expected PaCO2 of (1.5 x 8) + 8 = 20 +/- 2 mmHg. A measured PaCO2 of 20 mmHg is within appropriate respiratory compensation for metabolic acidosis; it does not establish an additional primary respiratory alkalosis. This pattern can occur in salicylate toxicity but is not specific for it. Low bicarbonate plus low CO2 alone must not be taught as proof of a mixed disorder. Source-key matching is retained, not presented as independent validation of the recalled question.'
  }],
  ['part2-toxicology-q15', {
    stem:'A poisoned child has pH 7.24, pCO2 24, and HCO3 8. Which listed toxin is favored by the source?',
    options:[['A','Aspirin'],['B','Methanol']],sourceKey:'A',reviewOnly:true,
    note:'The source records A (aspirin), but the recalled reasoning does not justify a definitive diagnosis. Assuming arterial values obtained together, HCO3 8 mmol/L gives an expected PaCO2 of (1.5 x 8) + 8 = 20 +/- 2 mmHg. PaCO2 24 mmHg is above that range, not evidence of an additional primary respiratory alkalosis. This limited blood-gas recall cannot reliably distinguish aspirin from methanol without additional clinical or exposure evidence. The original values, options and source key are preserved; B is not substituted. This question is retained for review without assigning a correct/incorrect score until the clinical ambiguity is resolved.'
  }]
]);
export function clinicalReviewFor({id,stem,options,key}) {
  const correction=corrections.get(id);
  if(!correction)return null;
  const signature=JSON.stringify(options.map(o=>[o.key,o.text]));
  if(stem!==correction.stem||key!==correction.sourceKey||signature!==JSON.stringify(correction.options)) {
    // A later edit must not inherit clinical conclusions about a different version.
    return {reviewedOn,reviewOnly:true,status:'changed_record_requires_review',references:[],
      note:'This previously flagged recall has changed since its clinical review. The earlier correction is not applied to this version. Review only; no score is assigned until the revised record is checked.'};
  }
  return {reviewedOn,reviewOnly:correction.reviewOnly,status:'targeted_reasoning_review',note:correction.note,
    references:[...(correction.references || referenceTemplates).map(r=>({...r})),{sourceName:'Pediatric Saudi Board Exams Question Collection, 4th Edition, 1 May 2026',part:'Source cross-check; PDF page index',page:correction.sourcePage || 599,questionNumber:correction.sourceQuestion || (id.endsWith('q14')?'Toxicology Q14':'Toxicology Q15')}]};
}
export function clinicalFeedbackNotice(q) {
  if(!q.clinicalReview)return q.notice;
  return q.notice+'\n\nClinical review note ('+q.clinicalReview.reviewedOn+'; independently written, not an original-source quotation): '+q.clinicalReview.note;
}
