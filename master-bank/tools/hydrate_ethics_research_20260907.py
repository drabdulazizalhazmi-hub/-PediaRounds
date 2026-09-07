"""Load only this recovery batch; preserve source text and keep publication blocked."""
from __future__ import annotations
import argparse
import copy
import json
from pathlib import Path

MANIFEST = 'master-bank/sources/ethics-research-20260907-source-manifest.json'

def load_json(root: Path, relative: str):
    path = (root / relative).resolve()
    if not path.is_relative_to(root.resolve()):
        raise ValueError('Path escapes root: ' + relative)
    return json.loads(path.read_text(encoding='utf-8'))

def hydrate(root: Path) -> dict:
    manifest = load_json(root, MANIFEST)
    drafts = []
    for path in manifest['canonicalDataFiles']:
        drafts.extend(load_json(root, path))
    recalls = load_json(root, manifest['recallFile'])
    figures = load_json(root, manifest['imageManifest'])
    canonical = {Path(a['path']).stem: a['path'] for a in figures}
    if len(canonical) != len(figures):
        raise ValueError('Image basename collision')
    def resolve_image(path: str) -> str:
        # Early raw exports may have guessed an extension; xref/page identity is stable.
        resolved = canonical.get(Path(path).stem)
        if resolved is None:
            raise ValueError('Unregistered image: ' + path)
        return resolved
    rows = copy.deepcopy(drafts + recalls)
    ids = [q['id'] for q in rows]
    if len(ids) != 47 or len(set(ids)) != 47:
        raise ValueError('Expected exactly 47 unique source records')
    if set(ids) != set(manifest['newRecordIds']):
        raise ValueError('ID coverage differs from source manifest')
    if len(drafts) != 35 or len(recalls) != 12:
        raise ValueError('Expected 35 MCQ drafts and 12 separate recalls')
    for q in rows:
        if not q.get('stemEn') or not q.get('sourceRefs'):
            raise ValueError('Missing source text/provenance: ' + q['id'])
        options = q['options']
        if len({o['key'] for o in options}) != len(options):
            raise ValueError('Repeated option key: ' + q['id'])
        if q['contentType'] == 'mcq_draft' and len(options) < 2:
            raise ValueError('Incomplete recall entered MCQ collection')
        if q['contentType'] == 'source_recall' and len(options) >= 2:
            raise ValueError('Unexpected multi-option record in recall collection')
        if q.get('verifiedAnswer') is not None or q.get('publishable') is not False:
            raise ValueError('Recovery batch must remain unapproved')
        q['tts'] = {'enabled': True, 'language': 'en', 'text':
            q['stemEn'] + ' ' + ' '.join(
                'Option ' + o['key'] + '. ' + o['text'] + '.' for o in options)}
        q.setdefault('examPart', 'Part II')
        q.setdefault('answerConfidence', 'unknown')
        q.setdefault('keywords', [q.get('subtopic', q['topic'])])
        q.setdefault('verification', {
            'upToDate': 'not_checked', 'nelson': 'not_checked',
            'guideline': 'not_checked',
            'referenceNotes': 'Source summary only; focused external checks are separate.'})
        if q['id'] == 'part2-ethics-q16':
            q['verification']['guideline'] = 'conflicts'
        q['blockers'] = sorted(set(q.get('blockers', []) +
            ['independent_verification_pending', 'editorial_approval_pending']))
        q['explanationAssetPaths'] = [resolve_image(p) for p in q.get('explanationAssetPaths', [])]
        question_figures = [a for a in figures if a['questionId'] == q['id'] and a['role'] == 'question']
        if question_figures:
            q.setdefault('image', {})
            q['image'].update({'requiredForQuestion': True, 'assetPath': None,
                'bundleAssetPath': question_figures[0]['path'], 'status': 'needs_review'})
            q['blockers'] += ['image_publication_rights_pending', 'image_not_uploaded_to_repository']
        else:
            q.setdefault('image', {'requiredForQuestion': False, 'assetPath': None, 'status': 'not_required'})
        if q['explanationAssetPaths']:
            q['blockers'].append('supporting_figure_publication_rights_pending')
        if q['contentType'] == 'source_recall':
            q['blockers'].append('fewer_than_two_source_options')
    return {'recordCount': 47, 'mcqDrafts': rows[:35], 'incompleteRecalls': rows[35:],
            'liveSitePublished': False, 'gradingEnabled': False}

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = hydrate(args.root)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Validated: 35 MCQ drafts + 12 recalls; 47 TTS texts; publication and grading disabled.')

if __name__ == '__main__':
    main()
