# PediaRounds Master Bank — Shared Progress & Handoff

> **Single source of truth for coordination between ChatGPT conversations.**
> Every conversation working on PediaRounds must read this file **and** the current PR #2 file list before starting, then update this file after each successful batch.

## Repository / PR

- Repository: `drabdulazizalhazmi-hub/-PediaRounds`
- Working branch: `master-bank/scfhs-merge`
- Pull request: `#2 — Initialize PediaRounds Master Bank`
- Base branch: `main`
- Last synchronized: `2026-09-07 09:16 +03:00`
- Last observed PR head before this handoff file: `8f113067eceefefc42cdc61f7c79bf39c332756d`

## Coordination protocol — mandatory

1. **Before doing work:** fetch this file and list changed filenames in PR #2.
2. Do **not** rely on a chat's remembered “next question” if GitHub shows newer files.
3. Reuse the same branch and PR; do not open another Master Bank PR unless explicitly requested.
4. Before creating a new question-data file, check whether the exact range/path already exists.
5. Preserve `recalledAnswer` separately from `verifiedAnswer`.
6. Image-dependent questions remain blocked as `image_missing` / `image_needs_review` until the original image is linked and reviewed.
7. Keep English question/TTS and clear Arabic clinical explanation with English medical terminology.
8. Do not silently correct source conflicts; mark `conflicting`, `incomplete_recall`, or `outdated` and document why.
9. Do not commit source PDFs, credentials, tokens, passwords, or secrets.
10. **After a successful batch:** update the `Latest handoff`, `Coverage notes`, `Review gates`, and `Next action` sections below using the latest blob SHA. If another conversation updated this file first, refetch it and merge the newer state rather than overwriting it.

## Latest handoff

The branch has progressed beyond the earlier chat pointers. Current file inventory confirms:

- **Dermatology:** data files now cover `Q1–Q22` (`q01-q06-q21-q22` plus `q07-q20`).
- **Ophthalmology:** data files cover `Q1–Q10` (`q01-q08` plus `q09-q10`).
- **Growth & Development:** `Q1–Q21` dataset exists.
- **Gastroenterology:** congenital ranges `Q2–Q21` are present; later gap-fill files now exist for `Q24–Q26`, `Q29–Q35`, `Q38–Q43`, `Q44–Q49`, `Q52–Q56`, `Q57–Q61`, `Q64–Q70`, `Q71–Q79`, and `Q80–Q85`. The review notes state `Q62–Q63` were already present and `Q86` was already imported. Generic supported batches contain additional pre-existing Gastro records.
- **ENT:** `Q1–Q9` dataset exists.
- **Medical Ethics / Patient Safety / Research & Communication:** structured datasets and review bundles are present.

This means a conversation must **not restart Dermatology, Ophthalmology, or the earlier Gastro gap ranges** merely because its local chat history is stale.

## Coverage notes

### Strongly represented / full-range datasets visible in PR #2

- Growth & Development `Q1–Q21`
- Dermatology `Q1–Q22`
- Ophthalmology `Q1–Q10`
- ENT `Q1–Q9`
- Neonatology `Q1–Q43`
- Neurology has files spanning `Q1–Q50`
- Nephrology & Urologic Disorders has files spanning `Q1–Q63`
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
- Genetics files span `Q1–Q52`; source/review notes must be checked before claiming Q53 final
- Metabolic Disorders files span `Q1–Q23`

### Requires coverage audit before calling fully complete

- **Gastroenterology Q1–Q86:** most explicit gaps are now filled, but generic `batch*-supported` files overlap the explicit ranges. Run an ID/range audit and deduplication check before marking `86/86` complete.
- **Nutrition & Malnutrition Q1–Q23:** several supported/gap files exist; audit exact coverage and duplicates.
- **Pulmonary / Sleep / Asthma:** multiple files exist under respiratory/ENT plus legacy Part II batch data; audit exact canonical coverage.
- **Allergy / Immunology:** data files are present, but canonical deduplication and verification remain required.
- **Medical Ethics & Patient Safety:** newer structured files and incomplete-recall queues exist; audit range completeness and verification state.

## Review gates currently known

- Gastro Q35: congenital diarrhea differential remains `conflicting` without stool electrolytes.
- Gastro Q42: duplicate option label in source.
- Gastro Q44–Q45: sodium/cerebral-edema stems have source assumptions missing from recall.
- Gastro Q53: achalasia vs eosinophilic esophagitis overlap.
- Gastro Q56–Q57: original imaging required; source itself questions the image interpretation / definitive study.
- Gastro Q58–Q59: GER/PPI framing requires verification.
- Gastro Q64, Q65, Q68, Q70, Q73–Q75, Q81: original images required.
- Gastro Q71, Q80: source conflicts explicitly documented.
- Gastro Q79, Q85: source option set differs from preferred modern imaging framing.
- Dermatology/Ophthalmology image-dependent items remain gated by the image manifests/review queues.

## Next action

**Do not blindly continue from an old question number.** The next conversation should:

1. Run a **Master Bank coverage audit** against PR #2 to identify the first truly missing canonical question IDs/ranges across all source sections.
2. Prioritize real gaps over already-created ranges.
3. Then continue importing the next largest missing batch using the same style: English stem/options + English TTS + clear Arabic explanation + provenance + image gate + `recalledAnswer`/`verifiedAnswer` separation.
4. Update this file immediately after the batch lands.

## Style contract between conversations

- Work in **large batches** when source quality permits.
- Be concise in chat status updates: report only what was actually committed.
- Do not claim a section is complete merely because files exist; exact ID coverage + duplicate audit + review gates determine completion.
- When source text is incomplete, preserve the gap rather than inventing wording.
- UpToDate first, then Nelson, then a current specialty guideline for independent verification when required.

---

**Handoff rule:** GitHub wins over chat memory. Read the branch, work forward, update this file, and leave the next conversation a clean handoff.
