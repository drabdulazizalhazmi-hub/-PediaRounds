# PediaRounds migration status — 2026-09-06

Target original Sites project: `appgprj_6a9b542a7a7c81919e2e97f30ed411bd`.

This directory records the migration material that is actually available in this ChatGPT session. It is **not** a recovered export of the original ChatGPT Site backend.

## Moved into GitHub in this migration

- Arabic scenario repair module: `arabic-scenario/public/scenario-panel.js`
- Node package metadata for the repair module
- Question import manifest for the saved D2 2025 Q37–Q96 content set
- Explicit provenance and limits in this status file

The saved import contains 59 records: 48 MCQ cards and 11 recall cards. Q43 is absent from the saved import and has not been invented. Manual review remains required for flagged records and missing source images.

## Not recovered from the original Site

The original Site source tree, authentication backend, database, deployment configuration, secrets, and user progress store were not available through the Sites project URI in this session. Therefore this repository must not be described as a complete export of the existing live site.

## Deployment state

Moving these files to GitHub does **not** by itself change or publish `https://pediarounds-alhazmi.dr-abdulazizalhazmi.chatgpt.site`.

Next engineering step: reconstruct or import the actual web application around these migrated assets, configure authentication and persistence without committing secrets, run integration tests, and deploy through a supported host/repository workflow.
