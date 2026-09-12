import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {toxicologyReviewEntries,verifiedToxicologyImage,toxicologySourceImageFor} from './study-toxicology-content.mjs';
import {createBank,beforeAnswer,answerFeedback,loadRepositoryBank,MISSING_EXPLANATION} from './study-bank.mjs';
const encodedOriginal=process.env.PEDIA_Q11_SOURCE_IMAGE_BASE64;
const original=typeof encodedOriginal==='string' && verifiedToxicologyImage(Buffer.from(encodedOriginal,'base64')) ? Buffer.from(encodedOriginal,'base64') : null;
// CI without private media uses metadata fixtures; Render and the local source
// check additionally run the exact-image assertions when the image is present.
const raw=n=>{
 const [id,r]=toxicologyReviewEntries.find(([id])=>id.endsWith('q'+String(n).padStart(2,'0')));
 return {id,stemEn:r.stem,options:r.options.map(([key,text])=>({key,text})),recalledAnswer:r.sourceKey,reviewStatus:'needs_verification',...(n===11?{image:{requiredForQuestion:true,status:'missing'}}:{})};
};
const get=n=>createBank([raw(n)]).get(raw(n).id);
for(const n of [9,10,11,12,13]){
 test(`Q${n}: English clinical teaching and exact source page are available after reveal`,()=>{
  const q=get(n),reply=answerFeedback(q,q.reviewOnly?null:0);
  assert.equal(q.clinicalReview.status,'targeted_reasoning_review');
  assert.doesNotMatch(q.clinicalReview.note,/\p{Script=Arabic}/u);
  assert.match(reply.notice,/independently written, not an original-source quotation/);
  assert.equal(reply.explanation,MISSING_EXPLANATION);
  assert.ok(reply.references.some(r=>r.url?.startsWith('https://www.rch.org.au/')));
  assert.ok(reply.references.some(r=>r.questionNumber===`Toxicology Q${n}`&&r.page===(n===9?596:n===13?598:597)));
 });
 test(`Q${n}: changed stem, options or source key cannot inherit an old clinical conclusion`,()=>{
  for(const field of ['stem','options','key']){
   const q=raw(n);
   if(field==='stem')q.stemEn+=' Changed.';
   if(field==='options')q.options[0].text+=' Changed.';
   if(field==='key')q.recalledAnswer='F';
   const normalized=createBank([q]).get(q.id);
   assert.equal(normalized.reviewOnly,true);
   assert.equal(normalized.clinicalReview.status,'changed_record_requires_review');
   assert.equal(normalized.sourceImage,null);
  }
 });
}
test('incomplete Q9/Q13 and treatment-ambiguous Q11 remain unscored',()=>{
 for(const n of [9,11,13]){
  const q=get(n);assert.equal(q.reviewOnly,true);
  for(const selected of [null,...q.options.map((_,i)=>i)])assert.equal(answerFeedback(q,selected).correct,null);
 }
});
test('Q10/Q12 retain their recorded A/C keys and do not invent a new key',()=>{
 assert.equal(answerFeedback(get(10),0).correct,true);assert.equal(answerFeedback(get(10),1).correct,false);
 assert.equal(answerFeedback(get(12),2).correct,true);assert.equal(answerFeedback(get(12),0).correct,false);
 assert.equal(answerFeedback(get(12),2).sourceKey,'C');
});
test('iron treatment note rejects automatic chelation from visible tablets alone',()=>{
 const note=get(11).clinicalReview.note;assert.match(note,/Visible tablets alone do not establish a need for chelation/);
 assert.match(note,/without waiting for serum iron/);assert.match(note,/does not replace indicated chelation/);assert.match(note,/without scoring/);
});
test('repeated acetaminophen exposure is not placed on the acute ingestion nomogram',()=>{
 assert.match(get(9).clinicalReview.note,/nomogram must not be used for repeated supratherapeutic ingestion/);
});
test('salicylate teaching does not require the same blood gas in every child',()=>{
 assert.match(get(13).clinicalReview.note,/not a mandatory finding/);assert.match(get(13).clinicalReview.note,/no distractors are invented/);
});
test('Q11 receives the original exact JPEG bytes and native dimensions, not a generated image',{skip:!original},()=>{
 const q=get(11),media=beforeAnswer(q).sourceImage;
 assert.deepEqual(Buffer.from(media.dataUrl.split(',')[1],'base64'),original);
 assert.equal(media.width,191);assert.equal(media.height,228);assert.equal(q.imageRequired,false);
 assert.equal(q.reviewOnly,true);assert.doesNotMatch(media.alt,/deferoxamine|chelation|correct answer/i);
});
test('unrelated records cannot acquire the restored source image',()=>{
 const q=raw(11);q.id='fictional-other-image';const bank=createBank([q]);
 assert.equal(bank.get(q.id).sourceImage,null);assert.equal(bank.get(q.id).imageRequired,true);
});
test('image checksum validation fails closed for changed, empty and non-buffer input',()=>{
 const changed=original?Buffer.from(original):Buffer.from('fictional-invalid-image');changed[0]^=1;
 for(const bytes of [changed,Buffer.alloc(0),null,'not an image'])assert.equal(verifiedToxicologyImage(bytes),null);
 if(original)assert.ok(verifiedToxicologyImage(original));
});
test('returned image metadata is isolated between requests',{skip:!original},()=>{
 const q=get(11),m=toxicologySourceImageFor(q);m.caption='changed';
 assert.notEqual(toxicologySourceImageFor(q).caption,'changed');
});
test('pre-answer payloads contain no clinical notes, references or key fields',()=>{
 for(const n of [9,10,11,12,13]){
  const before=beforeAnswer(get(n));
  for(const key of ['clinicalReview','key','sourceKey','explanation','references'])assert.equal(key in before,false);
  assert.doesNotMatch(before.notice,/The source key|best fit|best explains|Clinical review/);
 }
});
test('existing original English text and raw source records stay byte-for-byte unchanged',()=>{
 const rows=[9,10,11,12,13].map(raw);rows[1].originalExplanation=' Original English.\n  Same spacing.';
 const snapshot=JSON.stringify(rows);const bank=createBank(rows);
 assert.equal(JSON.stringify(rows),snapshot);assert.equal(answerFeedback(bank.get(rows[1].id),0).explanation,rows[1].originalExplanation);
 assert.equal(bank.summary.questionCount,5);assert.equal(bank.summary.restoredSourceImageCount,original?1:0);
 assert.equal(bank.summary.targetedClinicalReviewCount,5);assert.equal(bank.summary.fullSiteMigrated,false);
});
test('prior option-layout quarantine is preserved',()=>{
 const rawQuestion={id:'fictional-joined',stemEn:'Fictional question',recalledAnswer:'A',options:['A. One B. Two C. Three D. Four']};
 const q=createBank([rawQuestion]).get(rawQuestion.id);
 assert.equal(q.options.length,4);assert.equal(q.reviewOnly,true);assert.equal(q.sourceImage,null);
});
const questionWithImage=()=>{const q=beforeAnswer(get(11));q.sourceImage=q.sourceImage||{dataUrl:'data:image/jpeg;base64,AA==',width:191,height:228,alt:'Fictional image fixture',caption:'Fictional metadata, not a clinical image'};return q;};
const clientSource=readFileSync(new URL('./study-client.mjs',import.meta.url),'utf8');
function browserFixture(){
 const elements=new Map();let question;
 const element=(tag='div')=>({tag,hidden:false,disabled:false,value:'',textContent:'',dataset:{},children:[],listeners:new Map(),
  addEventListener(name,fn){this.listeners.set(name,fn);},replaceChildren(...items){this.children=items;},append(...items){this.children.push(...items);},get options(){return this.children;},querySelectorAll(){return [];},reportValidity(){return true;}});
 const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};get('mode').value='review';
 const context={createEnglishReader:()=>({supported:false,stop(){},speak(){}}),canReadEnglish:()=>false,englishVoices:()=>[],console,AbortController,setTimeout,clearTimeout,setInterval:()=>0,URL,Uint32Array,
  crypto:{getRandomValues(n){return n;}},location:{hash:''},document:{getElementById:get,createElement:element,addEventListener(){}},window:{addEventListener(){}},
  fetch:async url=>({ok:true,status:200,json:async()=>url.includes('/question?')?question:{revision:1}})};
 runInNewContext(clientSource.replace(/^import[^\n]*\n/,'').replace(/void initialize\(\);\s*$/,'')+`
 globalThis.fixture={async load(q){user={id:'fictional'};catalog={summary:{questionCount:1},items:[q]};history=[{id:q.id,reply:null,selected:null,saved:true}];position=0;await display();},feedback(reply){history[0].reply=reply;showFeedback(history[0]);},clear:clearWorkspace};`,context);
 return {get,async load(q){question=q;await context.fixture.load(q);},feedback:context.fixture.feedback,clear:context.fixture.clear};
}
test('actual client renders the original image separately from each answer option',async()=>{
 const client=browserFixture();await client.load(questionWithImage());
 const children=client.get('options').children;assert.equal(children[0].tag,'figure');assert.equal(children[0].children[0].tag,'img');
 assert.equal(children[0].children[0].width,191);assert.equal(children.length,4);
 assert.deepEqual(children.slice(1).map(x=>x.tag),['label','label','label']);
});
test('navigation and sign-out do not retain an old question image',async()=>{
 const client=browserFixture();await client.load(questionWithImage());await client.load(beforeAnswer(get(10)));
 assert.equal(client.get('options').children.some(x=>x.tag==='figure'),false);
 await client.load(questionWithImage());client.clear();assert.equal(client.get('options').children.length,0);
});
test('client rejects external image URLs and reports source-image load errors',async()=>{
 const client=browserFixture(),q=questionWithImage();q.sourceImage.dataUrl='https://untrusted.invalid/image.jpg';
 await client.load(q);assert.equal(client.get('options').children.some(x=>x.tag==='figure'),false);
 await client.load(questionWithImage());const [image,caption]=client.get('options').children[0].children;
 image.listeners.get('error')();assert.match(caption.textContent,/remains under review/);
});
const repositoryRoot=new URL('../../master-bank/data/',import.meta.url);
test('real repository Q9-Q13 receive exact reviews and only Q11 receives this image',{skip:!existsSync(repositoryRoot)},()=>{
 const bank=loadRepositoryBank();
 for(const n of [9,10,11,12,13])assert.equal(bank.get(raw(n).id)?.clinicalReview?.status,'targeted_reasoning_review');
 assert.equal(!!bank.get(raw(11).id).sourceImage,!!original);assert.equal(bank.get(raw(11).id).reviewOnly,true);
 assert.equal(bank.summary.restoredSourceImageCount,original?1:0);assert.equal(bank.summary.fileErrors,0);
 assert.equal(bank.get('part2-toxicology-q15').reviewOnly,true);
 console.log('TARGETED_CONTENT_AUDIT '+JSON.stringify(bank.summary));
});

test('clinical citations open approved HTTPS references without opening unsafe URLs',async()=>{
 const client=browserFixture();await client.load(beforeAnswer(get(10)));
 const reply=answerFeedback(get(10),0);reply.references.push(...[
  'javascript:alert(1)','https://evil.invalid/a','https://www.rch.org.au.evil.invalid/a',
  'https://user:pass@www.rch.org.au/a','http://www.rch.org.au/a'
 ].map(url=>({sourceName:'Fictional unsafe reference',url})));
 client.feedback(reply);
 const links=client.get('references').children.flatMap(p=>p.children).filter(x=>x?.tag==='a');
 assert.equal(links.length,1);assert.match(links[0].href,/^https:\/\/www\.rch\.org\.au\//);
 assert.equal(links[0].rel,'noopener noreferrer');assert.equal(links[0].target,'_blank');
});
