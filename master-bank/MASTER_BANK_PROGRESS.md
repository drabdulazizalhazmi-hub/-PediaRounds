# PediaRounds Master Bank — Shared Progress & Handoff

> **Single source of truth for coordination between ChatGPT conversations.**
> Every conversation working on PediaRounds must read this file **and** the current PR #2 file list before starting, then update this file after each successful batch.

## Repository / PR

- Repository: `drabdulazizalhazmi-hub/-PediaRounds`
- Working branch: `master-bank/scfhs-merge`
- Pull request: `#2 — Initialize PediaRounds Master Bank`
- Base branch: `main`
- Last synchronized: `2026-09-07 09:15 +03:00`
- Last observed PR head before this handoff update: `c956dcfa289c12d1169120ab3d0b827615f81143`
- PR status at sync: open, mergeable, 266 commits / 207 changed files

## Coordination protocol — mandatory

1. **Before doing work:** fetch this file, `coordination/current-work-state.md`, and list changed filenames in PR #2.
2. Do **not** rely on a chat's remembered “next question” if GitHub shows newer files.
3. Reuse the same branch and PR; do not open another Master Bank PR unless explicitly requested.
4. Before creating a new question-data file, check whether the exact range/path already exists.
5. Preserve `recalledAnswer` separately from `verifiedAnswer`.
6. Image-dependent questions remain blocked as `image_missing` / `image_needs_review` until the original image is linked and reviewed.
7. Keep English question/TTS and clear Arabic clinical explanation with English medical terminology.
8. Do not silently correct source conflicts; mark `conflicting`, `incomplete_recall`, or `outdated` and document why.
9. Do not commit source PDFs, credentials, tokens, passwords, or secrets.
10. **After a successful batch:** update this file and `coordination/current-work-state.md`. If another conversation updated either first, refetch and merge the newer state rather than overwriting it.

## Latest handoff

Cross-chat coordination is active. GitHub is the shared memory and the branch has moved beyond older chat pointers.

Recent synchronized work includes:
- **Dermatology:** data files cover `Q1–Q22`.
- **Ophthalmology:** canonical data covers `Q1–Q10`; stale duplicate/review artifacts were reduced; image-dependent questions remain gated.
- **Growth & Development:** `Q1–Q21` dataset exists.
- **Gastroenterology:** explicit gap-fill files now cover the previously missing ranges through `Q85`; `Q62–Q63` and `Q86` were already present in supported batches. Exact ID/duplicate audit is still required before final `86/86` claim.
- **Nutrition:** gap files were added through `Q23`; exact coverage/duplicate audit remains required.
- **ENT:** canonical file is `Q1–Q9`; old Q1–Q2 duplicate removed.
- **Infectious Diseases:** source coverage exists through `Q125`; immunization canonical split is `Q101–Q114` + `Q115–Q125` after overlapping exports were removed.
- **Genetics:** overlapping exports were reduced. Do not fabricate Q53: TOC states 53 but actual source numbering reaches Q52 before Metabolic Disorders.
- **Neurology:** Q44 source text was recovered and restored.
- **Sleep Medicine:** duplicate coverage was reduced; Q15 is preserved as a single-option incomplete recall, Q16–Q18 remain in the canonical respiratory/sleep batch.
- **QA tooling:** branch now includes audit/manifest/duplicate/asset-validation/answer-normalization tooling and GitHub quality workflows. Use these outputs as structural gates when available.

## Coverage notes

### Strongly represented / full-range datasets visible in PR #2

- Growth & Development `Q1–Q21`
- Dermatology `Q1–Q22`
- Ophthalmology `Q1–Q10`
- ENT `Q1–Q9`
- Neonatology `Q1–Q43`
- Neurology files span `Q1–Q50`
- Nephrology & Urologic Disorders files span `Q1–Q63`
- Rheumatology `Q1–Q16`
- Musculoskeletal & Sport Medicine `Q1–Q19`
- Critical Care Medicine files span `Q1–Q55`
- Trauma & Accidents files span `Q1–Q44`
- Substances Abuse & Toxicology `Q1–Q15`
- Behavioral Medicine & Psychiatric Disorders `Q1–Q33`
- Cardiology files span `Q1–Q57`
- Endocrinology files span `Q1–Q65`
- Hematology files span `Q1–Q57`; Oncology files span `Q1–Q20`
- Infectious Diseases files span the major Part II subsections through `Q125`
- Genetics files span `Q1–Q52`; source/review notes govern the Q53 discrepancy
- Metabolic Disorders files span `Q1–Q23`

### Requires exact canonical coverage audit before calling fully complete

- **Gastroenterology Q1–Q86:** generic `batch*-supported` files overlap explicit ranges.
- **Nutrition & Malnutrition Q1–Q23:** supported/gap files may overlap.
- **Pulmonary / Sleep / Asthma:** respiratory/ENT canonical files plus legacy batch data overlap; some single-option/image-dependent recalls remain.
- **Allergy / Immunology:** data exists, but canonical deduplication and verification remain required.
- **Medical Ethics & Patient Safety:** structured records plus incomplete-recall queues must be separated correctly.

## Review gates currently known

- Gastro Q35: congenital diarrhea differential remains `conflicting` without stool electrolytes.
- Gastro Q42: duplicate option label in source.
- Gastro Q44–Q45: sodium/cerebral-edema stems have source assumptions missing from recall.
- Gastro Q53: achalasia vs eosinophilic esophagitis overlap.
- Gastro Q56–Q57: original imaging required; source itself questions image interpretation / definitive study.
- Gastro Q58–Q59: GER/PPI framing requires verification.
- Gastro Q64, Q65, Q68, Q70, Q73–Q75, Q81: original images required.
- Gastro Q71, Q80: source conflicts explicitly documented.
- Gastro Q79, Q85: source option set differs from preferred modern imaging framing.
- Dermatology/Ophthalmology image-dependent items remain gated by image manifests/review queues.
- Pulmonary image-dependent items and single-option recalls remain non-publishable until original assets/options are restored.

## Next action

**Do not blindly continue from an old question number.** The next batch should:

1. Advance the **Master Bank canonical coverage audit / 1023-ID manifest** against the latest PR.
2. Identify and remove only proven structural duplicates/path overlaps.
3. Prioritize already-extracted source images/attachments and recoverable `incomplete_recall` records.
4. Only then import a genuinely missing range, using the standard schema and review gates.
5. Update both shared coordination files immediately after the batch lands.

## Style contract between conversations

- Work in **large batches** when source quality permits.
- Be concise in chat status updates: report only what was actually committed.
- Do not claim a section is complete merely because files exist; exact ID coverage + duplicate audit + review gates determine completion.
- When source text is incomplete, preserve the gap rather than inventing wording.
- UpToDate first, then Nelson, then a current specialty guideline for independent verification when required.

---

**Handoff rule:** GitHub wins over chat memory. Read the branch, work forward, update the shared handoff, and leave the next conversation a clean state.
