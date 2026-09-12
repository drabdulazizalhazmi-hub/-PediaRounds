import test from 'node:test';
import assert from 'node:assert/strict';
import {createDependencyMonitor, studyInfrastructureStatus} from './service-diagnostics.mjs';
const good = {configured:true,authReachable:true,anonymousDatabaseDenied:true};
const study = {authConfigured:true,bank:{questionCount:1029,fileErrors:0,skippedRecords:0,duplicateIDs:0}};

test('diagnostic cache refreshes after TTL and cannot stay healthy forever', async () => {
  let time=0,calls=0,healthy=true;
  const monitor=createDependencyMonitor({now:()=>time,ttlMs:100,backend:{configured:true,probe:async()=>{calls++;return {...good,authReachable:healthy};}}});
  assert.equal((await monitor.check()).authReachable,true);
  time=99;healthy=false;assert.equal((await monitor.check()).authReachable,true);assert.equal(calls,1);
  time=100;assert.equal((await monitor.check()).authReachable,false);assert.equal(calls,2);
  healthy=true;time=200;assert.equal((await monitor.check()).dependencyCheck,'ok');assert.equal(calls,3);
});
test('concurrent diagnostics share one probe and return independent snapshots', async () => {
  let calls=0,release;const gate=new Promise(resolve=>{release=resolve;});
  const monitor=createDependencyMonitor({backend:{configured:true,probe:async()=>{calls++;await gate;return good;}}});
  const a=monitor.check(),b=monitor.check();release();
  const [first,second]=await Promise.all([a,b]);assert.equal(calls,1);
  first.authReachable=false;assert.equal(second.authReachable,true);assert.equal((await monitor.check()).authReachable,true);
});
test('timeouts fail closed and late results cannot turn a timed-out check green', async () => {
  let release;const late=new Promise(resolve=>{release=resolve;});
  const monitor=createDependencyMonitor({timeoutMs:15,backend:{configured:true,probe:()=>late}});
  const snapshot=await monitor.check();assert.equal(snapshot.dependencyCheck,'timeout');assert.equal(snapshot.authReachable,false);
  release(good);await new Promise(resolve=>setImmediate(resolve));
  assert.equal((await monitor.check()).dependencyCheck,'timeout');
});
test('probe rejection and unconfigured backend do not leak errors or credentials', async () => {
  const rejected=createDependencyMonitor({backend:{configured:true,probe:async()=>{throw Error('private secret');}}});
  assert.equal((await rejected.check()).dependencyCheck,'unavailable');
  const unconfigured=createDependencyMonitor({backend:{configured:false,probe:async()=>({...good,key:'private secret'})}});
  const result=await unconfigured.check();assert.equal(result.configured,false);assert.equal(result.authReachable,false);
  assert.doesNotMatch(JSON.stringify(result),/private|secret|key/);
});
test('diagnostic response uses strict booleans and excludes extra remote fields', async () => {
  const monitor=createDependencyMonitor({backend:{configured:true,probe:async()=>({...good,authReachable:'true',credentials:'private'})}});
  const result=await monitor.check();assert.equal(result.authReachable,false);assert.equal(result.dependencyCheck,'unavailable');
  assert.doesNotMatch(JSON.stringify(result),/credentials|private/);
});
test('limited study health never claims migration or real-user completion', () => {
  const result=studyInfrastructureStatus(good,study);assert.equal(result.infrastructureReady,true);
  for(const key of ['applicationReady','fullSiteMigrated','legacyAccountsMigrated','legacyProgressMigrated','originalImagesMigrated','realUserEndToEndTested'])assert.equal(result[key],false);
  assert.equal(result.scope,'repository-study-beta-dependencies-only');
});
test('missing auth, anonymous protection or bank evidence fails study health closed', () => {
  assert.equal(studyInfrastructureStatus(good,null).infrastructureReady,false);
  for(const key of Object.keys(good))assert.equal(studyInfrastructureStatus({...good,[key]:false},study).infrastructureReady,false);
  for(const field of ['fileErrors','skippedRecords','duplicateIDs'])assert.equal(studyInfrastructureStatus(good,{...study,bank:{...study.bank,[field]:1}}).infrastructureReady,false);
  assert.equal(studyInfrastructureStatus(good,{...study,bank:{...study.bank,questionCount:0}}).infrastructureReady,false);
});
test('invalid diagnostic configuration is rejected', () => {
  assert.throws(()=>createDependencyMonitor());
  assert.throws(()=>createDependencyMonitor({backend:{probe:async()=>good},timeoutMs:0}));
});
