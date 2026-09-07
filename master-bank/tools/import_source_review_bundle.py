#!/usr/bin/env python3
"""Expand a PediaRounds source-review batch without publishing or overwriting questions.

Usage:
  python import_source_review.py --batch source-review-batch.json --out-dir expanded
  python import_source_review.py --batch source-review-batch.json --out-dir expanded --existing existing-bank.json

Source-only and single-option recalls remain unscored. This script does not contact,
authenticate with, modify, or deploy a ChatGPT Site.
"""
from __future__ import annotations
import argparse
import copy
import hashlib
import json
import re
from pathlib import Path
from typing import Any

def read_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as f:
        return json.load(f)

def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def validate_batch(batch: dict[str, Any]) -> None:
    if batch.get("format") != "pediarounds-source-review-batch-v1":
        raise ValueError("Unknown source-review batch format.")
    if not batch.get("projectId") or not batch.get("source", {}).get("name") or not batch.get("source", {}).get("editionKey"):
        raise ValueError("Project/source identity is required.")
    ids: set[str] = set()
    source_keys: set[tuple[str, int]] = set()
    for r in batch.get("records", []):
        key = r.get("id")
        if not isinstance(key, str) or key in ids:
            raise ValueError("Missing or duplicate stable ID.")
        ids.add(key)
        skey = (r.get("section", ""), r.get("sourceNumber", 0))
        if not skey[0] or not isinstance(skey[1], int) or skey[1] < 1 or skey in source_keys:
            raise ValueError(f"{key}: duplicate/invalid source section and number.")
        source_keys.add(skey)
        for field in ("stemEn", "scenarioAr", "explanationAr", "incorrectOptionsAr"):
            if not isinstance(r.get(field), str) or not r[field].strip():
                raise ValueError(f"{key}: missing {field}")
        if not r.get("sourcePages") or not r.get("yearTags"):
            raise ValueError(f"{key}: missing source page/year.")
        if r.get("sourceTextSha256"):
            payload = {k:r[k] for k in ("stemEn","options","yearTags","sourcePages","sourceAnswerText")}
            actual = hashlib.sha256(json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",",":")).encode()).hexdigest()
            if actual != r["sourceTextSha256"]:
                raise ValueError(f"{key}: preserved source text/options were changed.")
        opts = r.get("options")
        if not isinstance(opts, list):
            raise ValueError(f"{key}: options must be a list.")
        labels: set[str] = set()
        for o in opts:
            if not isinstance(o, dict) or not re.fullmatch("[A-E]", o.get("key", "")):
                raise ValueError(f"{key}: invented/invalid option label.")
            if o["key"] in labels or not o.get("text", "").strip():
                raise ValueError(f"{key}: duplicate or empty option.")
            labels.add(o["key"])
        answer = r.get("recalledAnswer")
        if answer is not None and answer not in labels:
            raise ValueError(f"{key}: recalled answer is not a preserved option.")
        if r.get("publishable", False) or r.get("verifiedAnswer") is not None:
            raise ValueError(f"{key}: source import cannot assert clinical approval.")
    if not ids:
        raise ValueError("Empty source batch.")

def expand(batch: dict[str, Any]) -> list[dict[str, Any]]:
    validate_batch(batch)
    defaults = batch["defaults"]
    if defaults.get("verifiedAnswer") is not None or defaults.get("publishable", False):
        raise ValueError("Source-review defaults cannot assert clinical approval.")
    source = batch["source"]
    assets = {a["id"]: a for a in batch.get("assets", [])}
    output = []
    for row in batch["records"]:
        r = copy.deepcopy(defaults)
        r.update(copy.deepcopy(row))
        r["publishable"] = False
        r["verifiedAnswer"] = None
        r["isScorable"] = False
        r["answerConfidence"] = "low" if r["reviewStatus"] in ("conflicting","incomplete_recall") else "unknown"
        r["specialty"] = "Medical Ethics and Patient Safety" if r["section"] in ("Medical Ethics", "Patient Safety") else "Research, Biostatistics, and Communication Skills"
        r["topic"] = r["section"]
        r["keywords"] = [r["subtopic"]]
        r["clinicalPearl"] = r.get("clinicalPearl") or "Source key and independent approval are separate; read the source-specific Arabic note."
        r["tts"] = {"enabled": True, "language": "en",
                    "text": r["stemEn"] + "".join(f" Option {o['key']}. {o['text']}." for o in r["options"])}
        r["canonicalSourceKey"] = f"{source['editionKey']}:{r['section']}:{r['sourceNumber']}"
        r["sourceRefs"] = [{
            "sourceName": source["name"], "part": r["examPart"],
            "page": r["sourcePages"][0],
            "questionNumber": f"{r['specialty']} Q{r['sourceNumber']}",
            "notes": f"{source['file']}; physical PDF pages {r['sourcePages']}; {source['normalization']}"
        }]
        chosen = [assets[i] for i in r.get("assetIds", [])]
        r["media"] = copy.deepcopy(chosen)
        question_media = [a for a in chosen if a["role"] == "question"]
        r["image"] = {
            "requiredForQuestion": bool(question_media),
            "status": "needs_review" if question_media else "not_required",
            "sourceRef": f"{source['file']}; pages {r['sourcePages']}" if question_media else None,
            "assetPath": None,
            "bundleAssetPaths": [a["file"] for a in question_media],
            "captionEn": "Original source figure; not a generated substitute." if question_media else None,
            "captionAr": "الشكل الأصلي من المصدر، وليس صورة مولدة بديلة." if question_media else None
        }
        r["duplicateOf"] = None
        if len(r["options"]) < 2:
            r["isScorable"] = False
        output.append(r)
    return output

def merge_staging(existing: list[dict[str, Any]], incoming: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Return a NEW list. Preserve existing IDs/content and record conflicts; never overwrite."""
    by_id: dict[str, dict[str, Any]] = {}
    by_source: dict[str, str] = {}
    for r in existing:
        if not isinstance(r.get("id"), str) or r["id"] in by_id:
            raise ValueError("Existing bank has missing/duplicate stable IDs; resolve before import.")
        by_id[r["id"]] = r
        if r.get("canonicalSourceKey"):
            if r["canonicalSourceKey"] in by_source:
                raise ValueError("Existing bank has duplicate canonical source keys.")
            by_source[r["canonicalSourceKey"]] = r["id"]
    merged = copy.deepcopy(existing)
    report: dict[str, Any] = {"added": [], "skippedIdentical": [], "conflicts": []}
    for r in incoming:
        matched_id = r["id"] if r["id"] in by_id else by_source.get(r.get("canonicalSourceKey", ""))
        if matched_id:
            old = by_id[matched_id]
            if old == r:
                report["skippedIdentical"].append(r["id"])
            else:
                report["conflicts"].append({"incomingId": r["id"], "existingId": matched_id,
                                           "action": "preserved_existing_no_overwrite"})
            continue
        merged.append(copy.deepcopy(r))
        by_id[r["id"]] = r
        by_source[r["canonicalSourceKey"]] = r["id"]
        report["added"].append(r["id"])
    return merged, report

def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--batch", type=Path, required=True)
    p.add_argument("--out-dir", type=Path, required=True)
    p.add_argument("--existing", type=Path)
    args = p.parse_args()
    batch = read_json(args.batch)
    records = expand(batch)
    mcqs = [r for r in records if len(r["options"]) >= 2]
    recalls = [r for r in records if len(r["options"]) < 2]
    write_json(args.out_dir/"mcq-drafts.json", mcqs)
    write_json(args.out_dir/"recall-review-queue.json", recalls)
    write_json(args.out_dir/"all-source-records.json", records)
    report: dict[str, Any] = {"sourceRecords":len(records), "mcqDrafts":len(mcqs),
                             "recallCards":len(recalls), "publishable":0, "liveSitePublished":False}
    if args.existing:
        existing = read_json(args.existing)
        if not isinstance(existing, list):
            raise ValueError("Existing staging bank must be a JSON array.")
        merged, changes = merge_staging(existing, records)
        write_json(args.out_dir/"merged-staging.json", merged)
        report["merge"] = changes
    write_json(args.out_dir/"import-report.json", report)
    print(json.dumps(report, ensure_ascii=False))
if __name__ == "__main__":
    main()
