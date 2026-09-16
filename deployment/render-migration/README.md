# PediaRounds Render migration: current source required

Status: read-only migration tooling on an isolated branch. NOT a full app deployment, NOT an authentication replacement, NOT a database migration.

## Verified in this continuation (11 September 2026)

- Existing Render service `srv-dai2qhuq1p3s73arsa2g` still starts `node deployment/render/server.mjs`, the hosting probe. Its settings were read, not changed.
- Connected GitHub main and its dated backup branch contain repair/master-bank material, not the complete current application.
- The Floot backup project's file tree contains its seeded components and backup manifest, not the current PediaRounds application routes. No Floot changes were made.
- The accessible complete source archive is `PediaRounds-Backup-2026-09-07.zip`. It was restored into a disposable LOCAL directory for inspection only. Snapshot commit: `6f2e93930db2a57d81971accaa3cbf3f5271f52a`; recorded original source commit: `fe5fa4c72090b317861dc48c8c246a443f342a14`.
- A later supplied audit identifies published version 79 at `a82c9b990776389fecd4a16e84c0437c4f2c8fb5`. That is a last-known reference, not a claim that it is today's latest version. The current complete export must be verified independently.
- Read-only inventory scanned 51 source files. Its 13 synthetic regression tests passed on Node v22.16.0. These are INVENTORY tests, not full app/login/iPhone/medical-content tests.

## Concrete migration boundaries found in the old source

1. `db/index.ts` and `db/progress.ts` import `cloudflare:workers` and expect a D1 `DB` binding. A direct import under local Node returned `ERR_UNSUPPORTED_ESM_URL_SCHEME`. Retain the database behind an authorized adapter or implement and test a deliberate data migration; do not silently replace it with empty storage.
2. `app/chatgpt-auth.ts`, API handlers and protected media services trust platform-injected identity headers. On an independently hosted server these MUST NOT become client-supplied proof of identity. Use a verified authentication boundary and explicit account-identity mapping; never infer account ownership from an unverified header or matching email alone.
3. Media/document services use `env.ASSETS.fetch` and encrypted content. Existing runtime keys and a compatible protected asset provider are required. The backup manifest explicitly excludes hosted secret values and live D1 user/progress/attempt rows.
4. Preserve original English source explanations, post-answer reveal timing, question IDs, answer keys, images, mastered questions and retry scheduling. Source words must not be replaced with generated or mixed-language fallback text.

## Run the inventory

```sh
node --test deployment/render-migration/preflight.test.mjs
node deployment/render-migration/preflight.mjs /absolute/path/to/current-source EXPECTED_FULL_SOURCE_COMMIT
```

The optional commit must come from the authorized current export. Without Git metadata, verify the export manifest and file inventory separately; a plain ZIP is not automatically rejected as unusable, but this tool cannot certify its revision. Exit code 1 means blockers were found; 2 means invalid input/read failure. Even a zero-blocker static result is NOT release approval. Source patterns are conservative diagnostics and may also match comments or already-adapted code; inspect each result rather than treating this as a complete security audit.

No .env files or runtime secret values are read or uploaded. No package/project scripts are run. The tool never changes source, data, Render settings or deploy commands.

## Required next input and release conditions

Obtain a current complete source export including application, server, data/media assets, dependency lockfile, migration definitions, and version manifest. Keep it private: do not upload account rows, runtime secrets or private source assets into this public repository. Set secret values through the destination's secret/environment settings, not chat or Git.

Then port the actual source boundaries, verify user/progress preservation, test protected media and original English explanations, run the full target build and authenticated acceptance checks, and only then replace the probe service's build/start commands. Do not restore the September 7 backup over the original live site or present a partial replacement as the complete platform.

No service, user account, question record, image, secret, or billable resource was created or changed by this continuation. The existing website and the Render probe are unchanged.
