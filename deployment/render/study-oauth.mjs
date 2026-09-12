/** Google/Apple login through Supabase Auth; no provider secret or token reaches JS. */
import {createHash, randomBytes} from 'node:crypto';

export const OAUTH_COOKIE = '__Host-pediarounds_oauth';
export const OAUTH_CALLBACK = '/auth/callback';
const PROVIDERS = new Set(['google', 'apple']);
const TTL = 600000;
const fail = (status, code) => Object.assign(new Error(code), {status, code});

function appendCookie(res, value) {
  const existing = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', [...(Array.isArray(existing) ? existing : existing ? [existing] : []), value]);
}
function pendingValue(req) {
  const values = String(req.headers.cookie || '').split(';').map(v => v.trim())
    .filter(v => v.startsWith(OAUTH_COOKIE + '='));
  if (values.length !== 1) return '';
  const value = values[0].slice(OAUTH_COOKIE.length + 1);
  return /^[A-Za-z0-9_-]{40,1024}$/.test(value) ? value : '';
}
function readPending(req, now) {
  try {
    const data = JSON.parse(Buffer.from(pendingValue(req), 'base64url').toString('utf8'));
    if (data?.version !== 1 || !PROVIDERS.has(data.provider) ||
        !/^[A-Za-z0-9_-]{43}$/.test(data.verifier || '') ||
        !Number.isSafeInteger(data.createdAt) || data.createdAt > now || now - data.createdAt >= TTL) return null;
    return data;
  } catch { return null; }
}

export function createStudyOAuth({origin, url, configured, remote, establish, guard, limit, now = Date.now}) {
  let cached = null, pending = null, cachedAt = 0;
  function clear(res) {
    appendCookie(res, OAUTH_COOKIE + '=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  }
  async function providers() {
    if (!configured) return {configured: false, providers: {google: false, apple: false}, authorizationOrigin: null};
    if (cached && now() - cachedAt < 30000) return cached;
    if (pending) return pending;
    pending = (async () => {
      const data = await remote('/settings');
      if (!data || typeof data.external?.google !== 'boolean' || typeof data.external?.apple !== 'boolean')
        throw fail(503, 'oauth_settings_unavailable');
      // Public capability flags only. Never forward the entire settings response.
      cached = {configured: true, providers: {google: data.external.google, apple: data.external.apple}, authorizationOrigin: url};
      cachedAt = now();
      return cached;
    })();
    try { return await pending; } finally { pending = null; }
  }
  async function begin(req, res, data) {
    if (req.method !== 'POST') throw fail(405, 'method_not_allowed');
    guard(req);
    if (!data || Array.isArray(data) || Object.keys(data).length !== 1 || !PROVIDERS.has(data.provider))
      throw fail(400, 'invalid_oauth_provider');
    if (!configured || new URL(origin).protocol !== 'https:') throw fail(503, 'external_backend_not_configured');
    limit(req, 'oauth');
    const settings = await providers();
    if (!settings.providers[data.provider]) throw fail(409, 'oauth_provider_not_enabled');
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const transaction = Buffer.from(JSON.stringify({version: 1, provider: data.provider, verifier, createdAt: now()})).toString('base64url');
    appendCookie(res, OAUTH_COOKIE + '=' + transaction + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600');
    const authorization = new URL(url + '/auth/v1/authorize');
    authorization.searchParams.set('provider', data.provider);
    authorization.searchParams.set('redirect_to', origin + OAUTH_CALLBACK);
    authorization.searchParams.set('code_challenge', challenge);
    authorization.searchParams.set('code_challenge_method', 's256');
    authorization.searchParams.set('scopes', data.provider === 'google' ? 'openid email profile' : 'email');
    if (data.provider === 'google') authorization.searchParams.set('prompt', 'select_account');
    return {provider: data.provider, url: authorization.href};
  }
  async function callback(req, res) {
    if (req.method !== 'GET') throw fail(405, 'method_not_allowed');
    try {
      const transaction = readPending(req, now());
      if (!transaction) throw fail(400, 'oauth_expired');
      const query = new URL(req.url, origin).searchParams;
      if (query.has('error')) throw fail(400, query.get('error') === 'access_denied' ? 'oauth_cancelled' : 'oauth_failed');
      const codes = query.getAll('code');
      if (codes.length !== 1 || !/^[A-Za-z0-9_-]{16,512}$/.test(codes[0])) throw fail(400, 'oauth_failed');
      limit(req, 'oauth-callback');
      // Supabase owns and validates provider OAuth state. PKCE binds its returned
      // one-use auth code to the browser's HttpOnly verifier, preventing login CSRF.
      const data = await remote('/token?grant_type=pkce', undefined, {auth_code: codes[0], code_verifier: transaction.verifier});
      await establish(res, data); // Re-fetch /user server-side before issuing cookies.
      return '/study'; // Ignore all caller-controlled next/redirect/provider values.
    } catch (error) {
      const allowed = new Set(['oauth_expired', 'oauth_cancelled', 'oauth_failed', 'rate_limited', 'auth_unavailable', 'external_backend_not_configured']);
      return '/study?auth_error=' + (allowed.has(error.code) ? error.code : 'oauth_failed');
    } finally { clear(res); }
  }
  return {providers, begin, callback, clear, hasPending: req => !!pendingValue(req)};
}
