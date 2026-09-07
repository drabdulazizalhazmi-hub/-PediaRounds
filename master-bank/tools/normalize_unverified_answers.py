#!/usr/bin/env python3
"""Conservatively normalize unsupported verification states.

Rules:
- Never change recalledAnswer.
- If verifiedAnswer is populated but no verification source is marked supports/conflicts,
  clear verifiedAnswer and keep the record in needs_verification.
- If placeholder text survives in a stem/option, move the record to incomplete_recall.
Only files with actual changes are rewritten.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "master-bank" / "data"
PLACEHOLDER_RE = re.compile(r"(?:\?\?|\[\s*(?:other )?option[^\]]*\]|option\s+missing|text\s+missing)", re.I)


def walk(obj: Any) -> tuple[Any, bool, int, int]:
    changed = False
    cleared = 0
    incompletes = 0
    if isinstance(obj, list):
        out = []
        for item in obj:
            new, ch, c, inc = walk(item)
            out.append(new)
            changed |= ch
            cleared += c
            incompletes += inc
        return out, changed, cleared, incompletes
    if not isinstance(obj, dict):
        return obj, False, 0, 0

    is_q = "id" in obj and "stemEn" in obj
    if is_q:
        verification = obj.get("verification") if isinstance(obj.get("verification"), dict) else {}
        supported = any(verification.get(k) in {"supports", "conflicts"} for k in ("upToDate", "nelson", "guideline"))
        if obj.get("verifiedAnswer") not in (None, "") and not supported:
            obj["verifiedAnswer"] = None
            if obj.get("reviewStatus") == "verified":
                obj["reviewStatus"] = "needs_verification"
            changed = True
            cleared += 1

        stem = str(obj.get("stemEn") or "")
        options = " ".join(str(o.get("text", "")) for o in (obj.get("options") or []) if isinstance(o, dict))
        if PLACEHOLDER_RE.search(stem + " " + options) and obj.get("reviewStatus") != "incomplete_recall":
            obj["reviewStatus"] = "incomplete_recall"
            obj["publishable"] = False
            blockers = obj.get("blockers")
            if not isinstance(blockers, list):
                blockers = []
            if "incomplete_source_text" not in blockers:
                blockers.append("incomplete_source_text")
            obj["blockers"] = blockers
            changed = True
            incompletes += 1
        return obj, changed, cleared, incompletes

    for key, value in list(obj.items()):
        new, ch, c, inc = walk(value)
        obj[key] = new
        changed |= ch
        cleared += c
        incompletes += inc
    return obj, changed, cleared, incompletes


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true")
    args = ap.parse_args()
    files_changed = total_cleared = total_incomplete = 0
    for path in sorted(DATA.rglob("*.json")):
        try:
            obj = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            print(f"SKIP invalid JSON {path.relative_to(ROOT)}: {exc}")
            continue
        obj, changed, cleared, incompletes = walk(obj)
        if changed:
            files_changed += 1
            total_cleared += cleared
            total_incomplete += incompletes
            print(f"CHANGE {path.relative_to(ROOT)} cleared_verified={cleared} incomplete={incompletes}")
            if args.write:
                path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Files changed: {files_changed}; verifiedAnswer cleared: {total_cleared}; moved to incomplete_recall: {total_incomplete}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
