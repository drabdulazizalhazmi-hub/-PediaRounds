#!/usr/bin/env python3
"""Restore previously mapped figures by exact file checksum and source page.

Input PDFs stay outside the repository. No question text or scoring is changed.
Requires PyMuPDF; pass the existing original source PDF with --pdf (repeatable).
"""
import argparse
import collections
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE_HASHES = {
    'c27467c9992a5fb480fcaeb3d0b05b516678724f16999b03aa93e5773480e632',
    '85f22dabc1e7f434bc39c49efecb2dcb7f4caadc63ac2abb93f6124a96b370b3',
}
MANIFESTS = ['derm-oph-20260907-image-manifest.json',
             'neonatology-neurology-image-manifest.json',
             'ethics-research-20260907-image-manifest.json']

def digest(data):
    return hashlib.sha256(data).hexdigest()

def recover(pdf_paths, apply=False, root=ROOT):
    import fitz
    sources = []
    for path in pdf_paths:
        sha = digest(Path(path).read_bytes())
        if sha not in SOURCE_HASHES:
            raise ValueError('Unrecognized PDF checksum; no output written')
        sources.append((sha, fitz.open(path)))
    known = set()
    for path in (root/'master-bank/data').rglob('*.json'):
        data = json.loads(path.read_text())
        rows = data if isinstance(data, list) else data.get('questions', data.get('records', []))
        known.update(q['id'] for q in rows)
    figures, unresolved, writes = [], [], {}
    expected_count = 0
    for name in MANIFESTS:
        manifest = json.loads((root/'master-bank/sources'/name).read_text())
        assets = manifest if isinstance(manifest, list) else manifest['assets']
        expected_count += len(assets)
        for asset in assets:
            image_id = asset.get('id', asset.get('assetId'))
            qids = asset.get('questionIds') or [asset['questionId']]
            page = asset.get('sourcePage', asset.get('sourcePdfPage'))
            relative = asset.get('bundlePath', asset.get('path'))
            output = (root/relative).resolve()
            if not output.is_relative_to((root/'master-bank/assets').resolve()):
                raise ValueError('Unsafe source asset path')
            if asset['role'] not in ('question', 'explanation') or not set(qids) <= known:
                raise ValueError('Unknown question association or figure role: '+image_id)
            match = None
            for sha, pdf in sources:
                for im in pdf[page-1].get_images(full=True):
                    extracted = pdf.extract_image(im[0])
                    if digest(extracted['image']) != asset['sha256']:
                        continue
                    if (extracted['width'], extracted['height']) != (asset['width'], asset['height']):
                        raise ValueError('Image dimensions do not match the prior manifest')
                    match = (sha, im[0], extracted)
                    break
                if match:
                    break
            if not match:
                unresolved.append(image_id)
                continue
            sha, xref, extracted = match
            if output.exists() and output.read_bytes() != extracted['image']:
                raise ValueError('Refusing to overwrite different existing image bytes')
            writes[output] = extracted['image']
            figures.append(dict(id=image_id, questionIds=qids, phase=asset['role'],
                assetPath=relative, sha256=asset['sha256'], width=asset['width'], height=asset['height'],
                mimeType='image/png' if extracted['ext']=='png' else 'image/jpeg',
                sourcePage=page, sourceSHA256=sha, sourceXref=xref, priorManifest=name,
                caption='Original source figure - page '+str(page),
                clinicalValidation='not_claimed', scoringStatus='unchanged'))
    result = dict(schemaVersion=1, figures=figures, unresolved=unresolved)
    report = dict(sourceAssetCount=expected_count,
        recoveredFiles=len(figures), questionAssociations=sum(len(f['questionIds']) for f in figures),
        questionsWithFigures=len({q for f in figures for q in f['questionIds']}),
        phases=dict(collections.Counter(f['phase'] for f in figures)), unresolved=unresolved,
        sourceHashes=sorted({f['sourceSHA256'] for f in figures}),
        exactPriorChecksumAndDimensions=True, questionDataModified=False,
        fullPlatformOriginalGapsResolved=False, liveDeployment=False)
    if apply:
        for path, data in writes.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        (root/'master-bank/sources/recovered-study-images.json').write_text(json.dumps(result, indent=2)+'\n')
        (root/'updates/content-recovery-2026-09-12/remaining-images-verification.json').write_text(json.dumps(report, indent=2)+'\n')
    for _, pdf in sources:
        pdf.close()
    return report

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pdf', action='append', required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    print(json.dumps(recover(args.pdf, args.apply), indent=2))
