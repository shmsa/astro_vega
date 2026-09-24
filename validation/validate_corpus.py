from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "corpus" / "corpus-index.v1.json"
REQUIRED_PROFILES = {"vega_classic", "modern_swiss", "comparative"}

def main() -> int:
    data = json.loads(INDEX.read_text(encoding="utf-8"))
    assert set(data["profiles_required"]) == REQUIRED_PROFILES
    cases = data["cases"]
    assert cases, "Corpus must contain at least one case"
    counts = {"golden_complete":0,"public_evidence_partial":0,"pending_source_recovery":0}
    for case in cases:
        status = case["status"]
        assert status in counts, f"Unknown corpus status: {status}"
        counts[status] += 1
        if status == "golden_complete":
            for rel in case.get("golden", []):
                path = ROOT / rel
                assert path.exists(), f"Missing golden fixture: {rel}"
                json.loads(path.read_text(encoding="utf-8"))
        elif status == "public_evidence_partial":
            assert case.get("do_not_infer_expected_values") is True
            path = ROOT / case["fixture"]
            assert path.exists(), f"Missing evidence fixture: {case['fixture']}"
            fixture=json.loads(path.read_text(encoding="utf-8"))
            assert fixture["provenance"] == "public_vega_report"
            assert fixture.get("source_url")
            assert fixture.get("birth_input")
            assert fixture.get("observed")
            assert fixture.get("do_not_infer_missing_expected_values") is True
        else:
            assert case.get("do_not_infer_expected_values") is True
    print(f"Corpus schema PASS: {len(cases)} indexed; {counts['golden_complete']} golden; {counts['public_evidence_partial']} public partial; {counts['pending_source_recovery']} pending")
    print("Profiles PASS: vega_classic + modern_swiss + comparative are mandatory")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
