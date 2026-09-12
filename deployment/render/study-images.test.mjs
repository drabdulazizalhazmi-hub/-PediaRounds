import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadStudyImages} from './study-images.mjs';
import {createStudyApp} from './study-app.mjs';
import {loadRepositoryBank} from './study-bank.mjs';
import {ACCESS} from './study-auth.mjs';

const ORIGIN='https://pediarounds-render-staging.onrender.com';
const TOKEN='fixture-image-session-token';
const USER={id:'00000000-0000-4000-8000-000000000001',email:'fixture@example.test',role:'authenticated',email_confirmed_at:'2026-09-01T00:00:00Z'};
const env={RENDER_EXTERNAL_URL:ORIGIN,PEDIAROUNDS_EXTERNAL_BACKEND:'enabled',PEDIAROUNDS_SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',PEDIAROUNDS_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'};
const questionID='part2-derm-q05';
const questionImage='part2-derm-q05-p639-x4910';
const explanationImage='part2-derm-q05-p639-x4909';
async function serverFixture(t){
 const fetcher=async(url,options)=>new Response(JSON.stringify(USER),{status:options.headers.Authorization==='Bearer '+TOKEN?200:401});
 const app=createStudyApp({env,fetcher});
 const server=createServer(async(req,res)=>{if(!await app.handle(req,res,new URL(req.url,'http://localhost').pathname)){res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
 const base='http://127.0.0.1:'+server.address().port;
 const request=(route,{authenticated=true,method='GET',body}={})=>fetch(base+route,{method,headers:{...(authenticated?{Cookie:ACCESS+'='+TOKEN}:{}),...(body?{Origin:ORIGIN,'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 return {request};
}
test('all 71 images load with checksums and resolve to the same 50 canonical source records',()=>{
 const images=loadStudyImages(),bank=loadRepositoryBank();
 assert.deepEqual(images.status(),{files:71,questions:50,rejected:0,questionFigures:34,explanationFigures:37});
 const doc=JSON.parse(readFileSync(new URL('../../master-bank/sources/recovered-study-images.json',import.meta.url)));
 for(const f of doc.figures)for(const id of f.questionIds){assert.equal(bank.get(id)?.id,id);assert.ok(images.descriptors(id,f.phase,'fixture').some(x=>x.id===f.id));}
});
test('explanation grants reject absent, forged, expired and other-session access',()=>{
 let now=1800000000000;const images=loadStudyImages({now:()=>now});
 const f=images.descriptors(questionID,'explanation','first-session').find(f=>f.id===explanationImage);
 const grant=new URL(f.url,'https://fixture.test').searchParams.get('grant');
 assert.ok(images.get(f.id,'first-session',grant));
 assert.equal(images.get(f.id,'first-session',null),null);
 assert.equal(images.get(f.id,'other-session',grant),null);
 assert.equal(images.get(f.id,'first-session',grant.slice(0,-1)+'!'),null);
 now+=901000;assert.equal(images.get(f.id,'first-session',grant),null);
});
test('source question images are served only after server-verified sign-in',async t=>{
 const {request}=await serverFixture(t),route='/api/study/image?id='+questionImage;
 assert.equal((await request(route,{authenticated:false})).status,401);
 const response=await request(route);assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/jpeg');
 assert.match(response.headers.get('cache-control'),/private, no-store/);assert.equal(response.headers.get('x-content-type-options'),'nosniff');
 const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes[0],255);assert.equal(bytes[1],216);
 const head=await request(route,{method:'HEAD'});assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0);assert.equal(Number(head.headers.get('content-length')),bytes.length);
});
test('question payload and guessed image URL cannot disclose explanation images',async t=>{
 const {request}=await serverFixture(t);
 const response=await request('/api/study/question?id='+questionID),q=await response.json();
 assert.equal(q.figures.length,2);assert.ok(q.figures.every(f=>f.phase==='question'&&!f.url.includes('grant=')));
 assert.equal(q.reviewOnly,true);assert.doesNotMatch(JSON.stringify(q),/sourceKey|explanation-figure|x4909|grant=/);
 assert.equal((await request('/api/study/image?id='+explanationImage)).status,404);
 const rejected=await request('/api/study/answer',{method:'POST',body:{id:questionID,selectedIndex:999}});assert.equal(rejected.status,400);
 const answer=await request('/api/study/answer',{method:'POST',body:{id:questionID,selectedIndex:null}}),feedback=await answer.json();
 assert.equal(feedback.correct,null);assert.equal(feedback.figures.length,2);
 const figure=feedback.figures.find(f=>f.id===explanationImage);assert.ok(figure.url.includes('grant='));
 const image=await request(figure.url);assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/png');
 assert.equal((await request(figure.url,{authenticated:false})).status,401);
 assert.equal((await request('/api/study/image?id=../../README.md')).status,404);
});
test('corrupt files and paths outside the asset directory are not served',t=>{
 const root=mkdtempSync(path.join(tmpdir(),'pediarounds-images-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 mkdirSync(path.join(root,'master-bank/sources'),{recursive:true});mkdirSync(path.join(root,'master-bank/assets'),{recursive:true});
 const real=JSON.parse(readFileSync(new URL('../../master-bank/sources/recovered-study-images.json',import.meta.url))).figures[0];
 writeFileSync(path.join(root,'master-bank/assets/bad.jpeg'),'corrupt');
 writeFileSync(path.join(root,'master-bank/sources/recovered-study-images.json'),JSON.stringify({schemaVersion:1,figures:[{...real,assetPath:'master-bank/assets/bad.jpeg'},{...real,id:'escape',assetPath:'master-bank/assets/../../README.jpeg'}]}));
 const images=loadStudyImages({root});assert.equal(images.status().files,0);assert.equal(images.status().rejected,2);
});
