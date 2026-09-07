#!/usr/bin/env python3
"""Validate canonical Dermatology shards without changing or publishing questions.

Optional --pdf verifies normalized source stems/options/keys/years against the
supplied 2026 PART Pediatric 3.pdf, physical pages 637-650. Requires jsonschema;
PDF comparison also requires PyMuPDF. Structural/source QA is not medical QA.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any

SOURCE_SHA256 = 'c27467c9992a5fb480fcaeb3d0b05b516678724f16999b03aa93e5773480e632'
DATA_DIR = 'master-bank/data/04-general-paediatrics-outpatients'
DATA_FILES = [f'{DATA_DIR}/dermatology-part2-q01-q06-q21-q22.json',
              f'{DATA_DIR}/dermatology-part2-q07-q20.json']
REVIEW_FILES = ['master-bank/review-queue/derm-oph-20260907-incomplete-recalls.json',
                'master-bank/review-queue/dermatology-part2-single-option-q04-q12.json']
EXPECTED = {f'part2-derm-q{n:02}' for n in range(1, 23)}
REVIEW_ONLY = {'part2-derm-q04', 'part2-derm-q12'}

def normalize(value: str) -> str:
    return re.sub(r'\s+', ' ', value).strip()

def load_array(path: Path) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(data, list) or any(not isinstance(q, dict) for q in data):
        raise ValueError(f'{path}: expected an array of objects')
    return data

def source_items(pdf: Path) -> dict[str, dict[str, Any]]:
    import fitz
    if hashlib.sha256(pdf.read_bytes()).hexdigest() != SOURCE_SHA256:
        raise ValueError('PDF hash differs: page mapping must be reviewed before use')
    with fitz.open(pdf) as doc:
        text = '\n'.join(doc[p-1].get_text(sort=True) for p in range(637, 651))
    starts = list(re.finditer(r'(?m)^Q(\d+)\)', text))
    result = {}
    for i, match in enumerate(starts):
        segment = text[match.end():starts[i+1].start() if i+1 < len(starts) else len(text)]
        before_key = segment.split('Correct answer:', 1)[0]
        body, exam = before_key.split('Part II', 1)
        options = list(re.finditer(r'(?m)^([A-E])\.\s*', body))
        key_match = re.search(r'Correct answer:\s*([^\n]+)', segment)
        if not options or key_match is None:
            raise ValueError(f'Cannot parse source Q{match.group(1)}')
        key = key_match.group(1).strip()
        result[f'part2-derm-q{int(match.group(1)):02}'] = {
            'stemEn': normalize(body[:options[0].start()]),
            'options': [{'key': opt.group(1), 'text': normalize(body[opt.end():options[j+1].start() if j+1 < len(options) else len(body)])}
                        for j, opt in enumerate(options)],
            'yearTags': sorted({int(y) for y in re.findall(r'Part II (\d{4})', 'Part II'+exam)}, reverse=True),
            'recalledAnswer': key.rstrip('?').strip(), 'rawKey': key}
    if set(result) != EXPECTED:
        raise ValueError('Source section does not contain exactly Q1-Q22')
    return result

def validate(records: list[dict[str, Any]], mcq_ids: list[str], schema: dict[str, Any],
             source: dict[str, dict[str, Any]] | None = None) -> dict[str, Any]:
    from jsonschema import Draft202012Validator
    errors = []
    ids = [q.get('id') for q in records]
    if len(ids) != len(set(ids)):
        errors.append('Duplicate stable IDs across the selected data and review files')
    if set(ids) != EXPECTED:
        errors.append(f'Wrong coverage: missing={sorted(EXPECTED-set(ids))}; unexpected={sorted(set(ids)-EXPECTED)}')
    if set(mcq_ids) != EXPECTED-REVIEW_ONLY or len(mcq_ids) != 20:
        errors.append('MCQ data must contain 20 records; Q4 and Q12 belong in review only')
    validator = Draft202012Validator(schema)
    checked = 0
    for q in records:
        qid = q.get('id', '<missing>')
        options = q.get('options', [])
        if qid in mcq_ids:
            errors.extend(f'{qid}: schema: {e.message}' for e in validator.iter_errors(q))
        elif qid in REVIEW_ONLY and len(options) != 1:
            errors.append(f'{qid}: preserve the single source option, without invented distractors')
        if q.get('publishable') is not False or q.get('verifiedAnswer') is not None:
            errors.append(f'{qid}: this unapproved batch must remain unpublished and unverified')
        for field in ('scenarioAr', 'explanationAr', 'incorrectOptionsAr'):
            if not isinstance(q.get(field), str) or not re.search(r'[\u0600-\u06ff]', q[field]):
                errors.append(f'{qid}: missing Arabic {field}')
        tts = q.get('tts', {})
        expected_tts = q.get('stemEn', '')+' '+' '.join('Option '+o['key']+'. '+o['text']+'.' for o in options)
        if tts.get('language') != 'en' or normalize(tts.get('text', '')) != normalize(expected_tts):
            errors.append(f'{qid}: TTS must preserve the full stem and all original options in order')
        if source and qid in source:
            for field in ('stemEn', 'options', 'yearTags', 'recalledAnswer'):
                if q.get(field) != source[qid][field]:
                    errors.append(f'{qid}: source mismatch in {field}')
            if q.get('sourceKeyRaw', q.get('sourceAnswerText')) != source[qid]['rawKey']:
                errors.append(f'{qid}: uncertain raw source key was not preserved')
            checked += 1
    if errors:
        raise ValueError('\n'.join(errors))
    return {'sourceRecords': len(records), 'mcqDrafts': len(mcq_ids), 'reviewOnlyRecords': 2,
            'duplicateIds': 0, 'sourceMatchedRecords': checked, 'mcqSchemaPassed': 20,
            'scope': 'Selected Dermatology files only; not global-bank deduplication or clinical validation',
            'sourceSha256': SOURCE_SHA256 if source else None,
            'imageRenderingTested': False, 'audioPlaybackTested': False, 'liveSiteUpdated': False}

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path('.'))
    parser.add_argument('--review-file', type=Path)
    parser.add_argument('--schema', type=Path)
    parser.add_argument('--pdf', type=Path)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    try:
        review_path = args.review_file
        if review_path is None:
            found = [args.root/p for p in REVIEW_FILES if (args.root/p).exists()]
            if len(found) != 1:
                raise ValueError('Specify --review-file: zero or multiple review bundles found')
            review_path = found[0]
        records = []
        for rel in DATA_FILES:
            records.extend(load_array(args.root/rel))
        mcq_ids = [q['id'] for q in records]
        records.extend(q for q in load_array(review_path) if str(q.get('id', '')).startswith('part2-derm-'))
        schema_path = args.schema or args.root/'master-bank/schema/question.schema.json'
        schema = json.loads(schema_path.read_text(encoding='utf-8'))
        report = validate(records, mcq_ids, schema, source_items(args.pdf) if args.pdf else None)
        output = json.dumps(report, ensure_ascii=False, indent=2)+'\n'
        if args.report:
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(output, encoding='utf-8')
        print(output, end='')
        return 0
    except (OSError, ValueError, KeyError, ImportError) as exc:
        print(f'Validation failed: {exc}')
        return 1

if __name__ == '__main__':
    raise SystemExit(main())
