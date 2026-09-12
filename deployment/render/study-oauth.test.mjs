import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createStudyAuth, ACCESS, REFRESH} from './study-auth.mjs';
import {OAUTH_COOKIE} from './study-oauth.mjs';
import {validateAuthorizationUrl} from './study-social.mjs';

const ORIGIN='https://pediarounds-render-staging.onrender.com';
const AUTH='https://abcdefghijklmnopqrst.supabase.co';
const env={RENDER_EXTERNAL_URL:ORIGIN,PEDIAROUNDS_EXTERNAL_BACKEND:'enabled',PEDIAROUNDS_SUPABASE_URL:AUTH,PEDIAROUNDS_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture_only'};
const TOKEN='oauth-fixture-access-token-not-a-real-token';
const RT='fixture-refresh-token';
const CODE='one-use-auth-code-fixture-12345';
const USER={id:'00000000-0000-4000-8000-000000000001',email:'reader@example.test',role:'authenticated',email_confirmed_at:'2026-09-01T00:00:00Z'};
const req=(extra={})=>({method:'POST',headers:{origin:ORIGIN,'sec-fetch-site':'same-origin'},socket:{remoteAddress:'127.0.0.1'},...extra});
const res=()=>({headers:new Map(),setHeader(k,v){this.headers.set(k.toLowerCase(),v);},getHeader(k){return this.headers.get(k.toLowerCase());}});
const cookieHeader=r=>(r.getHeader('Set-Cookie')||[]).map(c=>c.split(';')[0]).join('; ');
const transaction=r=>JSON.parse(Buffer.from(cookieHeader(r).split('=')[1],'base64url').toString());
function setup(options={}) {
  let time=1800000000000;
  const calls=[],used=new Set();
  const fetcher=async(url,init)=>{
    calls.push({url,init});
    if(options.networkFailure)throw Error('Do not leak upstream diagnostics or secrets');
    if(url.endsWith('/settings'))return new Response(JSON.stringify(options.settings||{external:{google:true,apple:true},privateValue:'must-not-leak'}),{status:200});
    if(url.includes('grant_type=pkce')){
      const data=JSON.parse(init.body);
      if(options.exchangeError||used.has(data.auth_code))return new Response('{"error_description":"Do not expose provider credentials"}',{status:400});
      used.add(data.auth_code);
      return new Response(JSON.stringify({access_token:TOKEN,refresh_token:RT,provider_token:'never-send-to-browser',user:{id:'untrusted-token-payload'}}),{status:200});
    }
    if(url.includes('grant_type=password')||url.includes('grant_type=refresh_token'))return new Response(JSON.stringify({access_token:TOKEN,refresh_token:RT}),{status:200});
    if(url.endsWith('/user'))return new Response(JSON.stringify({...USER,...options.user}),{status:options.invalidUser?401:200});
    if(url.includes('/logout'))return new Response(null,{status:204});
    if(url.includes('/signup'))return new Response(JSON.stringify(USER),{status:200});
    throw Error('unexpected endpoint');
  };
  const auth=createStudyAuth({env:options.env||env,fetcher,now:()=>time});
  return {auth,calls,advance:ms=>{time+=ms;}};
}
async function started(s,provider='google') {
  const response=res(),data=await s.auth.oauth.begin(req(),response,{provider});
  return {response,data,cookie:cookieHeader(response)};
}
const callback=cookie=>req({method:'GET',url:'/auth/callback?code='+CODE,headers:{cookie,'sec-fetch-site':'cross-site'}});

for(const provider of ['google','apple'])test(provider+' uses a fixed callback and SHA-256 PKCE',async()=>{
  const s=setup(),{response,data}=await started(s,provider),url=new URL(data.url),t=transaction(response);
  assert.equal(url.origin,AUTH);assert.equal(url.pathname,'/auth/v1/authorize');assert.equal(url.searchParams.get('provider'),provider);
  assert.equal(url.searchParams.get('redirect_to'),ORIGIN+'/auth/callback');assert.equal(url.searchParams.get('code_challenge_method'),'s256');
  assert.equal(url.searchParams.get('code_challenge'),createHash('sha256').update(t.verifier).digest('base64url'));
  assert.equal(data.url.includes(t.verifier),false);assert.doesNotMatch(JSON.stringify(data),/refresh_token|access_token|sb_publishable_|client_secret/);
  assert.equal(validateAuthorizationUrl(data.url,AUTH,provider,ORIGIN),data.url);
  const c=response.getHeader('Set-Cookie')[0];for(const required of ['__Host-','Path=/','HttpOnly','Secure','SameSite=Lax','Max-Age=600'])assert.ok(c.includes(required));
  assert.equal(c.includes('Domain='),false);
});
test('each login attempt creates an independent verifier',async()=>{const s=setup();const a=await started(s),b=await started(s);assert.notEqual(transaction(a.response).verifier,transaction(b.response).verifier);});
test('provider status exposes only capability flags and a public auth origin',async()=>{const {auth}=setup();assert.deepEqual(await auth.oauth.providers(),{configured:true,providers:{google:true,apple:true},authorizationOrigin:AUTH});});
test('provider status has a short cache and refreshes after expiry',async()=>{const s=setup();await Promise.all([s.auth.oauth.providers(),s.auth.oauth.providers()]);assert.equal(s.calls.length,1);s.advance(30001);await s.auth.oauth.providers();assert.equal(s.calls.length,2);});
test('unconfigured backend never contacts Supabase',async()=>{const s=setup({env:{}});assert.equal((await s.auth.oauth.providers()).configured,false);await assert.rejects(s.auth.oauth.begin(req(),res(),{provider:'google'}),{code:'external_backend_not_configured'});assert.equal(s.calls.length,0);});
for(const provider of ['google','apple'])test(provider+' disabled in Supabase cannot start',async()=>{const s=setup({settings:{external:{google:false,apple:false}}}),r=res();await assert.rejects(s.auth.oauth.begin(req(),r,{provider}),{code:'oauth_provider_not_enabled'});assert.equal(r.getHeader('Set-Cookie'),undefined);});
for(const data of [{provider:'facebook'},{provider:'Google'},{provider:'google',next:'https://evil.example'},['google'],{},null])test('invalid provider request rejected: '+JSON.stringify(data),async()=>{const s=setup();await assert.rejects(s.auth.oauth.begin(req(),res(),data),{code:'invalid_oauth_provider'});assert.equal(s.calls.length,0);});
test('GET cannot initiate OAuth',async()=>{const s=setup();await assert.rejects(s.auth.oauth.begin(req({method:'GET'}),res(),{provider:'google'}),{code:'method_not_allowed'});assert.equal(s.calls.length,0);});
for(const headers of [{origin:'https://evil.example'},{origin:ORIGIN,'sec-fetch-site':'cross-site'},{}])test('OAuth initiation rejects unsafe origin '+JSON.stringify(headers),async()=>{const s=setup();await assert.rejects(s.auth.oauth.begin(req({headers}),res(),{provider:'google'}),{code:'same_origin_required'});assert.equal(s.calls.length,0);});
test('start is rate limited',async()=>{const s=setup();for(let i=0;i<12;i++)await started(s);await assert.rejects(started(s),{code:'rate_limited'});});
test('malformed capability flags fail closed',async()=>{const s=setup({settings:{external:{google:'true',apple:true}}});await assert.rejects(s.auth.oauth.providers(),{code:'oauth_settings_unavailable'});});
test('successful callback verifies /user and stores tokens only in secure cookies',async()=>{
 const s=setup(),a=await started(s,'apple'),r=res();const result=await s.auth.oauth.callback(callback(a.cookie),r);
 assert.equal(result,'/study');const exchange=s.calls.find(c=>c.url.includes('grant_type=pkce'));
 assert.deepEqual(JSON.parse(exchange.init.body),{auth_code:CODE,code_verifier:transaction(a.response).verifier});
 assert.equal(exchange.init.redirect,'error');assert.equal(s.calls.at(-1).url,AUTH+'/auth/v1/user');assert.equal(s.calls.at(-1).init.headers.Authorization,'Bearer '+TOKEN);
 assert.equal(r.getHeader('Set-Cookie').length,3);assert.match(r.getHeader('Set-Cookie')[0],new RegExp(ACCESS+'='));assert.match(r.getHeader('Set-Cookie')[1],new RegExp(REFRESH+'='));
 assert.match(r.getHeader('Set-Cookie')[2],/Max-Age=0/);assert.doesNotMatch(result,/fixture|token/);
});
test('successful callback ignores open-redirect and provider overrides',async()=>{const s=setup(),a=await started(s),r=res(),q=callback(a.cookie);q.url+='&next=https%3A%2F%2Fevil.example&provider=apple';assert.equal(await s.auth.oauth.callback(q,r),'/study');});
test('callback requires a browser-bound pending cookie',async()=>{const s=setup(),r=res();assert.equal(await s.auth.oauth.callback(callback(''),r),'/study?auth_error=oauth_expired');assert.equal(s.calls.length,0);assert.match(r.getHeader('Set-Cookie')[0],/Max-Age=0/);});
test('callback rejects duplicate pending cookies',async()=>{const s=setup(),a=await started(s);assert.equal(await s.auth.oauth.callback(callback(a.cookie+'; '+a.cookie),res()),'/study?auth_error=oauth_expired');assert.equal(s.calls.length,1);});
test('expired pending cookie cannot exchange a code',async()=>{const s=setup(),a=await started(s);s.advance(600000);assert.equal(await s.auth.oauth.callback(callback(a.cookie),res()),'/study?auth_error=oauth_expired');assert.equal(s.calls.length,1);});
test('future-dated pending cookie is rejected',async()=>{const s=setup(),a=await started(s),t=transaction(a.response);t.createdAt+=9999;const value=OAUTH_COOKIE+'='+Buffer.from(JSON.stringify(t)).toString('base64url');assert.equal(await s.auth.oauth.callback(callback(value),res()),'/study?auth_error=oauth_expired');});
for(const value of ['invalid','A'.repeat(1100),Buffer.from('{"version":1}').toString('base64url')])test('malformed pending cookie rejected '+value.slice(0,12),async()=>{const s=setup();assert.equal(await s.auth.oauth.callback(callback(OAUTH_COOKIE+'='+value),res()),'/study?auth_error=oauth_expired');assert.equal(s.calls.length,0);});
for(const query of ['', '?code=short', '?code='+CODE+'&code='+CODE, '?code=%3Cscript%3E'])test('malformed callback code rejected '+query.slice(0,24),async()=>{const s=setup(),a=await started(s),r=res(),q=callback(a.cookie);q.url='/auth/callback'+query;assert.equal(await s.auth.oauth.callback(q,r),'/study?auth_error=oauth_failed');assert.equal(s.calls.length,1);});
test('cancellation is sanitized and clears only the transient cookie',async()=>{const s=setup(),a=await started(s),r=res(),q=callback(a.cookie);q.url='/auth/callback?error=access_denied&error_description=<script>secret</script>';assert.equal(await s.auth.oauth.callback(q,r),'/study?auth_error=oauth_cancelled');assert.equal(r.getHeader('Set-Cookie').length,1);assert.equal(s.calls.length,1);});
test('failed exchange reveals no upstream error or new session cookie',async()=>{const s=setup({exchangeError:true}),a=await started(s),r=res();assert.equal(await s.auth.oauth.callback(callback(a.cookie),r),'/study?auth_error=oauth_failed');assert.equal(r.getHeader('Set-Cookie').length,1);});
test('provider-issued code is one-use even when a pending cookie is replayed',async()=>{const s=setup(),a=await started(s);assert.equal(await s.auth.oauth.callback(callback(a.cookie),res()),'/study');assert.equal(await s.auth.oauth.callback(callback(a.cookie),res()),'/study?auth_error=oauth_failed');});
for(const user of [{email_confirmed_at:null},{role:'anon'},{is_anonymous:true},{id:'spoof'},{deleted_at:'2026-09-12'},{banned_until:'2999-01-01T00:00:00Z'}])test('untrusted or unconfirmed Supabase user rejected '+JSON.stringify(user),async()=>{const s=setup({user}),a=await started(s),r=res();assert.equal(await s.auth.oauth.callback(callback(a.cookie),r),'/study?auth_error=oauth_failed');assert.equal(r.getHeader('Set-Cookie').length,1);});
test('Apple relay email works without guessing or merging identities',async()=>{const s=setup({user:{email:'private@privaterelay.appleid.com'}}),a=await started(s,'apple');assert.equal(await s.auth.oauth.callback(callback(a.cookie),res()),'/study');});
test('ordinary email sign-in preserves the two-cookie contract',async()=>{const s=setup(),r=res();await s.auth.signIn(req(),r,{email:USER.email,password:'test-password'});assert.equal(r.getHeader('Set-Cookie').length,2);});
test('email sign-in cancels a previously started social sign-in',async()=>{const s=setup(),a=await started(s),r=res();await s.auth.signIn(req({headers:{origin:ORIGIN,cookie:a.cookie}}),r,{email:USER.email,password:'test-password'});assert.equal(r.getHeader('Set-Cookie').length,3);assert.match(r.getHeader('Set-Cookie')[2],/Max-Age=0/);});
test('logout clears pending OAuth as well as the current session',async()=>{const s=setup(),a=await started(s),r=res();await s.auth.signOut(req({headers:{cookie:a.cookie}}),r);for(const c of r.getHeader('Set-Cookie'))assert.match(c,/Max-Age=0/);assert.equal(r.getHeader('Set-Cookie').length,3);});
test('provider network failures are sanitized and retryable',async()=>{const s=setup({networkFailure:true});await assert.rejects(s.auth.oauth.providers(),{code:'auth_unavailable'});});
for(const bad of ['https://evil.example/auth/v1/authorize','javascript:alert(1)','https://abcdefghijklmnopqrst.supabase.co.evil.example/auth/v1/authorize'])test('browser refuses unexpected authorization location '+bad,()=>assert.equal(validateAuthorizationUrl(bad,AUTH,'google',ORIGIN),null));
test('browser rejects altered callbacks or duplicate provider parameters',async()=>{const s=setup(),a=await started(s);for(const [k,v] of [['redirect_to','https://evil.example'],['code_challenge_method','plain'],['provider','apple']]){const u=new URL(a.data.url);u.searchParams.set(k,v);assert.equal(validateAuthorizationUrl(u.href,AUTH,'google',ORIGIN),null);}assert.equal(validateAuthorizationUrl(a.data.url+'&provider=google',AUTH,'google',ORIGIN),null);});
