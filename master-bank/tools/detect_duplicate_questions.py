#!/usr/bin/env python3
"""Detect exact and near-duplicate PediaRounds questions without deleting anything.

The near-duplicate pass is optimized without weakening the requested similarity
threshold: rows are sorted by stem length, pairs that cannot mathematically reach the
threshold are skipped, and ``SequenceMatcher.quick_ratio()`` is used as a safe upper-
bound prefilter before the more expensive full ratio.
"""
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
        f"{o.get('key','')}:{o.get('text','')}"
        for o in (q.get("options") or [])
        if isinstance(o, dict)
    )
    raw = norm(str(q.get("stemEn") or "") + "|" + opts)
    return hashlib.sha256(raw.encode()).hexdigest()


def minimum_length_ratio_for_similarity(threshold: float) -> float:
    """Return the minimum shorter/longer length ratio that can reach threshold.

    SequenceMatcher's ratio is ``2*M/(len(a)+len(b))``. Even in the best possible
    case M cannot exceed the shorter length. Therefore a pair with length ratio r
    cannot reach threshold t unless ``2r/(1+r) >= t``, or ``r >= t/(2-t)``.
    """
    if threshold <= 0:
        return 0.0
    if threshold >= 1:
        return 1.0
    return threshold / (2.0 - threshold)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--fail-exact", action="store_true")
    ap.add_argument("--near-threshold", type=float, default=0.94)
    args = ap.parse_args()
    if not 0.0 <= args.near_threshold <= 1.0:
        ap.error("--near-threshold must be between 0 and 1")

    rows: list[tuple[str, str, str]] = []
    exact: defaultdict[str, list[tuple[str, str]]] = defaultdict(list)

    # Parse each JSON file once and build both the near-duplicate rows and exact
    # signature table in the same pass.
    for path in DATA.rglob("*.json"):
        try:
            obj = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        rel = str(path.relative_to(ROOT))
        for q in iter_questions(obj):
            qid = str(q.get("id") or "")
            stem = norm(str(q.get("stemEn") or ""))
            rows.append((qid, stem, rel))
            exact[signature(q)].append((qid, rel))

    exact_groups = [v for v in exact.values() if len(v) > 1]
    print(f"Questions scanned: {len(rows)}")
    print(f"Exact duplicate groups: {len(exact_groups)}")
    for group in exact_groups:
        print("EXACT", " | ".join(f"{qid}@{path}" for qid, path in group))

    near: list[tuple[float, str, str, str, str]] = []
    nonempty = sorted((row for row in rows if row[1]), key=lambda row: len(row[1]))
    min_len_ratio = minimum_length_ratio_for_similarity(args.near_threshold)

    for i, (id1, s1, p1) in enumerate(nonempty):
        len1 = len(s1)
        max_len = float("inf") if min_len_ratio == 0 else len1 / min_len_ratio

        for id2, s2, p2 in nonempty[i + 1 :]:
            len2 = len(s2)  # len2 >= len1 because rows are length-sorted
            if len2 > max_len:
                break
            if id1 == id2:
                continue

            matcher = SequenceMatcher(None, s1, s2)
            # quick_ratio() is an upper bound on ratio(), so rejecting a pair here
            # cannot hide a true match at or above the requested threshold.
            if matcher.quick_ratio() < args.near_threshold:
                continue
            score = matcher.ratio()
            if score >= args.near_threshold:
                near.append((score, id1, p1, id2, p2))

    near.sort(reverse=True)
    print(f"Near-duplicate pairs >= {args.near_threshold:.2f}: {len(near)}")
    for score, id1, p1, id2, p2 in near[:200]:
        print(f"NEAR {score:.3f} {id1}@{p1} <-> {id2}@{p2}")

    return 1 if args.fail_exact and exact_groups else 0


if __name__ == "__main__":
    sys.exit(main())
