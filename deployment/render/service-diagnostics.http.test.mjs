import test from 'node:test';
import assert from 'node:assert/strict';
import {createProbeServer} from './server.mjs';
import {createDependencyMonitor} from './service-diagnostics.mjs';
const GOOD = {configured:true,authReachable:true,anonymousDatabaseDenied:true};
const BANK = {questionCount:1029,fileErrors:0,skippedRecords:0,duplicateIDs:0};

async function running(t, {probe=async()=>GOOD, studyStatus={authConfigured:true,bank:BANK}, noStudy=false, timing={}}={}) {
  let calls=0;
  const backend={configured:true,probe:async()=>{calls++;return probe();},handle:async(req,res,path)=>{
    if(path!=='/api/external/session')return false;
    res.writeHead(401,{'Content-Type':'application/json'});res.end('{"error":"unauthorized"}');return true;
  }};
  const study=noStudy?null:{status:()=>studyStatus,handle:async(req,res,path)=>{
    if(path==='/test-handler-failure')throw new Error('do not disclose');
    if(path==='/study'){
      const body='<form id="login-form"></form>';
      res.writeHead(200,{'Content-Type':'text/html','Content-Security-Policy':"default-src 'none'; script-src 'self'"});
      res.end(req.method==='HEAD'?undefined:body);return true;
    }
    if(path==='/api/study/catalog'){
      res.writeHead(401,{'Content-Type':'application/json'});res.end('{"error":"unauthorized"}');return true;
    }
    return false;
  }};
  const server=createProbeServer({backend,study,monitor:createDependencyMonitor({backend,...timing})});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
  const base=`http://127.0.0.1:${server.address().port}`;
  return {request:(path,options={})=>fetch(base+path,{redirect:'manual',...options}),calls:()=>calls};
}

test('login aliases redirect only to the local login interface without establishing a session',async t=>{
  const {request}=await running(t);
  for(const path of ['/login','/login/','/login?next=https://other.example']){
    const response=await request(path,{headers:{'oai-authenticated-user-id':'spoof'}});
    assert.equal(response.status,302);assert.equal(response.headers.get('location'),'/study');
    assert.equal(response.headers.get('set-cookie'),null);assert.equal(await response.text(),'');
    assert.equal(response.headers.get('cache-control'),'no-store');
  }
  assert.match(await(await request('/study')).text(),/login-form/);
  assert.equal((await request('/api/study/catalog')).status,401);
});
test('HEAD login redirects without a body; POST login remains rejected',async t=>{
  const {request}=await running(t);
  const head=await request('/login',{method:'HEAD'});assert.equal(head.status,302);assert.equal(await head.text(),'');
  const post=await request('/login',{method:'POST',body:'fixture-only'});assert.equal(post.status,405);
  assert.equal(post.headers.get('location'),null);assert.equal(post.headers.get('set-cookie'),null);
});
test('missing study interface does not redirect to an unavailable app',async t=>{
  const {request}=await running(t,{noStudy:true});assert.equal((await request('/login')).status,503);
  assert.equal((await request('/study/readyz')).status,503);
});
test('transport header covers delegated pages, APIs, errors and redirects without overriding CSP',async t=>{
  const {request}=await running(t);
  for(const path of ['/','/healthz','/readyz','/login','/study','/api/study/catalog','/api/external/session','/missing','/test-handler-failure']){
    const response=await request(path);assert.equal(response.headers.get('strict-transport-security'),'max-age=86400',path);
    await response.arrayBuffer();
  }
  assert.match((await request('/study')).headers.get('content-security-policy'),/script-src 'self'/);
});
test('fresh health checks do not promote full migration readiness',async t=>{
  const {request}=await running(t);const response=await request('/study/readyz');assert.equal(response.status,200);
  const result=await response.json();assert.equal(result.infrastructureReady,true);
  for(const key of ['applicationReady','fullSiteMigrated','legacyAccountsMigrated','legacyProgressMigrated','originalImagesMigrated','realUserEndToEndTested'])assert.equal(result[key],false);
  const full=await request('/readyz');assert.equal(full.status,503);assert.equal((await full.json()).applicationReady,false);
});
test('diagnostic endpoints refresh after expiry and recover after a backend outage',async t=>{
  let now=0,healthy=true;
  const {request,calls}=await running(t,{probe:async()=>({...GOOD,authReachable:healthy}),timing:{now:()=>now,ttlMs:100}});
  assert.equal((await(await request('/external-backend-status')).json()).authReachable,true);
  healthy=false;now=100;
  assert.equal((await request('/study/readyz')).status,503);
  const down=await(await request('/deployment-status')).json();assert.equal(down.backend.authReachable,false);assert.equal(down.applicationReady,false);
  healthy=true;now=200;assert.equal((await request('/study/readyz')).status,200);assert.equal(calls(),3);
});
test('simultaneous diagnostic routes use a single in-flight probe',async t=>{
  let release;const gate=new Promise(resolve=>{release=resolve;});
  const {request,calls}=await running(t,{probe:async()=>{await gate;return GOOD;}});
  const jobs=['/study/readyz','/deployment-status','/external-backend-status'].map(path=>request(path));
  release();const responses=await Promise.all(jobs);assert.equal(calls(),1);
  for(const response of responses){assert.equal(response.status,200);await response.arrayBuffer();}
});
test('timed-out diagnostics return 503 and do not disclose late data',async t=>{
  let release;const late=new Promise(resolve=>{release=resolve;});
  const {request}=await running(t,{probe:()=>late,timing:{timeoutMs:20}});
  const response=await request('/study/readyz');assert.equal(response.status,503);
  assert.equal((await response.json()).infrastructureReady,false);
  release({...GOOD,secret:'fixture-private'});
  const status=await(await request('/external-backend-status')).json();assert.equal(status.dependencyCheck,'timeout');
  assert.doesNotMatch(JSON.stringify(status),/fixture-private/);
});
test('diagnostic errors are sanitized and fail closed',async t=>{
  const {request}=await running(t,{probe:async()=>{throw Error('fixture-private');}});
  assert.equal((await request('/study/readyz')).status,503);
  const text=await(await request('/deployment-status')).text();assert.doesNotMatch(text,/fixture-private/);
  assert.equal(JSON.parse(text).backend.dependencyCheck,'unavailable');
});
test('incomplete or corrupt question-bank evidence prevents study readiness',async t=>{
  const {request}=await running(t,{studyStatus:{authConfigured:true,bank:{...BANK,duplicateIDs:1}}});
  const response=await request('/study/readyz');assert.equal(response.status,503);
  assert.equal((await response.json()).checks.repositoryBankLoaded,false);
});
test('liveness never waits for external dependency checks',async t=>{
  const {request,calls}=await running(t,{probe:()=>new Promise(()=>{})});
  assert.equal((await request('/healthz')).status,200);assert.equal(calls(),0);
});
test('readiness HEAD is bodyless and write requests do not invoke a probe',async t=>{
  const {request,calls}=await running(t);
  const post=await request('/study/readyz',{method:'POST',body:'fixture-only'});assert.equal(post.status,405);assert.equal(calls(),0);
  const head=await request('/study/readyz',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
});
test('diagnostic metadata retains explicitly unverified login and migration flags',async t=>{
  const {request}=await running(t);const status=await(await request('/external-backend-status')).json();
  for(const key of ['frontendIntegrated','endToEndLoginTested','existingDataMigrated'])assert.equal(status[key],false);
  assert.equal(status.studyBetaIntegrated,true);assert.equal(typeof status.checkedAt,'string');
});
