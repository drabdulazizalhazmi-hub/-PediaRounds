# Google and Apple sign-in for the external study beta

This is an additive change to `/study` on the existing Render service. Email/password sign-in, the original English explanation policy, question IDs, progress storage and the original ChatGPT Site are unchanged. It does not migrate or merge legacy accounts.

## Implemented flow

The login page displays **Continue with Google**, **Continue with Apple**, and the existing email form. A server-side Supabase settings check enables only configured providers. A disabled provider is labelled unavailable with email still usable and a refresh control. No credentials are embedded in these controls.

A same-origin JSON POST to `/api/study/oauth/start` starts Google or Apple authorization. A cryptographically random PKCE verifier is stored only in a 10-minute Secure, HttpOnly, SameSite=Lax, `__Host-` cookie. The browser receives an authorization URL containing its SHA-256 challenge, never an access token, refresh token, provider secret or API key.

Supabase validates the provider callback and state. Our fixed `/auth/callback` exchanges the one-use code with the browser's verifier, then retrieves `/auth/v1/user` before issuing the existing secure session cookies. Failed, cancelled and expired callbacks redirect to a sanitised message. No caller-controlled redirect is followed. The temporary cookie is cleared after success/failure and on sign-out. The main study client is unchanged.

## One-time owner configuration

Developer credentials must be entered directly in the relevant provider consoles and Supabase Dashboard. Never commit them to GitHub, include them in frontend code, or paste private keys into chat. No additional Render secret or service-role key is needed.

### Supabase application redirect

In Authentication > URL Configuration, add this exact allowed redirect without removing existing entries:

```
https://pediarounds-render-staging.onrender.com/auth/callback
```

Keep the existing `/study` email-confirmation redirect as well. Do not blindly replace the project's Site URL or other application redirects.

### Google

Create/configure a **Web application** OAuth client in Google Auth Platform. Use:

Authorized JavaScript origin:
```
https://pediarounds-render-staging.onrender.com
```

Authorized redirect URI (this is Supabase, not the Render callback above):
```
https://xrrkijvsdhhhycqgvbrm.supabase.co/auth/v1/callback
```

Enable Google under Supabase Authentication > Sign In / Providers with that client's Client ID and Client Secret. Configure the consent screen and permitted audience/test users. Only basic identity scopes are requested: openid, email and profile. Google API access to Gmail/Drive is not requested.

### Apple

Use your Apple Developer account to configure an App ID with Sign in with Apple, an associated web Services ID and a signing key. Configure the Services ID website with:

Domain:
```
xrrkijvsdhhhycqgvbrm.supabase.co
```

Return URL:
```
https://xrrkijvsdhhhycqgvbrm.supabase.co/auth/v1/callback
```

Enable Apple in Supabase using the web Services ID (first in a multi-ID list) and a generated Apple client secret. Generate it privately using the Team ID, Key ID and private signing key according to the official guide. Keep the `.p8` key private. Apple web OAuth client secrets need regeneration at least every six months; record the actual expiry when configuring it.

Apple Hide My Email can produce a different external account. Users should use the same sign-in method to return to the same progress. This patch does not guess or forcibly merge identities.

## Verification and release criteria

Run:
```
node --test deployment/render/server.test.mjs
```

This includes the existing backend/study tests, 51 targeted OAuth tests and additional HTTP routing regressions. Targeted tests use fictional providers; they are not live Apple/Google consent tests.

The read-only `/api/study/oauth/providers` endpoint and startup log `Social sign-in providers` report current enabled flags only. **Enabled is not proof that credentials, consent audience and callback URLs are correct.** After owner configuration, complete one real Google and one real Apple sign-in on the HTTPS beta, check that the callback URL is cleaned, confirm progress persists on sign-out/sign-in, and test cancellation. Real-user tests must not be claimed until completed.

## Official references checked

- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/social-login/auth-apple
- https://supabase.com/docs/guides/auth/sessions/pkce-flow
- https://supabase.com/docs/guides/auth/redirect-urls
- https://github.com/supabase/auth-js/blob/master/src/GoTrueClient.ts
- https://github.com/supabase/auth/blob/master/internal/api/settings.go
