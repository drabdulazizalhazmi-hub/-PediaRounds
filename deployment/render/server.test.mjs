import test from 'node:test';
import assert from 'node:assert/strict';
import { createProbeServer, parsePort } from './server.mjs';
import './external-backend.test.mjs';
import './study.test.mjs';
import './service-diagnostics.test.mjs';
import './service-diagnostics.http.test.mjs';

async function running(t) {
  const server = createProbeServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return `http://127.0.0.1:${server.address().port}`;
}
test('health is explicitly process-only', async t => {
  const base = await running(t); const response = await fetch(base + '/healthz');
  assert.equal(response.status, 200); assert.equal((await response.json()).scope, 'external-backend-process-only');
});
test('application readiness fails closed', async t => {
  const base = await running(t); const response = await fetch(base + '/readyz');
  assert.equal(response.status, 503); const status = await response.json();
  for (const field of ['applicationReady','questionsMigrated','accountsMigrated','progressMigrated']) assert.equal(status[field], false);
});
test('home is labelled setup-only, with restrictive headers', async t => {
  const base = await running(t); const response = await fetch(base); const html = await response.text();
  assert.match(html, /ليست منصة الأسئلة/); assert.match(html, /Hosting setup only/);
  assert.doesNotMatch(html, /<form|<script|type="password"/i);
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.match(response.headers.get('x-robots-tag'), /noindex/); assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('spoofed legacy identity headers cannot unlock data', async t => {
  const base = await running(t);
  for (const path of ['/api/questions', '/api/progress', '/api/source-documents/test', '/quiz', '/signin-with-chatgpt']) {
    const response = await fetch(base + path, { headers: { 'oai-authenticated-user-id':'spoof', 'oai-authenticated-user-email':'spoof@example.test' } });
    assert.equal(response.status, 503, path); assert.equal(response.headers.get('set-cookie'), null);
  }
});
test('repository files and secrets are not served', async t => {
  const base = await running(t);
  for (const path of ['/.env', '/.git/config', '/README.md', '/server.mjs']) assert.equal((await fetch(base + path)).status, 404, path);
  assert.equal((await fetch(base + '/master-bank/data/test.json')).status, 404);
});
test('legacy writes are rejected without recording personal data', async t => {
  const base = await running(t); const response = await fetch(base + '/login', { method:'POST', body:'password=not-stored' });
  assert.equal(response.status, 405); assert.equal(response.headers.get('allow'), 'GET, HEAD');
});
test('HEAD has no body and robots disables indexing', async t => {
  const base = await running(t); const response = await fetch(base, { method:'HEAD' });
  assert.equal(response.status, 200); assert.equal(await response.text(), '');
  assert.match(await (await fetch(base + '/robots.txt')).text(), /Disallow: \//);
});
test('port validation rejects invalid bind values', () => {
  assert.equal(parsePort(undefined), 10000); assert.equal(parsePort('12345'), 12345);
  for (const port of ['','0','65536','-1','1.5','abc','10x']) assert.throws(() => parsePort(port));
});
test('external routes are wired into the deployed entrypoint and reject anonymous access',async t=>{
 const base=await running(t);
 for(const endpoint of ['session','progress','checkpoint']) assert.equal((await fetch(base+'/api/external/'+endpoint)).status,401);
});
test('backend status never implies full migration or browser login success',async t=>{
 const base=await running(t);const status=await(await fetch(base+'/external-backend-status')).json();
 for(const key of ['frontendIntegrated','endToEndLoginTested','existingDataMigrated'])assert.equal(status[key],false);
 assert.equal(status.studyBetaIntegrated,true);
 assert.doesNotMatch(JSON.stringify(status),/sb_publishable_|sb_secret_|eyJ/);
});
test('deployed entrypoint serves the new beta and keeps question API protected',async t=>{
 const base=await running(t);assert.match(await(await fetch(base+'/study')).text(),/id="login-form"/);
 const login=await fetch(base+'/login',{redirect:'manual',headers:{'oai-authenticated-user-id':'spoof'}});
 assert.equal(login.status,302);assert.equal(login.headers.get('location'),'/study');assert.equal(login.headers.get('set-cookie'),null);
 assert.equal((await fetch(base+'/api/study/catalog')).status,401);
});

import './study-oauth.test.mjs';
import './study-oauth.http.test.mjs';
import './study-client-reliability.test.mjs';

import './study-reader.test.mjs';
import './study-client.test.mjs';

test('study reader is served as a same-origin script without weakening data guards',async t=>{
 const base=await running(t);const response=await fetch(base+'/study/reader.mjs');
 assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/javascript/);
 assert.match(response.headers.get('content-security-policy'),/script-src 'self'/);
 assert.match(await response.text(),/createEnglishReader/);
 assert.equal((await fetch(base+'/api/study/catalog')).status,401);
});

import './study-client-continuity.test.mjs';
