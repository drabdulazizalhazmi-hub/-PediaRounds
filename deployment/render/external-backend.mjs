/** External staging backend. No Sites identity headers, service-role keys or data migration. */
import { createHash } from 'node:crypto';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const fail = (status, code) => Object.assign(new Error(code), {status, code});
const object = value => !!value && typeof value === 'object' && !Array.isArray(value);
const keys = (value, allowed) => Object.keys(value).every(key => allowed.includes(key));
const idOK = id => typeof id === 'string' && id.length > 0 && id.length <= 200 && !/[\p{Cc}]/u.test(id);

export function validateProgress(body) {
  if (!object(body) || !keys(body, ['completed','seen'])) throw fail(400, 'invalid_progress');
  const {completed = [], seen = []} = body;
  if (!Array.isArray(completed) || !Array.isArray(seen) || completed.length > 500 || seen.length > 500) throw fail(400, 'invalid_progress');
  if (!seen.every(idOK) || !completed.every(row => object(row) && keys(row,['questionId','correct']) && idOK(row.questionId) &&
      Object.hasOwn(row, 'correct') && (row.correct === null || typeof row.correct === 'boolean'))) throw fail(400, 'invalid_progress');
  return {completed, seen};
}

export function validateCheckpoint(body) {
  if (!object(body) || !keys(body, ['expectedRevision','state']) || !object(body.state) ||
      !Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0 || body.expectedRevision > 2147483645 ||
      Buffer.byteLength(JSON.stringify(body.state)) > 40000) throw fail(400, 'invalid_checkpoint');
  return {expected_revision: body.expectedRevision, new_state: body.state};
}

function configuration(env) {
  if (env.PEDIAROUNDS_EXTERNAL_BACKEND !== 'enabled') return null;
  const url = env.PEDIAROUNDS_SUPABASE_URL, key = env.PEDIAROUNDS_SUPABASE_PUBLISHABLE_KEY;
  if (typeof url !== 'string' || !/^https:\/\/[a-z0-9]{20}\.supabase\.co\/?$/.test(url) ||
      typeof key !== 'string' || !/^sb_publishable_[a-zA-Z0-9_-]+$/.test(key)) return null;
  return {url: url.replace(/\/$/, ''), key};
}

export function createExternalBackend({env = process.env, fetcher = globalThis.fetch, now = Date.now} = {}) {
  const config = configuration(env);
  const limits = new Map();
  let epoch = 0, requests = 0;
  function rateLimit(token) {
    const minute = Math.floor(now() / 60000);
    if (minute !== epoch) {epoch = minute; requests = 0; limits.clear();}
    if (++requests > 300) throw fail(429, 'rate_limited');
    const hash = createHash('sha256').update(token).digest('hex');
    const count = (limits.get(hash) || 0) + 1;
    limits.set(hash, count);
    if (count > 60) throw fail(429, 'rate_limited');
  }
  async function remote(path, token, payload) {
    const controller = new AbortController();
    let timeout;
    const deadline = new Promise((_, reject) => {
      timeout = setTimeout(() => {controller.abort(); reject(fail(503,'backend_unavailable'));}, 7000);
      timeout.unref?.();
    });
    try {
      return await Promise.race([(async () => {
        const response = await fetcher(config.url + path, {
          method: payload === undefined ? 'GET' : 'POST', redirect:'error', signal:controller.signal,
          headers:{apikey:config.key, ...(token ? {Authorization:`Bearer ${token}`} : {}), 'Content-Type':'application/json'},
          ...(payload === undefined ? {} : {body:JSON.stringify(payload)})
        });
        let result;
        try {result = await response.json();} catch {throw fail(503,'backend_unavailable');}
        if (!response.ok) {
          if (result?.code === '40001') throw fail(409,'checkpoint_conflict');
          if ([401,403].includes(response.status)) throw fail(401,'sign_in_required');
          if (response.status === 429) throw fail(429,'rate_limited');
          if (result?.code === '22023' || result?.code === '23514') throw fail(400,'invalid_input');
          throw fail(503,'backend_unavailable');
        }
        return result;
      })(), deadline]);
    } catch (error) {
      if (Number.isInteger(error?.status)) throw error;
      throw fail(503,'backend_unavailable');
    } finally {clearTimeout(timeout);}
  }
  async function authenticate(req) {
    // Do not accept identity from email, user_id, cookies or Sites dispatch headers.
    const header = req.headers.authorization;
    const match = typeof header === 'string' && /^Bearer ([A-Za-z0-9_.-]{16,8192})$/.exec(header);
    if (!match) throw fail(401,'sign_in_required');
    rateLimit(match[1]);
    if (!config) throw fail(503,'external_backend_not_configured');
    const user = await remote('/auth/v1/user', match[1]);
    if (!object(user) || !UUID.test(user.id || '') || user.role !== 'authenticated' || user.is_anonymous === true ||
        user.deleted_at || (user.banned_until && Date.parse(user.banned_until) > now()) ||
        typeof user.email !== 'string' || !user.email_confirmed_at) throw fail(401,'sign_in_required');
    return {token:match[1], user:{id:user.id,email:user.email}};
  }
  async function bodyJSON(req) {
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) throw fail(415,'json_required');
    if (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity') throw fail(415,'encoding_not_supported');
    if (Number(req.headers['content-length'] || 0) > 100000) throw fail(413,'body_too_large');
    const chunks = []; let size = 0;
    for await (const chunk of req.iterator({destroyOnReturn:false})) {
      size += chunk.length;
      if (size > 100000) throw fail(413,'body_too_large');
      chunks.push(chunk);
    }
    try {return JSON.parse(Buffer.concat(chunks).toString('utf8'));} catch {throw fail(400,'invalid_json');}
  }
  async function handle(req,res,pathname) {
    const routes = ['/api/external/session','/api/external/progress','/api/external/checkpoint'];
    if (!routes.includes(pathname)) return false;
    function send(status, result) {
      req.resume();
      const data = JSON.stringify(result);
      res.writeHead(status, {'Content-Type':'application/json; charset=utf-8', 'Content-Length':Buffer.byteLength(data),
        'Cache-Control':'private, no-store', 'X-Content-Type-Options':'nosniff', 'X-Frame-Options':'DENY',
        'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'", 'Referrer-Policy':'no-referrer',
        'X-Robots-Tag':'noindex, nofollow, noarchive', 'Vary':'Authorization',
        ...(status === 429 ? {'Retry-After':'60'} : {}),
        ...(status === 405 ? {'Allow':pathname.endsWith('/session') ? 'GET' : 'GET, POST'} : {})});
      res.end(data);
    }
    try {
      const permitted = pathname.endsWith('/session') ? ['GET'] : ['GET','POST'];
      if (!permitted.includes(req.method)) throw fail(405,'method_not_allowed');
      // Bearer tokens are not ambient browser credentials; there is deliberately no cookie/CORS auth.
      if (req.headers['sec-fetch-site'] === 'cross-site') throw fail(403,'cross_site_request_rejected');
      const {token,user} = await authenticate(req);
      if (pathname.endsWith('/session')) {send(200,{user, provider:'supabase', sitesAccountsMigrated:false}); return true;}
      if (pathname.endsWith('/progress')) {
        const payload = req.method === 'GET' ? {} : validateProgress(await bodyJSON(req));
        const name = req.method === 'GET' ? 'read_progress' : 'save_progress';
        const data = await remote('/rest/v1/rpc/pediarounds_render_' + name, token, payload);
        if (!object(data) || !Array.isArray(data.done) || !Array.isArray(data.seen) || !Number.isInteger(data.reviewedCount)) throw fail(503,'backend_unavailable');
        send(200,{...data,user}); return true;
      }
      const payload = req.method === 'GET' ? {} : validateCheckpoint(await bodyJSON(req));
      const name = req.method === 'GET' ? 'read_checkpoint' : 'save_checkpoint';
      const data = await remote('/rest/v1/rpc/pediarounds_render_' + name, token, payload);
      if (!object(data) || !Number.isInteger(data.revision) || !(data.state === null || object(data.state))) throw fail(503,'backend_unavailable');
      send(200,data);
    } catch(error) {send(error.status || 503,{error:error.code || 'backend_unavailable'});}
    return true;
  }
  async function probe() {
    if (!config) return {configured:false, authReachable:false, anonymousDatabaseDenied:false};
    let authReachable = false, anonymousDatabaseDenied = false;
    try {const data = await remote('/auth/v1/settings'); authReachable = object(data) && object(data.external);} catch {}
    try {await remote('/rest/v1/rpc/pediarounds_render_read_progress', undefined, {});} catch(error) {anonymousDatabaseDenied = error.code === 'sign_in_required';}
    return {configured:true, authReachable, anonymousDatabaseDenied};
  }
  return {handle,probe,configured:!!config};
}
