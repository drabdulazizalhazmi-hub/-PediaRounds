#!/usr/bin/env python3
"""Validate image/attachment references in the PediaRounds master bank."""
from __future__ import annotations
import json
import sys
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[2]
BANK = ROOT / "master-bank"
DATA = BANK / "data"
ASSETS = BANK / "assets"


def iter_questions(obj: Any) -> Iterable[dict[str, Any]]:
    if isinstance(obj, list):
        for x in obj:
            yield from iter_questions(x)
    elif isinstance(obj, dict):
        if "id" in obj and "stemEn" in obj:
            yield obj
        else:
            for k in ("questions", "records", "items"):
                if isinstance(obj.get(k), list):
                    for x in obj[k]:
                        yield from iter_questions(x)


def main() -> int:
    failures: list[str] = []
    refs: set[Path] = set()
    required = attached = missing = 0

    for path in DATA.rglob("*.json"):
        try:
            obj = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        for q in iter_questions(obj):
            qid = str(q.get("id") or path.name)
            image = q.get("image")
            if not isinstance(image, dict):
                continue
            if image.get("requiredForQuestion"):
                required += 1
            apath = image.get("assetPath")
            status = str(image.get("status") or "")
            if apath:
                attached += 1
                asset = (ROOT / str(apath)).resolve()
                refs.add(asset)
                if not asset.is_file():
                    failures.append(f"{qid}: referenced asset not found: {apath}")
                elif asset.stat().st_size <= 0:
                    failures.append(f"{qid}: referenced asset is empty: {apath}")
            elif image.get("requiredForQuestion"):
                missing += 1
                if q.get("publishable") is True:
                    failures.append(f"{qid}: publishable image-dependent question has no assetPath")
            if status in {"attached", "available"} and not apath:
                failures.append(f"{qid}: image status={status} but assetPath is null")

    orphans = []
    if ASSETS.exists():
        for p in ASSETS.rglob("*"):
            if p.is_file() and p.resolve() not in refs:
                orphans.append(str(p.relative_to(ROOT)))

    print(f"Image-dependent questions: {required}")
    print(f"Questions with assetPath: {attached}")
    print(f"Required images still missing assetPath: {missing}")
    print(f"Orphan assets: {len(orphans)}")
    for x in orphans:
        print("ORPHAN", x)
    for x in failures:
        print("ERROR", x)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
