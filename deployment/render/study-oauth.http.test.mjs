import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createStudyApp} from './study-app.mjs';
import {ACCESS,REFRESH} from './study-auth.mjs';
import {OAUTH_COOKIE} from './study-oauth.mjs';
const ORIGIN='https://pediarounds-render-staging.onrender.com';
const env={RENDER_EXTERNAL_URL:ORIGIN,PEDIAROUNDS_EXTERNAL_BACKEND:'enabled',PEDIAROUNDS_SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',PEDIAROUNDS_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'};
const USER={id:'00000000-0000-4000-8000-000000000001',email:'reader@example.test',role:'authenticated',email_confirmed_at:'2026-09-01T00:00:00Z'};
async function running(t,enabled=true){
 const calls=[];
 const fetcher=async(url,options)=>{
  calls.push({url,options});
  if(url.endsWith('/settings'))return Response.json({external:{google:enabled,apple:enabled},unrelated:'never expose'});
  if(url.endsWith('/token?grant_type=pkce'))return Response.json({access_token:'fixture-access-token-only',refresh_token:'fixture-refresh-token-only'});
  if(url.endsWith('/user'))return Response.json(USER);
  throw Error('Unexpected request');
 };
 const bank={summary:{},catalog:()=>({items:[]}),get:()=>null};
 const app=createStudyApp({env,fetcher,bank});
 const server=createServer(async(req,res)=>{if(!await app.handle(req,res,new URL(req.url,'http://localhost').pathname)){res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
 const request=(path,{body,headers={},method}={})=>fetch('http://127.0.0.1:'+server.address().port+path,{redirect:'manual',method:method||(body===undefined?'GET':'POST'),headers:{...(body===undefined?{}:{Origin:ORIGIN,'Content-Type':'application/json'}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
 return {request,calls};
}
test('HTTP exposes only public provider capabilities',async t=>{const {request}=await running(t);const r=await request('/api/study/oauth/providers');assert.equal(r.status,200);const body=await r.json();assert.deepEqual(body.providers,{google:true,apple:true});assert.doesNotMatch(JSON.stringify(body),/unrelated|publishable|access_token/);assert.match(r.headers.get('cache-control'),/no-store/);});
test('HTTP start is same-origin POST only',async t=>{const {request,calls}=await running(t);assert.equal((await request('/api/study/oauth/start')).status,405);assert.equal((await request('/api/study/oauth/start',{body:{provider:'google'},headers:{Origin:'https://other.example'}})).status,403);assert.equal(calls.length,0);});
for(const provider of ['google','apple'])test('HTTP '+provider+' callback establishes secure cookies and redirects',async t=>{
 const {request,calls}=await running(t);const r=await request('/api/study/oauth/start',{body:{provider}});assert.equal(r.status,200);
 const start=await r.json();assert.equal(new URL(start.url).searchParams.get('provider'),provider);
 const cookie=r.headers.getSetCookie()[0].split(';')[0];assert.ok(cookie.startsWith(OAUTH_COOKIE+'='));
 const finish=await request('/auth/callback?code=valid-fixture-code-12345',{headers:{Cookie:cookie,'Sec-Fetch-Site':'cross-site'}});
 assert.equal(finish.status,303);assert.equal(finish.headers.get('location'),'/study#');assert.equal(await finish.text(),'');
 const cookies=finish.headers.getSetCookie();assert.ok(cookies.some(v=>v.startsWith(ACCESS+'=')));assert.ok(cookies.some(v=>v.startsWith(REFRESH+'=')));assert.ok(cookies.some(v=>v.startsWith(OAUTH_COOKIE+'=;')&&v.includes('Max-Age=0')));
 for(const v of cookies){assert.match(v,/HttpOnly; Secure; SameSite=Lax/);assert.doesNotMatch(v,/Domain=/);}
 assert.equal(calls.at(-1).url.endsWith('/user'),true);assert.equal(finish.headers.get('referrer-policy'),'no-referrer');
});
test('HTTP missing verifier redirects safely without any upstream request',async t=>{const {request,calls}=await running(t);const r=await request('/auth/callback?code=valid-fixture-code-12345&next=https://other.example');assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/study?auth_error=oauth_expired#');assert.equal(calls.length,0);});
test('HTTP disabled provider produces an actionable error and no cookie',async t=>{const {request}=await running(t,false);const r=await request('/api/study/oauth/start',{body:{provider:'apple'}});assert.equal(r.status,409);assert.equal((await r.json()).error,'oauth_provider_not_enabled');assert.equal(r.headers.get('set-cookie'),null);});
test('HTTP callback never accepts cross-site POST',async t=>{const {request,calls}=await running(t);assert.equal((await request('/auth/callback',{body:{code:'valid-fixture-code-12345'}})).status,405);assert.equal(calls.length,0);});
test('HTTP login includes both social controls and preserves email form',async t=>{const {request}=await running(t);const r=await request('/study');const html=await r.text();for(const id of ['signin-google','signin-apple','login-form','email','password'])assert.ok(html.includes('id="'+id+'"'));assert.match(html,/Continue with Google/);assert.match(html,/Continue with Apple/);assert.match(html,/\/study\/social.mjs/);assert.match(r.headers.get('content-security-policy'),/script-src 'self'/);});
test('HTTP serves new social assets but not server auth sources',async t=>{const {request}=await running(t);for(const [path,type] of [['/study/social.mjs','text/javascript'],['/study/social.css','text/css']]){const r=await request(path);assert.equal(r.status,200);assert.ok(r.headers.get('content-type').startsWith(type));assert.equal(r.headers.get('x-content-type-options'),'nosniff');}assert.equal((await request('/study/study-oauth.mjs')).status,404);});
test('HTTP social availability does not unlock questions',async t=>{const {request}=await running(t);await request('/api/study/oauth/providers');for(const action of ['catalog','question?id=example','progress','checkpoint'])assert.equal((await request('/api/study/'+action)).status,401);});
