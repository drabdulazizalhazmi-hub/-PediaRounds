/** Read-only PediaRounds source portability inventory. No deploys or data changes. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const REQUIRED = ['package.json', 'package-lock.json', 'app/page.tsx',
  'app/chatgpt-auth.ts', 'db/progress.ts', 'public/app.js',
  'lib/merge-question-bank.mjs', 'data/questions.json'];
const ROOTS = ['app', 'db', 'server', 'lib', 'worker'];
const SOURCE_EXT = /\.(?:m?[jt]s|tsx|jsx)$/;
const SKIP = new Set(['.git', 'node_modules', 'dist', '.next', '.wrangler']);
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_FILES = 10000;

function safeFile(root, relative) {
  const full = path.resolve(root, relative);
  const rel = path.relative(root, full);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return false;
  let current = root;
  for (const piece of rel.split(path.sep).filter(Boolean)) {
    current = path.join(current, piece);
    if (!fs.existsSync(current) || fs.lstatSync(current).isSymbolicLink()) return false;
  }
  return fs.statSync(full).isFile();
}
function read(root, relative) {
  if (!safeFile(root, relative)) return null;
  if (fs.statSync(path.join(root, relative)).size > MAX_FILE_BYTES) return null;
  return fs.readFileSync(path.join(root, relative), 'utf8');
}
function digest(root, relative) {
  return safeFile(root, relative)
    ? crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex')
    : null;
}
function listSource(root) {
  const found = [];
  let entriesSeen = 0;
  function walk(relative) {
    const full = path.join(root, relative);
    if (!fs.existsSync(full) || fs.lstatSync(full).isSymbolicLink()) return;
    if (!fs.statSync(full).isDirectory()) return;
    for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
      if (++entriesSeen > MAX_FILES) throw new Error('SOURCE_SCAN_LIMIT');
      if (entry.isSymbolicLink() || SKIP.has(entry.name)) continue;
      const child = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile() && SOURCE_EXT.test(entry.name)) found.push(child);
    }
  }
  for (const dir of ROOTS) walk(dir);
  return found.sort();
}
function commitOf(root) {
  // No project scripts, hooks, package installs, or network requests are run.
  if (!fs.existsSync(path.join(root, '.git'))) return null;
  try {
    return execFileSync('git', ['rev-parse', '--verify', 'HEAD'], {
      cwd: root, encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch { return null; }
}

export function inspectSource(directory, { expectedCommit = null } = {}) {
  if (typeof directory !== 'string' || !directory.trim()) throw new TypeError('An explicit source directory is required.');
  if (expectedCommit !== null && !/^[a-f0-9]{40}$/i.test(expectedCommit)) {
    throw new TypeError('expectedCommit must be a complete 40-character Git commit.');
  }
  const root = path.resolve(directory);
  const report = {
    kind: 'pediarounds-render-portability-inventory-v1',
    readOnly: true, fullApplicationDeployed: false, releaseApproved: false,
    sourceCommit: null, expectedCommit, sourceRevisionMatched: false,
    blockers: [], requirements: [], inspectedFiles: 0,
    secretValuesRead: false, projectScriptsExecuted: false,
    testsOfLiveApplicationRun: false, fingerprints: {},
    limitations: [
      'A static inventory is not a build, login test, or deployment certificate.',
      'The expected commit must come from the authorized current application export.',
      'No live user rows, account mapping, secret values, or image decryptions are inspected.',
    ],
  };
  const block = (code, files = []) => report.blockers.push({ code, files });
  if (!fs.existsSync(root) || fs.lstatSync(root).isSymbolicLink() || !fs.statSync(root).isDirectory()) {
    block('SOURCE_DIRECTORY_UNAVAILABLE'); return report;
  }
  const missing = REQUIRED.filter(p => !safeFile(root, p));
  if (missing.length) block('FULL_APPLICATION_FILES_MISSING', missing);
  const pkgText = read(root, 'package.json');
  if (pkgText !== null) {
    try {
      const pkg = JSON.parse(pkgText);
      if (!pkg || Array.isArray(pkg) || typeof pkg !== 'object') throw new Error();
      if (!pkg.scripts?.build || !pkg.scripts?.start) block('BUILD_OR_START_SCRIPT_MISSING', ['package.json']);
      report.declaredRuntime = {
        node: pkg.engines?.node ?? null,
        vinext: pkg.dependencies?.vinext ?? pkg.devDependencies?.vinext ?? null,
        next: pkg.dependencies?.next ?? null,
      };
    } catch { block('PACKAGE_JSON_INVALID', ['package.json']); }
  } else if (safeFile(root, 'package.json')) block('PACKAGE_JSON_UNREADABLE', ['package.json']);
  report.sourceCommit = commitOf(root);
  if (!expectedCommit) block('CURRENT_SOURCE_REVISION_NOT_CONFIRMED');
  else if (!report.sourceCommit) block('SOURCE_COMMIT_NOT_VERIFIABLE');
  else if (report.sourceCommit.toLowerCase() !== expectedCommit.toLowerCase()) block('SOURCE_REVISION_MISMATCH');
  else report.sourceRevisionMatched = true;
  let sourceFiles = [];
  try { sourceFiles = listSource(root); }
  catch { block('SOURCE_SCAN_INCOMPLETE'); }
  const cloudflare = [], identityHeaders = [], assetBinding = [], oversized = [];
  const secretNames = new Set();
  for (const file of sourceFiles) {
    const text = read(root, file);
    if (text === null) { oversized.push(file); continue; }
    report.inspectedFiles++;
    if (/['"]cloudflare:workers['"]/.test(text)) cloudflare.push(file);
    if (/oai-authenticated-user-(?:id|email)/.test(text)) identityHeaders.push(file);
    if (/\b(?:env\.)?ASSETS\.fetch\s*\(/.test(text)) assetBinding.push(file);
    // Collect identifiers only; do not parse .env files or read runtime secret values.
    for (const match of text.matchAll(/\benv\.(PEDIA_[A-Z0-9_]*(?:KEY|SECRET))\b/g)) secretNames.add(match[1]);
  }
  if (oversized.length) block('SOURCE_FILES_UNREADABLE_OR_OVERSIZED', oversized);
  if (cloudflare.length) block('CLOUDFLARE_RUNTIME_ADAPTER_REQUIRED', cloudflare);
  if (identityHeaders.length) block('TRUSTED_AUTH_BOUNDARY_MUST_BE_VERIFIED_ON_RENDER', identityHeaders);
  if (assetBinding.length) block('ASSET_BINDING_ADAPTER_REQUIRED', assetBinding);
  if (secretNames.size) report.requirements.push({ code: 'CONFIGURE_EXISTING_CONTENT_KEYS_PRIVATELY', names: [...secretNames].sort() });
  report.requirements.push({ code: 'VERIFY_DURABLE_USER_STORAGE_AND_IDENTITY_MAPPING' });
  report.requirements.push({ code: 'VERIFY_ORIGINAL_ENGLISH_EXPLANATIONS_AFTER_ANSWER_ONLY' });
  report.requirements.push({ code: 'BUILD_AND_TEST_LOGIN_PROGRESS_EXAMS_IMAGES_ON_TARGET_RUNTIME' });
  // Hash only known source/config boundary files, never private account data or .env.
  for (const file of ['package.json', 'package-lock.json', 'app/chatgpt-auth.ts', 'db/index.ts', 'db/progress.ts', 'vite.config.ts']) {
    const sha = digest(root, file); if (sha) report.fingerprints[file] = sha;
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [directory, expectedCommit, ...extra] = process.argv.slice(2);
  if (!directory || extra.length) {
    console.error('Usage: node preflight.mjs /absolute/path/to/current-source [expected-full-commit]');
    process.exitCode = 2;
  } else {
    try {
      const report = inspectSource(directory, { expectedCommit: expectedCommit ?? null });
      console.log(JSON.stringify(report, null, 2));
      process.exitCode = report.blockers.length ? 1 : 0;
    } catch (error) {
      console.error(error instanceof TypeError ? error.message : 'Unable to inspect the source directory.');
      process.exitCode = 2;
    }
  }
}
