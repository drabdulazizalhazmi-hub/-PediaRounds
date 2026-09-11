# Superseded experiment — do not merge this branch as a deployment

During this session, main advanced to b01f8a1d2a463cbe4ba6b369d0f14ef1bc5d2809 (PR #12), which already contains `external-backend.mjs` and integrates it into `server.mjs`.

The attempted replacement of server.mjs was rejected by GitHub's SHA precondition. No replacement was forced. The two `supabase-bridge` files on this branch were not integrated, merged, or deployed. Do not wire them alongside the existing external backend or replace the newer server with the older probe.

The actual continuation used the existing backend and configured these Render environment names with merge semantics (values not recorded here):
- PEDIAROUNDS_EXTERNAL_BACKEND
- PEDIAROUNDS_SUPABASE_URL
- PEDIAROUNDS_SUPABASE_PUBLISHABLE_KEY

Render deploy dep-dai6bjmk1f9s73d1r9e0 at main commit b01f8a1d2a463cbe4ba6b369d0f14ef1bc5d2809 reached `live` at 2026-09-11T20:34:46Z. The running process logged configured=true, authReachable=true, anonymousDatabaseDenied=true.

Existing Supabase progress/checkpoint functions passed 12 transaction-scoped assertions for owner operations, isolation, monotonic mastery, optimistic checkpoint conflict, input validation and anonymous denial. Two temporary fixture auth rows and all fixture progress were rolled back; final counts were zero. The security advisor returned no lints. No database schema or original learner data was changed in this session.

The deployed backend provides /api/external/session, /api/external/progress and /api/external/checkpoint. There is still no integrated study frontend or end-to-end login/signup verification, and no existing account, progress or question migration. The old Sites application was not modified. Public browser verification from the assistant's environment was unavailable; the live result is verified using Render deploy status and application logs.
