/** Additive Supabase backend for Render staging. No service-role key or account migration. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PREFIX = '/api/supabase/';
const ERROR = (status, code) => Object.assign(new Error(code), { status, code });
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const keysOnly = (value, keys) => object(value) && Object.keys(value).every(key => keys.includes(key));
const questionId = value => typeof value === 'string' && value.length > 0 && value.length <= 200 && !/[\u0000-\u001f\u007f]/u.test(value);

export function validatePayload(kind, body) {
  if (kind === 'progress') {
    if (!keysOnly(body, ['completed', 'seen'])) throw ERROR(400, 'invalid_progress');
    const completed = Object.hasOwn(body, 'completed') ? body.completed : [];
    const seen = Object.hasOwn(body, 'seen') ? body.seen : [];
    if (!Array.isArray(completed) || !Array.isArray(seen) || completed.length > 500 || seen.length > 500 ||
        !seen.every(questionId) || !completed.every(item => keysOnly(item, ['questionId','correct']) &&
        questionId(item.questionId) && (typeof item.correct === 'boolean' || item.correct === null))) throw ERROR(400, 'invalid_progress');
    return { completed, seen };
  }
  if (!keysOnly(body, ['expectedRevision', 'state']) || !Number.isInteger(body.expectedRevision) ||
      body.expectedRevision < 0 || body.expectedRevision > 2147483645 || !object(body.state) ||
      Buffer.byteLength(JSON.stringify(body.state)) > 49000) throw ERROR(400, 'invalid_checkpoint');
  return { expected_revision: body.expectedRevision, new_state: body.state };
}

async function readJSON(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) throw ERROR(415, 'json_required');
  if (Number(req.headers['content-length']) > 60000) { req.resume(); throw ERROR(413, 'request_too_large'); }
  const raw = await new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    const clean = () => { req.off('data', data); req.off('end', end); req.off('error', failed); req.off('aborted', failed); };
    const failed = () => { clean(); reject(ERROR(400, 'incomplete_request')); };
    const data = chunk => {
      size += chunk.length;
      if (size > 60000) { clean(); req.resume(); reject(ERROR(413, 'request_too_large')); }
      else chunks.push(chunk);
    };
    const end = () => { clean(); resolve(Buffer.concat(chunks).toString('utf8')); };
    req.on('data', data); req.once('end', end); req.once('error', failed); req.once('aborted', failed);
  });
  try { return JSON.parse(raw); }
  catch { throw ERROR(400, 'invalid_json'); }
}

export function createSupabaseBridge({ env = process.env, fetcher = globalThis.fetch, timeoutMs = 5000, now = Date.now } = {}) {
  let base, key;
  try {
    const url = new URL(env.SUPABASE_URL);
    if (url.protocol !== 'https:' || !/^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname) ||
        url.port || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw Error();
    base = url.origin;
    key = env.SUPABASE_PUBLISHABLE_KEY;
    // Only the modern low-privilege key is accepted. Never fall back to service_role.
    if (typeof key !== 'string' || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) throw Error();
  } catch { base = null; key = null; }
  let cached = null, checkedAt = 0, pending = null;
  const statusBase = { configured: !!base, applicationReady: false, learnerFlowsVerified: false, accountsMigrated: false, progressMigrated: false };

  async function request(path, { token, method = 'GET', body } = {}) {
    if (!base) throw ERROR(503, 'supabase_not_configured');
    let response;
    try {
      response = await fetcher(base + path, { method, redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
        headers: { apikey: key, Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    } catch { throw ERROR(503, 'supabase_unreachable'); }
    let data;
    try { data = await response.json(); } catch { throw ERROR(502, 'invalid_backend_response'); }
    return { status: response.status, ok: response.ok, data };
  }

  async function check() {
    if (!base) return { ...statusBase, connected: false };
    if (cached && now() - checkedAt < 60000) return cached;
    if (pending) return pending;
    pending = (async () => {
      try {
        const [auth, denied] = await Promise.all([
          request('/auth/v1/settings'),
          request('/rest/v1/rpc/pediarounds_render_read_checkpoint')
        ]);
        const authReachable = auth.ok && object(auth.data);
        const unauthenticatedAccessBlocked = [401,403].includes(denied.status) && denied.data?.code === '42501';
        return { ...statusBase, connected: authReachable && unauthenticatedAccessBlocked, authReachable,
          dataApiReachable: denied.data?.code === '42501', unauthenticatedAccessBlocked };
      } catch { return { ...statusBase, connected: false, error: 'supabase_check_failed' }; }
    })();
    try { cached = await pending; checkedAt = now(); return cached; }
    finally { pending = null; }
  }

  function checked(result) {
    if (result.ok) return result.data;
    if (result.data?.code === '40001') throw ERROR(409, 'checkpoint_conflict');
    if (['22023','23514','22P02'].includes(result.data?.code)) throw ERROR(400, 'invalid_payload');
    if (result.status === 401) throw ERROR(401, 'authentication_required');
    if (result.status === 403) throw ERROR(403, 'access_denied');
    if (result.status === 429) throw ERROR(429, 'rate_limited');
    throw ERROR(502, 'backend_request_failed');
  }

  async function dispatch(req, pathname) {
    if (pathname === '/backend-status') {
      if (!['GET','HEAD'].includes(req.method)) throw ERROR(405, 'method_not_allowed');
      const data = await check();
      return { status: data.connected ? 200 : 503, data };
    }
    const kind = pathname.slice(PREFIX.length);
    if (!['me','progress','checkpoint'].includes(kind)) throw ERROR(404, 'not_found');
    if (!['GET','POST'].includes(req.method) || (kind === 'me' && req.method !== 'GET')) throw ERROR(405, 'method_not_allowed');
    const header = req.headers.authorization || '';
    if (typeof header !== 'string' || !/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/i.test(header) || header.length > 12000) throw ERROR(401, 'authentication_required');
    const token = header.slice(7);
    const user = checked(await request('/auth/v1/user', { token }));
    if (!UUID.test(user?.id || '') || user.is_anonymous === true || user.role !== 'authenticated') throw ERROR(403, 'registered_user_required');
    if (kind === 'me') return { status: 200, data: { id: user.id, email: user.email ?? null } };
    const write = req.method === 'POST';
    const body = write ? validatePayload(kind, await readJSON(req)) : undefined;
    const rpc = `pediarounds_render_${write ? 'save' : 'read'}_${kind}`;
    const data = checked(await request(`/rest/v1/rpc/${rpc}`, { token, method: write ? 'POST' : 'GET', body }));
    return { status: 200, data };
  }

  async function handle(req, res, pathname) {
    if (pathname !== '/backend-status' && !pathname.startsWith(PREFIX)) return false;
    let result;
    try { result = await dispatch(req, pathname); }
    catch (error) { result = { status: error.status || 500, data: { error: error.code || 'internal_error' } }; }
    req.resume();
    const output = JSON.stringify(result.data);
    res.writeHead(result.status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control':'no-store',
      'Content-Length': Buffer.byteLength(output), 'Vary':'Authorization', 'X-Content-Type-Options':'nosniff',
      'X-Robots-Tag':'noindex, nofollow', 'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'" });
    res.end(req.method === 'HEAD' ? undefined : output);
    return true;
  }
  return { handle, check };
}
