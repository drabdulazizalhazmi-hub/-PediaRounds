# Scientific English explanation revision

The sodium-disorder explanations previously mixed Arabic and English. This change adds edited `explanationEn` and `incorrectOptionsEn` fields for Endocrinology Q34–Q38, with PDF page numbers and a SHA-256 fingerprint. They are clinical teaching text, not quotations falsely attributed to UpToDate.

The source is the existing [Pediatric Saudi Board Exams Question Collection, 4th Edition, 1 May 2026](../../master-bank/sources/original-pdfs/Pediatric-Saudi-Board-Exams-Question-Collection-4th-ED-1-May-2026.pdf), 690 pages, SHA-256 `85f22dabc1e7f434bc39c49efecb2dcb7f4caadc63ac2abb93f6124a96b370b3`. Pages below use the PDF viewer's one-based numbering.

| Record | PDF pages | Language and source review |
|---|---|---|
| Endocrinology Q34 | 177–178 | SIADH terminology; the explanation includes a raster diagram/table and was visually inspected. |
| Endocrinology Q35 | 178 | Postoperative hyponatremia and urgent serum sodium measurement. |
| Endocrinology Q36 | 178–179 | Cerebral salt wasting, natriuresis, and hypovolemia; preserve the distinction from SIADH. |
| Endocrinology Q37 | 179 | Central diabetes insipidus / arginine vasopressin deficiency. The PDF's description of urine sodium 125 as low is unresolved; do not silently change it. |
| Endocrinology Q38 | 179–180 | Hypotonic polyuria and inadequate water replacement. The PDF explicitly refers to earlier explanations. |

IDs, stems, options, recalled and verified answers, images, duplicate links, and publication/review states remain unchanged. The old fields remain available for provenance. Q38 remains a linked duplicate with its existing incomplete option set. The schema describes English teaching as distinct from original-source quotations. Reading the source collection's UpToDate attribution is not independent access to the original UpToDate entry.

This public GitHub branch does not contain the full private application or its users. It does not deploy Render or change its source-only explanation policy. A consuming app must explicitly distinguish authored English teaching from original source material. Render workspace selection was unavailable in this session; no Render resource was changed.

The companion update to the current private Site source adds 76 exact-text translations (55 → 131 total entries), including 64 primary explanations from the 2024/2025 collections and 12 sodium-related teaching passages. The 277 primary explanations in those two collections now render in English; 64 were newly translated. Four additional canonical sodium questions render in English. Review pages now apply the same translation mapping, and new exam snapshots translate option-comparison text. Source text, review decisions, scoring, and stored attempts remain unchanged.

The language audit is intentionally explicit about unfinished coverage: 2,030 primary bank explanations, 573 review explanations, and 2,040 Nelson explanations still need translation. Bank and review records overlap, so these numbers must not be summed as unique questions. Supplemental discussions have additional untranslated text. This is a bounded language revision, not completion or clinical validation of the entire platform.

## Selected clinical cross-checks

Existing qualifications were retained rather than replacing corrected teaching with older English source paragraphs. Selected points were checked against [RCH emergency airway management](https://www.rch.org.au/clinicalguide/guideline_index/Emergency_airway_management/), [CPS acute asthma guidance](https://cps.ca/en/documents/position/managing-an-acute-asthma-exacerbation), and [RCH iron poisoning guidance](https://www.rch.org.au/clinicalguide/guideline_index/Iron_poisoning/). These checks support individualized airway medication choice, context-dependent asthma escalation, and assessment of iron toxicity before automatically selecting chelation. They do not certify every translated question or establish current Saudi policy.

The private application has 22 targeted passing regression tests covering source preservation, clinical cautions, English display in both collections, review-page translation, and examination answer withholding. Deployment status is recorded separately after publication; preparing this branch does not itself establish live publication.
