#!/usr/bin/env python3
"""Inventory PediaRounds Master Bank review statuses by question and source file.

This is a report-only helper for the quality phase. It does not alter question data.
It scans canonical data JSON files and prints grouped records for unresolved statuses,
especially conflicting/outdated/incomplete/image/verification queues.
"""
from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "master-bank" / "data"
TARGET = {
    "conflicting",
    "outdated",
    "incomplete_recall",
    "image_missing",
    "image_needs_review",
    "needs_verification",
}


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


def source_question(q: dict[str, Any]) -> str | None:
    for ref in q.get("sourceRefs") or []:
        if isinstance(ref, dict):
            raw = ref.get("questionNumber")
            if raw not in (None, ""):
                return str(raw)
    return None


def main() -> int:
    rows: list[dict[str, Any]] = []
    counts: Counter[str] = Counter()
    by_status: defaultdict[str, list[dict[str, Any]]] = defaultdict(list)

    for path in sorted(DATA.rglob("*.json")):
        try:
            obj = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        for q in iter_questions(obj):
            status = str(q.get("reviewStatus") or "missing")
            counts[status] += 1
            if status not in TARGET:
                continue
            row = {
                "id": q.get("id"),
                "reviewStatus": status,
                "module": q.get("module"),
                "specialty": q.get("specialty"),
                "topic": q.get("topic"),
                "sourceQuestion": source_question(q),
                "file": str(path.relative_to(ROOT)),
                "recalledAnswer": q.get("recalledAnswer"),
                "verifiedAnswer": q.get("verifiedAnswer"),
                "blockers": q.get("blockers") or [],
            }
            rows.append(row)
            by_status[status].append(row)

    print("PediaRounds review-status audit")
    print("Questions scanned:", sum(counts.values()))
    for status, n in sorted(counts.items()):
        print(f"STATUS {status}: {n}")

    for status in ("outdated", "conflicting", "incomplete_recall", "image_missing", "image_needs_review"):
        items = by_status.get(status, [])
        print(f"\n[{status}] {len(items)}")
        for row in items:
            print(json.dumps(row, ensure_ascii=False, separators=(",", ":")))

    print(f"\n[needs_verification] {len(by_status.get('needs_verification', []))}")
    # Keep logs compact: only first 100 needs-verification rows; full counts remain visible.
    for row in by_status.get("needs_verification", [])[:100]:
        print(json.dumps(row, ensure_ascii=False, separators=(",", ":")))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
