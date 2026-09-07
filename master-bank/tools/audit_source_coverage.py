#!/usr/bin/env python3
"""Audit Part II source-number coverage for the PediaRounds master bank.

This tool answers a different question from ``audit_master_bank.py``: not whether
records are structurally valid, but whether every numbered slot in the 2026 Part II
source collection has at least one structured record in the Master Bank.

The source table of contents prints 1023 questions. Genetics is a known numbering
anomaly in the source: its table says 53, but the actual Genetics sequence ends at
Q52 immediately before Metabolic Disorders. This audit therefore treats Genetics
Q1-Q52 as the enumerated source range and reports the printed-count discrepancy.
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "master-bank" / "data"
QNUM_RE = re.compile(r"(?:^|\b)(?:Q|Question\s*)(\d{1,4})(?:\b|$)", re.I)

# Canonical source sections. Counts/ranges follow the 2026 Part II collection.
EXPECTED: dict[str, range] = {
    "Pulmonary and Sleep Medicine": range(1, 19),
    "Allergy": range(1, 30),
    "Immunology": range(1, 21),
    "Hematology": range(1, 58),
    "Oncology": range(1, 21),
    "Cardiology": range(1, 58),
    "Endocrinology": range(1, 66),
    "Gastroenterology": range(1, 87),
    "Nutrition and Malnutrition": range(1, 24),
    "Infectious Diseases": range(1, 126),
    "Genetics": range(1, 53),  # source enumerates through Q52; printed TOC says 53
    "Metabolic Disorders": range(1, 24),
    "Nephrology and Urologic Disorders": range(1, 64),
    "Rheumatology": range(1, 17),
    "Neonatology": range(1, 44),
    "Neurology": range(1, 51),
    "Musculoskeletal and Sport Medicine": range(1, 20),
    "Critical Care Medicine": range(1, 56),
    "Trauma and Accidents": range(1, 45),
    "Substances Abuse and Toxicology": range(1, 16),
    "Behavioral Medicine and Psychiatric Disorders": range(1, 34),
    "Growth and Development": range(1, 22),
    "Dermatology": range(1, 23),
    "Ophthalmology": range(1, 11),
    "ENT": range(1, 10),
    "Medical Ethics and Patient Safety": range(1, 35),
    "Research, Biostatistics, and Communication Skills": range(1, 14),
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
        val = obj.get(key)
        if isinstance(val, list):
            for item in val:
                yield from iter_questions(item)


def load_questions() -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for path in sorted(DATA.rglob("*.json")):
        try:
            obj = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        out.extend(iter_questions(obj))
    return out


def qnum(q: dict[str, Any]) -> int | None:
    for ref in q.get("sourceRefs") or []:
        if isinstance(ref, dict) and ref.get("questionNumber"):
            m = QNUM_RE.search(str(ref["questionNumber"]))
            if m:
                return int(m.group(1))
    m = QNUM_RE.search(str(q.get("id", "")))
    return int(m.group(1)) if m else None


def canonical_section(q: dict[str, Any]) -> str | None:
    s = " ".join(
        str(q.get(k) or "")
        for k in ("specialty", "topic", "module")
    ).lower()

    # Order matters for combined/overlapping labels.
    if any(x in s for x in ("pulmonary medicine", "sleep medicine", "respiratory-sleep")):
        return "Pulmonary and Sleep Medicine"
    if "asthma" in s or re.search(r"\ballergy\b", s):
        return "Allergy"
    if "immunology" in s:
        return "Immunology"
    if "hematology" in s or "haematology" in s:
        return "Hematology"
    if "oncology" in s:
        return "Oncology"
    if "cardiology" in s:
        return "Cardiology"
    if "endocrinology" in s:
        return "Endocrinology"
    if "nutrition and malnutrition" in s:
        return "Nutrition and Malnutrition"
    if "gastroenterology" in s:
        return "Gastroenterology"
    if "infectious" in s:
        return "Infectious Diseases"
    if "metabolic disorders" in s or "amino acid metabolism" in s or "urea cycle" in s or "energy utilization" in s or "complex-molecule" in s:
        return "Metabolic Disorders"
    if "genetics" in s or "dysmorphology" in s or "aneuploidy" in s:
        return "Genetics"
    if "nephrology" in s or "urologic" in s or "urogenital" in s:
        return "Nephrology and Urologic Disorders"
    if "rheumatology" in s:
        return "Rheumatology"
    if "neonatology" in s or "neonatal" in s:
        return "Neonatology"
    if "neurology" in s or "neurodisability" in s:
        return "Neurology"
    if "musculoskeletal" in s or "sport medicine" in s:
        return "Musculoskeletal and Sport Medicine"
    if "critical care" in s or "intensive care" in s:
        return "Critical Care Medicine"
    if "trauma" in s or "accidents" in s:
        return "Trauma and Accidents"
    if "substances abuse" in s or "toxicology" in s:
        return "Substances Abuse and Toxicology"
    if "behavioral medicine" in s or "psychiatric disorders" in s or "mental health" in s:
        return "Behavioral Medicine and Psychiatric Disorders"
    if "growth and development" in s or "normal development" in s or "abnormal development" in s:
        return "Growth and Development"
    if "dermatology" in s:
        return "Dermatology"
    if "ophthalmology" in s:
        return "Ophthalmology"
    if re.search(r"\bent\b", s):
        return "ENT"
    if "medical ethics" in s or "patient safety" in s:
        return "Medical Ethics and Patient Safety"
    if "research" in s or "biostatistics" in s or "communication skills" in s:
        return "Research, Biostatistics, and Communication Skills"
    return None


def main() -> int:
    questions = load_questions()
    found: defaultdict[str, set[int]] = defaultdict(set)
    unmapped: defaultdict[str, int] = defaultdict(int)

    for q in questions:
        n = qnum(q)
        sec = canonical_section(q)
        if sec and n is not None:
            found[sec].add(n)
        elif n is not None:
            label = str(q.get("specialty") or q.get("topic") or q.get("module") or "unknown")
            unmapped[label] += 1

    print("PediaRounds Part II source coverage audit")
    total_expected_enumerated = sum(len(r) for r in EXPECTED.values())
    total_found_slots = 0
    missing_total = 0

    for sec, expected_range in EXPECTED.items():
        expected = set(expected_range)
        got = found.get(sec, set()) & expected
        missing = sorted(expected - got)
        extra = sorted(found.get(sec, set()) - expected)
        total_found_slots += len(got)
        missing_total += len(missing)
        status = "OK" if not missing else "MISSING"
        print(f"{status:7} {sec}: {len(got)}/{len(expected)}", end="")
        if missing:
            print(" missing=" + ",".join(f"Q{x}" for x in missing), end="")
        if extra:
            print(" extra=" + ",".join(f"Q{x}" for x in extra), end="")
        print()

    print(f"Enumerated expected slots: {total_expected_enumerated}")
    print(f"Covered expected slots: {total_found_slots}")
    print(f"Missing expected slots: {missing_total}")
    print("NOTE Genetics: source TOC prints 53, but the source sequence ends at Q52 before Metabolic Disorders.")

    if unmapped:
        print("Unmapped numbered records by label:")
        for label, count in sorted(unmapped.items()):
            print(f"  {label}: {count}")

    # Report-only tool: findings do not fail CI while the bank is being completed.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
