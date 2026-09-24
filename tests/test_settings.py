import json
import settings


def test_settings_roundtrip(tmp_path, monkeypatch):
    p = tmp_path / "settings.json"
    monkeypatch.setattr(settings, "SETTINGS_FILE", p)
    initial = settings.get_settings()
    assert initial["app"]["name"] == "Astro Vega"
    saved = settings.save_settings({"app": {"name": "Mapa Erwin"}, "practitioner": {"name": "Erwin"}})
    assert saved["app"]["name"] == "Mapa Erwin"
    assert saved["calculation"]["aspect_orbs"]["square"] == 6.0
    reloaded = settings.get_settings()
    assert reloaded["practitioner"]["name"] == "Erwin"
