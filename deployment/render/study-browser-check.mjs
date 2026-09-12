/** CI-only real-Chromium interface test using fictional accounts and an in-memory provider. */
import assert from 'node:assert/strict';
import {createServer} from 'node:https';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {createStudyApp} from './study-app.mjs';
import {createBank} from './study-bank.mjs';

const dir=mkdtempSync(path.join(tmpdir(),'pediarounds-browser-'));
const output=process.env.STUDY_BROWSER_OUTPUT||path.join(dir,'results');mkdirSync(output,{recursive:true});
const checks=[],errors=[],requests=[];
const ACCESS='fixture-access-token-never-a-real-account',REFRESH='fixture-refresh-token';
const user={id:'00000000-0000-4000-8000-000000000001',email:'browser@example.test',role:'authenticated',email_confirmed_at:'2026-09-01T00:00:00Z'};
const rows=new Map();let revision=0,state=null,conflict=false,app,chrome,ws,server;
const sourceText='  This is the original source explanation in a fictional test fixture.\nIts whitespace must remain unchanged.  ';
const bank=createBank(Array.from({length:7},(_,i)=>({id:'fixture-'+i,module:'Fixture module',stemEn:'Fictional interface test question '+i+'. Which option is recorded?',options:[{key:'A',text:'Recorded choice'},{key:'B',text:'Other choice'}],recalledAnswer:'A',reviewStatus:'ready_for_publish',publishable:true,originalExplanation:sourceText,sourceRefs:[{sourceName:'Fictional browser fixture',page:i+1}]})));
const progress=()=>({reviewedCount:rows.size,done:[...rows].map(([questionId,correct])=>({questionId,correct,completedAt:Date.now()})),seen:[...rows.keys()]});
const backend={handle:async(req,res,pathname)=>{
 let body={};if(req.method==='POST'){let text='';for await(const chunk of req)text+=chunk;body=JSON.parse(text);}
 let status=200,data;
 if(pathname.endsWith('/progress')){
  for(const row of body.completed||[])rows.set(row.questionId,rows.get(row.questionId)===true?true:row.correct);
  data=progress();
 }else{
  if(req.method==='POST'){
   if(conflict||body.expectedRevision!==revision){status=409;data={error:'checkpoint_conflict'};}
   else{revision++;state=body.state;}
  }
  data??={revision,state};
 }
 res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));return true;
}};
const provider=async(url,options)=>{
 if(url.includes('/token?'))return new Response(JSON.stringify({access_token:ACCESS,refresh_token:REFRESH,user}),{status:200});
 if(url.endsWith('/user'))return options.headers.Authorization==='Bearer '+ACCESS?new Response(JSON.stringify(user),{status:200}):new Response('{}',{status:401});
 if(url.includes('/logout?'))return new Response(null,{status:204});
 throw Error('Unexpected fixture provider request');
};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let sequence=0;const pending=new Map();
function call(method,params={}){
 const id=++sequence;
 return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},10000);pending.set(id,{resolve,reject,timeout});ws.send(JSON.stringify({id,method,params}));});
}
async function evaluate(expression){const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result?.value;}
async function wait(expression,label){const until=Date.now()+15000;while(Date.now()<until){if(await evaluate(expression))return;await sleep(80);}throw Error('Browser condition timed out: '+label+'; status='+await evaluate('document.getElementById("status")?.textContent'));}
async function check(name,fn){await fn();checks.push(name);console.log('BROWSER_CHECK_PASS',name);}
async function click(id){await evaluate('document.getElementById('+JSON.stringify(id)+').click()');}
const qReady='!document.getElementById("question-card").hidden && !document.getElementById("next").disabled';
try{
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',path.join(dir,'key.pem'),'-out',path.join(dir,'cert.pem'),'-days','1','-subj','/CN=localhost'],{stdio:'ignore'});
 server=createServer({key:readFileSync(path.join(dir,'key.pem')),cert:readFileSync(path.join(dir,'cert.pem'))},async(req,res)=>{
  const pathname=new URL(req.url,'https://localhost').pathname;requests.push(pathname);
  try{if(app&&await app.handle(req,res,pathname))return;res.writeHead(404);res.end();}catch{res.writeHead(500);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='https://localhost:'+server.address().port;
 app=createStudyApp({env:{RENDER_EXTERNAL_URL:origin,PEDIAROUNDS_EXTERNAL_BACKEND:'enabled',PEDIAROUNDS_SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',PEDIAROUNDS_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'},fetcher:provider,backend,bank});
 const binary=process.env.CHROME_BIN||execFileSync('bash',['-lc','command -v google-chrome || command -v chromium || command -v chromium-browser'],{encoding:'utf8'}).trim();
 console.log('BROWSER_VERSION',execFileSync(binary,['--version'],{encoding:'utf8'}).trim());
 let stderr='';
 chrome=spawn(binary,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--ignore-certificate-errors','--remote-debugging-port=0','--remote-allow-origins=*','--user-data-dir='+path.join(dir,'chrome'),'about:blank'],{stdio:['ignore','ignore','pipe']});
 chrome.stderr.on('data',chunk=>{stderr+=chunk.toString();});
 let debug;for(let i=0;i<150;i++){debug=stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1];if(debug)break;await sleep(100);}
 if(!debug)throw Error('Chrome debugging endpoint did not start');
 const debugURL=new URL(debug), endpoint='http://'+debugURL.host;
 const target=await(await fetch(endpoint+'/json/new?about:blank',{method:'PUT'})).json();
 ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 ws.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.id&&pending.has(data.id)){const entry=pending.get(data.id);pending.delete(data.id);clearTimeout(entry.timeout);data.error?entry.reject(Error(JSON.stringify(data.error))):entry.resolve(data.result);}else if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails);});
 await call('Runtime.enable');await call('Page.enable');await call('Page.navigate',{url:origin+'/study'});
 await wait('!document.getElementById("login")?.hidden && document.getElementById("status").textContent.includes("Sign in")','initial sign-in');
 await check('unauthenticated screen does not request questions',async()=>{assert.equal(requests.includes('/api/study/catalog'),false);assert.equal(await evaluate('document.getElementById("workspace").hidden'),true);});
 await evaluate('document.getElementById("email").value="browser@example.test";document.getElementById("password").value="fictional-password";document.getElementById("login-form").requestSubmit()');
 await wait(qReady,'first question');
 await check('real browser signs in, reads protected question, and hides feedback',async()=>{assert.equal(await evaluate('document.getElementById("login").hidden'),true);assert.equal(await evaluate('document.getElementById("feedback").hidden'),true);assert.equal(await evaluate('document.getElementById("password").value'),'');assert.equal(await evaluate('document.cookie'),'');});
 await check('desktop layout has no horizontal overflow',async()=>assert.equal(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),true));
 const first=await evaluate('document.getElementById("stem").textContent');
 await evaluate('document.querySelectorAll("input[name=answer]")[1].click()');await click('submit');
 await wait('document.getElementById("save-status").textContent.includes("Progress saved")','saved answer');
 await check('submitted answer reveals exact original explanation and saves progress',async()=>{assert.equal(await evaluate('document.getElementById("explanation").textContent'),sourceText);assert.equal(await evaluate('document.getElementById("result").dataset.state'),'incorrect');assert.equal(rows.size,1);});
 await click('next');await wait(qReady,'second question');const second=await evaluate('document.getElementById("stem").textContent');assert.notEqual(second,first);
 await click('next');await wait(qReady,'third question');await click('previous');await wait(qReady,'previous unanswered question');
 await check('Previous restores an unanswered skipped question',async()=>{assert.equal(await evaluate('document.getElementById("stem").textContent'),second);assert.equal(await evaluate('document.getElementById("feedback").hidden'),true);});
 await evaluate('document.querySelectorAll("input[name=answer]")[0].click()');await click('submit');await wait('document.getElementById("save-status").textContent.includes("Progress saved")','correct saved answer');
 await check('correct source choice receives correct feedback',async()=>assert.equal(await evaluate('document.getElementById("result").dataset.state'),'correct'));
 await check('current question counter stays within set bounds',async()=>{const text=await evaluate('document.getElementById("counter").textContent');const match=/Question (\d+) \/ (\d+)/.exec(text);assert.ok(match);assert.ok(Number(match[1])>0&&Number(match[1])<=Number(match[2]));});
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await check('390px mobile layout has no horizontal overflow',async()=>assert.equal(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),true));
 const image=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});writeFileSync(path.join(output,'study-mobile.png'),Buffer.from(image.data,'base64'));
 const initialRevision=revision;conflict=true;await click('next');await wait(qReady,'question before checkpoint conflict');
 await wait('!document.getElementById("reload-position").hidden','checkpoint conflict control');
 await check('stale checkpoint asks for reload and does not overwrite',async()=>assert.equal(revision,initialRevision));
 await click('logout');await wait('!document.getElementById("login").hidden && document.getElementById("status").textContent==="Signed out."','logout');
 await check('logout clears question content and denies protected API access',async()=>{assert.equal(await evaluate('document.getElementById("stem").textContent'),'');assert.equal(await evaluate('fetch("/api/study/catalog").then(r=>r.status)'),401);});
 await check('no uncaught browser JavaScript exceptions',async()=>assert.deepEqual(errors,[]));
 writeFileSync(path.join(output,'browser-verification.json'),JSON.stringify({testedAt:new Date().toISOString(),scope:'real Chromium; fictional provider and in-memory persistence; not live Supabase',checks,passed:checks.length,realUserTested:false,liveEmailDeliveryTested:false,actualIOSAudioTested:false},null,2));
 console.log('BROWSER_CHECK_SUMMARY',JSON.stringify({passed:checks.length,failed:0,scope:'real Chromium with mocked provider/storage'}));
}catch(error){console.error(error);if(ws?.readyState===1){try{const image=await call('Page.captureScreenshot',{format:'png'});writeFileSync(path.join(output,'browser-failure.png'),Buffer.from(image.data,'base64'));}catch{}}process.exitCode=1;}
finally{ws?.close();for(const entry of pending.values()){clearTimeout(entry.timeout);entry.reject(Error('Browser closed'));}chrome?.kill('SIGTERM');if(server)await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});setTimeout(()=>{try{rmSync(dir,{recursive:true,force:true});}catch{}},200).unref();}
