/** Publication segregation regressions. All approval/user fixtures below are fictional. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createBank,beforeAnswer,answerFeedback,loadRepositoryBank} from './study-bank.mjs';
import {createStudyApp} from './study-app.mjs';
import {ACCESS} from './study-auth.mjs';

const ready=(extra={})=>({id:'ready-fixture',module:'Ready module',stemEn:'Fictional interface question. Select the recorded choice.',
 options:[{key:'A',text:'First choice'},{key:'B',text:'Second choice'}],recalledAnswer:'B',verifiedAnswer:'B',
 reviewStatus:'ready_for_publish',publishable:true,originalExplanation:'  Fictional original explanation.\nKeep spacing.  ',
 sourceRefs:[{sourceName:'Fictional reference',page:1}],verification:{guideline:'supports',referenceNotes:'Fictional approval evidence; not clinical verification.'},...extra});
const under=(extra={})=>ready({id:'pending-fixture',module:'Pending module',reviewStatus:'needs_verification',...extra});
const question=raw=>createBank([raw]).get(raw.id);

test('explicit approval and complete source metadata can enter the ready set',()=>{
 const q=question(ready());assert.equal(q.reviewOnly,false);assert.deepEqual(q.publicationBlockers,[]);
 assert.equal(answerFeedback(q,1).correct,true);assert.equal(answerFeedback(q,0).correct,false);
});
for(const reviewStatus of [undefined,'imported','deduplicated','image_checked','needs_verification','verified','conflicting','outdated','READY_FOR_PUBLISH','unexpected_status']){
 test('non-publication status remains under review: '+String(reviewStatus),()=>{
  const q=question(ready({reviewStatus}));assert.equal(q.reviewOnly,true);
  assert.ok(q.publicationBlockers.includes('publication_review_pending'));
  assert.equal(answerFeedback(q,1).correct,null);
 });
}
for(const [name,extra,issue] of [
 ['missing original explanation',{originalExplanation:undefined},'original_english_explanation_missing'],
 ['mixed explanation',{originalExplanation:'English وعربي'},'original_english_explanation_missing'],
 ['generic teaching is not original',{originalExplanation:null,reasoningEn:'Fictional teaching'},'original_english_explanation_missing'],
 ['placeholder explanation',{originalExplanation:'N/A'},'original_english_explanation_missing'],
 ['explicit publication block',{publishable:false},'publication_blocked'],
 ['malformed publication permission',{publishable:'true'},'publication_blocked'],
 ['outstanding blockers',{blockers:['source review required']},'unresolved_source_blockers'],
 ['malformed blockers',{blockers:{}},'unresolved_source_blockers'],
 ['missing source',{sourceRefs:[]},'source_reference_missing'],
 ['placeholder source',{sourceRefs:[{sourceName:'Unknown'}]},'source_reference_missing'],
 ['missing reviewed key',{verifiedAnswer:null},'verified_answer_missing'],
 ['conflicting reviewed key',{verifiedAnswer:'A'},'verified_answer_conflict'],
 ['unverified sources',{verification:{guideline:'not_checked',referenceNotes:'Fictional notes'}},'verification_evidence_missing'],
 ['missing verification notes',{verification:{guideline:'supports'}},'verification_evidence_missing'],
 ['conflicting evidence',{verification:{guideline:'supports',nelson:'conflicts',referenceNotes:'Fictional conflict'}},'verification_conflict'],
])test('ready flag cannot bypass '+name,()=>{
 const q=question(ready(extra));assert.equal(q.reviewOnly,true);assert.ok(q.publicationBlockers.includes(issue));
 assert.equal(answerFeedback(q,1).correct,null);
});
test('existing image, layout, and duplicate gates cannot be bypassed by readiness metadata',()=>{
 for(const extra of [{imageRequired:true},{options:[{key:'A',text:'Only choice'}]},{duplicateOf:'absent'},
  {options:[{key:'A',text:'Same choice'},{key:'B',text:'Same choice'}]}])assert.equal(question(ready(extra)).reviewOnly,true);
});
test('catalog separates ready and pending counts without losing records or changing inputs',()=>{
 const rows=[ready(),under(),under({id:'second-pending',module:'Ready module'})],original=JSON.stringify(rows),b=createBank(rows),c=b.catalog();
 assert.equal(JSON.stringify(rows),original);assert.equal(c.summary.questionCount,3);assert.equal(c.summary.practiceCount,1);assert.equal(c.summary.reviewOnlyCount,2);
 assert.deepEqual(c.modules.find(m=>m.name==='Ready module'),{name:'Ready module',count:2,readyCount:1,reviewOnlyCount:1});
 assert.equal(c.items.filter(q=>q.reviewOnly).length,2);assert.equal(c.summary.publicationBlockerCounts.publication_review_pending,2);
});
test('no-ready catalog is explicit and never silently approves pending items',()=>{
 const b=createBank([under()]);assert.equal(b.summary.practiceCount,0);assert.equal(b.summary.reviewOnlyCount,1);
 assert.equal(answerFeedback(b.get('pending-fixture'),null).correct,null);
});
test('readiness notices do not leak keys, explanations or clinical teaching before reveal',()=>{
 const raw=under({originalExplanation:'Never expose fictional hidden explanation before answer.'}),q=question(raw),before=beforeAnswer(q);
 assert.doesNotMatch(JSON.stringify(before),/Never expose|verifiedAnswer|sourceKey|referenceNotes/);
 assert.equal(answerFeedback(q,null).explanation,raw.originalExplanation);assert.equal(answerFeedback(q,null).sourceKey,'B');
});
test('current repository keeps every canonical question and alias, never scores a blocked record',()=>{
 const b=loadRepositoryBank();assert.equal(b.summary.practiceCount+b.summary.reviewOnlyCount,b.summary.questionCount);
 for(const q of b.questions)if(q.publicationBlockers.length)assert.equal(q.reviewOnly,true);
 for(const [alias,id] of b.aliases)assert.equal(b.get(alias).id,id);
 assert.equal(b.summary.fileErrors,0);assert.equal(b.summary.skippedRecords,0);
});

const ORIGIN='https://study.example.test',TOKEN='fictional-readiness-user-token';
async function httpFixture(t){
 const app=createStudyApp({env:{RENDER_EXTERNAL_URL:ORIGIN,PEDIAROUNDS_EXTERNAL_BACKEND:'enabled',PEDIAROUNDS_SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',PEDIAROUNDS_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'},
  bank:createBank([ready(),under()]),fetcher:async(url,options)=>new Response(JSON.stringify({id:'00000000-0000-4000-8000-000000000001',role:'authenticated',email:'fixture@example.test',email_confirmed_at:'2026-01-01T00:00:00Z'}),{status:options.headers.Authorization==='Bearer '+TOKEN?200:401})});
 const server=createServer(async(req,res)=>{if(await app.handle(req,res,new URL(req.url,'http://localhost').pathname))return;res.writeHead(404);res.end();});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
 return (url,{anonymous=false,body}={})=>fetch('http://127.0.0.1:'+server.address().port+url,{method:body?'POST':'GET',headers:{...(anonymous?{}:{Cookie:ACCESS+'='+TOKEN}),...(body?{Origin:ORIGIN,'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
}
test('server rejects pending content in a default or explicit ready request',async t=>{
 const request=await httpFixture(t);
 for(const mode of ['', '&mode=practice']){const r=await request('/api/study/question?id=pending-fixture'+mode);assert.equal(r.status,409);assert.equal((await r.json()).error,'question_under_review');}
});
test('explicit review mode reveals only unscored pending content after authentication',async t=>{
 const request=await httpFixture(t),r=await request('/api/study/question?id=pending-fixture&mode=review');assert.equal(r.status,200);
 assert.equal((await r.json()).reviewOnly,true);
 const a=await request('/api/study/answer',{body:{id:'pending-fixture',selectedIndex:1}});assert.equal((await a.json()).correct,null);
 assert.equal((await request('/api/study/question?id=pending-fixture&mode=review',{anonymous:true})).status,401);
});
test('ready requests remain usable and invalid or cross-list requests are rejected',async t=>{
 const request=await httpFixture(t);assert.equal((await request('/api/study/question?id=ready-fixture')).status,200);
 const cross=await request('/api/study/question?id=ready-fixture&mode=review');assert.equal(cross.status,409);assert.equal((await cross.json()).error,'question_not_under_review');
 assert.equal((await request('/api/study/question?id=ready-fixture&mode=unknown')).status,400);
});

// Execute the actual client, with a tiny DOM and in-memory fixture transport only.
const clientSource=readFileSync(new URL('./study-client.mjs',import.meta.url),'utf8').replace(/^import[^\n]*\n/,'').replace(/void initialize\(\);\s*$/,'');
class Element{
 constructor(){this.children=[];this.events=new Map();this.value='';this.hidden=false;this.disabled=false;this.dataset={};this.textContent='';}
 addEventListener(type,fn){this.events.set(type,fn);}replaceChildren(...nodes){this.children=nodes;}append(...nodes){this.children.push(...nodes);}get options(){return this.children;}querySelectorAll(){return [];}
}
function client({items=[{id:'ready',module:'Ready',reviewOnly:false},{id:'pending',module:'Pending',reviewOnly:true}],saved=null,done=[]}={}){
 const nodes=new Map(),requests=[],responses=new Map();let revision=1;
 const get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
 const data=()=>({items,modules:[...new Set(items.map(q=>q.module))].map(name=>({name,count:items.filter(q=>q.module===name).length})),summary:{questionCount:items.length,practiceCount:items.filter(q=>!q.reviewOnly).length,originalEnglishCount:0,missingOriginalEnglishCount:items.length}});
 const respond=(data,status=200)=>new Response(JSON.stringify(data),{status});
 const ctx=vm.createContext({console,Response,URL,AbortController,setTimeout,clearTimeout,setInterval:()=>0,crypto:{getRandomValues:a=>{a[0]=0xffffffff;return a;}},
  createEnglishReader:()=>({supported:false,stop(){},speak(){}}),canReadEnglish:()=>false,englishVoices:()=>[],location:{hash:''},
  document:{getElementById:get,createElement:()=>new Element(),addEventListener(){}},window:{addEventListener(){}},
  fetch:async(url,options)=>{requests.push({url,options});const action=url.slice('/api/study/'.length);
   if(action==='session')return respond({user:{id:'fictional-user'}});
   if(action==='catalog')return respond(data());
   if(action==='progress')return respond({done,seen:[]});
   if(action==='checkpoint')return respond({revision:++revision,state:options.method==='GET'?saved:null});
   if(action.startsWith('question?')){const id=new URL(url,'https://fixture.test').searchParams.get('id');if(responses.has(id))return responses.get(id)();const item=items.find(q=>q.id===id);return respond({...item,text:'Fictional question '+id,options:[],notice:'Fixture only'});}
   throw Error('Unexpected fixture request '+action);
  }});
 vm.runInContext(clientSource,ctx,{filename:'study-client.mjs'});
 return {run:code=>vm.runInContext(code,ctx),get,requests,items,responses};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('fresh sign-in with no ready questions stays in ready mode and downloads no question',async()=>{
 const f=client({items:[{id:'pending',module:'Pending',reviewOnly:true}]});await f.run('initialize()');
 assert.equal(f.get('mode').value,'practice');assert.equal(f.get('empty').hidden,false);assert.equal(f.get('open-review').hidden,false);
 assert.match(f.get('empty-title').textContent,/No ready/);assert.equal(f.requests.some(r=>r.url.includes('/question?')),false);
 assert.equal(f.get('ready-option').textContent,'Ready questions (0)');assert.equal(f.get('next').disabled,true);assert.equal(f.get('previous').disabled,true);
});
test('explicit review control opens pending items, including historically correct ones, without rewriting history',async()=>{
 const done=[{questionId:'pending',correct:true}],snapshot=JSON.stringify(done),f=client({items:[{id:'pending',module:'Pending',reviewOnly:true}],done});
 await f.run('initialize()');f.get('open-review').events.get('click')();await settle();await settle();
 assert.equal(f.get('mode').value,'review');assert.equal(f.run('currentQuestion.id'),'pending');assert.match(f.requests.find(r=>r.url.includes('/question?')).url,/mode=review/);
 assert.match(f.get('progress-count').textContent,/Not scored/);assert.equal(JSON.stringify(done),snapshot);
 assert.equal(f.requests.some(r=>r.url.endsWith('/progress')&&r.options.method==='POST'),false);
});
test('module choices and counts match the selected list only',async()=>{
 const f=client();await f.run('initialize()');assert.deepEqual(f.get('module').options.map(o=>o.value),['','Ready']);
 assert.equal(f.get('ready-option').textContent,'Ready questions (1)');
 f.get('mode').value='review';f.run('updateSetControls()');assert.deepEqual(f.get('module').options.map(o=>o.value),['','Pending']);
 assert.match(f.get('review-option').textContent,/Under review \(1\)/);
});
test('saved practice position and retry queue cannot reintroduce pending questions',async()=>{
 const f=client({saved:{schema:'render-study-v1',mode:'practice',questionId:'pending',reviewQueue:[{id:'pending',after:0}]}});await f.run('initialize()');
 assert.equal(f.run('currentQuestion.id'),'ready');assert.equal(f.requests.some(r=>r.url.includes('id=pending')),false);assert.equal(f.run('reviews.length'),0);
});
test('only an explicitly saved review session restores the under-review mode',async()=>{
 const f=client({saved:{schema:'render-study-v1',mode:'review',questionId:'pending'}});await f.run('initialize()');assert.equal(f.get('mode').value,'review');assert.equal(f.run('currentQuestion.id'),'pending');
});
test('Next and Previous cannot cross the current publication boundary through old history',async()=>{
 const f=client();await f.run('initialize()');f.run("history=[{id:'pending'},{id:'ready'}];position=1;atEnd=false;updateCounters();");
 assert.equal(f.get('previous').disabled,true);const n=f.requests.length;f.get('previous').events.get('click')();await settle();assert.equal(f.requests.length,n);
 f.run("history.push({id:'pending'});cursor=pool.length;");await f.run('next()');assert.equal(f.run('atEnd'),true);assert.equal(f.run('previousPosition()'),1);
});
test('status changes during an active session do not trap Next retrying blocked content',async()=>{
 const f=client({items:[{id:'one',module:'Ready',reviewOnly:false},{id:'two',module:'Ready',reviewOnly:false}]});await f.run('initialize()');
 const id=f.run('currentQuestion.id');f.items.find(q=>q.id===id).reviewOnly=true;
 f.responses.set(id,()=>new Response(JSON.stringify({error:'question_under_review'}),{status:409}));
 await f.run('display()');assert.equal(f.run('currentQuestion'),null);assert.equal(f.run('history[position].unavailable'),true);
 assert.equal(f.get('submit').disabled,true);await f.run('next()');assert.notEqual(f.run('currentQuestion.id'),id);
});
