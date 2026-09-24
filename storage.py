from __future__ import annotations

import hashlib
import io
import json
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "saved_charts"
CLIENT_DIR = BASE_DIR / "saved_clients"
DATA_DIR.mkdir(exist_ok=True)
CLIENT_DIR.mkdir(exist_ok=True)


def _slug(text: str) -> str:
    text = (text or "mapa").strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "mapa"


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().casefold())


def client_key(name: str, birth_date: str | None) -> str:
    raw = f"{_norm(name)}|{birth_date or ''}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:20]


def upsert_client(subject: dict, profile: dict | None = None) -> dict:
    profile = profile or {}
    name = subject.get("name", "")
    birth_date = subject.get("date")
    key = client_key(name, birth_date)
    path = CLIENT_DIR / f"{key}.json"
    now = datetime.now(timezone.utc).isoformat()
    existing = {}
    if path.exists():
        try:
            existing = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            existing = {}
    row = {
        "id": key,
        "name": name,
        "birth_date": birth_date,
        "email": profile.get("email") or existing.get("email") or "",
        "phone": profile.get("phone") or existing.get("phone") or "",
        "notes": profile.get("notes") if profile.get("notes") is not None else existing.get("notes", ""),
        "created_at": existing.get("created_at") or now,
        "updated_at": now,
    }
    path.write_text(json.dumps(row, ensure_ascii=False, indent=2), encoding="utf-8")
    return row


def get_client(client_id: str) -> dict:
    if not re.fullmatch(r"[a-f0-9]{20}", client_id):
        raise ValueError("ID de consulente inválido")
    path = CLIENT_DIR / f"{client_id}.json"
    if not path.exists():
        raise FileNotFoundError(client_id)
    return json.loads(path.read_text(encoding="utf-8"))


def list_clients(query: str = "", limit: int = 200) -> list[dict]:
    q = _norm(query)
    rows = []
    chart_counts: dict[str, int] = {}
    for meta in list_charts(limit=10000):
        cid = meta.get("client_id")
        if cid:
            chart_counts[cid] = chart_counts.get(cid, 0) + 1
    for path in CLIENT_DIR.glob("*.json"):
        try:
            row = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        searchable = " ".join([row.get("name", ""), row.get("email", ""), row.get("phone", ""), row.get("birth_date", "")])
        if q and q not in _norm(searchable):
            continue
        row["chart_count"] = chart_counts.get(row.get("id"), 0)
        rows.append(row)
    rows.sort(key=lambda x: (x.get("name", "").casefold(), x.get("birth_date", "")))
    return rows[:limit]


def save_chart_bundle(classic: dict, modern: dict, comparison: dict, report_html: str, profile: dict | None = None) -> dict:
    now = datetime.now(timezone.utc)
    subject = classic.get("subject", {})
    name = subject.get("name", "mapa")
    client = upsert_client(subject, profile)
    chart_id = f"{now.strftime('%Y%m%dT%H%M%SZ')}-{_slug(name)[:40]}-{uuid4().hex[:6]}"
    folder = DATA_DIR / chart_id
    folder.mkdir(parents=True, exist_ok=False)

    meta = {
        "id": chart_id,
        "created_at": now.isoformat(),
        "name": name,
        "date": subject.get("date"),
        "local_time": subject.get("local_time"),
        "location_name": subject.get("location_name"),
        "client_id": client["id"],
    }
    (folder / "classic.json").write_text(json.dumps(classic, ensure_ascii=False, indent=2), encoding="utf-8")
    (folder / "modern.json").write_text(json.dumps(modern, ensure_ascii=False, indent=2), encoding="utf-8")
    (folder / "comparison.json").write_text(json.dumps(comparison, ensure_ascii=False, indent=2), encoding="utf-8")
    (folder / "report.html").write_text(report_html, encoding="utf-8")
    (folder / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return meta


def list_charts(limit: int = 100, query: str = "", client_id: str | None = None) -> list[dict]:
    rows = []
    q = _norm(query)
    for folder in DATA_DIR.iterdir():
        if not folder.is_dir():
            continue
        p = folder / "meta.json"
        if not p.exists():
            continue
        try:
            row = json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            continue
        if client_id and row.get("client_id") != client_id:
            continue
        searchable = " ".join([str(row.get(k, "") or "") for k in ("name", "date", "location_name", "id")])
        if q and q not in _norm(searchable):
            continue
        rows.append(row)
    rows.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return rows[:limit]


def chart_path(chart_id: str, filename: str) -> Path:
    if not re.fullmatch(r"[A-Za-z0-9._-]+", chart_id):
        raise ValueError("ID de mapa inválido")
    allowed = {"report.html", "classic.json", "modern.json", "comparison.json", "meta.json"}
    if filename not in allowed:
        raise ValueError("Arquivo inválido")
    p = DATA_DIR / chart_id / filename
    if not p.exists():
        raise FileNotFoundError(chart_id)
    return p


def export_chart_zip(chart_id: str) -> bytes:
    folder = DATA_DIR / chart_id
    if not folder.exists() or not folder.is_dir():
        raise FileNotFoundError(chart_id)
    mem = io.BytesIO()
    with zipfile.ZipFile(mem, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for filename in ("report.html", "classic.json", "modern.json", "comparison.json", "meta.json"):
            p = chart_path(chart_id, filename)
            zf.write(p, arcname=filename)
        meta = json.loads(chart_path(chart_id, "meta.json").read_text(encoding="utf-8"))
        cid = meta.get("client_id")
        if cid:
            try:
                zf.writestr("client.json", json.dumps(get_client(cid), ensure_ascii=False, indent=2))
            except Exception:
                pass
        zf.writestr("LEIA-ME.txt", "Pacote de mapa natal Astro Vega. Abra report.html em um navegador. Os JSONs preservam os resultados dos motores Clássico Vega, Precisão Atual e Comparativo.\n")
    return mem.getvalue()
