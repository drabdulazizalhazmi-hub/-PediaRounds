import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';

// Execute the shipped browser script with a small DOM and fictional transport.
// No production identity, cookies, account rows or database credentials are used.
const source=readFileSync(new URL('./study-client.mjs',import.meta.url),'utf8');
const response=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};}
function client(fetcher=async()=>response({})){
 const elements=new Map(),events=new Map();
 const element=()=>({hidden:false,disabled:false,value:'',textContent:'',dataset:{},children:[],listeners:new Map(),
  addEventListener(name,fn){this.listeners.set(name,fn);},replaceChildren(...children){this.children=children;},append(...children){this.children.push(...children);},get options(){return this.children;},querySelectorAll(){return [];},reportValidity(){return true;}});
 const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
 get('mode').value='practice';
 const context={console,AbortController,setTimeout,clearTimeout,setInterval:()=>0,crypto:webcrypto,URL,Uint32Array,
  fetch:fetcher,location:{hash:''},document:{getElementById:get,createElement:element,addEventListener(){}},
  window:{addEventListener(name,fn){events.set(name,fn);}}};
 runInNewContext(source.replace(/void initialize\(\);\s*$/,'')+`\n;globalThis.testClient={api,persist,savePosition,display,next,clearWorkspace,
  retry:()=>typeof retrySaving==='function'?retrySaving():persist(),
  seed(){user={id:'fictional-user'};history=[{id:'q1',reply:null,selected:null,saved:false}];position=0;currentQuestion={id:'q1',text:'Old question',options:[]};catalog={summary:{questionCount:2},items:[]};},
  enqueue(id,correct){pendingSaves.set(id,correct);},
  move(id){history.push({id,reply:null,selected:null,saved:false});position=history.length-1;},
  snapshot(){return {pending:[...pendingSaves],pendingCheckpoint,checkpointRevision,checkpointBlocked,currentQuestion,position,progress};}
 };`,context);
 context.testClient.seed();return {c:context.testClient,get,events};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('progress retry joins one in-flight request instead of duplicating writes',async()=>{
 const gate=deferred();let calls=0;
 const {c}=client(async()=>{calls++;return gate.promise;});c.enqueue('q1',true);
 const first=c.persist(),second=c.persist();await tick();const active=calls;
 gate.resolve(response({done:[{questionId:'q1',correct:true}],seen:['q1']}));await Promise.all([first,second]);
 assert.equal(active,1);assert.equal(c.snapshot().pending.length,0);
});
test('new answers queued during a save are drained serially',async()=>{
 const gate=deferred(),batches=[];
 const {c}=client(async(_url,options)=>{const rows=JSON.parse(options.body).completed;batches.push(rows);if(batches.length===1)return gate.promise;return response({done:rows,seen:rows.map(r=>r.questionId)});});
 c.enqueue('q1',false);const saving=c.persist();await tick();c.enqueue('q1',true);c.enqueue('q2',true);
 gate.resolve(response({done:[{questionId:'q1',correct:false}],seen:['q1']}));await saving;
 assert.equal(batches.length,2);assert.equal(batches[1].find(r=>r.questionId==='q1').correct,true);assert.equal(c.snapshot().pending.length,0);
});
test('failed answer saving remains retryable without claiming success',async()=>{
 let fail=true;const {c,get}=client(async()=>fail?response({error:'backend_unavailable'},503):response({done:[{questionId:'q1',correct:true}],seen:['q1']}));
 c.enqueue('q1',true);await c.persist();assert.equal(c.snapshot().pending.length,1);assert.equal(get('retry-save').hidden,false);
 fail=false;await c.persist();assert.equal(c.snapshot().pending.length,0);assert.equal(get('retry-save').hidden,true);
});
test('checkpoint failure keeps the unsaved position and exposes retry',async()=>{
 const {c,get}=client(async()=>response({error:'backend_unavailable'},503));await c.savePosition();
 assert.equal(c.snapshot().pendingCheckpoint?.questionId,'q1');assert.equal(get('retry-save').hidden,false);
});
test('a newer checkpoint survives failure of an older in-flight save',async()=>{
 const gate=deferred();const {c}=client(async()=>gate.promise);
 const saving=c.savePosition();await tick();c.move('q2');await c.savePosition();gate.resolve(response({error:'backend_unavailable'},503));await saving;
 assert.equal(c.snapshot().pendingCheckpoint?.questionId,'q2');
});
test('retry saves a retained checkpoint even when there are no pending answers',async()=>{
 let fail=true,calls=0;const {c,get}=client(async()=>{calls++;return fail?response({error:'backend_unavailable'},503):response({revision:1});});
 await c.savePosition();fail=false;await c.retry();assert.equal(calls,2);assert.equal(c.snapshot().checkpointRevision,1);assert.equal(c.snapshot().pendingCheckpoint,null);assert.equal(get('retry-save').hidden,true);
});
test('revision conflicts are not automatically overwritten',async()=>{
 let calls=0;const {c,get}=client(async()=>{calls++;return response({error:'checkpoint_conflict'},409);});
 await c.savePosition();await c.retry();assert.equal(calls,1);assert.equal(c.snapshot().checkpointBlocked,true);assert.equal(get('reload-position').hidden,false);
});
test('an unauthorized old request cannot refresh or replay after workspace changes',async()=>{
 const gate=deferred(),calls=[];const {c}=client(async url=>{calls.push(url);return calls.length===1?gate.promise:response({});});
 const request=c.api('progress','POST',{}).then(()=>null,e=>e);c.clearWorkspace();gate.resolve(response({error:'sign_in_required'},401));await request;
 assert.equal(calls.length,1);
});
test('workspace changes during refresh prevent replay of the previous request',async()=>{
 const gate=deferred(),calls=[];const {c}=client(async url=>{calls.push(url);if(calls.length===1)return response({error:'sign_in_required'},401);return calls.length===2?gate.promise:response({});});
 const request=c.api('progress','POST',{}).then(()=>null,e=>e);await tick();c.clearWorkspace();gate.resolve(response({}));await request;
 assert.equal(calls.length,2);
});
test('failed question loading clears stale content and does not checkpoint the failed item',async()=>{
 const calls=[];const {c,get}=client(async url=>{calls.push(url);return response({error:'study_unavailable'},503);});
 await c.display();await tick();assert.equal(c.snapshot().currentQuestion,null);assert.equal(get('submit').disabled,true);assert.equal(calls.length,1);
});
test('Next retries a failed question rather than silently skipping it',async()=>{
 let failing=true;const ids=[];const {c}=client(async url=>{
  if(url.includes('/question?')){ids.push(url);return failing?response({error:'study_unavailable'},503):response({id:'q1',text:'Loaded',module:'Test',options:[],notice:'',reviewOnly:false});}
  return response({revision:1});
 });await c.display();failing=false;await c.next();await tick();assert.equal(ids.length,2);assert.equal(ids[0],ids[1]);assert.equal(c.snapshot().currentQuestion?.text,'Loaded');
});
test('offline progress prevents an unnoticed page close',()=>{
 const {c,events}=client();let prevented=false;const event={preventDefault(){prevented=true;},returnValue:undefined};
 c.enqueue('q1',true);events.get('beforeunload')?.(event);assert.equal(prevented,true);assert.equal(event.returnValue,'');
});
