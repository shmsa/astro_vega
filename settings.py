from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from datetime import datetime, timezone

BASE_DIR = Path(__file__).resolve().parent
SETTINGS_FILE = BASE_DIR / "app_settings.json"

DEFAULT_SETTINGS = {
    "app": {
        "name": "Astro Vega",
        "tagline": "Clássico Vega • Precisão Atual • Comparativo",
        "theme": "classic",
    },
    "practitioner": {
        "name": "Erwin Von Rommel Pamplona",
        "title": "",
        "email": "",
        "phone": "",
        "website": "",
        "footer_text": "",
    },
    "calculation": {
        "parallel_orb": 1.0,
        "aspect_orbs": {
            "conjunction": 9.0,
            "opposition": 8.0,
            "trine": 7.0,
            "square": 6.0,
            "sextile": 4.0,
        },
        "house_orbs": {
            "angular": 10.0,
            "other": 5.0,
        },
    },
    "storage": {
        "provider": "local",
        "supabase_enabled": False,
    },
}


def _merge(base: dict, override: dict) -> dict:
    out = deepcopy(base)
    for key, value in (override or {}).items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = _merge(out[key], value)
        else:
            out[key] = value
    return out


def get_settings() -> dict:
    if not SETTINGS_FILE.exists():
        return deepcopy(DEFAULT_SETTINGS)
    try:
        data = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
    except Exception:
        return deepcopy(DEFAULT_SETTINGS)
    return _merge(DEFAULT_SETTINGS, data)


def save_settings(data: dict) -> dict:
    merged = _merge(DEFAULT_SETTINGS, data)
    merged["updated_at"] = datetime.now(timezone.utc).isoformat()
    SETTINGS_FILE.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
    return merged
