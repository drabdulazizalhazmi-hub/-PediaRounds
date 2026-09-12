# PediaRounds external study beta

This is an additive `/study` interface on the existing Render service. It is NOT a restore of the 7 September source backup and does not change the original website.

## Scope
- Loads the **current checkout's** `master-bank/data` records. This is not the complete legacy bank or the separate Nelson collection.
- No question content is sent before a verified, non-anonymous Supabase user signs in.
- Sign-in/sign-up use email and password. New users must confirm their email, then return to `/study` and sign in. Email delivery and the allowed redirect depend on the Supabase project's mail/URL configuration. No OAuth provider, SMTP sender, or legacy identity is silently configured.
- Access and refresh tokens are confined to Secure, HttpOnly, SameSite=Lax cookies. They are not returned to browser JavaScript or stored in localStorage.
- Cookie-authenticated writes require the exact Render origin. Existing bearer-only backend routes and RLS remain unchanged.
- Only explicit original-source English explanation fields are eligible. Text is not paraphrased, truncated or translated. Authored `reasoningEn` and generic `explanation` are not treated as original source evidence.
- Incomplete, conflicting, unpublished or required-image records are retained as unscored review records. Missing original images and explanations are stated explicitly, never fabricated.
- Account progress and checkpoint writes use the existing Supabase backend. The browser stops checkpoint retries on revision conflicts rather than overwriting newer progress.

## Verification
The Node test suite exercises HTTP routing, cookies, CSRF, mocked provider sign-in/sign-up, source preservation, answer withholding, safe grading and current-repository loading. These are NOT a completed real-user browser sign-up, SMTP-delivery, iPhone audio, or full migration test.

No legacy user rows, progress, PDFs, question data, images or runtime secrets are added by this change. Existing raw bank files are read in place. `/readyz` continues to report that the full legacy application has not been migrated. `/study/status` reports the narrower beta scope and measured repository counts.
