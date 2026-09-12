/** Read-only adapter for the CURRENT repository bank, not a legacy-site restore. */
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {clinicalReviewFor,clinicalFeedbackNotice} from './study-clinical-review.mjs';
import {normalizeSourceOptions} from './study-options.mjs';
import {publicationIssues,PUBLICATION_MESSAGES} from './study-readiness.mjs';
const str = v => typeof v === 'string' ? v : '';
const list = v => Array.isArray(v) ? v : [];
const validID = v => typeof v === 'string' && v.length > 0 && v.length <= 200 && !/\p{Cc}/u.test(v);
export const MISSING_EXPLANATION = 'Original source explanation is not available for this question.';
export function originalEnglish(q) {
  // reasoningEn, explanationAr and generic explanation are NOT original-source evidence.
  for (const value of [q?.originalExplanation,q?.sourceExplanationEn,q?.source_explanation_en,q?.sourceExplanation]) {
    if (typeof value !== 'string' || !/[A-Za-z]/.test(value) || /\p{Script=Arabic}/u.test(value)) continue;
    if (/^\s*(?:Didn't find an answer for this question\.?|Original source explanation is not available for this question\.?|See (?:the )?previous question\.?|(?:not available|not provided|not recalled|missing|N\/A)[.!]?|(?:no |missing )(?:original |source )?explanation(?: (?:available|provided|attached))?[.!]?)\s*$/i.test(value)) continue;
    return value; // Preserve the attached text byte-for-byte; no rewriting or truncation.
  }
  return '';
}
function normalized(q) {
  const id = q?.id ?? q?.uid, stem = str(q?.stemEn || q?.text);
  if (!validID(id) || !stem.trim()) return null;
  const {options,issues:optionIssues} = normalizeSourceOptions(q.options);
  const rawKey = str(q.recalledAnswer ?? q.sourceAnswer ?? q.verifiedAnswer);
  const key = rawKey.trim().toUpperCase();
  const verified = str(q.verifiedAnswer).trim().toUpperCase();
  const optionKeys = options.map(o => o.key.trim().toUpperCase());
  const keyValid = /^[A-Z]$/.test(key) && optionKeys.filter(k=>k===key).length === 1;
  const incomplete = optionIssues.length > 0;
  const imageRequired = q.imageRequired === true || q.image?.requiredForQuestion === true;
  const conflicting = ['conflicting','outdated','incomplete_recall','image_missing','image_needs_review'].includes(q.reviewStatus) || (verified && key && verified !== key);
  const clinicalReview = clinicalReviewFor({id,stem,options,key});
  const explanation = originalEnglish(q);
  const publicationBlockers = publicationIssues(q,{key,explanation});
  const reviewOnly = publicationBlockers.length > 0 || q.publishable === false || incomplete || imageRequired || conflicting || !keyValid || clinicalReview?.reviewOnly === true;
  return {id,module:str(q.module || q.specialty) || 'Unclassified',number:q.number ?? null,stem,options,key,rawKey,
    reviewOnly,imageRequired,clinicalReview,optionIssues,publicationBlockers,reviewStatus:str(q.reviewStatus) || 'needs_verification',
    explanation,duplicateOf:validID(q.duplicateOf) ? q.duplicateOf : null,
    references:list(q.sourceRefs).map(r=>({sourceName:str(r?.sourceName),part:str(r?.part),page:r?.page ?? null,questionNumber:r?.questionNumber ?? null})),
    notice:imageRequired ? 'Original question image has not been migrated. Review only; no score is assigned.' : optionIssues.includes('separated_labels_require_review') ? 'Joined option labels were separated for display. Source layout needs review; no score is assigned.' : incomplete ? 'Missing, duplicated or ambiguous source options. Review only; no score is assigned.' : publicationBlockers.length ? 'Under review; no score is assigned. '+publicationBlockers.map(code=>PUBLICATION_MESSAGES[code]).join(' ') : reviewOnly ? 'Incomplete or pending-review source record. No score is assigned.' : 'Feedback compares your selection with the recorded source key; it is not a new clinical validation.'};
}
export function createBank(records,{fileCount=0,errors=[]}={}) {
  const all = new Map(); let skipped = 0, duplicateIDs = 0;
  for (const raw of records) {
    const q = normalized(raw); if (!q) {skipped++;continue;}
    if (all.has(q.id)) {
      duplicateIDs++;
      if (JSON.stringify(all.get(q.id)) !== JSON.stringify(q)) {
        all.get(q.id).reviewOnly = true;
        all.get(q.id).notice = 'Conflicting records share this identifier. Review only; no score is assigned.';
      }
      continue;
    }
    all.set(q.id,q);
  }
  const aliases = new Map();
  for (const q of all.values()) {
    let target=q, visited=new Set([q.id]);
    while(target.duplicateOf && all.has(target.duplicateOf) && !visited.has(target.duplicateOf)) {
      target=all.get(target.duplicateOf);visited.add(target.id);
    }
    if (target.id !== q.id && !target.duplicateOf) aliases.set(q.id,target.id);
    else if(q.duplicateOf) {q.reviewOnly=true;q.notice='Duplicate linkage needs review. No score is assigned.';}
  }
  const questions = [...all.values()].filter(q=>!aliases.has(q.id));
  const moduleCounts = new Map(), publicationBlockerCounts = {};
  for(const q of questions) {
    const counts=moduleCounts.get(q.module)||{name:q.module,count:0,readyCount:0,reviewOnlyCount:0};
    counts.count++;counts[q.reviewOnly?'reviewOnlyCount':'readyCount']++;moduleCounts.set(q.module,counts);
    for(const code of q.publicationBlockers) publicationBlockerCounts[code]=(publicationBlockerCounts[code]||0)+1;
  }
  const summary = Object.freeze({scope:'current-github-master-bank-only',fullSiteMigrated:false,fileCount,
    readinessPolicy:'explicit-publication-approval-and-complete-source-v1',publicationBlockerCounts:Object.freeze(publicationBlockerCounts),
    sourceRecords:records.length,questionCount:questions.length,practiceCount:questions.filter(q=>!q.reviewOnly).length,
    reviewOnlyCount:questions.filter(q=>q.reviewOnly).length,originalEnglishCount:questions.filter(q=>!!q.explanation).length,
    missingOriginalEnglishCount:questions.filter(q=>!q.explanation).length,imageRequiredCount:questions.filter(q=>q.imageRequired).length,
    separatedOptionLayoutCount:questions.filter(q=>q.optionIssues.includes('separated_labels_require_review')).length,
    incompleteOptionRecordCount:questions.filter(q=>q.optionIssues.length>0).length,
    duplicateOptionTextCount:questions.filter(q=>q.optionIssues.includes('duplicate_option_text')).length,
    duplicateIDs,declaredDuplicateAliases:aliases.size,skippedRecords:skipped,fileErrors:errors.length});
  return {summary,questions,aliases,
    catalog:()=>({summary,modules:[...moduleCounts.values()].map(counts=>({...counts})),items:questions.map(q=>({id:q.id,module:q.module,reviewOnly:q.reviewOnly}))}),
    get:id=>all.get(aliases.get(id)||id) || null};
}
export function loadRepositoryBank(root=fileURLToPath(new URL('../../master-bank/data/',import.meta.url))) {
  const records=[],errors=[]; let fileCount=0;
  function walk(dir) {
    for(const entry of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
      const name=path.join(dir,entry.name);
      if(entry.isSymbolicLink()) continue;
      if(entry.isDirectory()) {walk(name);continue;}
      if(!entry.isFile() || !entry.name.endsWith('.json')) continue;
      fileCount++;
      try {
        if(statSync(name).size>10000000) throw Error('oversized');
        const doc=JSON.parse(readFileSync(name,'utf8'));
        const rows=Array.isArray(doc)?doc:Array.isArray(doc?.questions)?doc.questions:Array.isArray(doc?.records)?doc.records:null;
        if(!rows) throw Error('unsupported_document');
        records.push(...rows);
      } catch {errors.push(path.relative(root,name));}
    }
  }
  try {walk(root);} catch {errors.push('bank_directory_unavailable');}
  return createBank(records,{fileCount,errors});
}
export function beforeAnswer(q) {
  return {id:q.id,module:q.module,number:q.number,text:q.stem,options:q.options.map(o=>({...o})),reviewOnly:q.reviewOnly,imageRequired:q.imageRequired,notice:q.notice};
}
export function answerFeedback(q,selectedIndex) {
  if(selectedIndex !== null && (!Number.isInteger(selectedIndex)||selectedIndex<0||selectedIndex>=q.options.length)) throw Object.assign(Error('invalid_selection'),{status:400,code:'invalid_selection'});
  if(selectedIndex===null && !q.reviewOnly) throw Object.assign(Error('selection_required'),{status:400,code:'selection_required'});
  const correct=q.reviewOnly?null:q.options[selectedIndex].key.trim().toUpperCase()===q.key;
  return {id:q.id,correct,sourceKey:q.rawKey||null,reviewOnly:q.reviewOnly,notice:clinicalFeedbackNotice(q),
    explanation:q.explanation||MISSING_EXPLANATION,originalExplanationAvailable:!!q.explanation,references:[...q.references,...(q.clinicalReview?.references||[])]};
}
