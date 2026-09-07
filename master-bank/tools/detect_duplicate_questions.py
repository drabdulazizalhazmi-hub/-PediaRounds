#!/usr/bin/env python3
"""Detect exact and near-duplicate PediaRounds questions without deleting anything."""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import sys
from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "master-bank" / "data"


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


def norm(text: str) -> str:
    text = text.lower()
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^a-z0-9%+./ -]", "", text)
    return text.strip()


def signature(q: dict[str, Any]) -> str:
    opts = "|".join(
        f"{o.get('key','')}:{o.get('text','')}" for o in (q.get("options") or []) if isinstance(o, dict)
    )
    raw = norm(str(q.get("stemEn") or "") + "|" + opts)
    return hashlib.sha256(raw.encode()).hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--fail-exact", action="store_true")
    ap.add_argument("--near-threshold", type=float, default=0.94)
    args = ap.parse_args()

    rows: list[tuple[str, str, str]] = []
    for path in DATA.rglob("*.json"):
        try:
            obj = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        for q in iter_questions(obj):
            rows.append((str(q.get("id") or ""), norm(str(q.get("stemEn") or "")), str(path.relative_to(ROOT))))

    exact = defaultdict(list)
    sig_to_q = {}
    for path in DATA.rglob("*.json"):
        try:
            obj = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        for q in iter_questions(obj):
            s = signature(q)
            exact[s].append((str(q.get("id") or ""), str(path.relative_to(ROOT))))
            sig_to_q[s] = q

    exact_groups = [v for v in exact.values() if len(v) > 1]
    print(f"Questions scanned: {len(rows)}")
    print(f"Exact duplicate groups: {len(exact_groups)}")
    for group in exact_groups:
        print("EXACT", " | ".join(f"{qid}@{path}" for qid, path in group))

    near = []
    # Restrict O(n^2) comparison to stems with similar lengths.
    for i, (id1, s1, p1) in enumerate(rows):
        if not s1:
            continue
        for id2, s2, p2 in rows[i+1:]:
            if not s2 or id1 == id2:
                continue
            ratio_len = min(len(s1), len(s2)) / max(len(s1), len(s2))
            if ratio_len < 0.75:
                continue
            score = SequenceMatcher(None, s1, s2).ratio()
            if score >= args.near_threshold:
                near.append((score, id1, p1, id2, p2))
    near.sort(reverse=True)
    print(f"Near-duplicate pairs >= {args.near_threshold:.2f}: {len(near)}")
    for score, id1, p1, id2, p2 in near[:200]:
        print(f"NEAR {score:.3f} {id1}@{p1} <-> {id2}@{p2}")

    return 1 if args.fail_exact and exact_groups else 0


if __name__ == "__main__":
    sys.exit(main())
