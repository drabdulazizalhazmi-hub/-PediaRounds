/** Only checksum-verified, explicitly mapped source figures are served. */
import {readFileSync,realpathSync,statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';

const rootDefault=fileURLToPath(new URL('../../',import.meta.url));
const sha256=data=>createHash('sha256').update(data).digest('hex');
const validID=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,180}$/.test(value);
export function loadStudyImages({root=rootDefault,now=Date.now,secret=randomBytes(32)}={}) {
 const byID=new Map(),byQuestion=new Map();let rejected=0;
 let figures=[];
 try {const doc=JSON.parse(readFileSync(path.join(root,'master-bank/sources/recovered-study-images.json'),'utf8'));if(doc.schemaVersion!==1||!Array.isArray(doc.figures))throw Error('invalid_manifest');figures=doc.figures;}
 catch {rejected++;}
 for(const f of figures){
  try{
   if(!validID(f.id)||byID.has(f.id)||!['question','explanation'].includes(f.phase)||!Array.isArray(f.questionIds)||!f.questionIds.length||!f.questionIds.every(validID))throw Error('invalid_mapping');
   if(!Number.isSafeInteger(f.width)||f.width<1||!Number.isSafeInteger(f.height)||f.height<1||!Number.isSafeInteger(f.sourcePage)||f.sourcePage<1||!/^[a-f0-9]{64}$/.test(f.sha256))throw Error('invalid_metadata');
   if(typeof f.assetPath!=='string'||!/^master-bank\/assets\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g)$/.test(f.assetPath))throw Error('invalid_path');
   const base=realpathSync(path.join(root,'master-bank/assets')),file=realpathSync(path.resolve(root,f.assetPath));
   if(!file.startsWith(base+path.sep)||statSync(file).size>10000000)throw Error('invalid_file');
   const bytes=readFileSync(file);
   const mime=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':null;
   if(!mime||mime!==f.mimeType||sha256(bytes)!==f.sha256)throw Error('invalid_image');
   const image={...f,bytes,mime};byID.set(f.id,image);
   for(const qid of new Set(f.questionIds)){if(!byQuestion.has(qid))byQuestion.set(qid,[]);byQuestion.get(qid).push(image);}
  }catch{rejected++;}
 }
 const signature=(identity,id,expires)=>createHmac('sha256',secret).update(JSON.stringify([identity,id,expires])).digest('base64url');
 function descriptors(qid,phase,identity){
  return (byQuestion.get(qid)||[]).filter(f=>f.phase===phase).map(f=>{
   const expires=String(Math.floor(now()/1000)+900);
   const grant=phase==='explanation'?'&grant='+expires+'.'+signature(identity,f.id,expires):'';
   return {id:f.id,url:'/api/study/image?id='+encodeURIComponent(f.id)+grant,width:f.width,height:f.height,
    alt:'Source '+(phase==='question'?'question':'explanation')+' figure, page '+f.sourcePage,
    caption:'Figure from the source collection - page '+f.sourcePage,phase};
  });
 }
 function get(id,identity,grant){
  const f=byID.get(id);if(!f)return null;
  if(f.phase==='explanation'){
   if(typeof grant!=='string'||!/^\d{10}\.[A-Za-z0-9_-]{43}$/.test(grant))return null;
   const [expires,sig]=grant.split('.'),seconds=Math.floor(now()/1000);
   if(Number(expires)<seconds||Number(expires)>seconds+900)return null;
   const expected=signature(identity,id,expires);
   if(!timingSafeEqual(Buffer.from(expected),Buffer.from(sig)))return null;
  }
  return {bytes:f.bytes,mime:f.mime};
 }
 return {descriptors,get,status:()=>({files:byID.size,questions:byQuestion.size,rejected,
  questionFigures:[...byID.values()].filter(f=>f.phase==='question').length,
  explanationFigures:[...byID.values()].filter(f=>f.phase==='explanation').length})};
}

export const imageSessionIdentity=(user,token)=>user.id+':'+sha256(token);
