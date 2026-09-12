# Preserve Sites data before independent authentication

This is an offline migration gate and private archive generator. It is not a completed account migration or a replacement application. Nothing in this directory is served by the Render application. No learner records or secrets belong in Git.

## Findings on 12 September 2026

- Current Sites publication: version 86, source commit `84de28f7c4b1ffe4eef99ae1d65d22f7f92b6983`.
- D1 binding `DB` has eight tables, all represented in `snapshot.mjs`. Four contain long JSON payloads for study sessions, spaced review and both exam modes.
- The database viewer returned **truncated cell values** for all four payload tables. Concatenating its pages cannot reconstruct a full database backup. Its previews must not be imported.
- Read-only verification of the connected external Supabase database found zero Auth users, zero external progress rows and zero checkpoints. Existing Render code implements an external study beta; it does not link legacy identities.
- Cloning the current Sites source failed twice with HTTP 500. The publication archive could not be materialized through Library ownership validation. No older source snapshot was substituted.

## Input contract and workflow

Obtain a **complete, consistent native database export** through the source database's authorized export mechanism. Export all tables within one database snapshot; live offset pagination is not a consistent snapshot. The current Sites viewer is not such an exporter. Keep the native export, schema and its checksum as the independent recovery backup. This module does not itself export D1.

Normalize that complete export without changing cell values:

```json
{
  "format": "pediarounds-sites-snapshot-v1",
  "source": {
    "projectId": "exact-source-project-id",
    "binding": "DB",
    "snapshotId": "source-export-identifier",
    "exportedAt": "2026-09-12T00:00:00.000Z",
    "consistency": "database-snapshot"
  },
  "tables": {
    "user_profiles": {
      "columns": ["user_id", "email", "display_name", "created_at", "updated_at"],
      "rows": []
    }
  }
}
```

The example omits seven tables for brevity; the validator rejects it until **every table** in `TABLES` is present. Empty tables must be explicitly included. Preserve JSON payloads as their original strings, IDs, nulls, booleans/numeric flags, revisions and millisecond timestamps. Do not filter by the external beta's smaller question bank or join away users lacking a profile. New or changed source columns fail validation and require an explicit adapter update.

At the source export boundary, generate a separate manifest. Keep it with the independent native backup, then compare the transferred snapshot against this source manifest:

```sh
node deployment/render/migration/snapshot.mjs manifest /private/export.json /private/source-manifest.json
node deployment/render/migration/snapshot.mjs verify /private/transferred.json /private/source-manifest.json
node deployment/render/migration/snapshot.mjs archive-sql /private/transferred.json /private/source-manifest.json /private/archive.sql
```

Outputs use exclusive creation and owner-only permissions. Store all three output files outside the repository and web root. Never regenerate the comparison manifest from the destination to conceal a mismatch. Consistency and completeness metadata are **operator attestations**, not proof from this program: reconcile table counts with the independent native export and test a restore before cutover.

The SQL creates an additive archive in `pediarounds_legacy_private` with access revoked from PUBLIC, anon and authenticated. Each snapshot is immutable by digest; retries add no duplicate rows. Any conflicting existing rows abort the transaction. Both directions of row comparison run before commit. Original JSON payload text stays intact inside each archived row. Run only as the database owner through the approved database administration connection. No SQL was applied to the hosted database for this change.

## Identity and cutover requirements

1. Obtain the current complete runnable application source. Keep its private content and encrypted media outside the public repository. Port the existing screens and study/exam endpoints, including all eight data types.
2. Provision independent authentication using the existing external provider. Legacy platform headers are not authentication on Render. Do not copy ChatGPT sessions or passwords. A verified new login alone does not establish ownership of an old `user_id`.
3. Implement a one-to-one identity map after authenticated proof of control of both old and new accounts, or a separately verified recovery process. Email-string equality is not a substitute. Preserve records for unclaimed users without exposing them to anyone else.
4. Populate application tables using that identity map and preserved question IDs. Archive all source states and reconcile each user's progress, annotations, revisions and exam results. An archive alone is not usable migrated progress.
5. Test real login, account isolation, logout, resume and persistence after a redeploy. Source question IDs absent from the beta require the full bank or an explicit lossless mapping before cutover.
6. Pause source writes for the final consistent export, re-run counts/digests and verify target reads. Switch only after reconciliation succeeds. Keep Sites and the original export available for rollback. Once the target accepts writes, rollback must also preserve those new writes; blindly restoring the old snapshot loses data.

The verifier deliberately always returns `cutoverReady: false`. Only the completed integration and operator reconciliation can establish readiness. This change does not change source writes, deploy configuration, authentication, question content or the current live platform.

## Verification completed

- Nine Node tests passed: missing tables, altered rows, duplicate keys, truncated projections, source-manifest mismatches, numeric fidelity and exact long Unicode payload preservation.
- Isolated in-memory PostgreSQL testing with PGlite 0.5.8 restored all eight fictional table records exactly, preserved long payload strings, verified duplicate-free retries, denied reads to both anonymous and authenticated roles, and rolled back an entire conflicting retry.
- No hosted database writes, real-user import, production login test or traffic switch occurred. Existing account ownership and final-write reconciliation remain blockers.

References: [Supabase identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking), [Render deployment behavior](https://render.com/docs/deploys).
