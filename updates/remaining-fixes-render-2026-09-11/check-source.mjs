#!/usr/bin/env node
// Read-only guard for the legacy test fixture. This never applies or deploys a patch.
import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

function main() {
  const source = process.argv[2];
  if (!source || process.argv.length !== 3) {
    console.error('Usage: node check-source.mjs /absolute/path/to/source-copy');
    return 2;
  }
  const root = realpathSync(resolve(source));
  const manifest = JSON.parse(readFileSync(new URL('./source-fingerprints.json', import.meta.url), 'utf8'));
  const results = manifest.files.map(({ path, before, after }) => {
    try {
      const actual = createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex');
      return { path, status: actual === before ? 'before' : actual === after ? 'after' : 'different' };
    } catch { return { path, status: 'missing-or-unreadable' }; }
  });
  for (const { path, status } of results) console.log(`${status}: ${path}`);
  if (results.every(result => result.status === 'after')) {
    console.log('The three target files match the tested hardened fixture. No files changed.');
    console.log('This is not proof that the complete application or deployment is ready.');
    return 0;
  }
  if (!results.every(result => result.status === 'before')) {
    console.error('STOP: unknown or mixed source revision. Review and merge manually; do not overwrite newer code.');
    return 1;
  }
  const patch = fileURLToPath(new URL('./hardening.patch', import.meta.url));
  const check = spawnSync('git', ['-C', root, 'apply', '--check', patch], {
    encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (check.error || check.status !== 0) {
    console.error('STOP: git apply --check failed; nothing was changed.');
    if (check.stderr) console.error(check.stderr.trim());
    return 1;
  }
  console.log('Legacy fixture fingerprints match and git apply --check passed. No files changed.');
  console.log('Latest production source still requires a separate merge and integration review.');
  return 0;
}
try { process.exitCode = main(); }
catch (error) { console.error(`Preflight failed: ${error.message}`); process.exitCode = 2; }
