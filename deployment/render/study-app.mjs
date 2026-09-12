/** Additive /study beta. The original Site and legacy migration status are untouched. */
import {readFileSync} from 'node:fs';
import {createStudyAuth,readJSON,failure} from './study-auth.mjs';
import {OAUTH_CALLBACK} from './study-oauth.mjs';
import {loadRepositoryBank,beforeAnswer,answerFeedback} from './study-bank.mjs';
const assets=new Map([
  ['/study',['study.html','text/html; charset=utf-8']],
  ['/study/',['study.html','text/html; charset=utf-8']],
  ['/study/app.mjs',['study-client.mjs','text/javascript; charset=utf-8']],
  ['/study/reader.mjs',['study-reader.mjs','text/javascript; charset=utf-8']],
  ['/study/social.mjs',['study-social.mjs','text/javascript; charset=utf-8']],
  ['/study/social.css',['study-social.css','text/css; charset=utf-8']],
  ['/study/style.css',['study.css','text/css; charset=utf-8']]
].map(([route,[file,type]])=>[route,{body:readFileSync(new URL('./'+file,import.meta.url),'utf8'),type}]));
const HEADERS={'Cache-Control':'private, no-store','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow, noarchive','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Vary':'Cookie'};
export function createStudyApp({backend,env=process.env,fetcher=globalThis.fetch,bank=loadRepositoryBank(),now=Date.now}={}) {
  const auth=createStudyAuth({env,fetcher,now});
  function status(){return {stage:'repository-study-beta',browserInterfaceImplemented:true,authConfigured:auth.configured,fullSiteMigrated:false,legacyAccountsMigrated:false,legacyProgressMigrated:false,originalImagesMigrated:false,realUserEndToEndTested:false,bank:bank.summary};}
  async function handle(req,res,pathname) {
    if(!assets.has(pathname)&&pathname!=='/study/status'&&pathname!==OAUTH_CALLBACK&&!pathname.startsWith('/api/study/'))return false;
    const send=(code,data,type='application/json; charset=utf-8',extra={})=>{
      const body=typeof data==='string'?data:JSON.stringify(data);req.resume();
      res.writeHead(code,{...HEADERS,...extra,'Content-Type':type,'Content-Length':Buffer.byteLength(body)});res.end(req.method==='HEAD'?undefined:body);return true;
    };
    try{
      if(pathname===OAUTH_CALLBACK){
        if(req.method!=='GET')throw failure(405,'method_not_allowed');
        return send(303,'','text/plain; charset=utf-8',{Location:(await auth.oauth.callback(req,res))+'#'});
      }
      if(assets.has(pathname)||pathname==='/study/status'){
        if(!['GET','HEAD'].includes(req.method))throw failure(405,'method_not_allowed');
        if(pathname==='/study/status')return send(200,status());
        const asset=assets.get(pathname);return send(200,asset.body,asset.type);
      }
      if(!['GET','POST'].includes(req.method))throw failure(405,'method_not_allowed');
      if(req.method==='POST')auth.guard(req);
      const action=pathname.slice('/api/study/'.length);
      if(action==='oauth/providers'){
        if(req.method!=='GET')throw failure(405,'method_not_allowed');
        return send(200,await auth.oauth.providers());
      }
      if(action==='oauth/start'){
        if(req.method!=='POST')throw failure(405,'method_not_allowed');
        return send(200,await auth.oauth.begin(req,res,await readJSON(req)));
      }
      if(['signin','signup','refresh','signout'].includes(action)) {
        if(req.method!=='POST')throw failure(405,'method_not_allowed');
        const body=await readJSON(req);
        if(action==='signin')return send(200,await auth.signIn(req,res,body));
        if(action==='signup')return send(200,await auth.signUp(req,body));
        if(action==='refresh')return send(200,await auth.refresh(req,res));
        return send(200,await auth.signOut(req,res));
      }
      const {token,user}=await auth.current(req,res);
      if(action==='session'){
        if(req.method!=='GET')throw failure(405,'method_not_allowed');
        return send(200,{user,legacyAccountsMigrated:false});
      }
      if(['progress','checkpoint'].includes(action)) {
        if(!backend)throw failure(503,'backend_unavailable');
        // Origin was checked BEFORE converting the ambient cookie to a bearer token.
        req.headers.authorization='Bearer '+token;
        await backend.handle(req,res,'/api/external/'+action);return true;
      }
      if(action==='catalog'){
        if(req.method!=='GET')throw failure(405,'method_not_allowed');
        return send(200,bank.catalog());
      }
      if(action==='question') {
        if(req.method!=='GET')throw failure(405,'method_not_allowed');
        const params=new URL(req.url,'http://localhost').searchParams;
        const id=params.get('id'),mode=params.get('mode')||'practice';
        if(!['practice','review'].includes(mode))throw failure(400,'invalid_study_mode');
        const q=bank.get(id);if(!q)throw failure(404,'question_not_found');
        if(q.reviewOnly && mode!=='review')throw failure(409,'question_under_review');
        if(!q.reviewOnly && mode==='review')throw failure(409,'question_not_under_review');
        return send(200,beforeAnswer(q));
      }
      if(action==='answer'){
        if(req.method!=='POST')throw failure(405,'method_not_allowed');
        const body=await readJSON(req);
        if(Object.keys(body).some(k=>!['id','selectedIndex'].includes(k))||!Object.hasOwn(body,'selectedIndex'))throw failure(400,'invalid_input');
        const q=bank.get(body.id);if(!q)throw failure(404,'question_not_found');
        return send(200,answerFeedback(q,body.selectedIndex));
      }
      throw failure(404,'not_found');
    }catch(error){return send(error.status||503,{error:error.code||'study_unavailable'},undefined,error.status===429?{'Retry-After':'60'}:{});}
  }
  return {handle,status,oauthProviders:()=>auth.oauth.providers()};
}
