const $=id=>document.getElementById(id);
const IDLE=600000;
let user=null,epoch=0,catalog=null,progress={done:[],seen:[]},checkpointRevision=0,checkpointBlocked=false;
let history=[],position=-1,pool=[],cursor=0,freshCount=0,reviews=[],currentQuestion=null,loading=false;
let lastActivity=Date.now(),lastRefresh=Date.now(),refreshPromise=null,checkpointTask=null,pendingCheckpoint=null;
const pendingSaves=new Map(),controllers=new Set();
const messages={sign_in_required:'Please sign in.',authentication_failed:'Sign-in was not accepted. Check your email/password and email confirmation.',email_confirmation_required:'Confirm your email, then return here and sign in.',invalid_signup:'Enter a valid email and a password of at least 10 characters.',invalid_credentials:'Enter your email and password.',external_backend_not_configured:'The external authentication service is not configured.',auth_unavailable:'The sign-in service is unavailable. Please retry.',rate_limited:'Too many requests. Please wait a minute and retry.',same_origin_required:'This request was blocked. Open this page directly and retry.',checkpoint_conflict:'Another session saved a newer position. Reload the saved position before continuing to save.',backend_unavailable:'Account storage is unavailable. Your progress has not been confirmed as saved.'};
const notice=text=>{$('status').textContent=text;};
function errorMessage(e){return messages[e.code]||'The request could not be completed. Check the connection and retry.';}
async function raw(action,method='GET',body){
 const controller=new AbortController();controllers.add(controller);const timer=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch('/api/study/'+action,{method,credentials:'same-origin',signal:controller.signal,headers:{Accept:'application/json',...(method==='POST'?{'Content-Type':'application/json'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  let data;try{data=await response.json();}catch{throw Object.assign(Error('invalid_response'),{code:'invalid_response'});}
  if(!response.ok)throw Object.assign(Error(data.error||'request_failed'),{code:data.error,status:response.status});return data;
 }finally{clearTimeout(timer);controllers.delete(controller);}
}
async function refresh(){
 if(!refreshPromise)refreshPromise=raw('refresh','POST',{}).then(data=>{lastRefresh=Date.now();return data;}).finally(()=>{refreshPromise=null;});
 return refreshPromise;
}
async function api(action,method='GET',body){
 try{return await raw(action,method,body);}catch(e){
  if(e.status!==401||['signin','signup','refresh','signout'].includes(action))throw e;
  await refresh();return raw(action,method,body);
 }
}
function stopReading(){globalThis.speechSynthesis?.cancel();}
function clearWorkspace(){
 epoch++;for(const c of controllers)c.abort();controllers.clear();stopReading();user=null;catalog=null;progress={done:[],seen:[]};history=[];reviews=[];pool=[];position=-1;currentQuestion=null;loading=false;pendingSaves.clear();pendingCheckpoint=null;checkpointTask=null;checkpointBlocked=false;checkpointRevision=0;
 $('workspace').hidden=true;$('logout').hidden=true;$('login').hidden=false;
 for(const id of ['stem','explanation','source-key','result','validation-note','coverage','progress-count','save-status'])$(id).textContent='';
 $('options').replaceChildren();$('references').replaceChildren();$('password').value='';$('retry-save').hidden=true;$('reload-position').hidden=true;
}
async function signOut(message='Signed out.'){
 try{await refreshPromise;}catch{}clearWorkspace();
 try{await raw('signout','POST',{});}catch{}notice(message);
}
function correctIDs(){
 const ids=new Set((progress.done||[]).filter(r=>r.correct===true).map(r=>r.questionId));
 for(const [id,correct] of pendingSaves)if(correct===true)ids.add(id);
 return ids;
}
function filtered(){const module=$('module').value,review=$('mode').value==='review';return (catalog?.items||[]).filter(q=>(!module||q.module===module)&&q.reviewOnly===review);}
function shuffle(a){for(let i=a.length-1;i>0;i--){const n=new Uint32Array(1);crypto.getRandomValues(n);const j=n[0]%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function updateCounters(){
 const done=correctIDs(),items=filtered(),current=items.findIndex(q=>q.id===history[position]?.id)+1;
 // The set index is stable; revisiting a wrong answer must not exceed the bank total.
 $('counter').textContent='Question '+current+' / '+items.length+' in this set · Session item '+Math.max(0,position+1);
 $('progress-count').textContent=items.filter(q=>!done.has(q.id)).length+' not yet correct · '+(catalog?.summary.questionCount||0)+' repository records';
 $('previous').disabled=loading||position<=0;$('next').disabled=loading;
}
function lock(value){loading=value;for(const id of ['submit','module','mode','restart'])$(id).disabled=value;updateCounters();}
async function savePosition(){
 if(!user||position<0||checkpointBlocked)return;
 pendingCheckpoint={schema:'render-study-v1',module:$('module').value,mode:$('mode').value,questionId:history[position].id,freshCount,reviewQueue:reviews.slice(0,40)};
 if(checkpointTask)return;
 const task=Symbol('checkpoint'),ownEpoch=epoch;checkpointTask=task;
 try{while(pendingCheckpoint&&ownEpoch===epoch&&checkpointTask===task&&!checkpointBlocked){const state=pendingCheckpoint;pendingCheckpoint=null;
  try{const saved=await api('checkpoint','POST',{expectedRevision:checkpointRevision,state});if(ownEpoch!==epoch||checkpointTask!==task)return;checkpointRevision=saved.revision;}
  catch(e){if(ownEpoch!==epoch||checkpointTask!==task)return;pendingCheckpoint=null;if(e.status===409){checkpointBlocked=true;$('reload-position').hidden=false;}notice(errorMessage(e));break;}
 }}finally{if(checkpointTask===task)checkpointTask=null;}
}
function showFeedback(slot){
 const reply=slot.reply;$('feedback').hidden=!reply;if(!reply)return;
 $('result').dataset.state=reply.correct===true?'correct':reply.correct===false?'incorrect':'review';
 $('result').textContent=reply.correct===null?'Review only — not scored':reply.correct?(slot.wasWrong?'ممتاز إجابتك صحيحة لقد صححت معلومتك':'Matches the recorded source key.'):'Does not match the recorded source key.';
 $('source-key').textContent=reply.sourceKey?'Recorded source key: '+reply.sourceKey:'No definite source key is available.';
 $('validation-note').textContent=reply.notice;$('explanation').textContent=reply.explanation;
 $('read-explanation').disabled=!reply.originalExplanationAvailable||!globalThis.speechSynthesis;
 $('references').replaceChildren();for(const ref of reply.references||[]){const p=document.createElement('p');p.textContent=[ref.sourceName,ref.part,ref.page!=null?'Page '+ref.page:'',ref.questionNumber].filter(Boolean).join(' · ');$('references').append(p);}
 $('save-status').textContent=slot.saved?'Progress saved to your external account.':'Progress has not yet been confirmed as saved.';
}
async function display(){
 stopReading();const slot=history[position],ownEpoch=epoch;if(!slot)return;
 lock(true);$('question-card').hidden=true;$('empty').hidden=true;$('feedback').hidden=true;notice('Loading question…');
 try{const q=await api('question?id='+encodeURIComponent(slot.id));if(ownEpoch!==epoch)return;
  currentQuestion=q;$('category').textContent=q.module;$('stem').textContent=q.text;$('question-notice').textContent=q.notice;
  const options=$('options');options.replaceChildren();
  q.options.forEach((o,i)=>{const label=document.createElement('label');label.className='option';const input=document.createElement('input');input.type='radio';input.name='answer';input.value=String(i);input.checked=slot.selected===i;input.disabled=!!slot.reply;input.addEventListener('change',()=>{slot.selected=i;});const key=document.createElement('strong');key.textContent=o.key+'.';const text=document.createElement('span');text.textContent=o.text;label.append(input,key,text);options.append(label);});
  $('submit').textContent=q.reviewOnly?'Reveal source (not scored)':'Submit answer';$('question-card').hidden=false;showFeedback(slot);notice('');
 }catch(e){if(ownEpoch===epoch){notice(errorMessage(e));if(e.status===401)clearWorkspace();}}
 finally{if(ownEpoch===epoch&&user){lock(false);$('submit').disabled=!!slot.reply;$('read-question').disabled=!globalThis.speechSynthesis||/\p{Script=Arabic}/u.test(currentQuestion?.text||'');}}
 if(ownEpoch===epoch&&user)void savePosition();
}
async function next(){
 if(loading)return;
 if(position+1<history.length){position++;return display();}
 const done=correctIDs();reviews=reviews.filter(r=>!done.has(r.id));
 let id;const due=reviews.findIndex(r=>r.after<=freshCount);
 if(due>=0){id=reviews.splice(due,1)[0].id;}
 else{while(cursor<pool.length&&!id){const candidate=pool[cursor++];if(!done.has(candidate)){id=candidate;freshCount++;}}}
 if(!id&&reviews.length)id=reviews.shift().id;
 if(!id){$('question-card').hidden=true;$('empty').hidden=false;$('next').disabled=true;return;}
 history.push({id,selected:null,reply:null,saved:false});position=history.length-1;return display();
}
async function start(saved=null){
 stopReading();history=[];position=-1;cursor=0;freshCount=0;reviews=[];
 const done=correctIDs();pool=shuffle(filtered().filter(q=>!done.has(q.id)).map(q=>q.id));
 if(saved?.schema==='render-study-v1'){
  freshCount=Number.isSafeInteger(saved.freshCount)&&saved.freshCount>=0?saved.freshCount:0;
  reviews=Array.isArray(saved.reviewQueue)?saved.reviewQueue.filter(r=>r&&typeof r.id==='string'&&Number.isSafeInteger(r.after)&&r.after>=0&&pool.includes(r.id)&&!done.has(r.id)).slice(0,40):[];
  if(pool.includes(saved.questionId)){pool=pool.filter(id=>id!==saved.questionId);pool.unshift(saved.questionId);}
 }
 $('empty').hidden=true;await next();updateCounters();
}
async function initialize(){
 const ownEpoch=epoch;
 try{const session=await api('session');if(ownEpoch!==epoch)return;
  const [bank,stored,saved]=await Promise.all([api('catalog'),api('progress'),api('checkpoint')]);if(ownEpoch!==epoch)return;
  user=session.user;catalog=bank;progress=stored;checkpointRevision=saved.revision;checkpointBlocked=false;$('reload-position').hidden=true;lastActivity=lastRefresh=Date.now();
  $('module').replaceChildren();const all=document.createElement('option');all.value='';all.textContent='All modules';$('module').append(all);
  for(const m of bank.modules){const option=document.createElement('option');option.value=m.name;option.textContent=m.name+' ('+m.count+')';$('module').append(option);}
  const state=saved.state?.schema==='render-study-v1'?saved.state:null;
  $('module').value=bank.modules.some(m=>m.name===state?.module)?state.module:'';
  $('mode').value=state?.mode==='review'||bank.summary.practiceCount===0?'review':'practice';
  $('coverage').textContent=bank.summary.questionCount+' records from the current GitHub bank only. '+bank.summary.originalEnglishCount+' have attached original English explanation text; '+bank.summary.missingOriginalEnglishCount+' do not. This is not the complete legacy platform.';
  $('login').hidden=true;$('workspace').hidden=false;$('logout').hidden=false;await start(state);
 }catch(e){if(ownEpoch!==epoch)return;clearWorkspace();notice(e.status===401?'Sign in to begin.':errorMessage(e));}
}
async function persist(){
 if(!pendingSaves.size)return;const ownEpoch=epoch,rows=[...pendingSaves].slice(0,500).map(([questionId,correct])=>({questionId,correct}));
 try{const stored=await api('progress','POST',{completed:rows,seen:rows.map(r=>r.questionId)});if(ownEpoch!==epoch)return;
  progress=stored;for(const row of rows)if(pendingSaves.get(row.questionId)===row.correct)pendingSaves.delete(row.questionId);
  for(const slot of history)if(slot.reply&&!pendingSaves.has(slot.id))slot.saved=true;
  if(history[position]?.reply)showFeedback(history[position]);updateCounters();
 }catch(e){if(ownEpoch===epoch)notice(errorMessage(e));}finally{if(ownEpoch===epoch)$('retry-save').hidden=!pendingSaves.size;}
}
$('login-form').addEventListener('submit',async event=>{
 event.preventDefault();$('signin').disabled=$('signup').disabled=true;notice('Signing in…');
 try{await raw('signin','POST',{email:$('email').value,password:$('password').value});$('password').value='';await initialize();}catch(e){notice(errorMessage(e));}finally{$('signin').disabled=$('signup').disabled=false;}
});
$('signup').addEventListener('click',async()=>{
 if(!$('login-form').reportValidity())return;$('signin').disabled=$('signup').disabled=true;notice('Requesting account…');
 try{const result=await raw('signup','POST',{email:$('email').value,password:$('password').value});notice(result.message);$('password').value='';}catch(e){notice(errorMessage(e));}finally{$('signin').disabled=$('signup').disabled=false;}
});
$('logout').addEventListener('click',()=>void signOut());
$('submit').addEventListener('click',async()=>{
 const slot=history[position];if(loading||!slot||slot.reply)return;
 if(slot.selected===null&&!currentQuestion.reviewOnly){notice('Select an answer before submitting.');return;}
 const ownEpoch=epoch;lock(true);
 try{slot.wasWrong=(progress.done||[]).some(r=>r.questionId===slot.id&&r.correct===false);const reply=await api('answer','POST',{id:slot.id,selectedIndex:slot.selected});if(ownEpoch!==epoch)return;slot.reply=reply;
  if(reply.correct===false&&!reviews.some(r=>r.id===slot.id))reviews.push({id:slot.id,after:freshCount+3+Math.floor(Math.random()*3)});
  pendingSaves.set(slot.id,reply.correct);showFeedback(slot);$('options').querySelectorAll('input').forEach(input=>input.disabled=true);await persist();
  if(ownEpoch===epoch)void savePosition();
 }catch(e){if(ownEpoch===epoch)notice(errorMessage(e));}finally{if(ownEpoch===epoch&&user){lock(false);$('submit').disabled=!!slot.reply;}}
});
$('next').addEventListener('click',()=>void next());$('previous').addEventListener('click',()=>{if(!loading&&position>0){position--;void display();}});
for(const id of ['module','mode'])$(id).addEventListener('change',()=>void start());$('restart').addEventListener('click',()=>void start());
$('retry-save').addEventListener('click',()=>void persist());$('reload-position').addEventListener('click',()=>void initialize());
function loadVoices(){const selected=$('voice').value;const voices=globalThis.speechSynthesis?.getVoices()||[];$('voice').replaceChildren();const def=document.createElement('option');def.value='';def.textContent='System English voice';$('voice').append(def);for(const voice of voices.filter(v=>/^en(?:-|_)/i.test(v.lang))){const opt=document.createElement('option');opt.value=voice.voiceURI;opt.textContent=voice.name+' · '+voice.lang;$('voice').append(opt);}if([...$('voice').options].some(o=>o.value===selected))$('voice').value=selected;}
function read(text){if(!globalThis.speechSynthesis||!text||/\p{Script=Arabic}/u.test(text))return;stopReading();const voice=speechSynthesis.getVoices().find(v=>v.voiceURI===$('voice').value)||speechSynthesis.getVoices().find(v=>/^en[-_]/i.test(v.lang));const utterance=new SpeechSynthesisUtterance(text);utterance.lang=voice?.lang||'en-US';if(voice)utterance.voice=voice;utterance.onerror=()=>notice('Reading stopped or is unavailable on this device.');speechSynthesis.speak(utterance);}
$('read-question').addEventListener('click',()=>read(currentQuestion?.text));$('read-explanation').addEventListener('click',()=>read(history[position]?.reply?.originalExplanationAvailable?history[position].reply.explanation:''));$('stop-reading').addEventListener('click',stopReading);
globalThis.speechSynthesis?.addEventListener('voiceschanged',loadVoices);loadVoices();
for(const event of ['pointerdown','keydown','scroll'])window.addEventListener(event,()=>{lastActivity=Date.now();},{passive:true});
setInterval(()=>{if(!user)return;if(Date.now()-lastActivity>=IDLE){void signOut('Signed out after 10 minutes of inactivity.');return;}if(Date.now()-lastRefresh>240000&&Date.now()-lastActivity<60000)void refresh().catch(()=>{});},20000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&user&&Date.now()-lastActivity>=IDLE)void signOut('Session expired after inactivity.');});
// Confirmation links may contain provider tokens. Never store or echo the fragment.
if(location.hash){globalThis.history.replaceState(null,'','/study');notice('After confirming your email, sign in below.');}
void initialize();
