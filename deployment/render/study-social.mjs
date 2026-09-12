/** Progressive social-login controls. Browser JavaScript never receives auth tokens. */
const NAMES = {google: 'Google', apple: 'Apple'};
const MESSAGES = {
  oauth_expired: 'This sign-in attempt expired. Please start again in this browser.',
  oauth_cancelled: 'Sign-in was cancelled. Choose a sign-in option to try again.',
  oauth_failed: 'Social sign-in could not be completed. Please retry or use email sign-in.',
  oauth_provider_not_enabled: 'This sign-in provider is not enabled yet. Email sign-in remains available below.',
  oauth_settings_unavailable: 'Social sign-in availability could not be checked. Please retry or use email below.',
  external_backend_not_configured: 'Social sign-in is not configured yet.',
  auth_unavailable: 'The sign-in service is unavailable. Please retry.',
  rate_limited: 'Too many requests. Please wait a minute and retry.',
  same_origin_required: 'Open this page directly in your browser and try again.'
};
export function validateAuthorizationUrl(value, expectedOrigin, provider, pageOrigin) {
  try {
    if (!Object.hasOwn(NAMES, provider) || !/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(expectedOrigin || '')) return null;
    const url = new URL(value);
    if (url.origin !== expectedOrigin || url.username || url.password || url.hash || url.pathname !== '/auth/v1/authorize') return null;
    if (url.searchParams.get('provider') !== provider || url.searchParams.get('redirect_to') !== pageOrigin + '/auth/callback' ||
        url.searchParams.get('code_challenge_method') !== 's256' || !/^[A-Za-z0-9_-]{43}$/.test(url.searchParams.get('code_challenge') || '')) return null;
    for (const key of ['provider', 'redirect_to', 'code_challenge', 'code_challenge_method']) if (url.searchParams.getAll(key).length !== 1) return null;
    return url.href;
  } catch { return null; }
}
export function mountSocialSignIn() {
  const $ = id => document.getElementById(id);
  const buttons = {google: $('signin-google'), apple: $('signin-apple')};
  if (!buttons.google || !buttons.apple || !$('login-form') || !$('social-status')) return;
  const status = $('social-status'), retry = $('social-retry'), form = $('login-form');
  let settings = null, busy = false, checking = false, formState = [];
  const message = text => { status.textContent = text; };
  function updateButtons() {
    const emailBusy = $('signin').disabled || $('signup').disabled;
    for (const provider of Object.keys(buttons)) {
      buttons[provider].disabled = busy || checking || emailBusy || settings?.providers?.[provider] !== true;
    }
    retry.disabled = busy || checking || emailBusy;
    $('social-login').setAttribute('aria-busy', String(busy || checking));
  }
  function releaseForm() {
    for (const [element, disabled] of formState) element.disabled = disabled;
    formState = []; busy = false; updateButtons();
  }
  async function request(action, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch('/api/study/oauth/' + action, {
        method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: controller.signal,
        headers: {Accept: 'application/json', ...(body === undefined ? {} : {'Content-Type': 'application/json'})},
        ...(body === undefined ? {} : {body: JSON.stringify(body)})
      });
      const data = await response.json();
      if (!response.ok) throw Object.assign(new Error('request_failed'), {code: data?.error});
      return data;
    } finally { clearTimeout(timer); }
  }
  async function loadOptions(preserveMessage = false) {
    if (checking || busy) return;
    checking = true; updateButtons();
    if (!preserveMessage) message('Checking Google and Apple availability…');
    try {
      const result = await request('providers');
      if (typeof result?.providers?.google !== 'boolean' || typeof result?.providers?.apple !== 'boolean') throw new Error('invalid_response');
      settings = result;
      const unavailable = Object.keys(NAMES).filter(provider => settings.providers[provider] !== true).map(provider => NAMES[provider]);
      retry.hidden = unavailable.length === 0;
      if (!preserveMessage) message(unavailable.length ? unavailable.join(' and ') + ' sign-in is not enabled yet. Email sign-in remains available below.' : 'Choose Google or Apple, or use your email below.');
    } catch {
      settings = null; retry.hidden = false;
      if (!preserveMessage) message(MESSAGES.oauth_settings_unavailable);
    } finally { checking = false; updateButtons(); }
  }
  async function begin(provider) {
    if (busy || buttons[provider].disabled || !settings) return;
    busy = true;
    formState = [...form.elements].map(element => [element, element.disabled]);
    for (const [element] of formState) element.disabled = true;
    $('password').value = ''; updateButtons();
    message('Opening ' + NAMES[provider] + ' sign-in…');
    try {
      const result = await request('start', {provider});
      const target = validateAuthorizationUrl(result?.url, settings.authorizationOrigin, provider, location.origin);
      if (!target) throw Object.assign(new Error('invalid_redirect'), {code: 'oauth_failed'});
      location.assign(target);
    } catch (error) {
      message(MESSAGES[error.code] || 'Could not start social sign-in. Please retry or use email below.');
      retry.hidden = false; releaseForm();
    }
  }
  for (const provider of Object.keys(buttons)) buttons[provider].addEventListener('click', () => { void begin(provider); });
  // A pending OAuth request must not race an email/password submission.
  form.addEventListener('submit', event => { if (busy) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
  new MutationObserver(updateButtons).observe(form, {attributes: true, attributeFilter: ['disabled'], subtree: true});
  retry.addEventListener('click', () => { void loadOptions(); });
  window.addEventListener('pageshow', event => { if (event.persisted) { releaseForm(); void loadOptions(); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !$('login').hidden && !busy) void loadOptions(); });
  const params = new URL(location.href).searchParams;
  const callbackError = params.get('auth_error');
  if (params.has('auth_error')) {
    message(Object.hasOwn(MESSAGES, callbackError) ? MESSAGES[callbackError] : MESSAGES.oauth_failed);
    globalThis.history.replaceState(null, '', '/study');
  }
  void loadOptions(params.has('auth_error'));
}
if (typeof document !== 'undefined') mountSocialSignIn();
