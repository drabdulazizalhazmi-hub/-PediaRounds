#!/usr/bin/env python3
"""Global structural audit for the PediaRounds master bank.

This script is intentionally conservative: it reports source/structure problems but
never rewrites question content. It supports JSON files whose top level is a list,
a single question object, or an object containing a ``questions``/``records``/``items`` list.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[2]
BANK = ROOT / "master-bank"
DATA = BANK / "data"
ASSETS = BANK / "assets"

QUESTION_KEYS = {"id", "stemEn", "sourceRefs"}
PLACEHOLDER_RE = re.compile(r"(?:\?\?|\[\s*(?:other )?option[^\]]*\]|option\s+missing|text\s+missing)", re.I)
QNUM_RE = re.compile(r"(?:^|\b)(?:Q|Question\s*)(\d{1,4})(?:\b|$)", re.I)


def iter_question_objects(obj: Any) -> Iterable[dict[str, Any]]:
    if isinstance(obj, list):
        for item in obj:
            yield from iter_question_objects(item)
        return
    if not isinstance(obj, dict):
        return
    if QUESTION_KEYS.issubset(obj.keys()) or ("id" in obj and "stemEn" in obj):
        yield obj
        return
    for key in ("questions", "records", "items"):
        val = obj.get(key)
        if isinstance(val, list):
            for item in val:
                yield from iter_question_objects(item)


def load_questions() -> list[tuple[Path, dict[str, Any]]]:
    out: list[tuple[Path, dict[str, Any]]] = []
    for path in sorted(DATA.rglob("*.json")):
        try:
            obj = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            print(f"ERROR invalid JSON: {path.relative_to(ROOT)}: {exc}")
            continue
        for q in iter_question_objects(obj):
            out.append((path, q))
    return out


def qnum(q: dict[str, Any]) -> str | None:
    for ref in q.get("sourceRefs") or []:
        if isinstance(ref, dict):
            raw = ref.get("questionNumber")
            if raw:
                m = QNUM_RE.search(str(raw))
                if m:
                    return m.group(1)
    m = QNUM_RE.search(str(q.get("id", "")))
    return m.group(1) if m else None


def section_key(path: Path, q: dict[str, Any]) -> str:
    return "|".join([
        str(q.get("module") or ""),
        str(q.get("specialty") or q.get("topic") or ""),
        str(path.parent.relative_to(DATA)),
    ])


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--strict", action="store_true", help="fail on all structural findings")
    args = ap.parse_args()

    rows = load_questions()
    errors: list[str] = []
    warnings: list[str] = []
    ids: defaultdict[str, list[str]] = defaultdict(list)
    slots: defaultdict[tuple[str, str], list[str]] = defaultdict(list)
    referenced_assets: set[Path] = set()
    status_counts: Counter[str] = Counter()

    for path, q in rows:
        rel = str(path.relative_to(ROOT))
        qid = str(q.get("id") or "").strip()
        if not qid:
            errors.append(f"missing id: {rel}")
        else:
            ids[qid].append(rel)

        status = str(q.get("reviewStatus") or "missing")
        status_counts[status] += 1

        num = qnum(q)
        if num:
            slots[(section_key(path, q), num)].append(f"{qid}@{rel}")

        source_refs = q.get("sourceRefs")
        if not isinstance(source_refs, list) or not source_refs:
            errors.append(f"missing sourceRefs: {qid}@{rel}")

        verified = q.get("verifiedAnswer")
        if verified not in (None, ""):
            verification = q.get("verification") or {}
            if not isinstance(verification, dict) or not any(
                verification.get(k) in {"supports", "conflicts"}
                for k in ("upToDate", "nelson", "guideline")
            ):
                errors.append(f"verifiedAnswer without verification evidence: {qid}@{rel}")

        stem = str(q.get("stemEn") or "")
        option_text = " ".join(str(o.get("text", "")) for o in (q.get("options") or []) if isinstance(o, dict))
        if PLACEHOLDER_RE.search(stem + " " + option_text) and status != "incomplete_recall":
            errors.append(f"placeholder text outside incomplete_recall: {qid}@{rel}")

        image = q.get("image")
        if isinstance(image, dict):
            required = bool(image.get("requiredForQuestion"))
            asset_path = image.get("assetPath")
            image_status = str(image.get("status") or "")
            if asset_path:
                asset = ROOT / str(asset_path)
                referenced_assets.add(asset.resolve())
                if not asset.is_file() or asset.stat().st_size <= 0:
                    errors.append(f"missing/empty assetPath: {qid} -> {asset_path}")
            if required and q.get("publishable") is True and not asset_path:
                errors.append(f"publishable image-dependent question lacks asset: {qid}@{rel}")
            if image_status in {"attached", "available"} and not asset_path:
                errors.append(f"image status={image_status} but assetPath is null: {qid}@{rel}")

        if q.get("publishable") is True and status not in {"verified", "ready_for_publish"}:
            errors.append(f"publishable=true with unresolved reviewStatus={status}: {qid}@{rel}")

    for qid, paths in ids.items():
        if len(paths) > 1:
            errors.append(f"duplicate id {qid}: " + ", ".join(paths))

    for (sec, num), entries in slots.items():
        if len(entries) > 1:
            warnings.append(f"possible section/Q collision {num} [{sec}]: " + ", ".join(entries))

    orphan_assets: list[str] = []
    if ASSETS.exists():
        for asset in ASSETS.rglob("*"):
            if asset.is_file() and asset.resolve() not in referenced_assets:
                orphan_assets.append(str(asset.relative_to(ROOT)))

    print("PediaRounds master-bank audit")
    print(f"Questions scanned: {len(rows)}")
    print("Review statuses:")
    for k, v in sorted(status_counts.items()):
        print(f"  {k}: {v}")
    print(f"Duplicate IDs: {sum(1 for v in ids.values() if len(v) > 1)}")
    print(f"Possible section/Q collisions: {len(warnings)}")
    print(f"Referenced assets: {len(referenced_assets)}")
    print(f"Orphan assets: {len(orphan_assets)}")

    for item in warnings:
        print("WARN", item)
    for item in orphan_assets:
        print("WARN orphan asset:", item)
    for item in errors:
        print("ERROR", item)

    fail = bool(errors) or (args.strict and (warnings or orphan_assets))
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
