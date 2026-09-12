# Independent copy of the current PediaRounds application

The current Sites v86 application has been ported locally to native Next.js/Node with independent Supabase authentication and PostgreSQL storage. The public Render study beta is a different, smaller application. This directory preserves a reproducible patch for the full private source; it intentionally contains no question bank, encrypted media, learner records, database URLs, or secret keys.

**Draft only. No production change or completed migration.** Nothing was pushed to the Sites source repository. This work did not change the existing Render service or Supabase database. The user requires the current platform to remain unaffected.

During final read-only verification, Sites **v87** was found successfully published by a separate operation, at source commit `293eea34ffaf7f260b35004af6710c534796ded1`. Both an authorized fetch and a fresh clone returned HTTP 500. This patch therefore remains explicitly pinned to the fully tested **v86** source. The v87 delta must be recovered, reconciled and tested before deployment; this draft does not claim parity with v87. Separately, public GitHub main advanced through PR #16; its staging diagnostic changes are preserved in this draft's base and were not authored or deployed by this migration work.

## Prepare the full private copy

Required source commit: `84de28f7c4b1ffe4eef99ae1d65d22f7f92b6983`. The complete source was recovered through the authorized Sites Git repository after the earlier clone failure. Do not use the September 7 recovery archive or apply this patch to the smaller public Render beta.

```sh
node deployment/portable/prepare-private-copy.mjs /private/current-sites-checkout /private/new-independent-copy
cd /private/new-independent-copy
npm ci --ignore-scripts
npm run build:portable
node --test tests/portable/auth.test.mjs
node tests/portable/http-smoke.mjs
```

The preparation script requires an unchanged exact source checkout and a nonexistent target directory. It verifies the patch checksum, exports that commit, applies only the portability patch, checks all 936 content/media files byte for byte, removes Sites publishing metadata from the **new copy only**, and initializes Git without a remote. Put the resulting complete application in a **private** repository before connecting Render. Never push the full source into this public repository.

## What changed

- Current screens, question IDs, clinical content, encrypted media, study algorithms, and exam logic remain intact. Only the login boundary, database adapter, native routes, packaging and authentication labels change.
- Server-verified Supabase identities replace trust in Sites authentication headers. Access/refresh tokens use Secure HttpOnly host cookies; login writes require the configured origin. Google/Apple controls appear only when the provider reports them enabled. OAuth uses PKCE and a fixed callback. Legacy route names are local compatibility redirects, not a dependency on Sites.
- The PostgreSQL adapter implements the narrow D1 API used by the current application, including numeric timestamps, JSON text payloads, camel-case aliases and revision-checked writes. Each transaction resolves the verified account map and sets row-level isolation using the same pooled connection. The runtime rejects superuser/BYPASSRLS credentials. Reading a linked profile preserves its original stored email and existing display name rather than replacing them with the new provider's defaults.
- All eight legacy table structures are retained. A separate, one-to-one `account_links` table requires proof of account ownership. A public API cannot create links. Email matching alone never grants an old account's records. Unclaimed records remain inaccessible.
- Figure, source-document, speech and scenario routes run in Node and use the existing service logic. Encrypted media requires the owner's original keys. No API proxies requests to Sites.
- The generated `render.yaml` describes a new preview web service with automatic deployment disabled. `/healthz` checks process health; `/readyz` deliberately returns 503 until the migration and real login are independently verified. Render process health is not migration readiness.

## Target configuration still required

Use a separate PostgreSQL database and run `schema.sql` once as its owner. Provision a separate least-privilege LOGIN role that inherits only `pediarounds_portable_runtime`; do not use owner, superuser, or Supabase service-role credentials for application queries. Supply `PEDIAROUNDS_DATABASE_URL` through secret configuration. TLS certificate verification is enabled; provide `PEDIAROUNDS_DATABASE_CA` only if needed for the target's CA. No database or paid resource was provisioned by this draft.

Set the preview's exact HTTPS `PEDIAROUNDS_APP_ORIGIN`, `PEDIAROUNDS_EXTERNAL_BACKEND=enabled`, `PEDIAROUNDS_SUPABASE_URL` and `PEDIAROUNDS_SUPABASE_PUBLISHABLE_KEY`. Register the exact preview `/auth/callback` and email-confirmation destination with the auth provider without removing any existing redirects. Test confirmation, login, refresh, logout and multi-tab behavior in a real browser before release. Network, load and real-provider tests are outstanding; current authentication throttles remain conservative.

Supply the existing ten media encryption keys securely under their original `PEDIA_*` names. Sites returned key names with masked values; those keys could not be exported. Never replace or regenerate them: that would make the current encrypted content unreadable. Optional generated speech/scenarios additionally need the existing supported `OPENAI_API_KEY` configuration. Static scenarios do not require that key.

## Lossless data preparation

The Sites table viewer truncates long payloads and is not an export mechanism. Obtain a complete, consistent native D1 export and preserve its original checksum. Follow [`../render/migration/README.md`](../render/migration/README.md) to create an independently checked normalized snapshot and private archive.

```sh
node deployment/portable/import-sql.mjs /private/snapshot.json /private/source-manifest.json /private/application-import.sql
```

This command only writes private SQL; it does not connect to either database. Run the reviewed SQL only on the separate unused target after `schema.sql`. It imports all eight tables without changing IDs, timestamps, revisions or payload strings. An exact retry adds no duplicates. Any extra or different destination row aborts and rolls back the entire import; existing data is never overwritten. A target with linked accounts is refused. All tables are compared in both directions before commit.

No live export or real account linking has happened. Before activating links, require authenticated proof of both accounts or a documented owner-verified recovery process. Reconcile per-table source checksums and per-user states, then test resume/save/redeploy against the imported records. Keep a recovery copy for unclaimed users. A final source-write reconciliation and user approval are required before any traffic switch; no source-write pause is authorized by this draft. If the target later accepts writes, rollback must preserve them too.

## Verification completed on 12 September 2026

- Production native build and TypeScript checks passed with the complete v86 source.
- All 936 tracked `data/` and `public/` files match the original byte for byte.
- Four isolated authentication tests passed using fictional identities and mocked provider responses.
- The compiled server rejects forged platform identity headers on protected APIs and pages, rejects cross-origin auth writes, clears logout cookies, and reports migration readiness as false. It ran without hosted credentials.
- In-memory PostgreSQL tests cover long payloads, millisecond timestamps, current study/exam/spaced-review functions, revision conflicts, account isolation, rollback, and forbidden account-link writes.
- Offline import tests restore all eight fictional application tables exactly, preserve unmapped question IDs, keep unclaimed users inaccessible, allow identical retries, roll back conflicting imports and refuse linked targets.

Run the database checks with PGlite 0.5.8 installed outside either application:

```sh
PEDIAROUNDS_PGLITE_MODULE=/private/test-engine/node_modules/@electric-sql/pglite/dist/index.js node deployment/portable/import.postgres-check.mjs
# From the prepared private application:
PEDIAROUNDS_PGLITE_MODULE=/private/test-engine/node_modules/@electric-sql/pglite/dist/index.js node tests/portable/postgres-check.mjs
```

These are local and fictional-data results, not proof of a completed production migration. Remaining blockers are a private deployment repository, secure target configuration and original media keys, the full native database export, verified legacy-account ownership, and end-to-end reconciliation. `verification.json` records these limits explicitly.
