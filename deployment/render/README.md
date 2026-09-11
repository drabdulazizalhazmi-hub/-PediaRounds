# Render deployment connection probe

This dependency-free Node service verifies GitHub-to-Render deployment only. It is NOT the PediaRounds application, a question-bank migration, or an authentication implementation. It exposes no repository files, PDFs, question content, secrets, or learner data. The current hosted website is not modified.

Build: `node --test deployment/render/server.test.mjs`
Start: `node deployment/render/server.mjs`
Binding: `0.0.0.0:$PORT` (default 10000).

- `/healthz`: 200 when this probe runs; not application readiness.
- `/readyz`: 503, because the application has not been migrated.
- `/deployment-status`: explicit false migration/readiness flags.
- All writes: rejected. Legacy identity headers confer no access.
- No tracking, cookies, passwords, external JavaScript, or filesystem serving.

## Migration blockers established from the available backup

The 7 September 2026 source snapshot is commit `6f2e93930db2a57d81971accaa3cbf3f5271f52a`, recording source `fe5fa4c72090b317861dc48c8c246a443f342a14`. It has 1,074 tracked files. Later audits identify a newer 10 September source; do not replace it with this backup or represent this probe as the latest full application.

1. The connected public GitHub repository contains repair/data bundles, not the complete current runnable source. Keep the complete private source and confidential assets in a private repository; do not publish the backup to this public repository.
2. `app/chatgpt-auth.ts` relies on platform-injected identity headers and dispatch-owned authentication paths. These are not authentication on an ordinary public Node server. Replace with a server-verified identity provider before exposing any protected endpoint. Do not trust caller-supplied `oai-authenticated-*` headers.
3. `db/index.ts` and `db/progress.ts` rely on `cloudflare:workers` / D1. Implement and test a durable database adapter for the external deployment; do not use ephemeral local SQLite for persistent progress.
4. Source documents and figures are encrypted. The backup explicitly excludes runtime secret values, live user/progress/attempt rows, and device-local recordings. Securely provision the required keys; never commit keys or copy credentials into this document.
5. Merge the existing original-English-explanation patch into the current source without overwriting newer export contracts, source-image handling, or exam logic. Missing originals must remain explicitly unavailable, not generated or translated.
6. Verify login, account isolation, progress persistence across redeploys, images, exam scoring, and explanation provenance before declaring application readiness or sharing it with learners.

The free compute plan is for this setup check, not a production availability commitment. It may spin down on idle; usage remains subject to Render's free-plan limits. No paid compute/database or data migration is requested by this configuration.
