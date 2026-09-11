import test from 'node:test';
import assert from 'node:assert/strict';
import { createProbeServer } from './server.mjs';
import { createSupabaseBridge, validatePayload } from './supabase-bridge.mjs';

const env = { SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key' };
const token = 'header.payload.signature';
const user = { id: 'a0000000-0000-4000-8000-000000000001', role: 'authenticated', is_anonymous: false, email: 'test@example.invalid' };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: {'Content-Type':'application/json'} });
const headers = { Authorization: `Bearer ${token}`, 'Content-Type':'application/json' };
async function running(t, options = {}) {
  const bridge = createSupabaseBridge({ env, fetcher: async () => json(user), ...options });
  const server = createProbeServer({ bridge });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return { base: `http://127.0.0.1:${server.address().port}`, bridge };
}

test('bridge missing configuration is not ready', async t => {
  const {base} = await running(t, {env:{}});
  const r = await fetch(base + '/backend-status');
  assert.equal(r.status,503); assert.equal((await r.json()).connected,false);
});
test('bridge rejects privileged keys and non-Supabase URLs', async () => {
  for (const overrides of [{SUPABASE_PUBLISHABLE_KEY:'sb_secret_never_use'}, {SUPABASE_URL:'http://localhost'}, {SUPABASE_URL:env.SUPABASE_URL+'/other'}, {SUPABASE_URL:env.SUPABASE_URL+'?x=1'}]) {
    let calls=0;
    const bridge=createSupabaseBridge({env:{...env,...overrides},fetcher:()=>{calls++;}});
    assert.equal((await bridge.check()).configured,false); assert.equal(calls,0);
  }
});
test('read-only connection check confirms Auth and denied anonymous RPC', async t => {
  const {base,bridge} = await running(t,{fetcher:async url=>url.includes('/settings')?json({external:{email:true}}):json({code:'42501'},401)});
  const r=await fetch(base+'/backend-status'); const data=await r.json();
  assert.equal(r.status,200); assert.equal(data.connected,true); assert.equal(data.applicationReady,false); assert.equal(data.learnerFlowsVerified,false);
  assert.doesNotMatch(JSON.stringify(data),/publishable_test_key|abcdefghijklmnopqrst|test@example/);
  assert.equal((await bridge.check()).unauthenticatedAccessBlocked,true);
});
test('connection check fails if anonymous RPC unexpectedly succeeds', async t => {
  const {base}=await running(t,{fetcher:async()=>json({})});
  const r=await fetch(base+'/backend-status'); assert.equal(r.status,503); assert.equal((await r.json()).connected,false);
});
test('connection check fails for missing RPC, wrong keys or network failure', async () => {
  for (const fetcher of [async()=>json({code:'PGRST202'},404),async()=>json({message:'Invalid API key'},401),async()=>{throw Error('secret backend failure');}]) {
    const data=await createSupabaseBridge({env,fetcher}).check(); assert.equal(data.connected,false); assert.doesNotMatch(JSON.stringify(data),/secret backend/);
  }
});
test('connection checks are coalesced and cached', async () => {
  let calls=0;
  const bridge=createSupabaseBridge({env,fetcher:async url=>{calls++; return url.includes('/settings')?json({}):json({code:'42501'},403);}});
  await Promise.all([bridge.check(),bridge.check(),bridge.check()]); await bridge.check(); assert.equal(calls,2);
});
test('missing bearer token and spoofed old identity cannot read progress', async t => {
  let calls=0; const {base}=await running(t,{fetcher:async()=>{calls++;return json(user);}});
  for (const path of ['me','progress','checkpoint']) {
    const r=await fetch(base+'/api/supabase/'+path,{headers:{'oai-authenticated-user-id':user.id}}); assert.equal(r.status,401);
  }
  assert.equal(calls,0);
});
test('invalid access token is rejected by Auth before any data request', async t => {
  let calls=0; const {base}=await running(t,{fetcher:async()=>{calls++;return json({message:'invalid jwt secret'},401);}});
  const r=await fetch(base+'/api/supabase/progress',{headers}); assert.equal(r.status,401); assert.equal(calls,1); assert.doesNotMatch(await r.text(),/invalid jwt secret/);
});
test('anonymous signed-in accounts and invalid identities are rejected', async t => {
  for (const identity of [{...user,is_anonymous:true},{...user,id:'spoof'},{...user,role:'service_role'}]) {
    const {base}=await running(t,{fetcher:async()=>json(identity)});
    assert.equal((await fetch(base+'/api/supabase/me',{headers})).status,403);
  }
});
test('verified me response exposes only the caller id and email', async t => {
  const {base}=await running(t,{fetcher:async()=>json({...user,app_metadata:{private:'not-returned'}})});
  const r=await fetch(base+'/api/supabase/me',{headers}); assert.equal(r.status,200); assert.deepEqual(await r.json(),{id:user.id,email:user.email}); assert.equal(r.headers.get('cache-control'),'no-store');
});
test('progress read forwards the same user token to RLS RPC', async t => {
  const calls=[]; const {base}=await running(t,{fetcher:async(url,options)=>{calls.push({url,options});return json(calls.length===1?user:{reviewedCount:0,done:[],seen:[]});}});
  const r=await fetch(base+'/api/supabase/progress',{headers}); assert.equal(r.status,200); assert.equal(calls.length,2);
  assert.match(calls[1].url,/rpc\/pediarounds_render_read_progress$/);
  for (const c of calls) {assert.equal(c.options.headers.Authorization,headers.Authorization);assert.equal(c.options.headers.apikey,env.SUPABASE_PUBLISHABLE_KEY);assert.equal(c.options.redirect,'error');assert.ok(c.options.signal);}
});
test('progress write accepts source question ids unchanged', async t => {
  let sent; const payload={completed:[{questionId:'source/2025-Q003',correct:true}],seen:['source/2025-Q003']};
  const {base}=await running(t,{fetcher:async(url,options)=>{if(url.includes('/user'))return json(user);sent=JSON.parse(options.body);return json({reviewedCount:1});}});
  const r=await fetch(base+'/api/supabase/progress',{method:'POST',headers,body:JSON.stringify(payload)}); assert.equal(r.status,200); assert.deepEqual(sent,payload);
});
test('progress rejects user overrides, oversized batches and invalid types', () => {
  for (const payload of [{user_id:user.id},{completed:null},{seen:null},{seen:['']},{seen:['a\n']},{completed:[{questionId:'q',correct:'true'}]},{completed:[{questionId:'q'}]},{completed:[{questionId:'q',correct:true,user_id:user.id}]},{seen:Array(501).fill('q')}]) assert.throws(()=>validatePayload('progress',payload));
});
test('checkpoint maps expected revision without user ids', async t => {
  let sent; const {base}=await running(t,{fetcher:async(url,options)=>{if(url.includes('/user'))return json(user);sent=JSON.parse(options.body);return json({revision:3,state:{questionId:'q2'}});}});
  const r=await fetch(base+'/api/supabase/checkpoint',{method:'POST',headers,body:JSON.stringify({expectedRevision:2,state:{questionId:'q2'}})}); assert.equal(r.status,200);assert.deepEqual(sent,{expected_revision:2,new_state:{questionId:'q2'}});
});
test('checkpoint read uses existing read RPC', async t => {
  const {base}=await running(t,{fetcher:async url=>url.includes('/user')?json(user):(assert.match(url,/pediarounds_render_read_checkpoint$/),json({revision:0,state:null}))});
  const r=await fetch(base+'/api/supabase/checkpoint',{headers});assert.equal(r.status,200);assert.deepEqual(await r.json(),{revision:0,state:null});
});
test('stale checkpoint is 409, never reported as a successful save', async t => {
  const {base}=await running(t,{fetcher:async url=>url.includes('/user')?json(user):json({code:'40001',message:'private detail'},500)});
  const r=await fetch(base+'/api/supabase/checkpoint',{method:'POST',headers,body:JSON.stringify({expectedRevision:1,state:{}})}); assert.equal(r.status,409);assert.deepEqual(await r.json(),{error:'checkpoint_conflict'});
});
test('invalid checkpoint shape, revision and size fail locally', () => {
  for (const body of [{state:{}},{expectedRevision:-1,state:{}},{expectedRevision:1,state:[]},{expectedRevision:1,state:{},user_id:user.id},{expectedRevision:1,state:{text:'x'.repeat(50000)}}]) assert.throws(()=>validatePayload('checkpoint',body));
});
test('non-JSON and malformed JSON bodies are rejected', async t => {
  const {base}=await running(t);
  assert.equal((await fetch(base+'/api/supabase/progress',{method:'POST',headers:{Authorization:headers.Authorization},body:'password=x'})).status,415);
  assert.equal((await fetch(base+'/api/supabase/progress',{method:'POST',headers,body:'{'})).status,400);
});
test('oversized request returns 413 rather than accepting it', async t => {
  const {base}=await running(t);const r=await fetch(base+'/api/supabase/checkpoint',{method:'POST',headers,body:JSON.stringify({state:{text:'x'.repeat(62000)},expectedRevision:0})});assert.equal(r.status,413);
});
test('unexpected methods and unknown endpoints are not forwarded', async t => {
  const {base}=await running(t);assert.equal((await fetch(base+'/api/supabase/admin',{headers})).status,404);assert.equal((await fetch(base+'/api/supabase/me',{method:'POST',headers})).status,405);
});
test('network and invalid JSON errors are safely redacted', async t => {
  for (const fetcher of [async()=>{throw Error('token=password');},async()=>new Response('backend internal HTML')]) {
    const {base}=await running(t,{fetcher}); const r=await fetch(base+'/api/supabase/me',{headers}); assert.ok([502,503].includes(r.status));assert.doesNotMatch(await r.text(),/password|HTML|token=/);
  }
});
test('HEAD backend status emits no response body', async t => {
  const {base}=await running(t,{env:{}}); const r=await fetch(base+'/backend-status',{method:'HEAD'});assert.equal(r.status,503);assert.equal(await r.text(),'');
});
