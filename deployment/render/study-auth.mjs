/** Supabase browser sessions. Tokens stay in short-lived HttpOnly cookies. */
import {createHash} from 'node:crypto';
export const ACCESS='__Host-pediarounds_access', REFRESH='__Host-pediarounds_refresh';
const TOKEN=/^[A-Za-z0-9_.-]{16,3500}$/;
const REFRESH_VALUE=/^[A-Za-z0-9_.-]{8,3500}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const failure=(status,code)=>Object.assign(Error(code),{status,code});
export function cookie(req,name) {
  const values=String(req.headers.cookie||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(name+'='));
  if(values.length!==1) return '';
  const value=values[0].slice(name.length+1);return (name===REFRESH?REFRESH_VALUE:TOKEN).test(value)?value:'';
}
export async function readJSON(req) {
  if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||'')) throw failure(415,'json_required');
  if(req.headers['content-encoding'] && req.headers['content-encoding']!=='identity') throw failure(415,'encoding_not_supported');
  if(Number(req.headers['content-length']||0)>16000) throw failure(413,'body_too_large');
  const chunks=[];let size=0;
  for await(const chunk of req.iterator({destroyOnReturn:false})) {size+=chunk.length;if(size>16000) throw failure(413,'body_too_large');chunks.push(chunk);}
  let data;try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw failure(400,'invalid_json');}
  if(!data||typeof data!=='object'||Array.isArray(data))throw failure(400,'invalid_input');
  return data;
}
export function createStudyAuth({env=process.env,fetcher=globalThis.fetch,now=Date.now}={}) {
  const url=String(env.PEDIAROUNDS_SUPABASE_URL||'').replace(/\/$/,'');
  const key=String(env.PEDIAROUNDS_SUPABASE_PUBLISHABLE_KEY||'');
  const configured=env.PEDIAROUNDS_EXTERNAL_BACKEND==='enabled' && /^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url) && /^sb_publishable_[a-zA-Z0-9_-]+$/.test(key);
  const origin=new URL(env.RENDER_EXTERNAL_URL||'https://pediarounds-render-staging.onrender.com').origin;
  let minute=-1,total=0;const attempts=new Map(),refreshing=new Map();
  function guard(req) {
    if(req.headers.origin!==origin || req.headers['sec-fetch-site']==='cross-site')throw failure(403,'same_origin_required');
  }
  function limit(req,email='') {
    const current=Math.floor(now()/60000);if(current!==minute){minute=current;total=0;attempts.clear();}
    if(++total>120)throw failure(429,'rate_limited');
    const id=createHash('sha256').update(String(req.socket?.remoteAddress||'')+'|'+email.toLowerCase()).digest('hex');
    const n=(attempts.get(id)||0)+1;attempts.set(id,n);if(n>12)throw failure(429,'rate_limited');
  }
  async function remote(endpoint,token,payload) {
    if(!configured)throw failure(503,'external_backend_not_configured');
    const controller=new AbortController();let timer;
    const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(failure(503,'auth_unavailable'));},7000);timer.unref?.();});
    try{return await Promise.race([(async()=>{
      const response=await fetcher(url+'/auth/v1'+endpoint,{method:payload===undefined?'GET':'POST',redirect:'error',signal:controller.signal,
        headers:{apikey:key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(payload===undefined?{}:{body:JSON.stringify(payload)})});
      let result={};if(response.status!==204){try{result=await response.json();}catch{throw failure(503,'auth_unavailable');}}
      if(!response.ok){
        if(response.status===429)throw failure(429,'rate_limited');
        if(response.status>=500)throw failure(503,'auth_unavailable');
        if(result?.error_code==='email_not_confirmed')throw failure(401,'email_confirmation_required');
        throw failure(401,'authentication_failed');
      }
      return result;
    })(),deadline]);}catch(error){if(error.status)throw error;throw failure(503,'auth_unavailable');}finally{clearTimeout(timer);}
  }
  async function userFor(token) {
    if(!TOKEN.test(token))throw failure(401,'sign_in_required');
    const u=await remote('/user',token);
    if(!UUID.test(u?.id||'')||u.role!=='authenticated'||u.is_anonymous===true||u.deleted_at||!u.email_confirmed_at||typeof u.email!=='string'||(u.banned_until&&Date.parse(u.banned_until)>now()))throw failure(401,'sign_in_required');
    return {id:u.id,email:u.email};
  }
  function setCookies(res,access,refresh) {
    if(!TOKEN.test(access)||!REFRESH_VALUE.test(refresh))throw failure(503,'invalid_auth_response');
    res.setHeader('Set-Cookie',[ACCESS+'='+access+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600',REFRESH+'='+refresh+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600']);
  }
  function clear(res){res.setHeader('Set-Cookie',[ACCESS+'=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',REFRESH+'=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0']);}
  async function establish(res,data) {
    if(!TOKEN.test(data?.access_token||'')||!REFRESH_VALUE.test(data?.refresh_token||''))throw failure(503,'invalid_auth_response');
    const user=await userFor(data.access_token);setCookies(res,data.access_token,data.refresh_token);return {user};
  }
  async function current(req) {
    if(req.headers['sec-fetch-site']==='cross-site')throw failure(403,'same_origin_required');
    const token=cookie(req,ACCESS),user=await userFor(token);
    // Do not reissue cookies on GET: a slow response must not undo a later logout.
    return {token,user};
  }
  async function signIn(req,res,data) {
    const allowed=['email','password'];if(Object.keys(data).some(k=>!allowed.includes(k)))throw failure(400,'invalid_input');
    if(typeof data.email!=='string'||data.email.length>254||!/^\S+@\S+\.\S+$/.test(data.email)||typeof data.password!=='string'||data.password.length<1||data.password.length>1024)throw failure(400,'invalid_credentials');
    limit(req,data.email);
    return establish(res,await remote('/token?grant_type=password',undefined,{email:data.email.trim(),password:data.password}));
  }
  async function signUp(req,data) {
    if(Object.keys(data).some(k=>!['email','password'].includes(k))||typeof data.email!=='string'||data.email.length>254||!/^\S+@\S+\.\S+$/.test(data.email)||typeof data.password!=='string'||data.password.length<10||data.password.length>1024)throw failure(400,'invalid_signup');
    limit(req,data.email);
    await remote('/signup?redirect_to='+encodeURIComponent(origin+'/study'),undefined,{email:data.email.trim(),password:data.password});
    return {confirmationRequired:true,message:'Check your email for confirmation, then return here and sign in. Existing website accounts are not automatically linked.'};
  }
  async function refresh(req,res) {
    const token=cookie(req,REFRESH);if(!token)throw failure(401,'sign_in_required');limit(req,'refresh');
    const hash=createHash('sha256').update(token).digest('hex');
    let pending=refreshing.get(hash);
    if(!pending){pending=remote('/token?grant_type=refresh_token',undefined,{refresh_token:token});refreshing.set(hash,pending);pending.finally(()=>refreshing.delete(hash)).catch(()=>{});}
    return establish(res,await pending);
  }
  async function signOut(req,res) {
    const token=cookie(req,ACCESS);let remoteRevoked=false;
    try{if(token){await remote('/logout?scope=local',token,{});remoteRevoked=true;}}catch{}finally{clear(res);}
    return {signedOut:true,remoteRevoked};
  }
  return {configured,guard,current,signIn,signUp,refresh,signOut,clear};
}
