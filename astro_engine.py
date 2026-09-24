from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime, timezone, timedelta
from math import floor
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Protocol
import json
import os
import swisseph as swe

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]
SIGNS_PT = [
    "Áries", "Touro", "Gêmeos", "Câncer", "Leão", "Virgem",
    "Libra", "Escorpião", "Sagitário", "Capricórnio", "Aquário", "Peixes"
]
SIGN_GLYPHS = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"]

ELEMENTS = {
    0: "Fogo", 1: "Terra", 2: "Ar", 3: "Água", 4: "Fogo", 5: "Terra",
    6: "Ar", 7: "Água", 8: "Fogo", 9: "Terra", 10: "Ar", 11: "Água"
}
MODALITIES = {
    0: "Cardeal", 1: "Fixo", 2: "Mutável", 3: "Cardeal", 4: "Fixo", 5: "Mutável",
    6: "Cardeal", 7: "Fixo", 8: "Mutável", 9: "Cardeal", 10: "Fixo", 11: "Mutável"
}
POLARITIES = {
    0: "Ativo", 1: "Receptivo", 2: "Ativo", 3: "Receptivo", 4: "Ativo", 5: "Receptivo",
    6: "Ativo", 7: "Receptivo", 8: "Ativo", 9: "Receptivo", 10: "Ativo", 11: "Receptivo"
}

BODY_SPECS = [
    ("Sun", "Sol", "☉", swe.SUN),
    ("Moon", "Lua", "☽", swe.MOON),
    ("Mercury", "Mercúrio", "☿", swe.MERCURY),
    ("Venus", "Vênus", "♀", swe.VENUS),
    ("Mars", "Marte", "♂", swe.MARS),
    ("Jupiter", "Júpiter", "♃", swe.JUPITER),
    ("Saturn", "Saturno", "♄", swe.SATURN),
    ("Uranus", "Urano", "♅", swe.URANUS),
    ("Neptune", "Netuno", "♆", swe.NEPTUNE),
    ("Pluto", "Plutão", "♇", swe.PLUTO),
    ("Node", "Nodo Norte", "☊", swe.MEAN_NODE),
    ("Lilith", "Lilith", "⚸", swe.MEAN_APOG),
    ("Chiron", "Quíron", "⚷", swe.CHIRON),
]

ASPECTS = [
    ("conjunction", "Conjunção", "☌", 0.0, 9.0, "neutral"),
    ("sextile", "Sextil", "✶", 60.0, 4.0, "harmonic"),
    ("square", "Quadratura", "□", 90.0, 6.0, "tense"),
    ("trine", "Trígono", "△", 120.0, 7.0, "harmonic"),
    ("opposition", "Oposição", "☍", 180.0, 8.0, "tense"),
]

SCORING_WEIGHTS = {
    "Sun": 2, "Moon": 2,
    "Mercury": 1, "Venus": 1, "Mars": 1, "Jupiter": 1,
    "Saturn": 1, "Uranus": 1, "Neptune": 1, "Pluto": 1,
    "ASC": 2, "MC": 2,
}

@dataclass
class Subject:
    name: str
    date: str  # YYYY-MM-DD
    local_time: str  # HH:MM[:SS]
    utc_offset_hours: float
    latitude: float
    longitude: float
    location_name: str = ""
    # Optional legacy location data for the Classic Vega emulation. Historical
    # software often used a city database whose internal coordinates were more
    # precise than the rounded coordinates printed on the report.
    legacy_latitude: Optional[float] = None
    legacy_longitude: Optional[float] = None
    # Optional exact HSL override, expressed in decimal sidereal hours. Useful
    # when reproducing an existing archived Vega report whose HSL is known.
    classic_hsl_hours: Optional[float] = None

@dataclass
class Point:
    key: str
    name: str
    glyph: str
    longitude: float
    declination: Optional[float]
    speed_longitude: Optional[float]
    retrograde: bool
    sign_index: int
    degree_in_sign: float
    house_geometric: Optional[int] = None
    house_interpretive: Optional[int] = None

@dataclass
class Aspect:
    a: str
    b: str
    type: str
    name: str
    glyph: str
    exact_angle: float
    separation: float
    orb: float
    max_orb: float
    nature: str
    applying: Optional[bool]

@dataclass
class DeclinationAspect:
    a: str
    b: str
    type: str
    orb: float


def norm360(x: float) -> float:
    return x % 360.0


def angular_distance(a: float, b: float) -> float:
    d = abs(norm360(a) - norm360(b))
    return min(d, 360.0 - d)


def signed_angular_delta(a: float, b: float) -> float:
    """Shortest signed delta b-a, in degrees, range [-180, 180)."""
    return (b - a + 180.0) % 360.0 - 180.0


def sign_index(longitude: float) -> int:
    return int(norm360(longitude) // 30)


def round_arcminute(longitude: float) -> Tuple[int, int, int]:
    lon = norm360(longitude)
    total_minutes = int(floor(lon * 60.0 + 0.5)) % (360 * 60)
    s = total_minutes // (30 * 60)
    within = total_minutes % (30 * 60)
    d = within // 60
    m = within % 60
    return s, d, m


def format_zodiac(longitude: float, retrograde: bool = False, pt: bool = True) -> str:
    s, d, m = round_arcminute(longitude)
    sign = SIGNS_PT[s] if pt else SIGNS[s]
    r = " R" if retrograde else ""
    return f"{d:02d}°{m:02d}' {sign}{r}"


def format_declination(dec: Optional[float]) -> str:
    if dec is None:
        return "—"
    hemi = "N" if dec >= 0 else "S"
    value = abs(dec)
    total_minutes = int(floor(value * 60 + 0.5))
    d = total_minutes // 60
    m = total_minutes % 60
    return f"{d:02d}°{m:02d}'{hemi}"


def local_to_utc(subject: Subject) -> datetime:
    hhmmss = [int(x) for x in subject.local_time.split(":")]
    while len(hhmmss) < 3:
        hhmmss.append(0)
    y, mo, d = [int(x) for x in subject.date.split("-")]
    tz = timezone(timedelta(hours=subject.utc_offset_hours))
    local = datetime(y, mo, d, hhmmss[0], hhmmss[1], hhmmss[2], tzinfo=tz)
    return local.astimezone(timezone.utc)


def julian_day(dt_utc: datetime) -> float:
    hour = dt_utc.hour + dt_utc.minute / 60 + dt_utc.second / 3600 + dt_utc.microsecond / 3_600_000_000
    return swe.julday(dt_utc.year, dt_utc.month, dt_utc.day, hour, swe.GREG_CAL)


def classic_gmst_hours(jd_ut: float) -> float:
    """Legacy-friendly GMST formula (Meeus/IAU-1982 family), decimal hours."""
    t = (jd_ut - 2451545.0) / 36525.0
    gmst_deg = (
        280.46061837
        + 360.98564736629 * (jd_ut - 2451545.0)
        + 0.000387933 * t * t
        - (t * t * t) / 38710000.0
    ) % 360.0
    return gmst_deg / 15.0


def classic_hsl_hours(jd_ut: float, longitude: float) -> float:
    return (classic_gmst_hours(jd_ut) + longitude / 15.0) % 24.0


def find_house(longitude: float, cusps: List[float]) -> int:
    lon = norm360(longitude)
    for i in range(12):
        c1 = norm360(cusps[i])
        c2 = norm360(cusps[(i + 1) % 12])
        span = (c2 - c1) % 360
        rel = (lon - c1) % 360
        if rel < span or abs(rel - span) < 1e-12:
            return i + 1
    raise RuntimeError("Could not assign house")


def interpretive_house(longitude: float, geometric_house: int, cusps: List[float]) -> int:
    next_house = geometric_house % 12 + 1
    next_cusp = norm360(cusps[next_house - 1])
    d = (next_cusp - norm360(longitude)) % 360
    limit = 10.0 if next_house in (1, 4, 7, 10) else 5.0
    return next_house if d <= limit else geometric_house


def calc_body(jd: float, key: str, name: str, glyph: str, body_id: int,
              ephemeris_flag: int) -> Tuple[Point, int]:
    flags = ephemeris_flag | swe.FLG_SPEED
    try:
        ecl, retflag = swe.calc_ut(jd, body_id, flags)
        eq, _ = swe.calc_ut(jd, body_id, flags | swe.FLG_EQUATORIAL)
    except swe.Error as exc:
        if body_id == swe.CHIRON:
            raise RuntimeError(
                "Chiron requires Swiss Ephemeris main-asteroid file seas_18.se1 (for 1800–2400) "
                "in the configured ephemeris directory."
            ) from exc
        raise
    lon = norm360(ecl[0])
    speed = ecl[3]
    si = sign_index(lon)
    return Point(
        key=key, name=name, glyph=glyph, longitude=lon, declination=eq[1],
        speed_longitude=speed, retrograde=speed < 0, sign_index=si,
        degree_in_sign=lon - si * 30,
    ), retflag


def aspect_between(a: Point, b: Point) -> Optional[Aspect]:
    sep = angular_distance(a.longitude, b.longitude)
    for key, name, glyph, exact, max_orb, nature in ASPECTS:
        orb = abs(sep - exact)
        if orb <= max_orb + 1e-12:
            applying = None
            if a.speed_longitude is not None and b.speed_longitude is not None:
                a2 = norm360(a.longitude + a.speed_longitude / 24.0)
                b2 = norm360(b.longitude + b.speed_longitude / 24.0)
                sep2 = angular_distance(a2, b2)
                applying = abs(sep2 - exact) < orb
            return Aspect(a.key, b.key, key, name, glyph, exact, sep, orb, max_orb, nature, applying)
    return None


def declination_relation(a: Point, b: Point, max_orb: float = 1.0) -> Optional[DeclinationAspect]:
    if a.declination is None or b.declination is None:
        return None
    da, db = a.declination, b.declination
    if da * db >= 0:
        orb = abs(da - db)
        if orb <= max_orb:
            return DeclinationAspect(a.key, b.key, "parallel", orb)
    else:
        orb = abs(abs(da) - abs(db))
        if orb <= max_orb:
            return DeclinationAspect(a.key, b.key, "contra_parallel", orb)
    return None


def lunar_phase(sun_lon: float, moon_lon: float) -> str:
    d = (moon_lon - sun_lon) % 360.0
    if d < 90:
        return "Nova"
    if d < 180:
        return "Crescente"
    if d < 270:
        return "Cheia"
    return "Minguante"


def part_of_fortune(asc: float, moon: float, sun: float) -> float:
    return norm360(asc + moon - sun)


def score_distribution(points: Dict[str, Point]) -> Dict[str, Dict[str, int]]:
    out = {
        "elements": {"Fogo": 0, "Terra": 0, "Ar": 0, "Água": 0},
        "modalities": {"Cardeal": 0, "Fixo": 0, "Mutável": 0},
        "polarities": {"Ativo": 0, "Receptivo": 0},
    }
    for key, weight in SCORING_WEIGHTS.items():
        p = points[key]
        s = p.sign_index
        out["elements"][ELEMENTS[s]] += weight
        out["modalities"][MODALITIES[s]] += weight
        out["polarities"][POLARITIES[s]] += weight
    return out


class ChartEngine(Protocol):
    engine_id: str
    engine_name: str
    def calculate(self, subject: Subject) -> dict: ...


class BaseAstroEngine:
    engine_id = "base"
    engine_name = "Base"
    ephemeris_flag = swe.FLG_SWIEPH

    def __init__(self, ephemeris_path: Optional[str] = None, strict_chiron: bool = True):
        self.strict_chiron = strict_chiron
        path = ephemeris_path or os.environ.get("SE_EPHE_PATH")
        if path:
            swe.set_ephe_path(path)
        self.ephemeris_path = path

    def _houses(self, jd: float, subject: Subject) -> Tuple[List[float], float, float, dict]:
        raise NotImplementedError

    def calculate(self, subject: Subject) -> dict:
        utc = local_to_utc(subject)
        jd = julian_day(utc)
        cusps, asc, mc, house_meta = self._houses(jd, subject)

        points: Dict[str, Point] = {}
        warnings: List[str] = []
        ephemeris_retflags: Dict[str, int] = {}
        for spec in BODY_SPECS:
            try:
                p, retflag = calc_body(jd, *spec, self.ephemeris_flag)
                points[p.key] = p
                ephemeris_retflags[p.key] = int(retflag)
            except RuntimeError as exc:
                if spec[0] == "Chiron" and not self.strict_chiron:
                    warnings.append(str(exc))
                    continue
                raise

        points["ASC"] = Point("ASC", "Ascendente", "Asc", asc, None, None, False, sign_index(asc), asc % 30)
        points["MC"] = Point("MC", "Meio do Céu", "MC", mc, None, None, False, sign_index(mc), mc % 30)
        fortune = part_of_fortune(asc, points["Moon"].longitude, points["Sun"].longitude)
        points["Fortune"] = Point("Fortune", "Parte da Fortuna", "⊗", fortune, None, None, False,
                                  sign_index(fortune), fortune % 30)

        for p in points.values():
            p.house_geometric = find_house(p.longitude, cusps)
            p.house_interpretive = interpretive_house(p.longitude, p.house_geometric, cusps)

        order = [x[0] for x in BODY_SPECS if x[0] in points] + ["ASC", "MC", "Fortune"]
        aspects: List[Aspect] = []
        decl_aspects: List[DeclinationAspect] = []
        for i in range(len(order)):
            for j in range(i + 1, len(order)):
                a, b = points[order[i]], points[order[j]]
                asp = aspect_between(a, b)
                if asp:
                    aspects.append(asp)
                da = declination_relation(a, b, 1.0)
                if da:
                    decl_aspects.append(da)

        scores = score_distribution(points)
        phase = lunar_phase(points["Sun"].longitude, points["Moon"].longitude)

        return {
            "engine": {
                "id": self.engine_id,
                "name": self.engine_name,
                "ephemeris_requested_flag": int(self.ephemeris_flag),
                "ephemeris_path": self.ephemeris_path,
                "ephemeris_retflags": ephemeris_retflags,
            },
            "subject": asdict(subject),
            "utc": utc.isoformat(),
            "julian_day_ut": jd,
            "settings": {
                "zodiac": "tropical",
                "planet_frame": "geocentric",
                "house_system": "Topocentric / Polich-Page",
                "house_system_code": "T",
                "node": "Mean North Node",
                "lilith": "Mean Lunar Apogee",
                "fortune_formula": "ASC + Moon - Sun",
                "house_cusp_orbs": {"angular": 10.0, "other": 5.0},
                "aspect_orbs": {a[0]: a[4] for a in ASPECTS},
                "parallel_orb": 1.0,
                "display_rounding": "nearest arcminute",
            },
            "house_calculation": house_meta,
            "ascendant": asc,
            "midheaven": mc,
            "cusps": cusps,
            "points": {k: asdict(v) for k, v in points.items()},
            "aspects": [asdict(x) for x in aspects],
            "declination_aspects": [asdict(x) for x in decl_aspects],
            "scores": scores,
            "lunar_phase": phase,
            "warnings": warnings,
        }


class VegaClassicEngine(BaseAstroEngine):
    """Compatibility-oriented engine for archived Vega/Good Luck style reports.

    - Planetary calculation requests Moshier analytical ephemeris, closer in
      spirit to the historical self-contained analytical engine.
    - Houses are built from a legacy-style GMST/HSL path and houses_armc.
    - If an archived report's exact HSL is known, Subject.classic_hsl_hours can
      reproduce its house rotation without inventing corrections to planets.
    """
    engine_id = "vega_classic"
    engine_name = "Clássico Vega"
    ephemeris_flag = swe.FLG_MOSEPH

    def _houses(self, jd: float, subject: Subject) -> Tuple[List[float], float, float, dict]:
        lat = subject.legacy_latitude if subject.legacy_latitude is not None else subject.latitude
        lon = subject.legacy_longitude if subject.legacy_longitude is not None else subject.longitude
        if subject.classic_hsl_hours is not None:
            hsl = subject.classic_hsl_hours % 24.0
            hsl_source = "archived_report_override"
        else:
            hsl = classic_hsl_hours(jd, lon)
            hsl_source = "legacy_gmst_formula_plus_longitude"
        armc = hsl * 15.0
        ecl_nut, _ = swe.calc_ut(jd, swe.ECL_NUT, swe.FLG_MOSEPH)
        true_obliquity = ecl_nut[0]
        cusps_tuple, ascmc = swe.houses_armc(armc, lat, true_obliquity, b"T")
        cusps = [norm360(x) for x in cusps_tuple]
        return cusps, norm360(ascmc[0]), norm360(ascmc[1]), {
            "mode": "legacy_armc",
            "latitude_used": lat,
            "longitude_used": lon,
            "hsl_hours": hsl,
            "hsl_source": hsl_source,
            "armc_degrees": armc,
            "true_obliquity_degrees": true_obliquity,
        }


class ModernSwissEngine(BaseAstroEngine):
    engine_id = "modern_swiss"
    engine_name = "Precisão Atual"
    ephemeris_flag = swe.FLG_SWIEPH

    def _houses(self, jd: float, subject: Subject) -> Tuple[List[float], float, float, dict]:
        cusps_tuple, ascmc = swe.houses_ex(jd, subject.latitude, subject.longitude, b"T")
        cusps = [norm360(x) for x in cusps_tuple]
        hsl = (swe.sidtime(jd) + subject.longitude / 15.0) % 24.0
        return cusps, norm360(ascmc[0]), norm360(ascmc[1]), {
            "mode": "swiss_houses_ex",
            "latitude_used": subject.latitude,
            "longitude_used": subject.longitude,
            "hsl_hours": hsl,
            "hsl_source": "Swiss Ephemeris sidereal time",
            "armc_degrees": hsl * 15.0,
        }


# Backwards compatible name from v0.1. It now points to the modern calculation.
class VegaCompatibleEngine(ModernSwissEngine):
    engine_id = "vega_compatible_modern"
    engine_name = "Vega Compatível — Moderno"


def compare_charts(classic: dict, modern: dict) -> dict:
    if classic["subject"]["name"] != modern["subject"]["name"]:
        raise ValueError("Charts appear to belong to different subjects")

    keys = []
    preferred = [x[0] for x in BODY_SPECS] + ["ASC", "MC", "Fortune"]
    for k in preferred:
        if k in classic["points"] and k in modern["points"]:
            keys.append(k)

    point_diffs = {}
    for key in keys:
        c = classic["points"][key]
        m = modern["points"][key]
        delta = signed_angular_delta(c["longitude"], m["longitude"])
        point_diffs[key] = {
            "name": c["name"],
            "classic_longitude": c["longitude"],
            "modern_longitude": m["longitude"],
            "classic_display": format_zodiac(c["longitude"], bool(c["retrograde"])),
            "modern_display": format_zodiac(m["longitude"], bool(m["retrograde"])),
            "delta_degrees": delta,
            "delta_arcminutes": delta * 60.0,
            "same_display_minute": round_arcminute(c["longitude"]) == round_arcminute(m["longitude"]),
            "classic_house": c["house_geometric"],
            "modern_house": m["house_geometric"],
            "classic_interpretive_house": c["house_interpretive"],
            "modern_interpretive_house": m["house_interpretive"],
        }

    cusp_diffs = []
    for i, (c, m) in enumerate(zip(classic["cusps"], modern["cusps"]), 1):
        d = signed_angular_delta(c, m)
        cusp_diffs.append({
            "house": i,
            "classic": c,
            "modern": m,
            "delta_degrees": d,
            "delta_arcminutes": d * 60.0,
            "same_display_minute": round_arcminute(c) == round_arcminute(m),
        })

    classic_aspects = {(a["a"], a["b"], a["type"]) for a in classic["aspects"]}
    modern_aspects = {(a["a"], a["b"], a["type"]) for a in modern["aspects"]}

    return {
        "subject": classic["subject"],
        "classic_engine": classic["engine"],
        "modern_engine": modern["engine"],
        "points": point_diffs,
        "cusps": cusp_diffs,
        "aspect_changes": {
            "classic_only": sorted([list(x) for x in classic_aspects - modern_aspects]),
            "modern_only": sorted([list(x) for x in modern_aspects - classic_aspects]),
            "same_count": len(classic_aspects & modern_aspects),
        },
        "scores_equal": classic["scores"] == modern["scores"],
        "lunar_phase_equal": classic["lunar_phase"] == modern["lunar_phase"],
    }


def human_summary(chart: dict) -> str:
    pts = chart["points"]
    lines = []
    lines.append(f"Mapa natal — {chart['subject']['name']}")
    lines.append(f"Motor: {chart['engine']['name']}")
    lines.append(f"UTC: {chart['utc']}")
    lines.append(f"ASC: {format_zodiac(pts['ASC']['longitude'])}")
    lines.append(f"MC:  {format_zodiac(pts['MC']['longitude'])}")
    lines.append(f"Fase da Lua: {chart['lunar_phase']}")
    lines.append("")
    order = [x[0] for x in BODY_SPECS if x[0] in pts] + ["Fortune"]
    for key in order:
        p = pts[key]
        r = bool(p["retrograde"])
        house = p["house_geometric"]
        ih = p["house_interpretive"]
        htxt = str(house) if ih == house else f"{house}/{ih}"
        lines.append(f"{p['name']:<16} {format_zodiac(p['longitude'], r):<26} Casa {htxt:<4} Decl. {format_declination(p['declination'])}")
    lines.append("")
    s = chart["scores"]
    lines.append("Pontuação — Elementos: " + ", ".join(f"{k} {v}" for k, v in s["elements"].items()))
    lines.append("Pontuação — Modalidades: " + ", ".join(f"{k} {v}" for k, v in s["modalities"].items()))
    lines.append("Pontuação — Polaridades: " + ", ".join(f"{k} {v}" for k, v in s["polarities"].items()))
    return "\n".join(lines)


def comparison_summary(comp: dict, only_differences: bool = False) -> str:
    lines = []
    lines.append(f"Comparativo — {comp['subject']['name']}")
    lines.append("Clássico Vega × Precisão Atual")
    lines.append("")
    for key, d in comp["points"].items():
        significant = (not d["same_display_minute"] or abs(d["delta_arcminutes"]) >= 0.5
                       or d["classic_house"] != d["modern_house"]
                       or d["classic_interpretive_house"] != d["modern_interpretive_house"])
        if only_differences and not significant:
            continue
        lines.append(
            f"{d['name']:<16} {d['classic_display']:<24} | {d['modern_display']:<24} "
            f"Δ {d['delta_arcminutes']:+.2f}'"
        )
    lines.append("")
    lines.append(f"Pontuações iguais: {'sim' if comp['scores_equal'] else 'não'}")
    lines.append(f"Fase lunar igual: {'sim' if comp['lunar_phase_equal'] else 'não'}")
    ac = comp["aspect_changes"]
    lines.append(f"Aspectos comuns: {ac['same_count']}; só clássico: {len(ac['classic_only'])}; só moderno: {len(ac['modern_only'])}")
    return "\n".join(lines)


def save_json(chart: dict, path: str) -> None:
    Path(path).write_text(json.dumps(chart, ensure_ascii=False, indent=2), encoding="utf-8")
