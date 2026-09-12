import test from 'node:test';
import assert from 'node:assert/strict';
import {canReadEnglish,englishVoices,speechChunks,createEnglishReader} from './study-reader.mjs';
function fixture({voices=[],cancelSync=false,throwSpeak=false}={}) {
 const utterances=[],errors=[],timers=new Map();let serial=0;
 class Utterance {constructor(text){this.text=text;}}
 const synth={paused:false,resumes:0,getVoices:()=>voices,speak(u){utterances.push(u);if(throwSpeak)throw Error('synthetic failure');},cancel(){if(cancelSync)utterances.at(-1)?.onerror?.({error:'interrupted'});},resume(){this.resumes++;this.paused=false;}};
 const reader=createEnglishReader({synth,Utterance,onError:code=>errors.push(code),schedule:fn=>{timers.set(++serial,fn);return serial;},unschedule:id=>timers.delete(id)});
 const tick=()=>{for(const [id,fn] of [...timers]){timers.delete(id);fn();}};
 return {reader,synth,utterances,errors,timers,tick};
}
test('reader rejects mixed-language, blank and non-text units without stripping Arabic',()=>{
 for(const text of ['',null,undefined,42,'123','شرح','English شرح'])assert.equal(canReadEnglish(text),false);
 assert.equal(canReadEnglish('pH 7.35; µg/kg; PaO₂ 80 mmHg'),true);
 const f=fixture();assert.equal(f.reader.speak('English شرح'),false);assert.equal(f.utterances.length,0);
});
test('speech chunks preserve every word and do not split decimal tokens',()=>{
 const text=('pH 7.35 with 0.25 mg/kg.\n').repeat(60),chunks=speechChunks(text);
 assert.ok(chunks.length>1);assert.equal(chunks.join(' '),text.trim().replace(/\s+/g,' '));
 assert.ok(chunks.every(c=>c.length<=240));assert.deepEqual(speechChunks('x'.repeat(500)),['x'.repeat(500)]);
 assert.throws(()=>speechChunks('text',0),RangeError);
});
test('empty or unavailable voice lists do not block first synchronous read',()=>{
 const f=fixture();assert.equal(f.reader.speak('A question.'),true);assert.equal(f.utterances.length,1);assert.equal(f.utterances[0].lang,'en-US');
 f.synth.getVoices=()=>{throw Error('not ready');};assert.deepEqual(englishVoices(f.synth),[]);f.reader.speak('Another question.');assert.equal(f.utterances.length,2);
});
test('selected English voice is retained and other-language voices are not selected',()=>{
 const a={voiceURI:'one',lang:'en-US'},b={voiceURI:'two',lang:'en_GB'},ar={voiceURI:'ar',lang:'ar-SA'};
 const f=fixture({voices:[ar,a,b]});f.reader.speak('Question.',{voiceURI:'two'});assert.equal(f.utterances[0].voice,b);
 f.reader.speak('Question.',{voiceURI:'ar'});assert.equal(f.utterances[1].voice,a);
});
test('starting a new read suppresses synchronous and delayed cancellation errors',()=>{
 const f=fixture({cancelSync:true});f.reader.speak('First.');const old=f.utterances[0];f.reader.speak('Second.');
 old.onerror({error:'network'});old.onend();assert.equal(f.utterances.length,2);assert.deepEqual(f.errors,[]);assert.equal(f.timers.size,0);
});
test('a paused engine resumes only on an explicit new read',()=>{
 const f=fixture();f.synth.paused=true;f.reader.speak('Question.');assert.equal(f.synth.resumes,1);f.reader.stop();assert.equal(f.synth.resumes,1);
});
for(const code of ['network','audio-busy','synthesis-failed'])test('one bounded retry for '+code,()=>{
 const f=fixture();f.reader.speak('Question.');const old=f.utterances[0];old.onerror({error:code});old.onend();old.onerror({error:code});
 assert.equal(f.timers.size,1);assert.equal(f.utterances.length,1);f.tick();assert.equal(f.utterances.length,2);
 f.utterances[1].onerror({error:code});f.tick();assert.equal(f.utterances.length,2);assert.deepEqual(f.errors,[code]);
});
test('stop cancels a pending retry and old callbacks cannot restart audio',()=>{
 const f=fixture();f.reader.speak('Question.');const old=f.utterances[0];old.onerror({error:'network'});f.reader.stop();f.tick();old.onend();
 assert.equal(f.utterances.length,1);assert.deepEqual(f.errors,[]);
});
test('new read cancels the previous text retry',()=>{
 const f=fixture();f.reader.speak('Old.');f.utterances[0].onerror({error:'network'});f.reader.speak('New.');f.tick();
 assert.deepEqual(f.utterances.map(u=>u.text),['Old.','New.']);
});
test('chunk progression ignores duplicate or late completion events',()=>{
 const f=fixture(),text=('English text 0.25 mg/kg. ').repeat(40);f.reader.speak(text);const first=f.utterances[0];first.onend();first.onend();first.onerror({error:'network'});
 assert.equal(f.utterances.length,2);while(f.utterances.length<speechChunks(text).length)f.utterances.at(-1).onend();
 f.utterances.at(-1).onend();assert.equal(f.utterances.map(u=>u.text).join(' '),text.trim());assert.deepEqual(f.errors,[]);
});
for(const code of ['not-allowed','voice-unavailable','canceled','interrupted'])test('no automatic restart after '+code,()=>{
 const f=fixture();f.reader.speak('Question.');f.utterances[0].onerror({error:code});f.tick();assert.equal(f.utterances.length,1);assert.deepEqual(f.errors,[code]);
 f.reader.speak('Manual retry.');assert.equal(f.utterances.length,2);
});
test('synchronous engine exceptions are bounded',()=>{
 const f=fixture({throwSpeak:true});f.reader.speak('Question.');f.tick();f.tick();assert.equal(f.utterances.length,2);assert.deepEqual(f.errors,['synthesis-failed']);
});
test('unsupported devices fail safely',()=>{
 const r=createEnglishReader({synth:null,Utterance:null});assert.equal(r.supported,false);assert.equal(r.speak('Question.'),false);assert.doesNotThrow(()=>r.stop());
});
