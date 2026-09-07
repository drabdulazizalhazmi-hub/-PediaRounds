#!/usr/bin/env python3
"""Build a machine-readable manifest of all PediaRounds question records."""
from __future__ import annotations
import json
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "master-bank" / "data"
OUT = ROOT / "master-bank" / "generated" / "question-manifest.json"


def iter_questions(obj: Any) -> Iterable[dict[str, Any]]:
    if isinstance(obj, list):
        for x in obj:
            yield from iter_questions(x)
    elif isinstance(obj, dict):
        if "id" in obj and "stemEn" in obj:
            yield obj
        else:
            for key in ("questions", "records", "items"):
                if isinstance(obj.get(key), list):
                    for x in obj[key]:
                        yield from iter_questions(x)


def main() -> None:
    manifest = []
    for path in sorted(DATA.rglob("*.json")):
        try:
            obj = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        for q in iter_questions(obj):
            image = q.get("image") if isinstance(q.get("image"), dict) else {}
            manifest.append({
                "id": q.get("id"),
                "module": q.get("module"),
                "specialty": q.get("specialty"),
                "topic": q.get("topic"),
                "reviewStatus": q.get("reviewStatus"),
                "publishable": q.get("publishable", False),
                "duplicateOf": q.get("duplicateOf"),
                "imageRequired": bool(image.get("requiredForQuestion")),
                "imageStatus": image.get("status"),
                "assetPath": image.get("assetPath"),
                "sourceRefs": q.get("sourceRefs") or [],
                "path": str(path.relative_to(ROOT)),
            })
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"count": len(manifest), "questions": manifest}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(manifest)} records to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
