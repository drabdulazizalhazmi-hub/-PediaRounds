import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inspectSource } from './preflight.mjs';

function fixture(t, files = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pedia-preflight-'));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), {recursive:true});
    fs.writeFileSync(path.join(root, name), content);
  }
  return root;
}
const codes = r => r.blockers.map(b => b.code);
test('requires an explicit source path', () => assert.throws(() => inspectSource(''), TypeError));
test('rejects an incomplete expected commit', t => assert.throws(() => inspectSource(fixture(t), {expectedCommit:'abc'}), TypeError));
test('missing directory never becomes deployable', t => {
  const r = inspectSource(path.join(fixture(t), 'absent'));
  assert.ok(codes(r).includes('SOURCE_DIRECTORY_UNAVAILABLE'));
  assert.equal(r.releaseApproved, false);
});
test('repair-only checkout is rejected as a full app', t => {
  const r = inspectSource(fixture(t, {'updates/fix.js':'export const fix = true;'}));
  assert.ok(codes(r).includes('FULL_APPLICATION_FILES_MISSING'));
});
test('malformed package input is classified, not executed', t => {
  const r = inspectSource(fixture(t, {'package.json':'{ invalid json'}));
  assert.ok(codes(r).includes('PACKAGE_JSON_INVALID'));
  assert.equal(r.projectScriptsExecuted, false);
});
test('Cloudflare module import is a portability blocker', t => {
  const r = inspectSource(fixture(t, {'db/progress.ts':'const {env} = await import("cloudflare:workers");'}));
  assert.deepEqual(r.blockers.find(b => b.code === 'CLOUDFLARE_RUNTIME_ADAPTER_REQUIRED').files, ['db/progress.ts']);
});
test('platform identity headers require a trusted authentication boundary', t => {
  const r = inspectSource(fixture(t, {'app/chatgpt-auth.ts':'const id = headers.get("oai-authenticated-user-id");'}));
  assert.ok(codes(r).includes('TRUSTED_AUTH_BOUNDARY_MUST_BE_VERIFIED_ON_RENDER'));
});
test('asset binding dependency is detected', t => {
  const r = inspectSource(fixture(t, {'server/images.mjs':'return env.ASSETS.fetch(request);'}));
  assert.ok(codes(r).includes('ASSET_BINDING_ADAPTER_REQUIRED'));
});
test('only required secret names are reported, never .env values', t => {
  const root = fixture(t, {'server/content.mjs':'const key = env.PEDIA_SOURCE_DOCUMENT_KEY;', '.env':'PEDIA_SOURCE_DOCUMENT_KEY=DO_NOT_EXPOSE_THIS_VALUE'});
  const r = inspectSource(root);
  assert.ok(JSON.stringify(r).includes('PEDIA_SOURCE_DOCUMENT_KEY'));
  assert.ok(!JSON.stringify(r).includes('DO_NOT_EXPOSE_THIS_VALUE'));
  assert.equal(r.secretValuesRead, false);
});
test('unverified revision never becomes current or release-approved', t => {
  const r = inspectSource(fixture(t));
  assert.ok(codes(r).includes('CURRENT_SOURCE_REVISION_NOT_CONFIRMED'));
  assert.equal(r.sourceRevisionMatched, false);
  assert.equal(r.releaseApproved, false);
});
test('a source archive with no Git revision requires verification', t => {
  const r = inspectSource(fixture(t), {expectedCommit:'a'.repeat(40)});
  assert.ok(codes(r).includes('SOURCE_COMMIT_NOT_VERIFIABLE'));
});
test('symlinked source paths are not followed', t => {
  const outside = fixture(t, {'chatgpt-auth.ts':'PRIVATE_MARKER'});
  const root = fixture(t);
  fs.symlinkSync(outside, path.join(root, 'app'));
  const r = inspectSource(root);
  assert.ok(!JSON.stringify(r).includes('PRIVATE_MARKER'));
  assert.ok(!r.fingerprints['app/chatgpt-auth.ts']);
});
test('inspection does not modify files', t => {
  const root = fixture(t, {'package.json':'{"scripts":{"build":"echo build","start":"echo start"}}'});
  const before = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
  inspectSource(root);
  assert.equal(fs.readFileSync(path.join(root, 'package.json'), 'utf8'), before);
  assert.deepEqual(fs.readdirSync(root), ['package.json']);
});
