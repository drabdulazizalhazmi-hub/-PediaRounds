import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// Regression tests use fictional questions and in-memory transport only.
const source=readFileSync(new URL('./study-client.mjs',import.meta.url),'utf8');
const response=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function client({confirm=false,failSignout=false,failSaves=false}={}){
 const elements=new Map(),events=new Map(),requested=[],confirmations=[];
 const element=()=>({hidden:false,disabled:false,value:'',textContent:'',dataset:{},children:[],listeners:new Map(),
  addEventListener(name,fn){this.listeners.set(name,fn);},replaceChildren(...children){this.children=children;},append(...children){this.children.push(...children);},get options(){return this.children;},querySelectorAll(){return [];},reportValidity(){return true;}});
 const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
 get('mode').value='practice';get('empty').hidden=true;
 const context={createEnglishReader:()=>({supported:false,stop(){},speak(){}}),canReadEnglish:()=>false,englishVoices:()=>[],console,AbortController,setTimeout,clearTimeout,setInterval:()=>0,URL,Uint32Array,
  // Fixed bytes make shuffling deterministic; this is not a production random source.
  crypto:{getRandomValues(n){n[0]=0xffffffff;return n;}},
  confirm(message){confirmations.push(message);return confirm;},
  fetch:async(url,options)=>{
   requested.push(url);
   if(url.includes('/question?')){const id=new URL(url,'https://test.invalid').searchParams.get('id');return response({id,text:'Fictional '+id,module:'Test',options:[],notice:'',reviewOnly:false});}
   if(url.endsWith('/signout'))return failSignout?response({error:'auth_unavailable'},503):response({});
   if(failSaves)return response({error:'backend_unavailable'},503);
   if(url.endsWith('/checkpoint'))return response({revision:1});
   return response({done:[],seen:[]});
  },
  location:{hash:''},document:{getElementById:get,createElement:element,addEventListener(name,fn){events.set(name,fn);}},
  window:{addEventListener(name,fn){events.set(name,fn);}}};
 runInNewContext(source.replace(/^import[^\n]*\n/,'').replace(/void initialize\(\);\s*$/,'')+`\n;globalThis.testClient={start,next,signOut,savePosition,
  seed(ids=['q1']){user={id:'fictional-user'};history=[{id:ids[0],reply:null,selected:1,saved:false}];position=0;currentQuestion={id:ids[0],text:'Fictional question',options:[]};catalog={summary:{questionCount:ids.length},items:ids.map(id=>({id,module:'Test',reviewOnly:false}))};},
  enqueue(id,correct){pendingSaves.set(id,correct);},
  done(id){progress.done.push({questionId:id,correct:true});},
  snapshot(){return {user,pending:[...pendingSaves],current:currentQuestion?.id,position,reviews,pool,history};}
 };`,context);
 context.testClient.seed();return {c:context.testClient,get,events,requested,confirmations};
}

test('restored wrong-answer queue waits for the remaining fresh questions',async()=>{
 const {c}=client();c.seed(['wrong','q2','q3','q4','q5','q6']);
 await c.start({schema:'render-study-v1',freshCount:10,questionId:'wrong',reviewQueue:[{id:'wrong',after:13}]});
 assert.notEqual(c.snapshot().current,'wrong');
 await c.next();assert.notEqual(c.snapshot().current,'wrong');
 await c.next();assert.notEqual(c.snapshot().current,'wrong');
 await c.next();assert.equal(c.snapshot().current,'wrong');
});
test('restored pending review is not also a fresh-pool item',async()=>{
 const {c}=client();c.seed(['wrong','q2','q3','q4']);
 await c.start({schema:'render-study-v1',freshCount:0,questionId:'q2',reviewQueue:[{id:'wrong',after:3}]});
 assert.equal(c.snapshot().pool.includes('wrong'),false);
});
test('duplicate saved review entries do not replay the same mistake twice',async()=>{
 const {c}=client();c.seed(['wrong','q2','q3','q4','q5']);
 await c.start({schema:'render-study-v1',freshCount:0,reviewQueue:[{id:'wrong',after:4},{id:'wrong',after:4}]});
 assert.equal(c.snapshot().reviews.filter(r=>r.id==='wrong').length,1);
});
test('correctly answered IDs stay excluded when restoring reviews',async()=>{
 const {c}=client();c.seed(['wrong','correct','q2','q3']);c.done('correct');
 await c.start({schema:'render-study-v1',freshCount:0,reviewQueue:[{id:'correct',after:3},{id:'wrong',after:3}]});
 assert.equal(c.snapshot().reviews.some(r=>r.id==='correct'),false);assert.equal(c.snapshot().pool.includes('correct'),false);
});
test('queued reviews remain reachable when no fresh questions remain',async()=>{
 const {c}=client();c.seed(['wrong']);
 await c.start({schema:'render-study-v1',freshCount:0,reviewQueue:[{id:'wrong',after:5}]});
 assert.equal(c.snapshot().current,'wrong');
});
test('Previous returns to the last skipped question from the end screen',async()=>{
 const {c,get}=client();await c.next();assert.equal(get('empty').hidden,false);assert.equal(get('previous').disabled,false);
 await get('previous').listeners.get('click')();await tick();
 assert.equal(c.snapshot().position,0);assert.equal(c.snapshot().current,'q1');assert.equal(get('question-card').hidden,false);
 assert.equal(c.snapshot().history[0].selected,1);
});
test('no available questions leaves Next disabled',async()=>{
 const {c,get}=client();c.done('q1');await c.start();assert.equal(get('next').disabled,true);assert.equal(get('previous').disabled,true);
});
test('manual sign-out cancellation preserves unsaved answers and the session',async()=>{
 const {c,requested,confirmations}=client();c.enqueue('q1',true);await c.signOut();
 assert.equal(confirmations.length,1);assert.equal(c.snapshot().pending.length,1);assert.ok(c.snapshot().user);assert.equal(requested.some(u=>u.endsWith('/signout')),false);
});
test('manual sign-out warns about an unsaved checkpoint without pending answers',async()=>{
 const {c,confirmations}=client({failSaves:true});await c.savePosition();await c.signOut();
 assert.equal(confirmations.length,1);assert.ok(c.snapshot().user);
});
test('explicitly confirmed sign-out clears local unsaved data',async()=>{
 const {c,requested}=client({confirm:true});c.enqueue('q1',true);await c.signOut();
 assert.equal(c.snapshot().pending.length,0);assert.equal(c.snapshot().user,null);assert.equal(requested.some(u=>u.endsWith('/signout')),true);
});
test('automatic idle sign-out is never blocked by a save confirmation',async()=>{
 const {c,confirmations}=client();c.enqueue('q1',true);await c.signOut('Session expired.',{automatic:true});
 assert.equal(confirmations.length,0);assert.equal(c.snapshot().user,null);
});
test('failed remote sign-out does not claim it was confirmed',async()=>{
 const {c,get}=client({failSignout:true});await c.signOut();
 assert.equal(c.snapshot().user,null);assert.match(get('status').textContent,/could not be confirmed/i);
});
