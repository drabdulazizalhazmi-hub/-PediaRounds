import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {createBank,beforeAnswer,answerFeedback,MISSING_EXPLANATION,loadRepositoryBank} from './study-bank.mjs';
const q14=()=>({id:'part2-toxicology-q14',stemEn:'Which arterial blood gas pattern best matches aspirin toxicity among the listed options?',options:[{key:'A',text:'pH 7.25, pCO2 20, HCO3 8'},{key:'B',text:'pH 7.20, pCO2 45, HCO3 20'},{key:'C',text:'pH 7.50, pCO2 40, HCO3 30'},{key:'D',text:'pH 7.60, pCO2 40, HCO3 40'}],recalledAnswer:'A',reviewStatus:'needs_verification'});
const q15=()=>({id:'part2-toxicology-q15',stemEn:'A poisoned child has pH 7.24, pCO2 24, and HCO3 8. Which listed toxin is favored by the source?',options:[{key:'A',text:'Aspirin'},{key:'B',text:'Methanol'}],recalledAnswer:'A',reviewStatus:'needs_verification'});
const get=raw=>createBank([raw]).get(raw.id);
test('Q14 explains appropriate compensation rather than an unsupported mixed disorder',()=>{
 const reply=answerFeedback(get(q14()),0);
 assert.match(reply.notice,/20 \+\/- 2 mmHg/);assert.match(reply.notice,/does not establish an additional primary respiratory alkalosis/);
});
test('Q14 keeps source-key matching without claiming new clinical validation',()=>{
 const q=get(q14());assert.equal(q.reviewOnly,false);assert.equal(answerFeedback(q,0).correct,true);assert.equal(answerFeedback(q,1).correct,false);assert.equal(answerFeedback(q,0).sourceKey,'A');
});
test('Q15 remains present but cannot assign a correct or incorrect score',()=>{
 const q=get(q15());assert.equal(q.reviewOnly,true);
 for(const selected of [null,0,1]){const reply=answerFeedback(q,selected);assert.equal(reply.correct,null);assert.equal(reply.sourceKey,'A');}
});
test('Q15 never silently replaces aspirin with methanol',()=>{
 const reply=answerFeedback(get(q15()),null);assert.match(reply.notice,/B is not substituted/);assert.match(reply.notice,/above that range/);
});
test('clinical correction is not leaked before an answer or source reveal',()=>{
 for(const raw of [q14(),q15()]){const before=beforeAnswer(get(raw));assert.equal('clinicalReview' in before,false);assert.doesNotMatch(before.notice,/Winter|20 \+\/-|source records A/);assert.equal('sourceKey' in before,false);}
});
test('clinical note is not mislabeled as an original source explanation',()=>{
 const reply=answerFeedback(get(q14()),0);assert.equal(reply.originalExplanationAvailable,false);assert.equal(reply.explanation,MISSING_EXPLANATION);assert.match(reply.notice,/not an original-source quotation/);
});
test('attached original English wording remains byte-for-byte intact',()=>{
 const raw=q14();raw.originalExplanation='Attached original source text.\n  Keep this exact spacing.';
 assert.equal(answerFeedback(get(raw),0).explanation,raw.originalExplanation);
});
test('clinical references include exact URLs and original PDF page',()=>{
 const refs=answerFeedback(get(q15()),null).references;assert.ok(refs.some(r=>r.url?.startsWith('https://hospitalhandbook.ucsf.edu/')));assert.ok(refs.some(r=>r.url?.startsWith('https://www.rch.org.au/')));assert.ok(refs.some(r=>r.page===599));
});
test('a revised stem cannot inherit a stale clinical conclusion',()=>{
 const raw=q15();raw.stemEn+=' Revised.';const q=get(raw);assert.equal(q.reviewOnly,true);assert.equal(q.clinicalReview.status,'changed_record_requires_review');assert.doesNotMatch(answerFeedback(q,null).notice,/20 \+\/-/);
});
test('reordered options or a changed source key require re-review',()=>{
 const raw=q14();raw.options.reverse();assert.equal(get(raw).reviewOnly,true);
 const other=q14();other.recalledAnswer='B';assert.equal(get(other).reviewOnly,true);
});
test('invalid selection guards continue to apply to review-only questions',()=>{
 const q=get(q15());for(const selected of [-1,2,0.5])assert.throws(()=>answerFeedback(q,selected),e=>e.code==='invalid_selection');
});
test('source records, IDs, options and keys are not mutated by the adapter',()=>{
 const rows=[q14(),q15()],snapshot=JSON.stringify(rows);const bank=createBank(rows);assert.equal(JSON.stringify(rows),snapshot);assert.equal(bank.summary.questionCount,2);assert.equal(bank.summary.practiceCount,1);assert.equal(bank.summary.reviewOnlyCount,1);
});
test('unrelated questions retain their source grading and have no clinical note',()=>{
 const raw={...q14(),id:'fictional-unrelated'};const q=get(raw);assert.equal(q.clinicalReview,null);assert.equal(answerFeedback(q,0).correct,true);assert.equal(answerFeedback(q,0).notice,q.notice);
});
const repositoryRoot=new URL('../../master-bank/data/',import.meta.url);
test('current repository records receive both corrections without losing IDs',{skip:!existsSync(repositoryRoot)},()=>{
 const bank=loadRepositoryBank();for(const id of ['part2-toxicology-q14','part2-toxicology-q15']){const q=bank.get(id);assert.ok(q);assert.equal(q.clinicalReview?.status,'targeted_reasoning_review');}
 assert.equal(bank.get('part2-toxicology-q15').reviewOnly,true);assert.equal(bank.summary.fileErrors,0);
});
