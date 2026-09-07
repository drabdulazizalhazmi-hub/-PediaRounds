# Gastroenterology Part II — Review Queue (Batch 01)

Source: **Pediatric Saudi Board Exams Question Collection, 4th Edition, 1/May/2026**.

These items are intentionally **not promoted as clean verified questions**. The recall text is incomplete, internally ambiguous, or the source itself questions the answer.

## Q2 — Small left colon syndrome / maternal condition

- Recall years: Part II 2022, 2018.
- Stem: neonate did not pass meconium; contrast study showed small left colon; diabetes was not among the choices.
- Options recovered: hypertension, SLE, hypothyroidism.
- Source key: **C — Hypothyroidism**.
- Source note: the same compilation states small left colon is linked to **preeclampsia and magnesium sulfate use, not hypertension per se**.
- Status: `conflicting`.
- Action: preserve the recalled key but independently verify the intended maternal association before publishing.
- Image: original contrast-enema image must be recovered/linked if available.

## Q24 — Recurrent periumbilical pain

- Topic: functional abdominal pain.
- Partial stem recovered: recurrent periumbilical pain, sometimes sharp/sometimes dull, mainly during play and relieved by rest/lying down.
- Only the first option was reliably recovered in the current extraction.
- Status: `incomplete_recall`.
- Action: do not reconstruct missing options from memory; retrieve the complete source item before import.

## Q35 — Severe congenital diarrhea from birth

- Recall years: Part II 2023, 2022, 2021.
- Stem: severe diarrhea since birth; stool osmotic gap 40; pH 6.3.
- Options: congenital chloride diarrhea; tufting enteropathy; lactase deficiency.
- Source key: **A most likely, or B**.
- Source explicitly states the available data are insufficient to confidently distinguish congenital chloride diarrhea, congenital sodium diarrhea, and tufting enteropathy without stool electrolytes.
- Status: `conflicting`.
- Action: keep recalled answer separate from any future verified answer; verify with stool electrolyte pattern and complete original stem.

## Q38 — Bloody diarrhea

- Partial stem recovered: 2-year-old with one week of bloody diarrhea, no recent travel or antibiotic use.
- Options/answer were not completely recovered in the current source extraction.
- Status: `incomplete_recall`.
- Action: retrieve full item before import. Do not infer the organism.

## Q51 — Eosinophilic esophagitis

- Imported into the supported batch as a `conflicting` item, not publish-ready.
- Recall year: Part II 2025.
- Source key from available choices: **A — Start steroid**.
- Source's own explanation states that dietary therapy, PPI, and swallowed topical glucocorticoids are first-line approaches and notes that the best answer may not have been included among the choices.
- The stem reports only a two-week PPI exposure, while the source explanation discusses an eight-week PPI trial.
- Status: `conflicting`.
- Action: independent clinical verification required before setting `verifiedAnswer`.

## Image rule

Any item whose stem depends on a contrast study, endoscopy, rash photograph, or abdominal X-ray remains blocked from `ready_for_publish` until the corresponding image asset is recovered, reviewed, and its publication rights/provenance are acceptable.
