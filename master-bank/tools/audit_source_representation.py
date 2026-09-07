#!/usr/bin/env python3
"""Audit whether every enumerated Part II source slot is represented somewhere.

This complements ``audit_source_coverage.py``. Canonical MCQ data and structured
review-queue records are reported separately so incomplete/image-gated recalls are
not mistaken for absent source material.
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Any, Iterable

from audit_source_coverage import (
    EXPECTED,
    ROOT,
    fallback_section,
    load_questions,
    parse_question_number,
    qnum,
    section_from_path,
)

REVIEW = ROOT / "master-bank" / "review-queue"


def iter_review_records(obj: Any) -> Iterable[dict[str, Any]]:
    if isinstance(obj, list):
        for item in obj:
            yield from iter_review_records(item)
        return
    if not isinstance(obj, dict):
        return

    looks_like_record = bool(obj.get("stemEn")) and any(
        key in obj for key in ("id", "sourceQuestion", "sourceRefs", "questionNumber")
    )
    if looks_like_record:
        yield obj
        return

    for value in obj.values():
        if isinstance(value, (list, dict)):
            yield from iter_review_records(value)


def review_qnum(q: dict[str, Any]) -> int | None:
    n = qnum(q)
    if n is not None:
        return n

    for key in ("sourceQuestion", "questionNumber"):
        if q.get(key) not in (None, ""):
            n = parse_question_number(q.get(key))
            if n is not None:
                return n
    return None


def section_from_source_question(raw: Any) -> str | None:
    text = str(raw or "").strip().lower()
    if not text:
        return None
    if text.startswith("pulmonary q") or text.startswith("sleep q") or "sleep medicine q" in text:
        return "Pulmonary and Sleep Medicine"
    if text.startswith("neonatology q") or text.startswith("neonatal q"):
        return "Neonatology"
    if text.startswith("dermatology q") or text.startswith("derm q"):
        return "Dermatology"
    if text.startswith("ophthalmology q") or text.startswith("ophth q"):
        return "Ophthalmology"
    if text.startswith("ethics/safety q") or text.startswith("medical ethics q") or text.startswith("patient safety q"):
        return "Medical Ethics and Patient Safety"
    if text.startswith("research/communication q") or text.startswith("research q"):
        return "Research, Biostatistics, and Communication Skills"
    return None


def review_section(path: Path, q: dict[str, Any]) -> str | None:
    sec = section_from_source_question(q.get("sourceQuestion"))
    if sec:
        return sec

    for ref in q.get("sourceRefs") or []:
        if not isinstance(ref, dict):
            continue
        sec = section_from_source_question(ref.get("questionNumber"))
        if sec:
            return sec

    sec = fallback_section(q)
    if sec:
        return sec

    name = path.name.lower()
    if "respiratory-sleep" in name:
        return "Pulmonary and Sleep Medicine"
    if "neonatology" in name:
        return "Neonatology"
    return None


def load_review_slots() -> tuple[defaultdict[str, set[int]], list[str]]:
    found: defaultdict[str, set[int]] = defaultdict(set)
    unmapped: list[str] = []

    for path in sorted(REVIEW.rglob("*.json")):
        try:
            obj = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        for q in iter_review_records(obj):
            n = review_qnum(q)
            sec = review_section(path, q)
            if sec and n is not None:
                found[sec].add(n)
            elif n is not None:
                unmapped.append(f"{path.relative_to(ROOT)} :: {q.get('id') or q.get('sourceQuestion') or n}")
    return found, unmapped


def main() -> int:
    canonical: defaultdict[str, set[int]] = defaultdict(set)
    for path, q in load_questions():
        n = qnum(q)
        sec = section_from_path(path) or fallback_section(q)
        if sec and n is not None:
            canonical[sec].add(n)

    review, unmapped = load_review_slots()

    total_expected = sum(len(r) for r in EXPECTED.values())
    canonical_total = 0
    represented_total = 0
    truly_missing_total = 0
    review_only_total = 0

    print("PediaRounds Part II source representation audit")
    for sec, expected_range in EXPECTED.items():
        expected = set(expected_range)
        data_slots = canonical.get(sec, set()) & expected
        review_slots = review.get(sec, set()) & expected
        review_only = review_slots - data_slots
        represented = data_slots | review_slots
        missing = sorted(expected - represented)

        canonical_total += len(data_slots)
        review_only_total += len(review_only)
        represented_total += len(represented)
        truly_missing_total += len(missing)

        status = "OK" if not missing else "MISSING"
        print(
            f"{status:7} {sec}: canonical={len(data_slots)}/{len(expected)} "
            f"review_only={len(review_only)} represented={len(represented)}/{len(expected)}",
            end="",
        )
        if review_only:
            print(" review=" + ",".join(f"Q{x}" for x in sorted(review_only)), end="")
        if missing:
            print(" missing=" + ",".join(f"Q{x}" for x in missing), end="")
        print()

    print(f"Enumerated expected slots: {total_expected}")
    print(f"Canonical data slots: {canonical_total}")
    print(f"Review-only represented slots: {review_only_total}")
    print(f"All represented slots: {represented_total}")
    print(f"Truly absent source slots: {truly_missing_total}")
    print("NOTE Genetics: source TOC prints 53, but actual source sequence ends at Q52 before Metabolic Disorders.")

    if unmapped:
        print(f"Unmapped numbered review records: {len(unmapped)}")
        for item in unmapped[:100]:
            print("  " + item)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
