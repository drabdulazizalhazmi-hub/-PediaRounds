/** Actual client control flow under a small DOM fixture; not a real browser/audio engine. */
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createEnglishReader,canReadEnglish,englishVoices} from './study-reader.mjs';
const source=readFileSync(new URL('./study-client.mjs',import.meta.url),'utf8')
 .replace(/^import .* from '\.\/reader\.mjs';\n/,'').replace(/void initialize\(\);\s*$/,'');
class Element {
 constructor(tag='div'){this.tag=tag;this.value='';this.hidden=false;this.disabled=false;this.children=[];this.dataset={};this.events=new Map();this.textContent='';}
 addEventListener(type,fn){this.events.set(type,fn);}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=children;}
 get options(){return this.children;}
 querySelectorAll(tag){return this.children.flatMap(child=>[...(child.tag===tag?[child]:[]),...child.querySelectorAll(tag)]);}
 async click(){if(!this.disabled)return this.events.get('click')?.({preventDefault(){}});}
}
function fixture({ids=['q1'],questionText,failQuestion=null,failProgress=false}={}){
 const elements=new Map(),requests=[],spoken=[];let revision=0;
 const element=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
 const q=id=>({id,module:'Fixture',text:questionText||'Fictional question '+id,notice:'Fixture only',reviewOnly:false,options:[{key:'A',text:'Choice A'},{key:'B',text:'Choice B'}]});
 const reply={correct:true,sourceKey:'A',notice:'Fictional key',explanation:'Exact fictional explanation.',originalExplanationAvailable:true,references:[]};
 class Utterance{constructor(text){this.text=text;}}
 const synth={speak:u=>spoken.push(u),cancel(){spoken.at(-1)?.onerror?.({error:'interrupted'});},getVoices:()=>[],addEventListener(){}};
 const respond=(data,status=200)=>new Response(JSON.stringify(data),{status});
 const ctx=vm.createContext({console,Response,URL,AbortController,setTimeout,clearTimeout,setInterval:()=>0,crypto:{getRandomValues:a=>{a[0]=0;return a;}},SpeechSynthesisUtterance:Utterance,speechSynthesis:synth,
  createEnglishReader:options=>createEnglishReader({...options,synth,Utterance}),canReadEnglish,englishVoices:()=>englishVoices(synth),
  document:{getElementById:element,createElement:tag=>new Element(tag),addEventListener(){}},window:{addEventListener(){}},location:{hash:''},
  fetch:async(url,options)=>{requests.push({url,options});const action=url.slice('/api/study/'.length);
   if(action.startsWith('question?')){const id=new URL(url,'https://fixture.test').searchParams.get('id');return failQuestion===id?respond({error:'study_unavailable'},503):respond(q(id));}
   if(action==='checkpoint')return respond({revision:++revision,state:null});
   if(action==='answer')return respond(reply);
   if(action==='progress')return failProgress?respond({error:'backend_unavailable'},503):respond({done:JSON.parse(options.body).completed,seen:[]});
   throw Error('Unexpected fixture request: '+action);
  }
 });
 vm.runInContext(source,ctx,{filename:'study-client.mjs'});
 const run=code=>vm.runInContext(code,ctx);
 const items=ids.map(id=>({id,module:'Fixture',reviewOnly:false}));
 run(`user={id:'fictional-user'};catalog=${JSON.stringify({items,summary:{questionCount:items.length}})};$('mode').value='practice';`);
 return {run,element,requests,spoken,ctx,reply};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('single-question set retains Previous after Next reaches the end',async()=>{
 const f=fixture();await f.run('start()');await f.run('next()');assert.equal(f.element('empty').hidden,false);assert.equal(f.element('previous').disabled,false);
 await f.element('previous').click();await settle();assert.equal(f.element('stem').textContent,'Fictional question q1');assert.equal(f.element('question-card').hidden,false);assert.equal(f.run('position'),0);assert.equal(f.run('atEnd'),false);
});
test('Previous from end restores the last item, rather than skipping to the penultimate',async()=>{
 const f=fixture({ids:['q1','q2']});await f.run('start()');const first=f.element('stem').textContent;await f.run('next()');const last=f.element('stem').textContent;await f.run('next()');
 await f.element('previous').click();await settle();assert.equal(f.element('stem').textContent,last);
 await f.element('previous').click();await settle();assert.equal(f.element('stem').textContent,first);
});
test('empty initial set does not enable Next or Previous after counters update',async()=>{
 const f=fixture({ids:[]});await f.run('start()');assert.equal(f.element('previous').disabled,true);assert.equal(f.element('next').disabled,true);assert.equal(f.element('read-question').hidden,true);
});
test('failed question load clears stale read/submit state and does not save a new position',async()=>{
 const f=fixture({ids:['q1','q2'],failQuestion:'q1'});await f.run('start()');await settle();assert.equal(f.run('currentQuestion.id'),'q2');
 const saves=f.requests.filter(r=>r.url.endsWith('/checkpoint')).length;await f.run('next()');await settle();
 assert.equal(f.run('currentQuestion'),null);assert.equal(f.element('submit').disabled,true);assert.equal(f.element('read-question').hidden,true);
 await f.element('read-question').click();await f.element('submit').click();assert.equal(f.spoken.length,0);
 assert.equal(f.requests.filter(r=>r.url.endsWith('/checkpoint')).length,saves);
});
test('mixed-language source is not rewritten and has no reader control',async()=>{
 const text='English text مع شرح عربي';const f=fixture({questionText:text});await f.run('start()');
 assert.equal(f.element('stem').textContent,text);assert.equal(f.element('read-question').hidden,true);
 f.run(`history[0].reply={originalExplanationAvailable:true,explanation:${JSON.stringify(text)},references:[]};showFeedback(history[0]);`);
 assert.equal(f.element('explanation').textContent,text);assert.equal(f.element('read-explanation').hidden,true);
});
test('reader stops when reaching the end and ignores stale interruption callbacks',async()=>{
 const f=fixture();await f.run('start()');await f.element('read-question').click();assert.equal(f.spoken.length,1);const old=f.spoken[0];await f.run('next()');
 old.onerror({error:'network'});old.onend();assert.equal(f.element('status').textContent,'');assert.equal(f.spoken.length,1);assert.equal(f.element('read-question').hidden,true);
});
test('correction feedback survives a failed earlier progress save',async()=>{
 const f=fixture({failProgress:true});await f.run('start()');f.run("pendingSaves.set('q1',false);history[0].selected=0;");await f.element('submit').click();
 assert.equal(f.element('result').textContent,'ممتاز إجابتك صحيحة لقد صححت معلومتك');assert.equal(f.element('retry-save').hidden,false);assert.match(f.element('save-status').textContent,/not yet/);
 assert.equal(f.run("pendingSaves.get('q1')"),true);
});
test('logout clears content and reading cannot be restarted by an old speech event',async()=>{
 const f=fixture();await f.run('start()');await f.element('read-question').click();const old=f.spoken[0];f.run('clearWorkspace()');old.onerror({error:'network'});old.onend();
 assert.equal(f.element('stem').textContent,'');assert.equal(f.element('read-question').hidden,true);assert.equal(f.element('read-explanation').hidden,true);assert.equal(f.spoken.length,1);
});
test('an older same-session fetch cannot replace a newer question view',async()=>{
 const f=fixture({ids:['q1','q2']});let release;
 const previous=f.ctx.fetch;f.ctx.fetch=async(url,options)=>url.includes('id=q1')?new Promise(resolve=>{release=()=>resolve(new Response(JSON.stringify({id:'q1',text:'Old question',module:'Fixture',options:[]})));}):previous(url,options);
 f.run("history=[{id:'q1',selected:null,reply:null}];position=0;");const old=f.run('display()');
 f.run("history.push({id:'q2',selected:null,reply:null});position=1;");await f.run('display()');release();await old;
 assert.equal(f.element('stem').textContent,'Fictional question q2');assert.equal(f.run('currentQuestion.id'),'q2');
});
test('restarting while an old view loads does not leave the new session locked',async()=>{
 const f=fixture({ids:['q2']});let release;const previous=f.ctx.fetch;
 f.ctx.fetch=async(url,options)=>url.includes('id=q1')?new Promise(resolve=>{release=()=>resolve(new Response(JSON.stringify({id:'q1',text:'Old question',module:'Fixture',options:[]})));}):previous(url,options);
 f.run("history=[{id:'q1',selected:null,reply:null}];position=0;");const old=f.run('display()');await f.run('start()');release();await old;
 assert.equal(f.element('stem').textContent,'Fictional question q2');assert.equal(f.element('next').disabled,false);assert.equal(f.run('loading'),false);
});
test('source figures preserve their stage and clear on logout or a question change',async()=>{
 const f=fixture();await f.run('start()');
 const before={id:'question-image',url:'/api/study/image?id=question-image',width:320,height:220,phase:'question'};
 const after={id:'answer-image',url:'/api/study/image?id=answer-image&grant=fixture',width:600,height:250,phase:'explanation'};
 f.run(`renderFigures('question-figures',[${JSON.stringify(before)}]);`);
 assert.equal(f.element('question-figures').querySelectorAll('img').length,1);
 assert.equal(f.element('explanation-figures').querySelectorAll('img').length,0);
 f.run(`history[0].reply={figures:[${JSON.stringify(after)}],references:[]};showFeedback(history[0]);`);
 assert.equal(f.element('explanation-figures').querySelectorAll('img').length,1);
 const img=f.element('explanation-figures').querySelectorAll('img')[0];
 img.events.get('error')();assert.equal(f.element('explanation-figures').querySelectorAll('button')[0].hidden,false);
 f.run('clearWorkspace()');
 assert.equal(f.element('question-figures').querySelectorAll('img').length,0);
 assert.equal(f.element('explanation-figures').querySelectorAll('img').length,0);
});
