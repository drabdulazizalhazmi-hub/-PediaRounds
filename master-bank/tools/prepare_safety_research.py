#!/usr/bin/env python3
"""Prepare a SOURCE-REVIEW bundle, not a deployable/clinically approved bank.

Run: python master-bank/tools/prepare_safety_research.py --root . \
       --output prepared-review.json --pdf '/private/2026 PART Pediatric 3.pdf'
Only --pdf needs PyMuPDF. No source record, production ID or publication gate is edited.
"""
from __future__ import annotations
import argparse
import copy
import hashlib
import json
import re
from pathlib import Path
from typing import Any

FILES = (
    'master-bank/data/01-principles-of-paediatrics/patient-safety-part2-q12-q23.json',
    'master-bank/data/01-principles-of-paediatrics/patient-safety-part2-q25-q33.json',
    'master-bank/data/01-principles-of-paediatrics/research-biostatistics-communication-part2-q01-q13.json',
    'master-bank/review-queue/safety-research-20260907-recall-cards.json',
)
EXPECTED = {f'part2-ethics-q{n:02d}' for n in range(12, 35)} | {f'part2-research-q{n:02d}' for n in range(1, 14)}
STATES = {'needs_verification', 'incomplete_recall', 'conflicting', 'image_needs_review'}

def narrate(r: dict[str, Any]) -> str:
    return ' '.join([r['stemEn']] + [f"Option {o['key']}. {o['text']}." for o in r['options']])

def read_records(root: Path) -> list[dict[str, Any]]:
    records = []
    for relative in FILES:
        value = json.loads((root / relative).read_text(encoding='utf-8'))
        if not isinstance(value, list):
            raise ValueError(f'{relative}: expected a JSON array')
        records.extend(value)
    return sorted(records, key=lambda r: (r['id'].startswith('part2-research'), int(r['id'].split('-q')[-1])))

def validate(records: list[dict[str, Any]], source: list[dict[str, Any]] | None = None) -> None:
    ids = [r['id'] for r in records]
    if len(ids) != len(set(ids)) or set(ids) != EXPECTED:
        raise ValueError('Duplicate IDs or unexpected source coverage')
    source_map = {}
    for r in source or []:
        prefix = 'ethics' if r['label'] == 'safety' else 'research'
        source_map[f"part2-{prefix}-q{r['number']:02d}"] = r
    for r in records:
        ident = r['id']
        if r.get('publishable') is not False or r.get('verifiedAnswer') is not None:
            raise ValueError(f'{ident}: premature publication or verification')
        if r.get('reviewStatus') not in STATES:
            raise ValueError(f'{ident}: unexpected review status')
        for field in ('stemEn', 'scenarioAr', 'explanationAr', 'incorrectOptionsAr'):
            if not isinstance(r.get(field), str) or not r[field].strip():
                raise ValueError(f'{ident}: missing {field}')
        for field in ('scenarioAr', 'explanationAr', 'incorrectOptionsAr'):
            if not re.search(r'[\u0600-\u06ff]', r[field]):
                raise ValueError(f'{ident}: Arabic content missing in {field}')
        if not r.get('sourceRefs') or not r.get('sourcePages') or not r.get('yearTags'):
            raise ValueError(f'{ident}: provenance missing')
        options = r['options']
        if len({o['key'] for o in options}) != len(options):
            raise ValueError(f'{ident}: duplicate option key')
        expected_kind = 'mcq_draft' if len(options) >= 2 else 'recall_card'
        if r.get('contentType') != expected_kind:
            raise ValueError(f'{ident}: invented or misclassified MCQ')
        if r.get('tts', {}).get('text') is not None and r['tts']['text'] != narrate(r):
            raise ValueError(f'{ident}: narration does not exactly follow stem/options')
        if source_map:
            s = source_map[ident]
            for field in ('stemEn', 'options', 'sourceAnswerText', 'yearTags'):
                if r[field] != s[field]:
                    raise ValueError(f'{ident}: source mismatch in {field}')
    if sum(r['contentType'] == 'mcq_draft' for r in records) != 27:
        raise ValueError('Expected 27 MCQ drafts and nine recall cards')

def extract_source(pdf: Path) -> list[dict[str, Any]]:
    import fitz  # Optional dependency; PDF remains private.
    with fitz.open(pdf) as doc:
        text = '\n'.join(doc[i].get_text(sort=True) for i in range(670, 690))
    start = text.index('Patient Safety (23 Questions)')
    middle = text.index('Research, Biostatistics, and Communication Skills', start)
    out = []
    for label, a, b in [('safety', start, middle), ('research', middle, len(text))]:
        section = text[a:b]
        matches = list(re.finditer(r'(?m)^Q(\d+)\)\s*', section))
        for j, match in enumerate(matches):
            stop = matches[j+1].start() if j+1 < len(matches) else len(section)
            raw = section[match.end():stop]
            header = raw.split('Part II', 1)[0]
            opts = list(re.finditer(r'(?m)^([A-E])\.\s*', header))
            norm = lambda v: ' '.join(v.split())
            answer = re.search(r'Correct answer:\s*(.*?)(?=\n\s*\n|$)', raw, re.S)
            out.append({
                'number': int(match[1]), 'label': label,
                'stemEn': norm(header[:opts[0].start()] if opts else header),
                'options': [{'key': o[1], 'text': norm(header[o.end():opts[k+1].start() if k+1 < len(opts) else len(header)])} for k, o in enumerate(opts)],
                'sourceAnswerText': norm(answer[1].split('Explanation:', 1)[0]) if answer else None,
                'yearTags': sorted({int(y) for y in re.findall(r'Part II (20\d\d)', raw)}, reverse=True),
            })
    return out

def prepare(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result = copy.deepcopy(records)
    for r in result:
        r['tts'] = {'enabled': True, 'language': 'en', 'text': narrate(r), 'requiresPreparation': False}
        r['examPart'] = 'Part II'
        r['answerConfidence'] = 'unknown'
        r['duplicateOf'] = None
        r['verification'] = {k: 'not_checked' for k in ('upToDate', 'nelson', 'guideline')}
        r['verification']['referenceNotes'] = 'Source review only. External checks are limited and recorded separately; not clinical/legal approval.'
        r['blockers'] = ['independent_verification_pending']
        if r['contentType'] == 'recall_card':
            r['blockers'].append('not_a_complete_mcq')
        if r['reviewStatus'] in ('conflicting', 'incomplete_recall'):
            r['blockers'].append('source_context_or_answer_unresolved')
        if r.get('explanationAssetPaths') or r.get('image', {}).get('requiredForQuestion'):
            r['blockers'].extend(['repository_images_not_uploaded', 'image_publication_rights_pending'])
    validate(result)
    return result

def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root', type=Path, default=Path('.'))
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--pdf', type=Path)
    p.add_argument('--source-manifest', type=Path)
    args = p.parse_args()
    try:
        records = read_records(args.root)
        source = extract_source(args.pdf) if args.pdf else None
        if source is None and args.source_manifest:
            source = json.loads(args.source_manifest.read_text(encoding='utf-8'))['sourceRecords']
        validate(records, source)
        prepared = prepare(records)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(prepared, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(json.dumps({'sourceRecords': 36, 'mcqDrafts': 27, 'recallCards': 9,
                          'sourceCompared': source is not None, 'publishable': 0,
                          'outputSha256': hashlib.sha256(args.output.read_bytes()).hexdigest()}))
    except (ValueError, KeyError, OSError, ImportError) as exc:
        p.exit(1, f'Preparation failed: {exc}\n')

if __name__ == '__main__':
    main()
