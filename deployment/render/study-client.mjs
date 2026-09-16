import {createEnglishReader,canReadEnglish,englishVoices} from './reader.mjs';
const $=id=>document.getElementById(id);
const IDLE=600000;
const REVIEW_OUTBOX='pediarounds-review-outbox-v2:';
let user=null,epoch=0,catalog=null,progress={done:[],seen:[],dailyProgress:[]},checkpointRevision=0,checkpointBlocked=false;
let history=[],position=-1,pool=[],cursor=0,freshCount=0,reviews=[],currentQuestion=null,loading=false,atEnd=false,viewVersion=0,signingOut=false,dailyProgressOpen=false;
let lastActivity=Date.now(),lastRefresh=Date.now(),refreshPromise=null,checkpointTask=null,pendingCheckpoint=null,persistTask=null,checkpointFailed=false;
let currentRiyadhDay=new Date(Date.now()+10800000).toISOString().slice(0,10);
const pendingSaves=new Map(),pendingReviewEvents=new Map(),controllers=new Set();
const messages={sign_in_required:'Please sign in.',authentication_failed:'Sign-in was not accepted. Check your email/password and email confirmation.',email_confirmation_required:'Confirm your email, then return here and sign in.',invalid_signup:'Enter a valid email and a password of at least 10 characters.',invalid_credentials:'Enter your email and password.',external_backend_not_configured:'The external authentication service is not configured.',auth_unavailable:'The sign-in service is unavailable. Please retry.',rate_limited:'Too many requests. Please wait a minute and retry.',same_origin_required:'This request was blocked. Open this page directly and retry.',session_changed:'The signed-in account changed in another tab. Return to this account or reload before saving.',checkpoint_conflict:'Another session saved a newer position. Reload the saved position before continuing to save.',backend_unavailable:'Account storage is unavailable. Your progress has not been confirmed as saved.'};
const notice=text=>{$('status').textContent=text;};
function errorMessage(e){return messages[e.code]||'The request could not be completed. Check the connection and retry.';}
function riyadhDay(reviewedAt){return new Date(Date.parse(reviewedAt)+10800000).toISOString().slice(0,10);}
function outboxPrefix(userId){return REVIEW_OUTBOX+userId+':';}
function reviewEventKey(event){return riyadhDay(event.reviewedAt)+'\u0000'+event.questionId+'\u0000'+event.reviewedAt+'\u0000'+String(event.correct);}
function storedEventKey(userId,key){return outboxPrefix(userId)+encodeURIComponent(key);}
function eventJSON(event){return JSON.stringify({questionId:event.questionId,correct:event.correct,reviewedAt:event.reviewedAt});}
function storeReviewEvent(key,event){try{if(user?.id)globalThis.localStorage?.setItem(storedEventKey(user.id,key),eventJSON(event));}catch{}}
function removeStoredReviewEvent(userId,key){try{globalThis.localStorage?.removeItem(storedEventKey(userId,key));}catch{}}
function discardReviewOutbox(userId){
 try{const storage=globalThis.localStorage,prefix=outboxPrefix(userId),keys=[];for(let i=0;i<(storage?.length||0);i++){const key=storage.key(i);if(key?.startsWith(prefix))keys.push(key);}for(const key of keys)storage.removeItem(key);}catch{}
}
function restoreReviewOutbox(){
 if(!user?.id)return;
 let storage;try{storage=globalThis.localStorage;}catch{return;}
 const prefix=outboxPrefix(user.id);let restored=0;
 try{
 for(let index=0;index<(storage?.length||0)&&restored<5000;index++){
  const storageKey=storage.key(index);if(!storageKey?.startsWith(prefix))continue;
  let event;try{event=JSON.parse(storage.getItem(storageKey));}catch{storage.removeItem(storageKey);index--;continue;}
  if(!event||typeof event.questionId!=='string'||event.questionId.length<1||event.questionId.length>200||/[\p{Cc}]/u.test(event.questionId)||
     !(event.correct===null||typeof event.correct==='boolean')||typeof event.reviewedAt!=='string'||
     !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(event.reviewedAt)||!Number.isFinite(Date.parse(event.reviewedAt))||new Date(event.reviewedAt).toISOString()!==event.reviewedAt){storage.removeItem(storageKey);index--;continue;}
  const restoredEvent={questionId:event.questionId,correct:event.correct,reviewedAt:event.reviewedAt},key=reviewEventKey(restoredEvent);
  if(storageKey!==storedEventKey(user.id,key)){storage.removeItem(storageKey);index--;continue;}
  pendingReviewEvents.set(key,restoredEvent);
  restored++;
 }
 for(const event of [...pendingReviewEvents.values()].sort((a,b)=>a.reviewedAt.localeCompare(b.reviewedAt)))pendingSaves.set(event.questionId,event.correct);
 }catch{}
}
function queueReviewedQuestion(questionId,correct,reviewedAt=new Date().toISOString()){
 const event={questionId,correct,reviewedAt},key=reviewEventKey(event);pendingSaves.set(questionId,correct);pendingReviewEvents.set(key,event);storeReviewEvent(key,event);
}
async function raw(action,method='GET',body){
 const controller=new AbortController();controllers.add(controller);const timer=setTimeout(()=>controller.abort(),15000);
 try{
  const accountBound=['progress','checkpoint'].includes(action)&&user?.id?{'X-PediaRounds-User-ID':user.id}:{};
  const response=await fetch('/api/study/'+action,{method,credentials:'same-origin',signal:controller.signal,headers:{Accept:'application/json',...accountBound,...(method==='POST'?{'Content-Type':'application/json'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  let data;try{data=await response.json();}catch{throw Object.assign(Error('invalid_response'),{code:'invalid_response'});}
  if(!response.ok)throw Object.assign(Error(data.error||'request_failed'),{code:data.error,status:response.status});return data;
 }finally{clearTimeout(timer);controllers.delete(controller);}
}
async function refresh(){
 if(!refreshPromise)refreshPromise=raw('refresh','POST',{}).then(data=>{lastRefresh=Date.now();return data;}).finally(()=>{refreshPromise=null;});
 return refreshPromise;
}
async function api(action,method='GET',body){
 const ownEpoch=epoch;
 try{return await raw(action,method,body);}catch(e){
  if(ownEpoch!==epoch||e.status!==401||['signin','signup','refresh','signout'].includes(action))throw e;
  await refresh();if(ownEpoch!==epoch)throw e;return raw(action,method,body);
 }
}
const reader=createEnglishReader({onError:code=>{
 if(!user)return;
 notice(code==='not-allowed'?'Tap Read again to allow audio on this device.':'Reading stopped. Tap Read to try again, or choose another English voice.');
}});
function stopReading(){reader.stop();}
function renderFigures(containerID,figures=[]){
 const container=$(containerID);container.replaceChildren();
 for(const f of figures){
  if(!f||typeof f.url!=='string'||!f.url.startsWith('/api/study/image?'))continue;
  const figure=document.createElement('figure');figure.className='source-figure';
  const link=document.createElement('a');link.href=f.url;link.target='_blank';link.rel='noopener noreferrer';link.title='Open source figure at full size';
  const img=document.createElement('img');img.alt=f.alt||'Source figure';img.width=f.width;img.height=f.height;img.decoding='async';img.src=f.url;
  const caption=document.createElement('figcaption');caption.textContent=(f.caption||'Source figure')+' · Tap to enlarge';
  const retry=document.createElement('button');retry.type='button';retry.className='secondary compact';retry.textContent='Retry image';retry.hidden=true;
  img.addEventListener('error',()=>{caption.textContent='Image could not load. Check your connection and retry.';retry.hidden=false;});
  img.addEventListener('load',()=>{caption.textContent=(f.caption||'Source figure')+' · Tap to enlarge';retry.hidden=true;});
  retry.addEventListener('click',async()=>{
   const ownEpoch=epoch,ownView=viewVersion,slot=history[position];if(!user||!slot)return;retry.disabled=true;
   try{
    if(f.phase==='explanation'&&slot.reply){
     const refreshed=await api('answer','POST',{id:slot.id,selectedIndex:slot.selected});
     if(ownEpoch!==epoch||ownView!==viewVersion)return;
     slot.reply={...slot.reply,figures:refreshed.figures||[]};showFeedback(slot);
    }else{img.src=f.url;}
   }catch(e){if(ownEpoch===epoch&&ownView===viewVersion)notice(errorMessage(e));}
   finally{retry.disabled=false;}
  });
  link.append(img);figure.append(link,caption,retry);container.append(figure);
 }
 container.hidden=!container.children.length;
}
function updateReadControls(){
 const reply=history[position]?.reply;
 for(const [id,text] of [['read-question',currentQuestion?.text],['read-explanation',reply?.originalExplanationAvailable?reply.explanation:'']]){
  const eligible=canReadEnglish(text);$(id).hidden=!eligible;
  $(id).disabled=!eligible||!reader.supported||!user||loading||atEnd||!currentQuestion;
 }
}
function renderDailyProgress(){
 const rows=Array.isArray(progress?.dailyProgress)?progress.dailyProgress.filter(row=>row&&typeof row.date==='string'&&Number.isInteger(row.reviewedCount)&&row.reviewedCount>=0):[];
 const list=$('daily-progress-list');list.replaceChildren();
 const total=rows.reduce((sum,row)=>sum+row.reviewedCount,0),maximum=Math.max(1,...rows.map(row=>row.reviewedCount));
 const todayKey=riyadhDay(new Date().toISOString()),yesterdayKey=riyadhDay(new Date(Date.now()-86400000).toISOString());
 const today=rows.find(row=>row.date===todayKey)?.reviewedCount||0;
 $('today-progress').textContent='Today: '+today+' '+(today===1?'question':'questions');
 $('daily-progress-total').textContent=total+' reviewed in 30 days';
 rows.forEach((row,index)=>{
  const item=document.createElement('li');item.className='daily-progress-row';
  const date=document.createElement('time');date.dateTime=row.date;
  let label;try{label=new Intl.DateTimeFormat('en',{weekday:'short',month:'short',day:'numeric',timeZone:'Asia/Riyadh'}).format(new Date(row.date+'T12:00:00.000Z'));}catch{label=row.date;}
  date.textContent=(row.date===todayKey?'Today · ':row.date===yesterdayKey?'Yesterday · ':'')+label;
  const meter=document.createElement('progress');meter.max=maximum;meter.value=row.reviewedCount;meter.setAttribute?.('aria-label',row.reviewedCount+' questions reviewed');
  const count=document.createElement('strong');count.textContent=String(row.reviewedCount);
  const unit=document.createElement('span');unit.textContent=row.reviewedCount===1?'question':'questions';
  item.append(date,meter,count,unit);list.append(item);
 });
 $('daily-progress-empty').hidden=total>0;
}
function setDailyProgress(open){
 dailyProgressOpen=!!open;$('daily-progress-panel').hidden=!dailyProgressOpen;$('daily-progress-toggle').setAttribute?.('aria-expanded',String(dailyProgressOpen));
 $('daily-progress-toggle').textContent=dailyProgressOpen?'Hide daily progress':'Show daily progress';
}
async function refreshDailyProgress(){
 if(!user)return;
 const ownEpoch=epoch,ownUser=user.id;
 try{const stored=await api('progress');if(ownEpoch!==epoch||user?.id!==ownUser)return;progress={...progress,dailyProgress:stored.dailyProgress||[]};renderDailyProgress();}
 catch(e){if(ownEpoch===epoch&&user?.id===ownUser&&dailyProgressOpen)notice(errorMessage(e));}
}
function clearWorkspace({discardOutbox=false,userId=user?.id}={}){
 if(discardOutbox)discardReviewOutbox(userId);
 epoch++;viewVersion++;atEnd=false;for(const c of controllers)c.abort();controllers.clear();stopReading();user=null;catalog=null;progress={done:[],seen:[],dailyProgress:[]};history=[];reviews=[];pool=[];position=-1;currentQuestion=null;loading=false;pendingSaves.clear();pendingReviewEvents.clear();pendingCheckpoint=null;checkpointTask=null;persistTask=null;checkpointFailed=false;checkpointBlocked=false;checkpointRevision=0;
 $('workspace').hidden=true;$('logout').hidden=true;$('login').hidden=false;
 for(const id of ['stem','explanation','source-key','result','validation-note','coverage','progress-count','save-status'])$(id).textContent='';
 $('options').replaceChildren();$('references').replaceChildren();renderFigures('question-figures');renderFigures('explanation-figures');$('password').value='';$('retry-save').hidden=true;$('reload-position').hidden=true;setDailyProgress(false);renderDailyProgress();updateReadControls();
}
async function signOut(message='Signed out.',{automatic=false}={}){
 if(signingOut)return;
 const unsaved=!!(user&&(pendingSaves.size||pendingReviewEvents.size||pendingCheckpoint||checkpointTask));
 // Manual departure needs consent before discarding an unconfirmed save.
 // Idle expiry must still clear private data without waiting for a dialog.
 if(unsaved&&!automatic&&(typeof globalThis.confirm!=='function'||!globalThis.confirm('Some answers or your current position have not been saved. Sign out anyway and discard these unsaved changes?'))){
  notice('Sign-out cancelled. Use Retry saving before leaving.');return;
 }
 signingOut=true;
 try{
  const signedOutUser=user?.id;try{await refreshPromise;}catch{}clearWorkspace({discardOutbox:!automatic,userId:signedOutUser});
  $('signin').disabled=$('signup').disabled=true;
  try{await raw('signout','POST',{});notice(message+(automatic&&unsaved?' Pending answers remain on this device and will retry for this account.':''));}
  catch{notice('This page has been cleared, but server sign-out could not be confirmed. Retry signing out when connected before using a shared device.');$('logout').hidden=false;}
 }finally{signingOut=false;$('signin').disabled=$('signup').disabled=false;}
}
function correctIDs(){
 const ids=new Set((progress.done||[]).filter(r=>r.correct===true).map(r=>r.questionId));
 for(const [id,correct] of pendingSaves)if(correct===true)ids.add(id);
 return ids;
}
function excludedFromSet(){return $('mode').value==='review'?new Set():correctIDs();}
function filtered(){const module=$('module').value,review=$('mode').value==='review';return (catalog?.items||[]).filter(q=>(!module||q.module===module)&&q.reviewOnly===review);}
function updateSetControls(){
 const selected=$('module').value,review=$('mode').value==='review',items=catalog?.items||[],counts=new Map();
 for(const q of items.filter(q=>q.reviewOnly===review))counts.set(q.module,(counts.get(q.module)||0)+1);
 $('module').replaceChildren();const all=document.createElement('option');all.value='';all.textContent='All modules ('+[...counts.values()].reduce((a,b)=>a+b,0)+')';$('module').append(all);
 for(const [name,count] of counts){const option=document.createElement('option');option.value=name;option.textContent=name+' ('+count+')';$('module').append(option);}
 $('module').value=counts.has(selected)?selected:'';
 const ready=items.filter(q=>q.reviewOnly===false).length,pending=items.filter(q=>q.reviewOnly===true).length;
 $('ready-option').textContent='Ready questions ('+ready+')';$('review-option').textContent='تحت المراجعة · Under review ('+pending+')';
 $('open-review').hidden=review||pending===0;
}
function updateEmptyState(){
 const review=$('mode').value==='review',total=filtered().length;
 $('empty-title').textContent=total?'No remaining questions in this set.':review?'No questions under review in this set.':'No ready questions in this set.';
 $('empty-description').textContent=total?(review?'You have reached the end of this under-review set. No scores are assigned here.':'Choose another module. Questions already answered correctly are not repeated.'):review?'This list contains only questions awaiting completion or source review.':'Incomplete questions are kept separately under «تحت المراجعة». They are not substituted for ready questions.';
}
function shuffle(a){for(let i=a.length-1;i>0;i--){const n=new Uint32Array(1);crypto.getRandomValues(n);const j=n[0]%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function previousPosition(){
 const allowed=new Set(filtered().map(q=>q.id));
 for(let index=atEnd?position:position-1;index>=0;index--){
  if(allowed.has(history[index]?.id)&&!history[index].unavailable)return index;
 }
 return -1;
}
function updateCounters(){
 const done=correctIDs(),items=filtered(),current=items.findIndex(q=>q.id===history[position]?.id)+1;
 // The set index is stable; revisiting a wrong answer must not exceed the bank total.
 $('counter').textContent='Question '+current+' / '+items.length+' in this set · Session item '+Math.max(0,position+1);
 $('progress-count').textContent=($('mode').value==='review'?items.length+' records under review · Not scored':items.filter(q=>!done.has(q.id)).length+' not yet correct')+' · '+(catalog?.summary.questionCount||0)+' repository records';
 $('previous').disabled=loading||previousPosition()<0;$('next').disabled=loading||atEnd;
}
function lock(value){loading=value;for(const id of ['submit','module','mode','restart','open-review'])$(id).disabled=value;updateCounters();updateReadControls();}
function updateSaveControls(){
 $('retry-save').hidden=!(pendingSaves.size||pendingReviewEvents.size||checkpointFailed);
}
async function savePosition(retryOnly=false){
 if(!user||checkpointBlocked)return;
 if(!retryOnly){
  if(position<0||!history[position])return;
  pendingCheckpoint={schema:'render-study-v1',module:$('module').value,mode:$('mode').value,questionId:history[position].id,freshCount,reviewQueue:reviews.slice(0,40)};
 }
 if(!pendingCheckpoint||checkpointTask)return;
 const task=Symbol('checkpoint'),ownEpoch=epoch;checkpointTask=task;checkpointFailed=false;
 try{while(pendingCheckpoint&&ownEpoch===epoch&&checkpointTask===task&&!checkpointBlocked){const state=pendingCheckpoint;pendingCheckpoint=null;
  try{const saved=await api('checkpoint','POST',{expectedRevision:checkpointRevision,state});if(ownEpoch!==epoch||checkpointTask!==task)return;checkpointRevision=saved.revision;}
  catch(e){if(ownEpoch!==epoch||checkpointTask!==task)return;
   if(e.status===409){pendingCheckpoint=null;checkpointBlocked=true;$('reload-position').hidden=false;}
   else{pendingCheckpoint=pendingCheckpoint||state;checkpointFailed=true;}
   notice(errorMessage(e));break;
  }
 }}finally{if(checkpointTask===task){checkpointTask=null;updateSaveControls();}}
}
function showFeedback(slot){
 const reply=slot.reply;$('feedback').hidden=!reply;renderFigures('explanation-figures',reply?.figures||[]);updateReadControls();if(!reply)return;
 $('result').dataset.state=reply.correct===true?'correct':reply.correct===false?'incorrect':'review';
 $('result').textContent=reply.correct===null?'Review only — not scored':reply.correct?(slot.wasWrong?'ممتاز إجابتك صحيحة لقد صححت معلومتك':'Matches the recorded source key.'):'Does not match the recorded source key.';
 $('source-key').textContent=reply.sourceKey?'Recorded source key: '+reply.sourceKey:'No definite source key is available.';
 $('validation-note').textContent=reply.notice;$('explanation').textContent=reply.explanation;
 $('references').replaceChildren();for(const ref of reply.references||[]){
  const p=document.createElement('p');p.textContent=[ref.sourceName,ref.part,ref.page!=null?'Page '+ref.page:'',ref.questionNumber].filter(Boolean).join(' · ');
  try{const url=new URL(ref.url);if(url.protocol==='https:'&&!url.username&&!url.password&&['www.rch.org.au','rch.org.au','hospitalhandbook.ucsf.edu'].includes(url.hostname)){
   const link=document.createElement('a');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open clinical reference';p.append(' · ',link);
  }}catch{ /* Missing or unapproved links remain plain source citations. */ }
  $('references').append(p);
 }
 $('save-status').textContent=slot.saved?'Progress saved to your external account.':'Progress has not yet been confirmed as saved.';
}
async function display(){
 stopReading();const slot=history[position],ownEpoch=epoch,ownView=++viewVersion;if(!slot)return;
 atEnd=false;currentQuestion=null;renderFigures('question-figures');renderFigures('explanation-figures');
 lock(true);$('question-card').hidden=true;$('empty').hidden=true;$('feedback').hidden=true;notice('Loading question…');
 try{const q=await api('question?id='+encodeURIComponent(slot.id)+'&mode='+($('mode').value==='review'?'review':'practice'));if(ownEpoch!==epoch||ownView!==viewVersion)return;
  if(!q||q.id!==slot.id)throw Object.assign(Error('invalid_response'),{code:'invalid_response'});
  currentQuestion=q;$('category').textContent=q.module;$('stem').textContent=q.text;$('question-notice').textContent=q.notice;renderFigures('question-figures',q.figures||[]);
  const options=$('options');options.replaceChildren();
  const media=q.sourceImage;
  if(media && typeof media.dataUrl==='string' && media.dataUrl.length<100000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(media.dataUrl)){
   const figure=document.createElement('figure'),image=document.createElement('img'),caption=document.createElement('figcaption');
   image.src=media.dataUrl;image.alt=typeof media.alt==='string'?media.alt:'Original source question image';image.width=191;image.height=228;
   caption.className='muted';caption.textContent=typeof media.caption==='string'?media.caption:'';
   image.addEventListener('error',()=>{caption.textContent='The original source image could not be displayed. This item remains under review.';});
   figure.append(image,caption);options.append(figure);
  }
  q.options.forEach((o,i)=>{const label=document.createElement('label');label.className='option';const input=document.createElement('input');input.type='radio';input.name='answer';input.value=String(i);input.checked=slot.selected===i;input.disabled=!!slot.reply;input.addEventListener('change',()=>{slot.selected=i;});const key=document.createElement('strong');key.textContent=o.key+'.';const text=document.createElement('span');text.textContent=o.text;label.append(input,key,text);options.append(label);});
  $('submit').textContent=q.reviewOnly?'Reveal source (not scored)':'Submit answer';$('question-card').hidden=false;showFeedback(slot);notice('');
 }catch(e){if(ownEpoch===epoch&&ownView===viewVersion){
  if(['question_under_review','question_not_under_review'].includes(e.code)){
   slot.unavailable=true;
   const item=catalog?.items?.find(q=>q.id===slot.id);if(item)item.reviewOnly=e.code==='question_under_review';
   try{const bank=await api('catalog');if(ownEpoch!==epoch||ownView!==viewVersion)return;catalog=bank;}catch{}
   if(ownEpoch!==epoch||ownView!==viewVersion)return;
   updateSetControls();notice('The review status of this question changed. Select Next to continue in this set, or choose the separate Under review list.');
  }else{notice(errorMessage(e)+' Select Next to retry this question.');if(e.status===401)clearWorkspace();}
 }}
 finally{if(ownEpoch===epoch&&ownView===viewVersion&&user){lock(false);$('submit').disabled=!currentQuestion||!!slot.reply;}}
 if(ownEpoch===epoch&&ownView===viewVersion&&user&&currentQuestion)void savePosition();
}
async function next(){
 if(loading||atEnd)return;
 if(history[position]&&!currentQuestion&&!history[position].unavailable)return display();
 const allowed=new Set(filtered().map(q=>q.id));
 while(position+1<history.length){position++;if(allowed.has(history[position].id)&&!history[position].unavailable)return display();}
 const done=excludedFromSet();reviews=reviews.filter(r=>allowed.has(r.id)&&!done.has(r.id));
 let id;const due=reviews.findIndex(r=>r.after<=freshCount);
 if(due>=0){id=reviews.splice(due,1)[0].id;}
 else{while(cursor<pool.length&&!id){const candidate=pool[cursor++];if(allowed.has(candidate)&&!done.has(candidate)){id=candidate;freshCount++;}}}
 if(!id&&reviews.length)id=reviews.shift().id;
 if(!id){stopReading();atEnd=true;currentQuestion=null;$('question-card').hidden=true;$('empty').hidden=false;$('feedback').hidden=true;updateEmptyState();updateCounters();updateReadControls();return;}
 history.push({id,selected:null,reply:null,saved:false});position=history.length-1;return display();
}
async function start(saved=null){
 stopReading();viewVersion++;loading=false;atEnd=false;currentQuestion=null;history=[];position=-1;cursor=0;freshCount=0;reviews=[];
 const done=excludedFromSet();pool=shuffle(filtered().filter(q=>!done.has(q.id)).map(q=>q.id));
 if(saved?.schema==='render-study-v1'){
  freshCount=Number.isSafeInteger(saved.freshCount)&&saved.freshCount>=0?saved.freshCount:0;
  const allowed=new Set(pool),queued=new Set();
  for(const r of Array.isArray(saved.reviewQueue)?saved.reviewQueue:[]){
   if(!r||typeof r.id!=='string'||!Number.isSafeInteger(r.after)||r.after<0||!allowed.has(r.id)||queued.has(r.id))continue;
   queued.add(r.id);reviews.push({id:r.id,after:r.after});if(reviews.length===40)break;
  }
  // A delayed review cannot also appear early as an unseen fresh question.
  pool=pool.filter(id=>!queued.has(id));
  if(pool.includes(saved.questionId)){pool=pool.filter(id=>id!==saved.questionId);pool.unshift(saved.questionId);}
 }
 $('empty').hidden=true;lock(false);await next();updateCounters();
}
async function initialize(){
 const ownEpoch=epoch;
 try{const session=await api('session');if(ownEpoch!==epoch)return;
  user=session.user;restoreReviewOutbox();
  const [bank,stored,saved]=await Promise.all([api('catalog'),api('progress'),api('checkpoint')]);if(ownEpoch!==epoch)return;
  catalog=bank;progress=stored;checkpointRevision=saved.revision;checkpointBlocked=false;$('reload-position').hidden=true;lastActivity=lastRefresh=Date.now();renderDailyProgress();
  const state=saved.state?.schema==='render-study-v1'?saved.state:null;
  // Only an explicitly saved review session may reopen that list. An empty ready set is not consent.
  $('mode').value=state?.mode==='review'?'review':'practice';
  updateSetControls();
  $('module').value=[...$('module').options].some(m=>m.value===state?.module)?state.module:'';
  $('coverage').textContent=bank.summary.questionCount+' records from the current GitHub bank only. '+bank.summary.originalEnglishCount+' have attached original English explanation text; '+bank.summary.missingOriginalEnglishCount+' do not. This is not the complete legacy platform.';
  $('login').hidden=true;$('workspace').hidden=false;$('logout').hidden=false;notice('');updateSaveControls();await start(state);
  if(ownEpoch===epoch&&pendingReviewEvents.size)void persist();
 }catch(e){if(ownEpoch!==epoch)return;clearWorkspace();notice(e.status===401?'Sign in to begin.':errorMessage(e));}
}
async function persist(){
 if(persistTask)return persistTask.promise;
 if(!user||(!pendingSaves.size&&!pendingReviewEvents.size))return;
 const ownEpoch=epoch,ownUser=user.id,task={promise:null};persistTask=task;
 task.promise=(async()=>{
  try{while((pendingSaves.size||pendingReviewEvents.size)&&ownEpoch===epoch&&persistTask===task){
   const eventRows=[...pendingReviewEvents.entries()].slice(0,500),represented=new Set(eventRows.map(([,event])=>event.questionId));
   const rows=eventRows.map(([,event])=>({...event}));
   for(const [questionId,correct] of pendingSaves){if(rows.length>=500)break;if(!represented.has(questionId))rows.push({questionId,correct});}
   const stored=await api('progress','POST',{completed:rows,seen:rows.map(r=>r.questionId)});if(ownEpoch!==epoch||persistTask!==task)return;
   progress=stored;
   for(const [key,event] of eventRows){if(pendingReviewEvents.get(key)===event)pendingReviewEvents.delete(key);removeStoredReviewEvent(ownUser,key);}
   const stillPending=new Set([...pendingReviewEvents.values()].map(event=>event.questionId));
   for(const row of rows)if(!stillPending.has(row.questionId)&&pendingSaves.get(row.questionId)===row.correct)pendingSaves.delete(row.questionId);
   for(const slot of history)if(slot.reply&&!pendingSaves.has(slot.id))slot.saved=true;
   if(history[position]?.reply)showFeedback(history[position]);renderDailyProgress();updateCounters();
  }}catch(e){if(ownEpoch===epoch)notice(errorMessage(e));}
  finally{if(persistTask===task){persistTask=null;updateSaveControls();}}
 })();
 return task.promise;
}
async function retrySaving(){
 const ownEpoch=epoch;await persist();if(ownEpoch===epoch&&user)await savePosition(true);
}
async function reloadSavedPosition(){
 const ownEpoch=epoch;await persist();if(ownEpoch!==epoch||!user)return;
 if(pendingSaves.size){notice('Save your pending answers before reloading the saved position.');return;}
 pendingCheckpoint=null;checkpointFailed=false;await initialize();
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
 const slot=history[position];if(loading||atEnd||!slot||slot.reply||!currentQuestion||currentQuestion.id!==slot.id)return;
 if(slot.selected===null&&!currentQuestion.reviewOnly){notice('Select an answer before submitting.');return;}
 const ownEpoch=epoch;lock(true);
 try{slot.wasWrong=pendingSaves.get(slot.id)===false||(progress.done||[]).some(r=>r.questionId===slot.id&&r.correct===false)||history.some(r=>r.id===slot.id&&r.reply?.correct===false);const reply=await api('answer','POST',{id:slot.id,selectedIndex:slot.selected});if(ownEpoch!==epoch)return;slot.reply=reply;
  if(reply.correct===false&&!reviews.some(r=>r.id===slot.id))reviews.push({id:slot.id,after:freshCount+3+Math.floor(Math.random()*3)});
  queueReviewedQuestion(slot.id,reply.correct,reply.reviewedAt);showFeedback(slot);$('options').querySelectorAll('input').forEach(input=>input.disabled=true);await persist();
  if(ownEpoch===epoch)void savePosition();
 }catch(e){if(ownEpoch===epoch)notice(errorMessage(e));}finally{if(ownEpoch===epoch&&user){lock(false);$('submit').disabled=!!slot.reply;}}
});
$('next').addEventListener('click',()=>void next());$('previous').addEventListener('click',()=>{if(loading)return;const index=previousPosition();if(index<0)return;position=index;atEnd=false;void display();});
$('module').addEventListener('change',()=>void start());
$('mode').addEventListener('change',()=>{updateSetControls();void start();});
$('open-review').addEventListener('click',()=>{if(loading)return;$('mode').value='review';updateSetControls();void start();});
$('restart').addEventListener('click',()=>void start());
$('daily-progress-toggle').addEventListener('click',()=>{setDailyProgress(!dailyProgressOpen);if(dailyProgressOpen)void refreshDailyProgress();});
$('retry-save').textContent='Retry saving';
$('retry-save').addEventListener('click',()=>void retrySaving());$('reload-position').addEventListener('click',()=>void reloadSavedPosition());
window.addEventListener('online',()=>{if(user)void retrySaving().then(()=>refreshDailyProgress());});
window.addEventListener('beforeunload',event=>{
 if(user&&(pendingSaves.size||pendingReviewEvents.size||pendingCheckpoint||checkpointTask)){event.preventDefault();event.returnValue='';}
});
function loadVoices(){const selected=$('voice').value;const voices=englishVoices();$('voice').replaceChildren();const def=document.createElement('option');def.value='';def.textContent='System English voice';$('voice').append(def);for(const voice of voices.filter(v=>/^en(?:-|_)/i.test(v.lang))){const opt=document.createElement('option');opt.value=voice.voiceURI;opt.textContent=voice.name+' · '+voice.lang;$('voice').append(opt);}if([...$('voice').options].some(o=>o.value===selected))$('voice').value=selected;}
function read(text){if(!user||loading||atEnd||!currentQuestion)return;reader.speak(text,{voiceURI:$('voice').value});}
$('read-question').addEventListener('click',()=>read(currentQuestion?.text));$('read-explanation').addEventListener('click',()=>read(history[position]?.reply?.originalExplanationAvailable?history[position].reply.explanation:''));$('stop-reading').addEventListener('click',stopReading);
globalThis.speechSynthesis?.addEventListener?.('voiceschanged',loadVoices);loadVoices();updateReadControls();
for(const event of ['pointerdown','keydown','scroll'])window.addEventListener(event,()=>{lastActivity=Date.now();},{passive:true});
setInterval(()=>{
 const day=riyadhDay(new Date().toISOString());
 if(day!==currentRiyadhDay){currentRiyadhDay=day;renderDailyProgress();if(user)void refreshDailyProgress();}
 if(!user)return;if(Date.now()-lastActivity>=IDLE){void signOut('Signed out after 10 minutes of inactivity.',{automatic:true});return;}if(Date.now()-lastRefresh>240000&&Date.now()-lastActivity<60000)void refresh().catch(()=>{});
},20000);
document.addEventListener('visibilitychange',()=>{if(document.hidden||!user)return;if(Date.now()-lastActivity>=IDLE)void signOut('Session expired after inactivity.',{automatic:true});else if(dailyProgressOpen)void refreshDailyProgress();});
// Confirmation links may contain provider tokens. Never store or echo the fragment.
if(location.hash){globalThis.history.replaceState(null,'','/study');notice('After confirming your email, sign in below.');}
void initialize();
