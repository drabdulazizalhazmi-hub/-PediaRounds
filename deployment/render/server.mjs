/** Deployment probe only. No app data, authentication, or database access. */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

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
  service: 'PediaRounds Render deployment probe',
  stage: 'hosting-setup-only',
  applicationReady: false,
  questionsMigrated: false,
  accountsMigrated: false,
  progressMigrated: false,
});

export function createProbeServer() {
  const server = createServer((req, res) => {
    const send = (status, body, type = 'application/json; charset=utf-8', extra = {}) => {
      const output = typeof body === 'string' ? body : JSON.stringify(body);
      res.writeHead(status, { ...headers, ...extra, 'Content-Type': type, 'Content-Length': Buffer.byteLength(output) });
      res.end(req.method === 'HEAD' ? undefined : output);
    };
    if (!['GET', 'HEAD'].includes(req.method || '')) {
      req.resume();
      return send(405, { error: 'Read-only deployment probe.' }, undefined, { Allow: 'GET, HEAD' });
    }
    let pathname;
    try { pathname = new URL(req.url || '/', 'http://localhost').pathname; }
    catch { return send(400, { error: 'Invalid request.' }); }
    // Health confirms the probe process is up, never application readiness.
    if (pathname === '/healthz') return send(200, { status: 'ok', scope: 'deployment-probe-only' });
    if (pathname === '/readyz') return send(503, deploymentStatus);
    if (pathname === '/deployment-status') return send(200, deploymentStatus);
    if (pathname === '/robots.txt') return send(200, 'User-agent: *\nDisallow: /\n', 'text/plain; charset=utf-8');
    if (pathname === '/') return send(200, html, 'text/html; charset=utf-8');
    if (pathname.startsWith('/api/') || ['/quiz', '/exam', '/nelson', '/login', '/signin-with-chatgpt'].includes(pathname)) {
      return send(503, { error: 'External application is not configured. No account or question data is served.' });
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
  const server = createProbeServer();
  server.on('error', error => { console.error('Deployment probe failed:', error.code || 'unknown'); process.exit(1); });
  server.listen(port, '0.0.0.0', () => console.log(`Deployment probe listening on ${port}; applicationReady=false`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
