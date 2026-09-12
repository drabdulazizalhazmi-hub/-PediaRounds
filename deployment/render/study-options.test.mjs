import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSourceOptions,missingOption} from './study-options.mjs';
import {createBank,beforeAnswer,answerFeedback,originalEnglish,MISSING_EXPLANATION} from './study-bank.mjs';
const fixture = extra => ({id:'layout-fixture',module:'fixtures',stemEn:'Select the recorded fixture option.',
  options:[{key:'A',text:'First option'},{key:'B',text:'Second option'},{key:'C',text:'Third option'},{key:'D',text:'Fourth option'}],
  recalledAnswer:'B',publishable:true,reviewStatus:'ready_for_publish',...extra});
const question = extra => createBank([fixture(extra)]).get('layout-fixture');
const joined = 'A. First option B. Second option C. Third option D. Fourth option';

test('four explicitly joined source labels become four display options, never a new scored record',()=>{
 const q=question({options:[joined]});
 assert.deepEqual(q.options,fixture().options);assert.equal(q.reviewOnly,true);
 assert.equal(answerFeedback(q,1).correct,null);assert.match(q.notice,/separated for display/);
});
test('a string-valued source list is supported without fabricating an option',()=>{
 const q=question({options:joined});assert.deepEqual(q.options,fixture().options);
 assert.equal(beforeAnswer(q).options.length,4);assert.equal(q.id,'layout-fixture');
});
test('explicit label layouts support periods, right parentheses, paired parentheses and colons',()=>{
 for(const make of [k=>k+'.',k=>k+')',k=>'('+k+')',k=>k+':']) {
  const source=fixture().options.map(o=>make(o.key)+' '+o.text).join('\n');
  assert.deepEqual(normalizeSourceOptions([source]).options,fixture().options);
 }
});
test('lowercase joined labels, CRLF and copied br separators are recognized',()=>{
 for(const separator of ['\r\n','<br>','<br/>','<br />']) {
  const source=fixture().options.map(o=>o.key.toLowerCase()+'. '+o.text).join(separator);
  assert.deepEqual(normalizeSourceOptions([source]).options,fixture().options);
 }
});
test('empty trailing source slots do not prevent a complete labelled list from being separated',()=>{
 const q=question({options:[{key:'A',text:joined},{key:'B',text:'...'},{key:'C',text:''},{key:'D',text:'Not recalled'}]});
 assert.deepEqual(q.options,fixture().options);assert.equal(q.reviewOnly,true);
});
test('a missing choice inside a labelled list stays visibly missing and non-scoring',()=>{
 const q=question({options:['A. First B. ... C. Third D. Fourth']});
 assert.equal(q.options.length,4);assert.match(q.options[1].text,/Original option missing/);
 assert.equal(q.reviewOnly,true);assert.equal(answerFeedback(q,0).correct,null);
});
test('joined lists with competing substantive source options are never guessed apart',()=>{
 const q=question({options:[joined,'Another substantive source choice']});
 assert.equal(q.options.length,2);assert.equal(q.options[0].text,joined);
 assert.equal(q.reviewOnly,true);assert.ok(q.optionIssues.includes('ambiguous_option_layout'));
});
test('an aggregate filed under a conflicting outer label is not silently relabelled',()=>{
 const q=question({options:[{key:'C',text:joined}]});
 assert.equal(q.options[0].key,'C');assert.equal(q.options.length,1);assert.equal(q.reviewOnly,true);
});
test('doses, slashes, arrows and unlabelled prose never create synthetic choices',()=>{
 for(const value of ['Na 130 K 4 Cl 100 HCO3 24','5 mg/kg/day / 10 mg/kg/day / 15 mg/kg/day','↑ sodium ↓ potassium ↑ chloride ↓ bicarbonate','First; Second; Third; Fourth']) {
  const q=question({options:[value]});assert.equal(q.options.length,1);assert.equal(q.options[0].text,value);assert.equal(q.reviewOnly,true);
 }
});
test('inconsistent, nonconsecutive and too-short labelled runs are kept unscored',()=>{
 for(const value of ['A. One B) Two C. Three D. Four','A. One C. Three D. Four E. Five','A. One b. Two C. Three D. Four','A. One B. Two','A. One B. Two B. Three D. Four']) {
  const q=question({options:[value]});assert.equal(q.options.length,1);assert.equal(q.reviewOnly,true);
 }
});
test('individually labelled string options use their labels rather than array positions',()=>{
 const q=question({options:['B. Second option','A. First option','D. Fourth option','C. Third option']});
 assert.equal(q.reviewOnly,false);assert.equal(q.options[0].key,'B');assert.equal(q.options[0].text,'Second option');
 assert.equal(answerFeedback(q,0).correct,true);assert.equal(answerFeedback(q,1).correct,false);
});
test('every ordering of explicitly labelled choices keeps source-label grading',()=>{
 const permutations=xs=>xs.length===0?[[]]:xs.flatMap((x,i)=>permutations(xs.filter((_,j)=>i!==j)).map(tail=>[x,...tail]));
 for(const choices of permutations(fixture().options)) {
  const q=question({options:choices.map(o=>o.key+'. '+o.text)});
  assert.equal(q.reviewOnly,false);assert.equal(answerFeedback(q,q.options.findIndex(o=>o.key==='B')).correct,true);
 }
});
test('explicit object keys that contradict a full set of embedded labels are review-only',()=>{
 const q=question({options:[{key:'A',text:'B. Second'},{key:'B',text:'A. First'}]});
 assert.equal(q.reviewOnly,true);assert.equal(answerFeedback(q,1).correct,null);
 assert.ok(q.optionIssues.includes('conflicting_option_labels'));
});
test('formatting around object labels is normalized without reordering the options',()=>{
 const q=question({options:[{label:'(B)',text:'Second'},{key:'A.',text:'First'},{key:'c)',text:'Third'}]});
 assert.equal(q.reviewOnly,false);assert.deepEqual(q.options.map(o=>o.key),['B','A','C']);assert.equal(answerFeedback(q,0).correct,true);
});
test('organism abbreviations are not stripped or mistaken for partial option labels',()=>{
 const choices=['C. difficile','E. coli','S. aureus','D. fragilis'];
 const q=question({options:choices.map((text,index)=>({key:String.fromCharCode(65+index),text}))});assert.equal(q.reviewOnly,false);
 assert.deepEqual(q.options.map(o=>o.text),choices);
});
test('standalone missing-option phrases and punctuation do not count as real choices',()=>{
 for(const value of ['', '...', '…', '—','B. ..','D.','Option not recalled','Original option missing from source — not scored','Not provided in the original source','Choice is missing.','\u200b']) {
  assert.equal(missingOption(value),true,value);
  const q=question({options:[{key:'A',text:'First'},{key:'B',text:value}]});
  assert.equal(q.reviewOnly,true,value);assert.match(q.options[1].text,/Original option missing/);assert.equal(answerFeedback(q,0).correct,null);
 }
});
test('valid options containing negative wording are not treated as placeholders',()=>{
 for(const value of ['None of the above','Not applicable','Unknown','Missing teeth','No treatment is required','Not available locally; transfer for treatment']) assert.equal(missingOption(value),false,value);
});
test('copied correctness marks are not leaked to the pre-answer option text',()=>{
 const q=question({options:[{key:'A',text:'✓ First option'},{key:'B',text:'Second option ✅'},{key:'C',text:'Third option ❌'},{key:'D',text:'Fourth option ✔️'}]});
 assert.deepEqual(q.options,fixture().options);assert.doesNotMatch(JSON.stringify(beforeAnswer(q)),/[✓✔☑✅✗✘❌]/u);
 assert.equal(answerFeedback(q,1).correct,true);
});
test('clinical signs, decimal doses and case-sensitive units survive display cleanup',()=>{
 const choices=['Na ≥ 135 mmol/L; K ≤ 5; ↑/↓','0.5 mg/kg/day ± 0.1','10 mM','10 mm'];
 const q=question({options:choices});assert.equal(q.reviewOnly,false);assert.deepEqual(q.options.map(o=>o.text),choices);
});
test('duplicate option text is review-only even when its labels differ',()=>{
 const q=question({options:[{key:'A',text:'Same choice'},{key:'B',text:' Same  choice '}]});
 assert.equal(q.reviewOnly,true);assert.ok(q.optionIssues.includes('duplicate_option_text'));assert.equal(answerFeedback(q,0).correct,null);
});
test('duplicate and invalid labels cannot be graded',()=>{
 for(const options of [[{key:'A',text:'One'},{key:'a.',text:'Two'}],[{key:'Wrong label',text:'One'},{key:'B',text:'Two'}]]) {
  const q=question({options});assert.equal(q.reviewOnly,true);assert.equal(answerFeedback(q,1).correct,null);
 }
});
test('malformed containers and null options are handled without throwing',()=>{
 for(const options of [null,undefined,17,{},[null,{},42]]) {
  const q=question({options});assert.equal(q.reviewOnly,true);assert.doesNotThrow(()=>beforeAnswer(q));assert.equal(answerFeedback(q,null).correct,null);
 }
});
test('source image, publishability and answer-conflict gates survive layout repair',()=>{
 for(const extra of [{imageRequired:true},{publishable:false},{verifiedAnswer:'A'},{reviewStatus:'image_needs_review'}]) {
  const q=question({...extra,options:[joined]});assert.equal(q.reviewOnly,true);assert.equal(answerFeedback(q,1).correct,null);
 }
});
test('question sources, options, identity and clinical text are never mutated in place',()=>{
 const row=fixture({options:[joined],sourceRefs:[{sourceName:'Fictional fixture',page:38,questionNumber:38}],originalExplanation:'  Original attached wording.\nSecond line.  '});
 const snapshot=structuredClone(row);Object.freeze(row.options);Object.freeze(row.sourceRefs);Object.freeze(row);
 const bank=createBank([row]);assert.deepEqual(row,snapshot);assert.equal(bank.get(row.id).id,row.id);
 assert.equal(bank.get(row.id).explanation,row.originalExplanation);assert.equal(bank.get(row.id).stem,row.stemEn);
});
test('pre-answer fields still exclude the source key, explanation and repair internals',()=>{
 const data=beforeAnswer(question({options:[joined],originalExplanation:'Hidden original source wording.'}));
 assert.deepEqual(Object.keys(data).sort(),['id','imageRequired','module','notice','number','options','reviewOnly','text'].sort());
 assert.doesNotMatch(JSON.stringify(data),/sourceKey|recalledAnswer|optionIssues|Hidden original/);
});
test('existing declared duplicate aliases remain canonical after option normalization',()=>{
 const b=createBank([fixture(),fixture({id:'legacy-alias',duplicateOf:'layout-fixture'})]);
 assert.equal(b.summary.questionCount,1);assert.equal(b.get('legacy-alias').id,'layout-fixture');assert.equal(b.aliases.get('legacy-alias'),'layout-fixture');
});
test('summary counts formatting issues without claiming more questions or a migration',()=>{
 const b=createBank([fixture(),fixture({id:'joined',options:[joined]}),fixture({id:'missing',options:['First','...']})]);
 assert.equal(b.summary.questionCount,3);assert.equal(b.summary.practiceCount,1);assert.equal(b.summary.reviewOnlyCount,2);
 assert.equal(b.summary.separatedOptionLayoutCount,1);assert.equal(b.summary.incompleteOptionRecordCount,2);assert.equal(b.summary.fullSiteMigrated,false);
});
test('missing-source explanation placeholders never count as original explanations',()=>{
 for(const value of ['Not available.','Missing','N/A','No explanation provided.','Missing source explanation','No original explanation attached']) {
  assert.equal(originalEnglish({originalExplanation:value}),'',value);
  const q=question({originalExplanation:value});assert.equal(answerFeedback(q,1).explanation,MISSING_EXPLANATION);
 }
});
test('a missing original field does not hide a later explicitly attached English source field',()=>{
 const value='  Attached source text.\nSecond line preserved.  ';
 assert.equal(originalEnglish({originalExplanation:'Not available',sourceExplanationEn:value}),value);
});
test('authored reasoning, translations and mixed-language text remain excluded as original source text',()=>{
 assert.equal(originalEnglish({reasoningEn:'Authored teaching',explanation:'Generic text',explanationAr:'شرح'}),'');
 assert.equal(originalEnglish({originalExplanation:'English شرح'}),'');
});
test('an ordinary unchanged question still grades and returns the original source text',()=>{
 const q=question({originalExplanation:'Exact attached original text.'});
 assert.equal(q.reviewOnly,false);assert.equal(answerFeedback(q,1).correct,true);assert.equal(answerFeedback(q,0).correct,false);
 assert.equal(answerFeedback(q,1).explanation,'Exact attached original text.');
});

test('a partial contrary label without an explicit source key never grades by array position',()=>{
 const q=question({options:['B. Second option','Remaining unlabelled option']});
 assert.equal(q.reviewOnly,true);assert.equal(answerFeedback(q,0).correct,null);
 assert.equal(q.options[0].text,'B. Second option');
});
