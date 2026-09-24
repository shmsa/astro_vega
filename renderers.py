from __future__ import annotations

from html import escape
from math import cos, sin, radians
from pathlib import Path
from typing import Dict, List, Tuple

from astro_engine import (
    ASPECTS, BODY_SPECS, SIGN_GLYPHS, SIGNS_PT,
    format_zodiac, round_arcminute, signed_angular_delta,
)

POINT_ORDER = [x[0] for x in BODY_SPECS] + ["ASC", "MC", "Fortune"]
ASPECT_COLOR = {
    "conjunction": "#444444",
    "sextile": "#2368b5",
    "square": "#b22222",
    "trine": "#2368b5",
    "opposition": "#b22222",
}
ASPECT_DASH = {
    "conjunction": "",
    "sextile": "4 3",
    "square": "",
    "trine": "",
    "opposition": "",
}


def _pt(cx: float, cy: float, r: float, angle_deg: float) -> Tuple[float, float]:
    # SVG y grows downward. 0 deg = right; convert conventional polar angle.
    a = radians(angle_deg)
    return cx + r * cos(a), cy - r * sin(a)


def _visual_angle(longitude: float, asc_longitude: float) -> float:
    # Put ASC at 180° (left), DSC at 0° (right). Zodiac increases clockwise.
    return 180.0 - ((longitude - asc_longitude) % 360.0)


def _svg_text(x, y, text, size=12, anchor="middle", weight="normal", fill="#111", family="Arial, sans-serif", rotate=None):
    transform = f' transform="rotate({rotate:.3f} {x:.3f} {y:.3f})"' if rotate is not None else ""
    return (f'<text x="{x:.3f}" y="{y:.3f}" text-anchor="{anchor}" font-family="{family}" '
            f'font-size="{size}" font-weight="{weight}" fill="{fill}"{transform}>{escape(str(text))}</text>')


def render_wheel_svg(chart: dict, width: int = 920, height: int = 920) -> str:
    cx, cy = width / 2, height / 2
    r_outer = min(width, height) * 0.45
    r_sign_in = r_outer * 0.84
    r_house_in = r_outer * 0.68
    r_planet = r_outer * 0.74
    r_aspect = r_outer * 0.55
    asc = chart["points"]["ASC"]["longitude"]

    out: List[str] = []
    out.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">')
    out.append('<rect width="100%" height="100%" fill="white"/>')
    for r, sw in [(r_outer, 2.2), (r_sign_in, 1.2), (r_house_in, 1.2)]:
        out.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#222" stroke-width="{sw}"/>')

    # Zodiac boundaries and labels.
    for sign_i in range(12):
        lon = sign_i * 30.0
        ang = _visual_angle(lon, asc)
        x1, y1 = _pt(cx, cy, r_sign_in, ang)
        x2, y2 = _pt(cx, cy, r_outer, ang)
        out.append(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="#555" stroke-width="1"/>')
        mid_ang = _visual_angle(lon + 15.0, asc)
        tx, ty = _pt(cx, cy, (r_outer + r_sign_in) / 2, mid_ang)
        out.append(_svg_text(tx, ty + 8, SIGN_GLYPHS[sign_i], 27, fill="#111", family="DejaVu Sans, Arial, sans-serif"))

    # House cusps and house numbers.
    cusps = chart["cusps"]
    for i, cusp in enumerate(cusps, 1):
        ang = _visual_angle(cusp, asc)
        x1, y1 = _pt(cx, cy, r_house_in, ang)
        x2, y2 = _pt(cx, cy, r_sign_in, ang)
        emphasis = 2.4 if i in (1,4,7,10) else 1.0
        col = "#222" if i in (1,4,7,10) else "#888"
        out.append(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="{col}" stroke-width="{emphasis}"/>')
        next_c = cusps[i % 12]
        span = (next_c - cusp) % 360
        mid = (cusp + span / 2) % 360
        tx, ty = _pt(cx, cy, r_house_in * 0.91, _visual_angle(mid, asc))
        out.append(_svg_text(tx, ty + 5, i, 13, weight="bold", fill="#555"))

    # Aspect lines.
    points = chart["points"]
    for asp in chart["aspects"]:
        if asp["a"] not in points or asp["b"] not in points:
            continue
        a = points[asp["a"]]["longitude"]
        b = points[asp["b"]]["longitude"]
        x1, y1 = _pt(cx, cy, r_aspect, _visual_angle(a, asc))
        x2, y2 = _pt(cx, cy, r_aspect, _visual_angle(b, asc))
        color = ASPECT_COLOR.get(asp["type"], "#777")
        dash = ASPECT_DASH.get(asp["type"], "")
        dash_attr = f' stroke-dasharray="{dash}"' if dash else ""
        opacity = 0.62 if asp["type"] != "conjunction" else 0.42
        out.append(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="{color}" stroke-width="1.4" opacity="{opacity}"{dash_attr}/>')

    # Radial markers for points. Offset near-collisions by lane.
    shown = [k for k in POINT_ORDER if k in points]
    sorted_pts = sorted(shown, key=lambda k: points[k]["longitude"])
    lane: Dict[str, int] = {}
    previous_lon = None
    current_lane = 0
    for k in sorted_pts:
        lon = points[k]["longitude"]
        if previous_lon is not None and ((lon - previous_lon) % 360) < 3.0:
            current_lane = (current_lane + 1) % 3
        else:
            current_lane = 0
        lane[k] = current_lane
        previous_lon = lon

    for k in shown:
        p = points[k]
        ang = _visual_angle(p["longitude"], asc)
        rr = r_planet - lane.get(k, 0) * 25
        x, y = _pt(cx, cy, rr, ang)
        xi, yi = _pt(cx, cy, r_house_in, ang)
        xo, yo = _pt(cx, cy, r_sign_in, ang)
        out.append(f'<line x1="{xi:.2f}" y1="{yi:.2f}" x2="{xo:.2f}" y2="{yo:.2f}" stroke="#999" stroke-width="0.6" opacity="0.5"/>')
        glyph = p.get("glyph") or k
        if k in ("ASC", "MC"):
            glyph = k
        out.append(_svg_text(x, y + 7, glyph, 22 if k not in ("ASC","MC") else 14, weight="bold", family="DejaVu Sans, Arial, sans-serif"))
        s, d, m = round_arcminute(p["longitude"])
        dx, dy = _pt(cx, cy, rr - 21, ang)
        out.append(_svg_text(dx, dy + 4, f"{d:02d}°{m:02d}'", 8, fill="#555"))

    # ASC / MC labels at outer ring.
    for key in ("ASC", "MC"):
        p = points[key]
        ang = _visual_angle(p["longitude"], asc)
        x, y = _pt(cx, cy, r_outer + 23, ang)
        out.append(_svg_text(x, y + 5, key, 13, weight="bold", fill="#111"))

    # Center title.
    out.append(_svg_text(cx, cy - 8, chart["engine"]["name"], 17, weight="bold"))
    out.append(_svg_text(cx, cy + 15, chart["subject"]["name"], 12, fill="#444"))
    out.append('</svg>')
    return "\n".join(out)


def render_aspect_matrix_svg(chart: dict, cell: int = 42, margin: int = 95) -> str:
    points = chart["points"]
    order = [k for k in POINT_ORDER if k in points]
    n = len(order)
    width = margin + n * cell + 20
    height = margin + n * cell + 20

    asp_map = {}
    for a in chart["aspects"]:
        asp_map[frozenset((a["a"], a["b"]))] = a
    dec_map = {}
    for a in chart["declination_aspects"]:
        dec_map[frozenset((a["a"], a["b"]))] = a

    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
           '<rect width="100%" height="100%" fill="white"/>']

    # Labels.
    for i, k in enumerate(order):
        p = points[k]
        glyph = p.get("glyph") or k
        x = margin + i * cell + cell / 2
        y = margin - 14
        out.append(_svg_text(x, y, glyph, 18, weight="bold", family="DejaVu Sans, Arial, sans-serif"))
        x2 = margin - 16
        y2 = margin + i * cell + cell / 2 + 6
        out.append(_svg_text(x2, y2, glyph, 18, anchor="end", weight="bold", family="DejaVu Sans, Arial, sans-serif"))

    # Grid and contents. Upper triangle = longitude aspects; lower = declination relations.
    for i, akey in enumerate(order):
        for j, bkey in enumerate(order):
            x = margin + j * cell
            y = margin + i * cell
            fill = "#fafafa" if i == j else "white"
            out.append(f'<rect x="{x}" y="{y}" width="{cell}" height="{cell}" fill="{fill}" stroke="#bbb" stroke-width="0.7"/>')
            if i == j:
                glyph = points[akey].get("glyph") or akey
                out.append(_svg_text(x + cell/2, y + cell/2 + 7, glyph, 18, weight="bold", family="DejaVu Sans, Arial, sans-serif"))
            elif j > i:
                asp = asp_map.get(frozenset((akey, bkey)))
                if asp:
                    color = ASPECT_COLOR.get(asp["type"], "#333")
                    out.append(_svg_text(x + cell/2, y + cell/2 + 7, asp["glyph"], 19, weight="bold", fill=color, family="DejaVu Sans, Arial, sans-serif"))
            else:
                rel = dec_map.get(frozenset((akey, bkey)))
                if rel:
                    symbol = "∥" if rel["type"] == "parallel" else "#"
                    out.append(_svg_text(x + cell/2, y + cell/2 + 6, symbol, 17, weight="bold", fill="#555"))

    out.append(_svg_text(width/2, 28, "Quadro de Aspectos", 18, weight="bold"))
    out.append(_svg_text(width/2, 50, "Superior: aspectos zodiacais • Inferior: paralelos/contraparalelos", 10, fill="#666"))
    out.append('</svg>')
    return "\n".join(out)


def render_comparison_table_html(comparison: dict) -> str:
    rows = []
    for key, d in comparison["points"].items():
        cls = "diff" if not d["same_display_minute"] else "same"
        rows.append(
            f'<tr class="{cls}"><td>{escape(d["name"])}</td><td>{escape(d["classic_display"])}</td>'
            f'<td>{escape(d["modern_display"])}</td><td>{d["delta_arcminutes"]:+.2f}′</td>'
            f'<td>{d["classic_house"]}/{d["classic_interpretive_house"]}</td>'
            f'<td>{d["modern_house"]}/{d["modern_interpretive_house"]}</td></tr>'
        )
    return ('<table class="comparison"><thead><tr><th>Ponto</th><th>Clássico</th><th>Atual</th><th>Δ</th>'
            '<th>Casa C</th><th>Casa A</th></tr></thead><tbody>' + ''.join(rows) + '</tbody></table>')


def render_chart_table_html(chart: dict) -> str:
    rows = []
    points = chart["points"]
    for k in POINT_ORDER:
        if k not in points:
            continue
        p = points[k]
        h = p["house_geometric"]
        ih = p["house_interpretive"]
        htxt = str(h) if h == ih else f"{h}/{ih}"
        rows.append(f'<tr><td>{escape(p["name"])}</td><td>{escape(format_zodiac(p["longitude"], bool(p["retrograde"])))}</td><td>{htxt}</td></tr>')
    return '<table><thead><tr><th>Ponto</th><th>Posição</th><th>Casa</th></tr></thead><tbody>' + ''.join(rows) + '</tbody></table>'


def render_dual_report_html(classic: dict, modern: dict, comparison: dict, branding: dict | None = None) -> str:
    branding = branding or {}
    app_name = branding.get("app_name", "Astro Vega")
    practitioner = branding.get("practitioner", "")
    cw = render_wheel_svg(classic, 760, 760)
    mw = render_wheel_svg(modern, 760, 760)
    cm = render_aspect_matrix_svg(classic, cell=34, margin=78)
    mm = render_aspect_matrix_svg(modern, cell=34, margin=78)
    ct = render_chart_table_html(classic)
    mt = render_chart_table_html(modern)
    cmp = render_comparison_table_html(comparison)

    def score_cards(chart):
        s = chart["scores"]
        chunks = []
        for title, block in (("Elementos", s["elements"]), ("Modalidades", s["modalities"]), ("Polaridades", s["polarities"])):
            vals = ''.join(f'<span><b>{escape(k)}</b> {v}</span>' for k,v in block.items())
            chunks.append(f'<div class="score"><h4>{title}</h4>{vals}</div>')
        return ''.join(chunks)

    return f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(app_name)} — {escape(classic['subject']['name'])}</title>
<style>
:root{{--bg:#f4f5f7;--card:#fff;--ink:#171717;--muted:#6b7280;--border:#d7dbe0;--accent:#252a34}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}}
header{{padding:24px 28px;background:#111827;color:white}} header h1{{margin:0 0 4px;font-size:24px}} header p{{margin:0;color:#cbd5e1}}
.tabs{{display:flex;gap:8px;padding:14px 18px;background:white;border-bottom:1px solid var(--border);position:sticky;top:0;z-index:2}}
.tabbtn{{border:1px solid var(--border);background:#f8fafc;padding:10px 14px;border-radius:9px;cursor:pointer;font-weight:650}} .tabbtn.active{{background:#111827;color:white;border-color:#111827}}
.panel{{display:none;padding:20px;max-width:1450px;margin:auto}} .panel.active{{display:block}}
.grid{{display:grid;grid-template-columns:minmax(500px,1.1fr) minmax(420px,.9fr);gap:18px;align-items:start}}
.card{{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,.035);overflow:auto}} .card h2{{margin:0 0 12px;font-size:18px}}
svg{{max-width:100%;height:auto;display:block;margin:auto}} table{{border-collapse:collapse;width:100%}} th,td{{padding:8px 9px;border-bottom:1px solid #e5e7eb;text-align:left;white-space:nowrap}} th{{background:#f8fafc;position:sticky;top:0}} tr.diff td{{background:#fff7ed}} tr.same td{{color:#555}}
.scores{{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}} .score{{border:1px solid var(--border);padding:10px;border-radius:10px;min-width:220px}} .score h4{{margin:0 0 7px}} .score span{{display:inline-block;margin:0 10px 4px 0}}
.note{{padding:10px 12px;border-left:3px solid #64748b;background:#f8fafc;color:#475569;margin-bottom:12px}}
@media(max-width:950px){{.grid{{grid-template-columns:1fr}}}}
</style></head><body>
<header><h1>{escape(app_name)} — {escape(classic['subject']['name'])}</h1><p>{escape(classic['subject'].get('location_name',''))} • {escape(classic['subject']['date'])} {escape(classic['subject']['local_time'])}{(' • ' + escape(practitioner)) if practitioner else ''}</p></header>
<div class="tabs"><button class="tabbtn active" onclick="showTab('classic',this)">Clássico Vega</button><button class="tabbtn" onclick="showTab('modern',this)">Precisão Atual</button><button class="tabbtn" onclick="showTab('compare',this)">Comparativo</button></div>
<section id="classic" class="panel active"><div class="note">Compatibilidade com o cálculo tradicional, incluindo HSL histórica quando fornecida.</div><div class="grid"><div class="card"><h2>Roda natal</h2>{cw}</div><div><div class="card"><h2>Posições</h2>{ct}<div class="scores">{score_cards(classic)}</div></div><div class="card" style="margin-top:18px"><h2>Matriz</h2>{cm}</div></div></div></section>
<section id="modern" class="panel"><div class="note">Cálculo astronômico atualizado, mantendo as mesmas regras interpretativas do perfil Vega/Good Luck.</div><div class="grid"><div class="card"><h2>Roda natal</h2>{mw}</div><div><div class="card"><h2>Posições</h2>{mt}<div class="scores">{score_cards(modern)}</div></div><div class="card" style="margin-top:18px"><h2>Matriz</h2>{mm}</div></div></div></section>
<section id="compare" class="panel"><div class="card"><h2>Diferenças entre os motores</h2>{cmp}</div><div class="card" style="margin-top:18px"><h2>Aspectos que mudaram</h2><pre>{escape(str(comparison['aspect_changes']))}</pre></div></section>
<script>function showTab(id,btn){{document.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.tabbtn').forEach(x=>x.classList.remove('active'));document.getElementById(id).classList.add('active');btn.classList.add('active')}}</script>
</body></html>'''


def save_text(text: str, path: str) -> None:
    Path(path).write_text(text, encoding="utf-8")


def render_print_report_html(chart: dict, title: str, subtitle: str = "", branding: dict | None = None) -> str:
    """Relatório autocontido otimizado para impressão A4/PDF pelo navegador."""
    branding = branding or {}
    app_name = branding.get("app_name", "Astro Vega")
    practitioner = branding.get("practitioner", "")
    footer_text = branding.get("footer_text", "")
    wheel = render_wheel_svg(chart, 690, 690)
    matrix = render_aspect_matrix_svg(chart, cell=30, margin=72)
    table = render_chart_table_html(chart)
    scores = chart["scores"]
    score_html = ''.join(
        f'<div class="score"><h3>{escape(group)}</h3>' + ''.join(f'<span><b>{escape(k)}</b> {v}</span>' for k, v in values.items()) + '</div>'
        for group, values in (("Elementos", scores["elements"]), ("Modalidades", scores["modalities"]), ("Polaridades", scores["polarities"]))
    )
    subject = chart["subject"]
    return f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{escape(title)} — {escape(subject['name'])}</title>
<style>
@page{{size:A4;margin:12mm}}*{{box-sizing:border-box}}body{{font:11px/1.35 Arial,sans-serif;color:#111;margin:0}}h1{{font-size:20px;margin:0}}h2{{font-size:14px;margin:0 0 8px}}.muted{{color:#555}}.toolbar{{display:flex;gap:8px;margin:0 0 12px}}.toolbar a,.toolbar button{{border:1px solid #bbb;background:white;padding:7px 10px;border-radius:7px;text-decoration:none;color:#111;cursor:pointer}}.section{{break-inside:avoid;margin-bottom:14px}}.grid{{display:grid;grid-template-columns:1.15fr .85fr;gap:12px;align-items:start}}.card{{border:1px solid #ccc;border-radius:8px;padding:10px;overflow:hidden}}svg{{max-width:100%;height:auto}}table{{border-collapse:collapse;width:100%}}th,td{{padding:4px 5px;border-bottom:1px solid #ddd;text-align:left}}.scores{{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}}.score{{border:1px solid #ddd;padding:6px 8px;border-radius:6px}}.score h3{{font-size:11px;margin:0 0 4px}}.score span{{display:inline-block;margin-right:7px}}.pagebreak{{break-before:page}}@media print{{.toolbar{{display:none}}body{{font-size:10px}}.card{{border-color:#bbb}}}}@media(max-width:800px){{.grid{{grid-template-columns:1fr}}}}
</style></head><body>
<div class="toolbar"><button onclick="window.print()">Imprimir / Salvar em PDF</button><a href="javascript:history.back()">Voltar</a></div>
<header class="section"><h1>{escape(title)}</h1><div>{escape(subject['name'])}</div><div class="muted">{escape(subject.get('location_name',''))} • {escape(subject['date'])} {escape(subject['local_time'])}</div><div class="muted">{escape(subtitle)}</div></header>
<section class="grid section"><div class="card"><h2>Roda natal</h2>{wheel}</div><div class="card"><h2>Posições</h2>{table}<div class="scores">{score_html}</div></div></section>
<section class="card section pagebreak"><h2>Quadro de Aspectos</h2>{matrix}</section>
<footer class="muted">Gerado por {escape(app_name)} • {escape(chart['engine']['name'])}{(' • ' + escape(practitioner)) if practitioner else ''}{(' • ' + escape(footer_text)) if footer_text else ''}</footer>
</body></html>'''
