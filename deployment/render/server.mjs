/** External staging foundation with an additive authenticated /study beta. */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createExternalBackend } from './external-backend.mjs';
import { createStudyApp } from './study-app.mjs';
import { createDependencyMonitor, studyInfrastructureStatus } from './service-diagnostics.mjs';

const html = readFileSync(new URL('./status.html', import.meta.url), 'utf8');
const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] || '';
const styleHash = createHash('sha256').update(css).digest('base64');
const headers = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy': `default-src 'none'; style-src 'sha256-${styleHash}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
};
export const deploymentStatus = Object.freeze({
  service: 'PediaRounds Render external backend foundation',
  stage: 'external-backend-with-repository-study-beta',
  applicationReady: false,
  studyBetaPath: '/study',
  questionsMigrated: false,
  accountsMigrated: false,
  progressMigrated: false,
});
export function createProbeServer({backend = createExternalBackend(), study = createStudyApp({backend}), monitor = createDependencyMonitor({backend})} = {}) {
  const server = createServer(async (req, res) => {
    // Host-only HTTPS policy applies to delegated routes too; no preload/subdomain lock-in.
    res.setHeader('Strict-Transport-Security', 'max-age=86400');
    const send = (status, body, type = 'application/json; charset=utf-8', extra = {}) => {
      const output = typeof body === 'string' ? body : JSON.stringify(body);
      res.writeHead(status, { ...headers, ...extra, 'Content-Type': type, 'Content-Length': Buffer.byteLength(output) });
      res.end(req.method === 'HEAD' ? undefined : output);
    };
    let pathname;
    try { pathname = new URL(req.url || '/', 'http://localhost').pathname; }
    catch { return send(400, { error: 'Invalid request.' }); }
    try {
      if (study && await study.handle(req,res,pathname)) return;
      if (await backend.handle(req, res, pathname)) return;
    } catch {
      req.resume();
      if (!res.headersSent) return send(503,{error:'backend_unavailable'});
      return res.end();
    }
    if (!['GET', 'HEAD'].includes(req.method || '')) {
      req.resume();
      return send(405, { error: 'The full application is not available.' }, undefined, { Allow: 'GET, HEAD' });
    }
    // Full migration readiness remains distinct from the additive study beta.
    if (pathname === '/healthz') return send(200, { status: 'ok', scope: 'external-backend-process-only' });
    if (pathname === '/readyz') return send(503, deploymentStatus);
    if (pathname === '/login' || pathname === '/login/') {
      if (study) return send(302, '', 'text/plain; charset=utf-8', {Location:'/study'});
      return send(503, {error:'study_unavailable'});
    }
    if (['/study/readyz', '/deployment-status', '/external-backend-status'].includes(pathname)) {
      try {
        const backendStatus = await monitor.check();
        const studyStatus = study?.status();
        if (pathname === '/study/readyz') {
          const readiness = studyInfrastructureStatus(backendStatus, studyStatus);
          return send(readiness.infrastructureReady ? 200 : 503, readiness);
        }
        if (pathname === '/deployment-status') return send(200, {...deploymentStatus,backend:backendStatus,studyBeta:studyStatus});
        return send(200, {...backendStatus,frontendIntegrated:false,studyBetaIntegrated:!!study,endToEndLoginTested:false,existingDataMigrated:false});
      } catch {
        return send(503, {error:'diagnostics_unavailable',applicationReady:false});
      }
    }
    if (pathname === '/robots.txt') return send(200, 'User-agent: *\nDisallow: /\n', 'text/plain; charset=utf-8');
    if (pathname === '/') return send(200, html, 'text/html; charset=utf-8');
    if (pathname.startsWith('/api/') || ['/quiz', '/exam', '/nelson', '/login', '/signin-with-chatgpt'].includes(pathname)) {
      return send(503, { error: 'External application is not configured. No legacy account or question data is served.' });
    }
    return send(404, { error: 'Not found.' });
  });
  server.headersTimeout = 10000;
  server.requestTimeout = 15000;
  server.keepAliveTimeout = 5000;
  server.maxHeadersCount = 50;
  return server;
}
export function parsePort(value) {
  const raw = String(value ?? '10000');
  if (!/^\d+$/.test(raw)) throw new Error('PORT must be an integer.');
  const port = Number(raw);
  if (port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
  return port;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = parsePort(process.env.PORT);
  const backend = createExternalBackend();
  const monitor = createDependencyMonitor({backend});
  const study=createStudyApp({backend});
  const server = createProbeServer({backend,study,monitor});
  server.on('error', error => { console.error('External staging process failed:', error.code || 'unknown'); process.exit(1); });
  server.listen(port, '0.0.0.0', () => {
    console.log(`External staging process listening on ${port}; applicationReady=false; studyBeta=/study`);
    console.log('Repository study beta:',JSON.stringify(study.status()));
    void study.oauthProviders().then(result=>console.log('Social sign-in providers:',JSON.stringify({configured:result.configured,...result.providers}))).catch(()=>console.log('Social sign-in providers: settings unavailable; no credentials logged.'));
    void monitor.check().then(result => {
      console.log('External backend dependency check:',JSON.stringify(result));
    }).catch(()=>console.error('External backend dependency check failed; no credentials logged.'));
  });
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
