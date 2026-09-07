from __future__ import annotations
import base64, json, re, sys
from pathlib import Path


def records_container(data):
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("questions", "items", "records"):
            v = data.get(key)
            if isinstance(v, list):
                return v
    raise ValueError("Unsupported question JSON structure")


def q_matches(rec, qn: int) -> bool:
    qtoken = f"q{qn:02d}"
    rid = str(rec.get("id", "")).lower()
    if qtoken in rid:
        return True
    for ref in rec.get("sourceRefs") or []:
        s = str(ref.get("questionNumber", "")).lower().replace(" ", "")
        if re.search(rf"(^|[^0-9])q?0*{qn}([^0-9]|$)", s):
            return True
    return False


def main(bundle_path: str):
    bundle_file = Path(bundle_path)
    bundle = json.loads(bundle_file.read_text(encoding="utf-8"))

    for asset in bundle.get("assets", []):
        out = Path(asset["path"])
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(base64.b64decode(asset["content"]))

    touched = set()
    for m in bundle.get("mappings", []):
        data_path = Path(m["dataFile"])
        data = json.loads(data_path.read_text(encoding="utf-8"))
        recs = records_container(data)
        qn = int(m["questionNumber"])
        hits = [r for r in recs if q_matches(r, qn)]
        if len(hits) != 1:
            raise RuntimeError(f"Expected exactly one Q{qn} in {data_path}, got {len(hits)}")
        r = hits[0]
        img = r.get("image") if isinstance(r.get("image"), dict) else {}
        img.update({
            "requiredForQuestion": True,
            "assetPath": m["assetPath"],
            "captionEn": m.get("captionEn"),
            "captionAr": m.get("captionAr"),
            "status": "attached",
        })
        r["image"] = img
        if r.get("reviewStatus") == "image_missing":
            r["reviewStatus"] = "needs_verification"
        blockers = [b for b in (r.get("blockers") or []) if b not in {"image_missing", "missing_image", "source_image_missing"}]
        if blockers or "blockers" in r:
            r["blockers"] = blockers
        r["publishable"] = False
        touched.add(data_path)
        data_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Attached {len(bundle.get('mappings', []))} source images across {len(touched)} question files")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("usage: apply_source_image_bundle.py <bundle.json>")
    main(sys.argv[1])
