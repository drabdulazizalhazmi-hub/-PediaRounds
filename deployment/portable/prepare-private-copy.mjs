/** Prepare an isolated source copy. Never pushes, deploys, or contacts a database. */
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {readFileSync,mkdirSync,rmSync,existsSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const run=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
const [sourceArg,targetArg]=process.argv.slice(2);
if(!sourceArg||!targetArg||process.argv.length!==4)throw Error('Usage: prepare-private-copy.mjs AUTHORIZED_SOURCE_CHECKOUT NEW_PRIVATE_DIRECTORY');
const source=resolve(sourceArg),target=resolve(targetArg),inside=relative(source,target);
if(!inside||(!inside.startsWith('..')&&!isAbsolute(inside))||existsSync(target))throw Error('Target must be a new directory outside the source checkout');
const verification=JSON.parse(readFileSync(new URL('./verification.json',import.meta.url),'utf8'));
if(run(source,'rev-parse','HEAD')!==verification.sourceCommit||run(source,'status','--porcelain'))throw Error(`Clean exact version-${verification.sourceVersion} source required`);
const patch=fileURLToPath(new URL('./current-v87.patch',import.meta.url));
if(createHash('sha256').update(readFileSync(patch)).digest('hex')!==verification.patchSha256)throw Error('Patch checksum mismatch');
mkdirSync(target,{mode:0o700});
const archive=spawn('git',['archive',verification.sourceCommit],{cwd:source,stdio:['ignore','pipe','inherit']});
const tar=spawn('tar',['-xf','-','-C',target],{stdio:['pipe','ignore','inherit']});
const completed=Promise.all([once(archive,'exit'),once(tar,'exit')]);archive.stdout.pipe(tar.stdin);
if((await completed).some(([code])=>code!==0))throw Error('Source copy failed; incomplete target retained for inspection');
run(target,'apply','--check',patch);run(target,'apply',patch);
const paths=execFileSync('git',['ls-files','-z','data','public'],{cwd:source,encoding:'utf8'}).split('\0').filter(Boolean);
for(const path of paths)if(!readFileSync(resolve(source,path)).equals(readFileSync(resolve(target,path))))throw Error('Content changed: '+path);
// This new copy must never be mistaken for the Sites publishing workspace.
rmSync(resolve(target,'.openai'),{recursive:true,force:true});
run(target,'init','--quiet','--initial-branch',`independent-v${verification.sourceVersion}`);
console.log(JSON.stringify({prepared:target,sourceVersion:verification.sourceVersion,contentFilesUnchanged:paths.length,gitRemotes:0,deployed:false,sourceModified:false}));
