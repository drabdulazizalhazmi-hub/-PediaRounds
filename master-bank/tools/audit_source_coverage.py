#!/usr/bin/env python3
"""Audit numbered Part II source coverage for the PediaRounds master bank.

Unlike ``audit_master_bank.py`` (structural integrity), this tool asks whether each
numbered slot in the 2026 Part II source collection is represented by at least one
structured record. File paths are the primary classifier because question topics can
overlap specialties (for example Critical Care neurological questions or metabolic
questions stored in the Endocrinology/Metabolic module).

The source table of contents prints 1023 questions. Genetics is a known source
numbering anomaly: the table says 53, but the actual Genetics sequence ends at Q52
immediately before Metabolic Disorders. This audit therefore treats Q1-Q52 as the
enumerated Genetics source range and reports the printed-count discrepancy.
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
    "Genetics": range(1, 53),  # actual numbered sequence ends at Q52
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


def load_questions() -> list[tuple[Path, dict[str, Any]]]:
    out: list[tuple[Path, dict[str, Any]]] = []
    for path in sorted(DATA.rglob("*.json")):
        try:
            obj = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        for q in iter_questions(obj):
            out.append((path, q))
    return out


def qnum(q: dict[str, Any]) -> int | None:
    for ref in q.get("sourceRefs") or []:
        if isinstance(ref, dict) and ref.get("questionNumber"):
            m = QNUM_RE.search(str(ref["questionNumber"]))
            if m:
                return int(m.group(1))
    m = QNUM_RE.search(str(q.get("id", "")))
    return int(m.group(1)) if m else None


def section_from_path(path: Path) -> str | None:
    rel = path.relative_to(DATA).as_posix().lower()
    name = path.name.lower()

    if rel.startswith("part2-2017-2025/"):
        return "Pulmonary and Sleep Medicine" if "respiratory-sleep" in name else None

    if rel.startswith("01-principles-of-paediatrics/"):
        if "research" in name or "communication" in name:
            return "Research, Biostatistics, and Communication Skills"
        if "ethics" in name or "patient-safety" in name:
            return "Medical Ethics and Patient Safety"
    if rel.startswith("02-paediatric-emergency-medicine/"):
        if "trauma" in name:
            return "Trauma and Accidents"
        if "substances" in name or "toxicology" in name:
            return "Substances Abuse and Toxicology"
    if rel.startswith("04-general-paediatrics-outpatients/"):
        if "dermatology" in name:
            return "Dermatology"
        if "ophthalmology" in name:
            return "Ophthalmology"
    if rel.startswith("05-child-development-behaviour/"):
        return "Growth and Development"
    if rel.startswith("06-neonatology/"):
        return "Neonatology"
    if rel.startswith("07-respiratory-ent/"):
        if name.startswith("ent-") or "ent-part" in name:
            return "ENT"
        if "sleep" in name:
            return "Pulmonary and Sleep Medicine"
        if "asthma" in name:
            return "Allergy"
    if rel.startswith("08-cardiology/"):
        return "Cardiology"
    if rel.startswith("09-gastroenterology-hepatology-nutrition/"):
        return "Nutrition and Malnutrition" if "nutrition" in name else "Gastroenterology"
    if rel.startswith("10-neurology-neurodisability/"):
        return "Neurology"
    if rel.startswith("11-infectious-diseases/"):
        return "Infectious Diseases"
    if rel.startswith("12-allergy-immunology/"):
        return "Immunology" if "immunology" in name else "Allergy"
    if rel.startswith("13-nephrology-urology/"):
        return "Nephrology and Urologic Disorders"
    if rel.startswith("14-diabetes-endocrinology-metabolic/"):
        return "Metabolic Disorders" if name.startswith("metabolic-") else "Endocrinology"
    if rel.startswith("15-genetics-dysmorphology/"):
        return "Genetics"
    if rel.startswith("16-haematology-oncology/"):
        return "Oncology" if "oncology" in name else "Hematology"
    if rel.startswith("17-musculoskeletal-rheumatology/"):
        return "Rheumatology" if name.startswith("rheumatology-") else "Musculoskeletal and Sport Medicine"
    if rel.startswith("18-paediatric-intensive-care/") or rel.startswith("18-pediatric-intensive-care/"):
        return "Critical Care Medicine"
    if rel.startswith("19-child-adolescent-mental-health/"):
        return "Behavioral Medicine and Psychiatric Disorders"
    return None


def fallback_section(q: dict[str, Any]) -> str | None:
    s = " ".join(str(q.get(k) or "") for k in ("specialty", "topic", "module")).lower()
    # Fallback only; path mapping above is authoritative for overlapping topics.
    if "pulmonary medicine" in s or "sleep medicine" in s:
        return "Pulmonary and Sleep Medicine"
    if "immunology" in s and "allergy" not in s:
        return "Immunology"
    if "asthma" in s or re.search(r"\ballergy\b", s):
        return "Allergy"
    if "oncology" in s:
        return "Oncology"
    if "hematology" in s or "haematology" in s:
        return "Hematology"
    if "cardiology" in s:
        return "Cardiology"
    if "nutrition and malnutrition" in s:
        return "Nutrition and Malnutrition"
    if "gastroenterology" in s:
        return "Gastroenterology"
    if "infectious" in s:
        return "Infectious Diseases"
    if "metabolic disorders" in s:
        return "Metabolic Disorders"
    if "genetics" in s or "dysmorphology" in s or "aneuploidy" in s:
        return "Genetics"
    if "endocrinology" in s:
        return "Endocrinology"
    if "nephrology" in s or "urologic" in s:
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
    if "behavioral medicine" in s or "psychiatric" in s or "mental health" in s:
        return "Behavioral Medicine and Psychiatric Disorders"
    if "growth and development" in s:
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
    rows = load_questions()
    found: defaultdict[str, set[int]] = defaultdict(set)
    unmapped: defaultdict[str, int] = defaultdict(int)

    for path, q in rows:
        n = qnum(q)
        sec = section_from_path(path) or fallback_section(q)
        if sec and n is not None:
            found[sec].add(n)
        elif n is not None:
            label = f"{path.relative_to(DATA)} :: {q.get('specialty') or q.get('topic') or 'unknown'}"
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
        print("Unmapped numbered records:")
        for label, count in sorted(unmapped.items()):
            print(f"  {label}: {count}")

    # Report-only while the bank is still being completed.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
