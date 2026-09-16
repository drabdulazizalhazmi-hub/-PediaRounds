# PediaRounds external backend foundation

This is a partial Render migration, not a release of the full study application.

## Implemented

- Server-side verification of a Supabase bearer access token via the Auth user endpoint. Sites identity headers, client-supplied user IDs and email matching are never used for authentication.
- Authenticated progress read/write and checkpoint endpoints under `/api/external/`. No password, signup, reset, delete or legacy-user migration endpoint has been added.
- Additive PostgreSQL storage with row-level ownership policies and SECURITY INVOKER functions. The user token, not a service-role key, is used for data access.
- Atomic progress merges preserve original question IDs, preserve correctly answered status and keep seen-only questions distinct from answered questions.
- Daily review events use the answer endpoint's server timestamp, count a question once per Riyadh calendar day, and are retained in a user-scoped browser outbox until the database confirms them.
- Progress and checkpoint requests are bound to the account that opened the tab, preventing a later cookie switch in another tab from receiving stale writes.
- Compare-and-swap checkpoint revisions return HTTP 409 on stale writes rather than overwriting a newer resume position.
- Body limits, network deadlines, rate limits, explicit errors and no-store responses. No credentials are logged or committed.

The `pediarounds_render_external_progress_v1` migration was applied to the existing connected Supabase project on 11 September 2026. The daily-progress migrations were applied on 16 September 2026; they added an immutable per-user/per-day question ledger and extended the progress RPCs. No Sites data was imported. Existing progress could supply only each question's latest known answer day, so exact daily history starts with this release and older totals may be incomplete. `backend-schema.sql` records the schema; do not reapply blindly to an existing database.

## Verification performed

- `node --test deployment/render/server.test.mjs`: 34 passed, 0 failed (24 new backend tests plus 10 entrypoint/status tests).
- Live database transaction: 14 isolation, atomicity and concurrency test groups passed. Both temporary Auth fixtures and all test progress were rolled back.
- Daily-progress transaction: same-day replay deduplication, adjacent Riyadh dates, aggregation, future-day rejection and cross-user isolation passed; the temporary Auth fixture and all probe rows were rolled back. The reusable probe is `verification/daily-progress-transaction.sql`.
- Post-test checks: zero progress rows, zero checkpoint rows, zero remaining test users.
- Supabase security and performance advisors: no lints returned after the daily-progress migrations.

These tests do not certify a real browser login, existing-account migration, medical content or the complete application. The Node tests use provider fixtures. The database tests exercise actual authenticated-role RLS inside a rolled-back transaction.

## Configuration boundary

The attempt to set Render environment variables through the connector was blocked. It was not retried through another tool or embedded in the source. The code defaults to disabled and fails closed until the host is configured through its normal account settings.

Required environment variable names (no values in this repository):

- `PEDIAROUNDS_EXTERNAL_BACKEND`: `enabled`
- `PEDIAROUNDS_SUPABASE_URL`: the existing project's HTTPS API URL
- `PEDIAROUNDS_SUPABASE_PUBLISHABLE_KEY`: a modern `sb_publishable_` key, never a secret/service-role key

`/external-backend-status` reports configuration and non-user dependency checks. A successful dependency probe only establishes provider reachability and rejection of anonymous database access, not successful end-user login. `/readyz` remains 503 because the full application is not migrated.

## Remaining integration

Integrate the current full application and a real external login UI, validate user/account transition without assuming matching email proves ownership, port the current study/exam routes, and safely provision the encrypted media keys. Do not overwrite production with the 7 September snapshot. The explanation policy remains original attached English source text, with no generated/translated fallback. No question, answer key, source explanation, clinical reference, image or old progress was changed by this backend work.

## Reference documentation

- https://supabase.com/docs/reference/javascript/auth-getuser
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://render.com/docs/deploys
