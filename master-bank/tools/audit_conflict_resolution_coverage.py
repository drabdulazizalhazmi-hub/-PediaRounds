#!/usr/bin/env python3
"""Audit unique conflict-resolution coverage for the PediaRounds Master Bank.

Compares canonical question records carrying reviewStatus=conflicting against all
conflicting-clinical-resolution overlay files. Reports unique reviewed IDs,
duplicate review occurrences, overlay-only IDs, and the exact remaining IDs.
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "master-bank" / "data"
QUEUE = ROOT / "master-bank" / "review-queue"


def iter_questions(obj: Any) -> Iterable[dict[str, Any]]:
    if isinstance(obj, list):
        for item in obj:
            yield from iter_questions(item)
        return
    if not isinstance(obj, dict):
        return
    if "id" in obj and "stemEn" in obj:
        yield obj
        return
    for key in ("questions", "records", "items"):
        value = obj.get(key)
        if isinstance(value, list):
            for item in value:
                yield from iter_questions(item)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    canonical: dict[str, dict[str, Any]] = {}
    for path in sorted(DATA.rglob("*.json")):
        try:
            obj = load_json(path)
        except Exception:
            continue
        for q in iter_questions(obj):
            if q.get("reviewStatus") == "conflicting" and q.get("id"):
                qid = str(q["id"])
                canonical[qid] = {
                    "id": qid,
                    "module": q.get("module"),
                    "specialty": q.get("specialty"),
                    "topic": q.get("topic"),
                    "file": str(path.relative_to(ROOT)),
                }

    occurrences: Counter[str] = Counter()
    overlay_files: dict[str, list[str]] = {}
    for path in sorted(QUEUE.glob("conflicting-clinical-resolution-*.json")):
        try:
            obj = load_json(path)
        except Exception:
            continue
        ids: list[str] = []
        for item in obj.get("items", []) if isinstance(obj, dict) else []:
            if isinstance(item, dict) and item.get("id"):
                qid = str(item["id"])
                ids.append(qid)
                occurrences[qid] += 1
        overlay_files[str(path.relative_to(ROOT))] = ids

    canonical_ids = set(canonical)
    reviewed_ids = canonical_ids.intersection(occurrences)
    remaining_ids = canonical_ids - reviewed_ids
    overlay_only = set(occurrences) - canonical_ids
    duplicate_review_ids = {qid: n for qid, n in occurrences.items() if n > 1}

    report = {
        "canonicalConflicting": len(canonical_ids),
        "uniqueResolutionReviewed": len(reviewed_ids),
        "remainingCanonicalConflicts": len(remaining_ids),
        "resolutionOverlayOccurrences": sum(occurrences.values()),
        "duplicateResolutionIds": duplicate_review_ids,
        "overlayOnlyIds": sorted(overlay_only),
        "remaining": [canonical[qid] for qid in sorted(remaining_ids)],
        "reviewedIds": sorted(reviewed_ids),
        "overlayFiles": overlay_files,
    }

    text = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    print(text, end="")
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
