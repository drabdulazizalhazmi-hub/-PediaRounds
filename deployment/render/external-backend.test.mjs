import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createExternalBackend,validateProgress,validateCheckpoint} from './external-backend.mjs';

const env = {PEDIAROUNDS_EXTERNAL_BACKEND:'enabled',PEDIAROUNDS_SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',PEDIAROUNDS_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture-only'};
const token='aaaaaaaabbbbbbbb.ccccccccdddddddd.eeeeeeeeffffffff';
const auth={Authorization:'Bearer '+token};
const user={id:'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',email:'fixture@example.invalid',role:'authenticated',is_anonymous:false,email_confirmed_at:'2026-01-01T00:00:00Z'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
async function running(t,options={}) {
 const calls=[];
 const backend=createExternalBackend({env,fetcher:async(url,opts)=>{
  calls.push({url,opts});
  if(options.fetcher) return options.fetcher(url,opts);
  if(url.endsWith('/auth/v1/user')) return json(user);
  if(url.endsWith('/auth/v1/settings')) return json({external:{email:true}});
  if(url.includes('checkpoint')) return json({revision:1,state:{currentId:'source-id'}});
  return json({reviewedCount:1,done:[{questionId:'source-id',correct:true}],seen:['source-id']});
 },...options});
 const server=createServer(async(req,res)=>{
  if(!await backend.handle(req,res,new URL(req.url,'http://localhost').pathname)){res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
 return {url:`http://127.0.0.1:${server.address().port}`,calls,backend};
}
const post=(body)=>({method:'POST',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify(body)});

test('progress preserves original IDs and tri-state correct values',()=>{
 const b={completed:[{questionId:'p2-original-001',correct:null},{questionId:'original-false',correct:false},{questionId:'original-true',correct:true}],seen:['another-id']};
 assert.deepEqual(validateProgress(b),b);
});
test('progress rejects user spoofing, unknown fields and malformed values',()=>{
 for(const body of [null,[],{user_id:'x'},{completed:[{questionId:'x'}]},{completed:[{questionId:'x',correct:1}]},{completed:[{questionId:'x',correct:'true'}]},{completed:[{questionId:'x',correct:true,user_id:'spoof'}]},{seen:['']},{seen:['x\n']},{seen:[4]},{seen:['x'.repeat(201)]},{completed:Array(501).fill({questionId:'x',correct:true})}]) assert.throws(()=>validateProgress(body));
});
test('empty progress is a no-op payload, never a delete request',()=>assert.deepEqual(validateProgress({}),{completed:[],seen:[]}));
test('checkpoint requires an explicit nonnegative revision and bounded object',()=>{
 assert.deepEqual(validateCheckpoint({expectedRevision:2,state:{currentId:'original'}}),{expected_revision:2,new_state:{currentId:'original'}});
 for(const b of [{expectedRevision:-1,state:{}},{expectedRevision:1.5,state:{}},{expectedRevision:2147483646,state:{}},{state:{}},{expectedRevision:0,state:[]},{expectedRevision:0,state:null},{expectedRevision:0,state:{x:'x'.repeat(41000)}},{expectedRevision:0,state:{},user_id:'fake'}])assert.throws(()=>validateCheckpoint(b));
});
test('disabled backend remains closed, even with a bearer token',async t=>{
 const {url,calls}=await running(t,{env:{}});const r=await fetch(url+'/api/external/session',{headers:auth});
 assert.equal(r.status,503);assert.equal(calls.length,0);
});
test('secret/service-role or insecure project configuration is rejected',()=>{
 for(const change of [{PEDIAROUNDS_SUPABASE_PUBLISHABLE_KEY:'sb_secret_private'},{PEDIAROUNDS_SUPABASE_PUBLISHABLE_KEY:'eyJservice_role'},{PEDIAROUNDS_SUPABASE_URL:'http://localhost:54321'},{PEDIAROUNDS_SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co@evil.test'}]) assert.equal(createExternalBackend({env:{...env,...change}}).configured,false);
});
test('missing bearer and forged legacy headers cannot authenticate',async t=>{
 const {url,calls}=await running(t);
 for(const headers of [{},{'oai-authenticated-user-email':'fixture@example.invalid','oai-authenticated-user-id':user.id},{Cookie:'access_token='+token},{Authorization:'Bearer bad'}]) {
  const r=await fetch(url+'/api/external/progress',{headers});assert.equal(r.status,401);assert.equal(r.headers.get('set-cookie'),null);
 }
 assert.equal(calls.length,0);
});
test('identity is obtained from the Auth server, never from caller-supplied email',async t=>{
 const {url,calls}=await running(t);const r=await fetch(url+'/api/external/session',{headers:{...auth,'oai-authenticated-user-email':'forged@example.invalid'}});
 assert.equal(r.status,200);assert.deepEqual((await r.json()).user,{id:user.id,email:user.email});
 assert.equal(calls[0].opts.headers.Authorization,'Bearer '+token);assert.equal(calls[0].opts.headers.apikey,env.PEDIAROUNDS_SUPABASE_PUBLISHABLE_KEY);
 assert.equal(calls[0].opts.redirect,'error');assert.match(r.headers.get('cache-control'),/private, no-store/);assert.equal(r.headers.get('access-control-allow-origin'),null);
});
test('expired or invalid JWT is denied with no provider error leakage',async t=>{
 const {url}=await running(t,{fetcher:()=>json({message:'private upstream diagnostic'},401)});
 const r=await fetch(url+'/api/external/session',{headers:auth});assert.equal(r.status,401);assert.deepEqual(await r.json(),{error:'sign_in_required'});
});
test('anonymous, unconfirmed, deleted and banned identities are refused',async t=>{
 for(const patch of [{is_anonymous:true},{email_confirmed_at:null},{deleted_at:'2026-01-01'},{banned_until:'2999-01-01'},{role:'service_role'},{id:'not-uuid'}]){
  const {url}=await running(t,{fetcher:()=>json({...user,...patch})});assert.equal((await fetch(url+'/api/external/session',{headers:auth})).status,401);
 }
});
test('network errors are safe 503 failures',async t=>{
 const {url}=await running(t,{fetcher:()=>{throw Error('secret internal connection details');}});const r=await fetch(url+'/api/external/session',{headers:auth});
 assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'backend_unavailable'});
});
test('malformed Auth response never authenticates',async t=>{
 const {url}=await running(t,{fetcher:()=>new Response('<html>upstream</html>')});const r=await fetch(url+'/api/external/session',{headers:auth});assert.equal(r.status,503);
});
test('progress read uses the verified user token and the read RPC',async t=>{
 const {url,calls}=await running(t);const r=await fetch(url+'/api/external/progress',{headers:auth});assert.equal(r.status,200);
 assert.match(calls[1].url,/rpc\/pediarounds_render_read_progress$/);assert.equal(calls[1].opts.headers.Authorization,'Bearer '+token);assert.equal(calls[1].opts.body,'{}');
});
test('progress write validates fields before issuing the transactional RPC',async t=>{
 const {url,calls}=await running(t);const payload={completed:[{questionId:'source-id',correct:true}],seen:[]};
 const r=await fetch(url+'/api/external/progress',post(payload));assert.equal(r.status,200);assert.deepEqual(JSON.parse(calls[1].opts.body),payload);
});
test('invalid input does not reach the persistence layer',async t=>{
 const {url,calls}=await running(t);const r=await fetch(url+'/api/external/progress',post({user_id:'another-user'}));assert.equal(r.status,400);assert.equal(calls.length,1);
});
test('non-JSON and malformed JSON are rejected',async t=>{
 const {url}=await running(t);
 assert.equal((await fetch(url+'/api/external/progress',{method:'POST',headers:auth,body:'password=no'})).status,415);
 assert.equal((await fetch(url+'/api/external/progress',{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:'{'})).status,400);
});
test('oversized input is rejected',async t=>{
 const {url}=await running(t);const r=await fetch(url+'/api/external/progress',post({seen:['x'.repeat(100001)]}));assert.equal(r.status,413);
});
test('destructive methods and cross-site requests are denied',async t=>{
 const {url,calls}=await running(t);
 assert.equal((await fetch(url+'/api/external/progress',{method:'DELETE',headers:auth})).status,405);
 assert.equal((await fetch(url+'/api/external/progress',{headers:{...auth,'Sec-Fetch-Site':'cross-site'}})).status,403);assert.equal(calls.length,0);
});
test('checkpoint write maps the compare-and-swap revision exactly',async t=>{
 const {url,calls}=await running(t);const r=await fetch(url+'/api/external/checkpoint',post({expectedRevision:3,state:{currentId:'source-id'}}));assert.equal(r.status,200);
 assert.deepEqual(JSON.parse(calls[1].opts.body),{expected_revision:3,new_state:{currentId:'source-id'}});
});
test('stale checkpoint becomes 409, not a silent overwrite',async t=>{
 const {url}=await running(t,{fetcher:(url)=>url.endsWith('/user')?json(user):json({code:'40001',message:'private SQL'},409)});
 const r=await fetch(url+'/api/external/checkpoint',post({expectedRevision:1,state:{}}));assert.equal(r.status,409);assert.deepEqual(await r.json(),{error:'checkpoint_conflict'});
});
test('invalid storage result is not reported as successful progress',async t=>{
 const {url}=await running(t,{fetcher:(url)=>url.endsWith('/user')?json(user):json({unexpected:true})});assert.equal((await fetch(url+'/api/external/progress',{headers:auth})).status,503);
});
test('request limits prevent repeated token verification floods',async t=>{
 const {url}=await running(t,{now:()=>6000000});let r;
 for(let i=0;i<61;i++)r=await fetch(url+'/api/external/session',{headers:auth});
 assert.equal(r.status,429);assert.equal(r.headers.get('retry-after'),'60');
});
test('dependency probe checks reachability and refusal, without creating users',async()=>{
 const calls=[];const backend=createExternalBackend({env,fetcher:(url,opts)=>{calls.push(url);return url.endsWith('/settings')?json({external:{email:true}}):json({code:'42501'},401);}});
 assert.deepEqual(await backend.probe(),{configured:true,authReachable:true,anonymousDatabaseDenied:true});assert.equal(calls.length,2);assert.ok(!calls.some(url=>/signup|admin|token/.test(url)));
});
test('dependency probe does not confuse an accessible database with security',async()=>{
 const backend=createExternalBackend({env,fetcher:(url)=>url.endsWith('/settings')?json({external:{email:true}}):json({reviewedCount:0})});
 assert.equal((await backend.probe()).anonymousDatabaseDenied,false);
});
