# PediaRounds Master Bank

This directory defines the merge workflow for the PediaRounds pediatric question bank.

## Core rules

1. Organize questions using the 19 SCFHS Saudi Postgraduate Diploma in Paediatrics modules.
2. Deduplicate repeated files and repeated questions before publication.
3. Preserve source provenance internally: source file, year/part, page/question number, and source confidence.
4. For repeated questions, keep one canonical question and record every year/source where it appeared.
5. Prefer the clearest complete vignette and complete answer choices.
6. Image-dependent questions must retain an associated image reference. If the image is missing or unclear, mark the question `image_missing` or `image_needs_review` rather than publishing it as complete.
7. English reading is a first-class feature: store clean English stem and options suitable for text-to-speech.
8. Arabic explanation is a first-class feature: explain the clinical reasoning clearly in Arabic while preserving key English medical terminology.
9. Do not trust recall-book answer keys automatically. Store the recalled answer separately from the verified answer.
10. Verification priority: UpToDate first, then Nelson Textbook of Pediatrics, then the most relevant current specialty guideline when needed.
11. If references disagree, mark the question `conflicting` and retain the reasoning trail; do not silently overwrite the recalled answer.
12. Do not commit passwords, API keys, tokens, or copyrighted source PDFs to the public repository.

## Question presentation order

- English question stem
- English answer choices
- Optional/required image
- User answer
- Correct answer
- Clear Arabic explanation with English medical terms
- High-yield clues / keywords
- Why the correct option is correct
- Why the other options are incorrect
- Diagnostic / management steps when relevant
- Clinical pearl / board trap
- Verification references and status

## Merge states

`imported` → `deduplicated` → `image_checked` → `needs_verification` → `verified` → `ready_for_publish`

Additional review states: `conflicting`, `incomplete_recall`, `image_missing`, `image_needs_review`, `outdated`.

## Current source strategy

The uploaded source library contains Part I recalls/reviews across multiple years, specialty collections, the SCFHS curriculum, and a 2026 Part II collection containing 1023 recalled questions. These sources are used to build transformed structured records; the original PDFs are not copied into this public repository.
