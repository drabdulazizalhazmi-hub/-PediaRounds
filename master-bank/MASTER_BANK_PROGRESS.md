# PediaRounds Master Bank — Shared Progress & Handoff

> **Single source of truth for coordination between ChatGPT conversations.** Read this file and `coordination/current-work-state.md` before work, then update both after every successful batch.

## Repository / active phase

- Repository: `drabdulazizalhazmi-hub/-PediaRounds`
- Base branch: `main`
- PR #2: merged
- PR #4: merged successfully as `c24996e32b4279f71518455483c45afb7da49bc7`
- PR #3: closed as superseded by PR #4
- Current working branch: `master-bank/review-images-verification`
- Phase: **image recovery / incomplete-recall cleanup / clinical verification**

## Source coverage milestone

Latest successful quality run on the closure branch reported:

- **Questions scanned: 1023**
- **Enumerated expected source slots: 1022**
- **Covered expected slots: 1022**
- **Missing expected slots: 0**
- **Exact duplicate IDs: 0**
- **Possible section/Q collisions: 0**
- **All canonical sections: full source-number coverage**

The 1023-vs-1022 discrepancy is a source numbering anomaly: the source TOC prints Genetics = 53, but the actual Genetics sequence ends at Q52 before Metabolic Disorders. **Do not fabricate Genetics Q53.**

## Current review-status inventory

From the same successful audit:

- `needs_verification`: 585
- `image_missing`: 198
- `image_needs_review`: 10
- `incomplete_recall`: 77
- `conflicting`: 131
- `outdated`: 9
- `deduplicated`: 13

Image validation reported **249 image-dependent questions** and **0 public repository assetPaths**. Original images may exist in private/source bundles, but publication remains blocked until image association, clinical review, and rights/publication handling are completed.

## Coordination protocol — mandatory

1. GitHub wins over chat memory.
2. Do not re-import already covered source-number ranges.
3. Preserve `recalledAnswer` separately from `verifiedAnswer`.
4. Keep `verifiedAnswer: null` until independent verification is explicitly recorded.
5. Do not invent missing distractors, images, years, stems, calculations, or answer keys.
6. Image-dependent questions stay blocked until an original source image is linked and reviewed; do not substitute generated images.
7. Maintain clean English stem/options/TTS plus clear Arabic clinical explanation with English medical terminology.
8. Preserve `conflicting`, `outdated`, `incomplete_recall`, `image_missing`, and `image_needs_review` until genuinely resolved.
9. Do not commit source PDFs, credentials, tokens, passwords, or secrets.
10. Before writing, refetch this file if another conversation may have advanced the branch.

## Highest-priority next work

1. **Image recovery:** reconcile the 249 image-dependent records with existing source/image manifests and recoverable original embedded images. Keep rights/publication status separate from technical extraction.
2. **Incomplete recalls:** resolve the 77 `incomplete_recall` records only where the original uploaded source provides the missing detail. Otherwise leave them incomplete.
3. **Conflicts/outdated keys:** review the 131 `conflicting` and 9 `outdated` records with source text first, then independent references where requested/appropriate.
4. **Clinical verification:** advance `needs_verification` in controlled batches using priority UpToDate → Nelson → current specialty guideline. Never infer independent verification merely because the source book cites one of these references.
5. Keep the 1023-record manifest structurally stable while cleanup proceeds.

## Style contract between conversations

- Work in large batches when source quality permits.
- Report only work actually committed.
- Do not call a record publishable because its source slot exists.
- Source completeness, image readiness, and clinical verification are separate gates.

---

**Handoff rule:** the numbered source bank is structurally covered. From here, optimize quality—not quantity.