# PediaRounds Master Bank — Shared Progress & Handoff

> **Single source of truth for coordination between ChatGPT conversations.**
> Every conversation working on PediaRounds must read this file and `coordination/current-work-state.md` before starting, then update both after each successful batch.

## Repository / current continuation

- Repository: `drabdulazizalhazmi-hub/-PediaRounds`
- PR #2 `Initialize PediaRounds Master Bank` was **merged** into `main` on 2026-09-07.
- PR #2 merge commit: `8d73d387f4fe57410f10f4ec46c10ab6dd059765`
- Current continuation branch: `master-bank/part1-2025-batch01`
- Base branch: `main`
- Last synchronized: `2026-09-07 12:38 +03:00`
- Latest committed batch on continuation branch: Part I 2025 `Q1–Q15`.

## Coordination protocol — mandatory

1. **Before doing work:** fetch this file, `coordination/current-work-state.md`, and inspect current branch/PR state.
2. Do **not** rely on a chat's remembered “next question” if GitHub shows newer files.
3. Before creating a new question-data file, check whether the exact source/range already exists.
4. Preserve `recalledAnswer` separately from `verifiedAnswer`.
5. Image-dependent questions remain blocked as `image_missing` / `image_needs_review` until the original image is linked and reviewed.
6. Keep English question/TTS and clear Arabic clinical explanation with English medical terminology.
7. Do not silently correct source conflicts; mark `conflicting`, `incomplete_recall`, or `outdated` and document why.
8. Do not commit source PDFs, credentials, tokens, passwords, or secrets.
9. **After a successful batch:** update this file and `coordination/current-work-state.md`.

## Latest handoff

Cross-chat coordination is active. GitHub is the shared memory and the original Part II master-bank PR has been merged.

Recent synchronized work includes:
- **Part I 2025:** first transformed batch `Q1–Q15` added on `master-bank/part1-2025-batch01`, with `verifiedAnswer: null` throughout and a dedicated review queue.
- **Dermatology:** data files cover `Q1–Q22`.
- **Ophthalmology:** canonical data covers `Q1–Q10`; image-dependent questions remain gated.
- **Growth & Development:** `Q1–Q21` dataset exists.
- **Gastroenterology:** source coverage extends through Q86; exact ID/duplicate audit remains required before a final canonical-completion claim.
- **Nutrition:** source coverage extends through Q23; exact coverage/duplicate audit remains required.
- **ENT:** canonical file is `Q1–Q9`.
- **Infectious Diseases:** source coverage exists through `Q125`.
- **Genetics:** source numbering reaches Q52 although the TOC declares 53; do not fabricate Q53.
- **Neurology:** source-backed files span `Q1–Q50`.
- **Sleep Medicine:** Q15 is preserved as an incomplete single-option recall; Q16–Q18 are in the respiratory/sleep batch.
- **QA tooling:** audit/manifest/duplicate/asset-validation/answer-normalization tooling and quality workflows are present on main.

## Part I 2025 current batch

File: `master-bank/data/part1-2025/part1-2025-q01-q15.json`

Review queue: `master-bank/review-queue/part1-2025-q01-q15.md`

Important gates:
- Q2 severe asthma escalation — current guideline verification required.
- Q3 asthma RSI regimen — current airway/PICU verification required.
- Q4 familial short stature inheritance — source framing potentially conflicts with polygenic/multifactorial inheritance; growth-chart image missing.
- Q5 infant of diabetic mother — wording/outcome requires current neonatal verification.
- Q6 neonatal lupus — rash image missing.
- Q7 NAIT — verify current platelet-product recommendation.
- Q8 Kawasaki — source aspirin dose must be checked against current guideline/local convention.
- Q9 gastroschisis — source image missing.
- Q11 congenital varicella — maternal infection timing conflicts with classic congenital-varicella timing.
- Q13 recurrent NTD prevention — source says folic acid 4 mg/day; verify current Saudi/local recommendation.
- Q14 DKA initial fluid — verify against current ISPAD/local guidance.
- Q15 DKA neurologic deterioration — source answer preserved; current cerebral-injury terminology/management still to verify.

## Strongly represented Part II ranges

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

## Part II areas still requiring exact canonical audit

- Gastroenterology Q1–Q86 — generic supported batches overlap explicit ranges.
- Nutrition & Malnutrition Q1–Q23 — supported/gap files may overlap.
- Pulmonary / Sleep / Asthma — legacy/canonical overlap plus incomplete image/single-option recalls.
- Allergy / Immunology — data exists, but canonical deduplication and verification remain required.
- Medical Ethics & Patient Safety — structured records and incomplete-recall queues must remain separated.

## Next action

1. Continue Part I 2025 in a **large next batch**, starting with the next source-backed question IDs not already imported.
2. Preserve the source's original question numbers even though the Rapid Review is grouped by specialty rather than numeric order.
3. Before writing, search the 2025 Rapid Review for the target IDs and recover full stem/options; do not infer missing numbers.
4. Keep image-dependent items blocked until source images are linked.
5. Keep `verifiedAnswer` null until independent UpToDate/Nelson/current-guideline review is actually performed.
6. Update the coordination files after the batch lands.

## Style contract between conversations

- Work in **large batches** when source quality permits.
- Be concise in chat status updates: report only what was actually committed.
- Do not claim a section complete merely because files exist; exact ID coverage + duplicate audit + review gates determine completion.
- When source text is incomplete, preserve the gap rather than inventing wording.
- UpToDate first, then Nelson, then a current specialty guideline for independent verification when required.

---

**Handoff rule:** GitHub wins over chat memory. Read the current branch state, work forward, update the shared handoff, and leave the next conversation a clean state.
