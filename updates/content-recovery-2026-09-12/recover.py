#!/usr/bin/env python3
"""Recover only checksum-matched source images and explicit English source text.
Default is dry-run. This never deploys, changes grading, or accesses user data.
Requires pypdf. Source PDF and existing image manifest are inputs, not new uploads.
"""
from __future__ import annotations
import argparse, copy, hashlib, json, re, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PDF = Path('master-bank/sources/original-pdfs/Pediatric-Saudi-Board-Exams-Question-Collection-4th-ED-1-May-2026.pdf')
PDF_SHA = '85f22dabc1e7f434bc39c49efecb2dcb7f4caadc63ac2abb93f6124a96b370b3'
MANIFEST = Path('master-bank/sources/derm-oph-20260907-image-manifest.json')
REPORT = Path('updates/content-recovery-2026-09-12/verification.json')
SCOPES = [('part2-derm-',637,650,22), ('part2-ophthalmology-',652,657,10)]
PROTECTED = ('id','stemEn','options','recalledAnswer','sourceAnswerText','verifiedAnswer','reviewStatus','publishable','duplicateOf')

def digest(data):
    return hashlib.sha256(data).hexdigest()

def rows(obj):
    if isinstance(obj,list):
        for item in obj: yield from rows(item)
    elif isinstance(obj,dict):
        if 'id' in obj and 'stemEn' in obj: yield obj
        else:
            for key in ('questions','records','items'):
                if isinstance(obj.get(key),list): yield from rows(obj[key])

def english(value):
    return isinstance(value,str) and bool(re.search('[A-Za-z]',value)) and not any('ARABIC' in unicodedata.name(c,'') for c in value)

def usable(value):
    return english(value) and not re.match(r'\s*Similar question\b',value,re.I) and not re.fullmatch(r"\s*(?:See (?:the )?previous questions?\.?|Didn't find an answer for this question\.?|Original source explanation is not available for this question\.?)\s*",value,re.I)

def asset_path(root,value):
    if not isinstance(value,str) or not value.startswith('master-bank/assets/derm-oph-20260907/'):
        raise ValueError('Unexpected asset path')
    out=(root/value).resolve()
    if not out.is_relative_to((root/'master-bank/assets/derm-oph-20260907').resolve()):
        raise ValueError('Asset path escapes its directory')
    return out

def split_questions(page_texts,expected_count):
    text=''; spans=[]
    for page,content in page_texts:
        start=len(text); text+=content+'\n'; spans.append((page,start,len(text)))
    marks=list(re.finditer(r'(?m)^[ \t]*Q(\d+)\)',text)); result={}
    for i,m in enumerate(marks):
        n=int(m.group(1)); end=marks[i+1].start() if i+1<len(marks) else len(text)
        if n in result: raise ValueError('Duplicate source question number')
        block=text[m.start():end]; exp=re.search(r'(?im)^\s*Explanation\s*:\s*',block)
        explanation=block[exp.end():].strip() if exp else ''
        pages=[p for p,a,b in spans if a<end and b>m.start()]
        result[n]={'text':explanation,'pages':pages}
    if set(result)!=set(range(1,expected_count+1)):
        raise ValueError('Source question boundaries do not match expected scope')
    return result

def image_streams(resources,visited=None):
    visited=set() if visited is None else visited
    resources=resources.get_object() if hasattr(resources,'get_object') else resources
    xobjects=resources.get('/XObject')
    if not xobjects: return
    for ref in xobjects.get_object().values():
        key=(getattr(ref,'idnum',None),getattr(ref,'generation',None))
        if key in visited: continue
        visited.add(key); obj=ref.get_object()
        if obj.get('/Subtype')=='/Form':
            yield from image_streams(obj.get('/Resources',{}),visited)
        elif obj.get('/Subtype')=='/Image':
            yield ref,obj

def run(root=ROOT,apply=False):
    from pypdf import PdfReader
    root=Path(root).resolve(); source=root/PDF
    if digest(source.read_bytes())!=PDF_SHA: raise ValueError('Source PDF checksum mismatch; no files written')
    reader=PdfReader(source)
    docs={p:json.loads(p.read_text()) for p in sorted((root/'master-bank/data').rglob('*.json'))}
    index={}
    for path,doc in docs.items():
        for q in rows(doc):
            if q['id'] in index: raise ValueError('Duplicate question identifier')
            index[q['id']]=(path,q)
    original_ids=set(index)
    before={qid:{k:copy.deepcopy(q.get(k)) for k in PROTECTED} for qid,(_,q) in index.items()}
    manifest=json.loads((root/MANIFEST).read_text()); writes={}; matches=[]; missing=[]
    for a in manifest['assets']:
        out=asset_path(root,a['bundlePath']); page=a['sourcePage']; found=None
        if a['questionId'] not in index or a['role'] not in ('question','explanation'): raise ValueError('Invalid image association')
        for ref,obj in image_streams(reader.pages[page-1].get('/Resources',{})):
            try: data=obj.get_data()
            except Exception: continue
            if digest(data)==a['sha256']:
                if (int(obj.get('/Width',0)),int(obj.get('/Height',0)))!=(a['width'],a['height']): raise ValueError('Image dimensions mismatch')
                found=(data,getattr(ref,'idnum',None)); break
        if found:
            if out.exists() and out.read_bytes()!=found[0]: raise ValueError('Existing image differs; refusing overwrite')
            writes[out]=found[0]
            matches.append({**a,'path':a['bundlePath'],'actualSourceXref':found[1],'bytes':len(found[0]),'restoredFromPdfSha256':PDF_SHA})
        else: missing.append(a['id'])
    explanations=[]; unavailable=[]; linked=[]; touched=set()
    for prefix,start,end,count in SCOPES:
        segments=split_questions([(p,reader.pages[p-1].extract_text()) for p in range(start,end+1)],count)
        for n,s in segments.items():
            qid=prefix+f'q{n:02d}'
            if qid not in index: raise ValueError('Expected question is absent: '+qid)
            path,q=index[qid]
            ref_pages={r.get('page') for r in q.get('sourceRefs',[]) if isinstance(r,dict)}
            if not ref_pages.intersection(s['pages']): raise ValueError('Source page mismatch: '+qid)
            text=s['text']; provenance={'type':'extracted_original_source','sourcePdf':str(PDF),'sourcePdfSha256':PDF_SHA,'sourcePages':s['pages'],'sourceQuestionId':qid,'independentlyClinicallyVerified':False}
            if usable(text):
                old=q.get('sourceExplanationEn')
                if old and old!=text: raise ValueError('Existing source explanation differs: '+qid)
                q['sourceExplanationEn']=text
                q['sourceExplanationProvenance']={**provenance,'sha256':digest(text.encode())}
                explanations.append({'id':qid,'path':str(path.relative_to(root)),'pages':s['pages'],'characters':len(text),'sha256':digest(text.encode())})
                touched.add(path)
            elif re.fullmatch(r'See (?:the )?previous questions?\.?',text,re.I) and n>1 and usable(segments[n-1]['text']):
                prior=segments[n-1]
                if q.get('linkedSourceExplanation') and q['linkedSourceExplanation']!=prior['text']: raise ValueError('Existing linked explanation differs')
                q['linkedSourceExplanation']=prior['text']
                q['linkedSourceExplanationProvenance']={**provenance,'type':'explicit_previous_question_link','sourceQuestionId':prefix+f'q{n-1:02d}','sourcePages':prior['pages'],'sha256':digest(prior['text'].encode())}
                linked.append(qid);touched.add(path)
            else: unavailable.append({'id':qid,'reason':'source_text_missing_or_graphical','pages':s['pages']})
    for qid in sorted({a['questionId'] for a in matches}):
        path,q=index[qid]; question=[a for a in matches if a['questionId']==qid and a['role']=='question']; after=[a for a in matches if a['questionId']==qid and a['role']=='explanation']
        if question:
            image=q.get('image') or {}; paths=[a['path'] for a in question]
            if image.get('assetPath') and image['assetPath'] not in paths: raise ValueError('Existing image differs: '+qid)
            image.update({'assetPath':paths[0],'assetPaths':paths,'status':'needs_review','captionEn':'Original source image for this question.','restorationVerifiedBySha256':True,'publicationRights':'not_verified'})
            q['image']=image
        if after: q['explanationAssetPaths']=list(dict.fromkeys(q.get('explanationAssetPaths',[])+[a['path'] for a in after]))
        q['unrestoredSourceAssetIds']=[a['id'] for a in manifest['assets'] if a['questionId']==qid and a['id'] in missing]
        q['restoredSourceAssets']=[{'path':a['path'],'role':a['role'],'displayBeforeAnswer':a['role']=='question','sha256':a['sha256'],'sourcePage':a['sourcePage']} for a in matches if a['questionId']==qid]
        q['blockers']=[b for b in q.get('blockers',[]) if b!='images_not_uploaded_to_repository']
        touched.add(path)
    if set(index)!=original_ids: raise ValueError('Question IDs changed')
    for qid,(_,q) in index.items():
        if {k:q.get(k) for k in PROTECTED}!=before[qid]: raise ValueError('Protected question fields changed: '+qid)
    report={'scope':'32 dermatology/ophthalmology records in current GitHub master bank; not the full live bank','liveSiteModified':False,'clinicalVerificationPerformed':False,'sourcePdfSha256':PDF_SHA,'repositoryRecordCount':len(index),'questionIdsPreserved':True,'answerKeysAndReviewStatesPreserved':True,'sourceExplanationsRecovered':explanations,'linkedSourceExplanationsRecovered':linked,'sourceExplanationsStillMissing':unavailable,'imagesRecovered':matches,'imageManifestEntriesStillMissing':missing,'imagePublicationRightsVerified':False,'changedDataFiles':[str(p.relative_to(root)) for p in sorted(touched)]}
    if apply:
        for out,data in writes.items(): out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(data)
        for path in touched: path.write_text(json.dumps(docs[path],ensure_ascii=False,indent=2)+'\n')
        (root/REPORT).parent.mkdir(parents=True,exist_ok=True);(root/REPORT).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    return report

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');args=parser.parse_args()
    report=run(apply=args.apply)
    print(json.dumps({'applied':args.apply,'records':report['repositoryRecordCount'],'englishSourceExplanations':len(report['sourceExplanationsRecovered']),'linkedExplanations':len(report['linkedSourceExplanationsRecovered']),'remainingExplanationIds':[x['id'] for x in report['sourceExplanationsStillMissing']],'imagesRecovered':len(report['imagesRecovered']),'questionImages':sum(x['role']=='question' for x in report['imagesRecovered']),'explanationImages':sum(x['role']=='explanation' for x in report['imagesRecovered']),'remainingImageIds':report['imageManifestEntriesStillMissing'],'protectedFieldsPreserved':True},indent=2))
