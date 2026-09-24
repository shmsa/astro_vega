from __future__ import annotations

import html
import json
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from astro_engine import Subject, VegaClassicEngine, ModernSwissEngine, compare_charts
from location_resolver import resolve_location
from renderers import render_dual_report_html, render_print_report_html
from settings import get_settings, save_settings
from settings_ui import settings_body
from storage import (
    save_chart_bundle, list_charts, chart_path, export_chart_zip,
    list_clients, get_client,
)

HOST = "127.0.0.1"
PORT = 8765
VERSION = "0.7"

FORM_HTML = r'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Astro Vega — Mapa Natal</title>
<style>
:root{--bg:#eef1f5;--card:#fff;--ink:#111827;--muted:#64748b;--line:#d7dde5;--brand:#1f2937;--accent:#8b6f47}
*{box-sizing:border-box}body{margin:0;background:var(--bg);font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:var(--ink)}
header{background:linear-gradient(135deg,#111827,#293445);color:#fff;padding:30px 24px}header .brand{max-width:980px;margin:auto}header h1{margin:0;font-size:27px;letter-spacing:.2px}header p{margin:6px 0 0;color:#cbd5e1}
main{max-width:980px;margin:24px auto;padding:0 18px}.card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:22px;box-shadow:0 3px 12px rgba(0,0,0,.04)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:15px}.full{grid-column:1/-1}label{display:block;font-weight:650;margin-bottom:6px}input,textarea{width:100%;padding:11px 12px;border:1px solid #cbd5e1;border-radius:9px;font-size:15px;background:white}textarea{min-height:90px;resize:vertical}small{color:var(--muted)}
details{margin-top:18px;border-top:1px solid #e5e7eb;padding-top:15px}summary{font-weight:700;cursor:pointer}.actions{display:flex;gap:10px;margin-top:20px;align-items:center;flex-wrap:wrap}.btn{display:inline-block;border:0;border-radius:10px;padding:12px 17px;font-weight:750;cursor:pointer;text-decoration:none}.primary{background:#111827;color:#fff}.secondary{background:#e2e8f0;color:#111827}.note{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin:16px 0;color:#475569}.section-title{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin:0 0 10px}
@media(max-width:700px){.grid{grid-template-columns:1fr}.full{grid-column:auto}}
</style></head><body>
<header><div class="brand"><h1>Astro Vega</h1><p>Clássico Vega • Precisão Atual • Comparativo</p></div></header>
<main><div class="card">
<form method="post" action="/calculate">
<p class="section-title">Consulente</p>
<div class="grid">
<div class="full"><label>Nome</label><input name="name" required value="Sergio Monte Santo Andrade"></div>
<div><label>Data de nascimento</label><input type="date" name="date" required value="1989-01-23"></div>
<div><label>Hora local</label><input type="time" step="1" name="time" required value="10:55:00"></div>
<div class="full"><label>Cidade / local</label><input name="location" required value="Belém, Pará, Brasil"><small>Com internet, o programa tenta localizar a cidade automaticamente.</small></div>
<div><label>Estado/UF</label><input name="state" value="PA" placeholder="PA"></div>
<div><label>País</label><input name="country" value="Brasil"></div>
</div>
<details><summary>Perfil do consulente (opcional)</summary><div class="grid" style="margin-top:14px">
<div><label>E-mail</label><input name="email" type="email" placeholder="opcional"></div><div><label>Telefone</label><input name="phone" placeholder="opcional"></div>
<div class="full"><label>Observações internas</label><textarea name="notes" placeholder="Anotações do atendimento. Não aparecem no relatório impresso."></textarea></div>
</div></details>
<div class="note">O fuso é resolvido historicamente na data do nascimento. Em casos antigos ou excepcionais, use as opções avançadas para auditar os dados.</div>
<details><summary>Opções avançadas / auditoria</summary><div class="grid" style="margin-top:14px">
<div><label>Latitude</label><input name="latitude" value="-1.45" placeholder="ex.: -1.45"></div>
<div><label>Longitude</label><input name="longitude" value="-48.50" placeholder="ex.: -48.50"></div>
<div class="full"><label>Fuso IANA</label><input name="timezone" value="America/Belem" placeholder="ex.: America/Belem"><small>Preferível a informar somente UTC−3, pois preserva horário de verão histórico.</small></div>
<div><label>HSL clássico (opcional)</label><input name="classic_hsl" placeholder="18:52:24"><small>Use apenas ao reproduzir um relatório Vega arquivado.</small></div>
<div><label>Latitude clássica (opcional)</label><input name="legacy_latitude" placeholder="normalmente deixe vazio"></div>
<div><label>Longitude clássica (opcional)</label><input name="legacy_longitude" placeholder="normalmente deixe vazio"></div>
</div></details>
<div class="actions"><button class="btn primary" type="submit">Gerar mapa natal</button><a class="btn secondary" href="/history">Histórico</a><a class="btn secondary" href="/clients">Consulentes</a><a class="btn secondary" href="/settings">Configurações</a></div>
</form></div></main></body></html>'''



def _branding() -> dict:
    cfg = get_settings()
    return {
        "app_name": cfg["app"]["name"],
        "practitioner": cfg["practitioner"]["name"],
        "footer_text": cfg["practitioner"].get("footer_text", ""),
    }


def settings_page(saved: bool = False) -> bytes:
    cfg = get_settings()
    return _shell(f"Configurações — {cfg['app']['name']}", settings_body(saved))

def _float(v):
    v = (v or '').strip().replace(',', '.')
    return None if not v else float(v)


def _hsl(v):
    v = (v or '').strip()
    if not v:
        return None
    parts = [float(x) for x in v.split(':')]
    while len(parts) < 3:
        parts.append(0.0)
    return (parts[0] + parts[1] / 60 + parts[2] / 3600) % 24


def error_page(message: str) -> bytes:
    return f'''<!doctype html><meta charset="utf-8"><style>body{{font:15px Arial;padding:30px;max-width:800px;margin:auto}}.e{{background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;padding:18px}}a{{color:#1d4ed8}}</style><h1>Não foi possível calcular</h1><div class="e">{html.escape(message)}</div><p><a href="/">← Voltar</a></p>'''.encode('utf-8')


def _shell(title: str, body: str) -> bytes:
    return f'''<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(title)}</title><style>
body{{font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;background:#eef1f5;margin:0;color:#111827}}main{{max-width:1150px;margin:30px auto;background:white;padding:24px;border:1px solid #d7dde5;border-radius:14px;box-shadow:0 2px 9px rgba(0,0,0,.04)}}table{{width:100%;border-collapse:collapse}}td,th{{padding:10px;border-bottom:1px solid #e5e7eb;text-align:left}}th{{background:#f8fafc}}a{{color:#1d4ed8;text-decoration:none}}.top{{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:18px}}.search{{display:flex;gap:8px;margin:14px 0}}.search input{{flex:1;padding:9px;border:1px solid #cbd5e1;border-radius:8px}}.search button{{padding:9px 13px;border:0;border-radius:8px;background:#111827;color:white}}.muted{{color:#64748b}}.pill{{display:inline-block;background:#e2e8f0;border-radius:999px;padding:3px 8px;font-size:12px}} input{{padding:8px 9px;border:1px solid #cbd5e1;border-radius:7px;min-width:220px}} label{{font-weight:600}}
</style><main>{body}</main></html>'''.encode('utf-8')


def history_page(query: str = "") -> bytes:
    rows = list_charts(query=query)
    body_rows = []
    for row in rows:
        cid = html.escape(row.get('id', ''))
        name = html.escape(row.get('name', ''))
        date = html.escape(str(row.get('date', '') or ''))
        loc = html.escape(str(row.get('location_name', '') or ''))
        client = row.get('client_id', '')
        client_link = f'<a href="/client/{html.escape(client)}">perfil</a> · ' if client else ''
        body_rows.append(
            f'<tr><td><a href="/report/{cid}">{name}</a></td><td>{date}</td><td>{loc}</td>'
            f'<td>{client_link}<a href="/print/{cid}/classic">imprimir clássico</a> · <a href="/print/{cid}/modern">imprimir atual</a> · <a href="/bundle/{cid}">ZIP</a></td></tr>'
        )
    rows_html = ''.join(body_rows) if body_rows else '<tr><td colspan="4">Nenhum mapa encontrado.</td></tr>'
    q = html.escape(query)
    return _shell('Histórico — Astro Vega', f'''<div class="top"><a href="/">← Novo mapa</a><a href="/clients">Consulentes</a></div><h1>Histórico</h1><form class="search" method="get" action="/history"><input name="q" value="{q}" placeholder="Buscar por nome, data, local ou ID"><button>Buscar</button></form><table><thead><tr><th>Nome</th><th>Data</th><th>Local</th><th>Ações</th></tr></thead><tbody>{rows_html}</tbody></table>''')


def clients_page(query: str = "") -> bytes:
    rows = list_clients(query=query)
    body_rows = []
    for row in rows:
        cid = html.escape(row['id'])
        body_rows.append(f'''<tr><td><a href="/client/{cid}">{html.escape(row.get('name',''))}</a></td><td>{html.escape(str(row.get('birth_date','') or ''))}</td><td>{html.escape(row.get('email',''))}</td><td>{html.escape(row.get('phone',''))}</td><td><span class="pill">{row.get('chart_count',0)} mapa(s)</span></td></tr>''')
    rows_html = ''.join(body_rows) if body_rows else '<tr><td colspan="5">Nenhum consulente encontrado.</td></tr>'
    return _shell('Consulentes — Astro Vega', f'''<div class="top"><a href="/">← Novo mapa</a><a href="/history">Histórico</a></div><h1>Consulentes</h1><form class="search" method="get" action="/clients"><input name="q" value="{html.escape(query)}" placeholder="Buscar por nome, nascimento, e-mail ou telefone"><button>Buscar</button></form><table><thead><tr><th>Nome</th><th>Nascimento</th><th>E-mail</th><th>Telefone</th><th>Mapas</th></tr></thead><tbody>{rows_html}</tbody></table>''')


def client_page(client_id: str) -> bytes:
    c = get_client(client_id)
    charts = list_charts(client_id=client_id, limit=1000)
    rows = ''.join(f'''<tr><td><a href="/report/{html.escape(m['id'])}">{html.escape(str(m.get('created_at',''))[:19])}</a></td><td>{html.escape(str(m.get('location_name','') or ''))}</td><td><a href="/bundle/{html.escape(m['id'])}">ZIP</a></td></tr>''' for m in charts)
    if not rows:
        rows = '<tr><td colspan="3">Nenhum mapa salvo.</td></tr>'
    notes = html.escape(c.get('notes','')).replace('\n','<br>')
    return _shell(f"Consulente — {c.get('name','')}", f'''<div class="top"><a href="/clients">← Consulentes</a><a href="/history">Histórico</a><a href="/">Novo mapa</a></div><h1>{html.escape(c.get('name',''))}</h1><p class="muted">Nascimento: {html.escape(str(c.get('birth_date','') or ''))}</p><p><b>E-mail:</b> {html.escape(c.get('email','') or '—')}<br><b>Telefone:</b> {html.escape(c.get('phone','') or '—')}</p><p><b>Observações internas</b><br>{notes or '—'}</p><h2>Mapas salvos</h2><table><thead><tr><th>Gerado em</th><th>Local</th><th>Exportar</th></tr></thead><tbody>{rows}</tbody></table>''')


def _load_chart(chart_id: str, mode: str) -> dict:
    filename = 'classic.json' if mode == 'classic' else 'modern.json'
    return json.loads(chart_path(chart_id, filename).read_text(encoding='utf-8'))


class Handler(BaseHTTPRequestHandler):
    def _send(self, body: bytes, status=200, content_type="text/html; charset=utf-8", extra_headers=None):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        for key, value in (extra_headers or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        qs = parse_qs(parsed.query)
        if path == "/":
            self._send(FORM_HTML.encode('utf-8')); return
        if path == "/health":
            self._send(json.dumps({"ok": True, "version": VERSION}).encode('utf-8'), content_type="application/json"); return
        if path == "/settings":
            self._send(settings_page(qs.get('saved',[''])[0] == '1')); return
        if path == "/history":
            self._send(history_page(qs.get('q',[''])[0])); return
        if path == "/clients":
            self._send(clients_page(qs.get('q',[''])[0])); return
        if path.startswith("/client/"):
            cid = path.split('/', 2)[2]
            try:
                self._send(client_page(cid))
            except Exception:
                self._send(b"Not found", 404, "text/plain; charset=utf-8")
            return
        if path.startswith("/report/"):
            cid = path.split("/", 2)[2]
            try:
                self._send(chart_path(cid, "report.html").read_bytes())
            except Exception:
                self._send(b"Not found", 404, "text/plain; charset=utf-8")
            return
        if path.startswith('/print/'):
            parts = path.split('/')
            if len(parts) == 4 and parts[3] in ('classic','modern'):
                _, _, cid, mode = parts
                try:
                    chart = _load_chart(cid, mode)
                    title = 'Mapa Natal — Clássico Vega' if mode == 'classic' else 'Mapa Natal — Precisão Atual'
                    subtitle = 'Compatibilidade com o cálculo tradicional.' if mode == 'classic' else 'Efemérides astronômicas modernas com o mesmo perfil interpretativo.'
                    self._send(render_print_report_html(chart, title, subtitle, branding=_branding()).encode('utf-8'))
                except Exception as exc:
                    self._send(error_page(str(exc)), 400)
                return
        if path.startswith('/bundle/'):
            cid = path.split('/',2)[2]
            try:
                data = export_chart_zip(cid)
                self._send(data, content_type='application/zip', extra_headers={'Content-Disposition': f'attachment; filename="astro-vega-{cid}.zip"'})
            except Exception:
                self._send(b"Not found", 404, "text/plain; charset=utf-8")
            return
        if path.startswith("/download/"):
            parts = path.split("/")
            if len(parts) == 4:
                _, _, cid, filename = parts
                try:
                    data = chart_path(cid, filename).read_bytes()
                    self._send(data, content_type="application/json; charset=utf-8", extra_headers={"Content-Disposition": f'attachment; filename="{filename}"'})
                    return
                except Exception:
                    pass
            self._send(b"Not found", 404, "text/plain; charset=utf-8"); return
        self._send(b"Not found", 404, "text/plain; charset=utf-8")

    def do_POST(self):
        if self.path == "/settings":
            try:
                n = int(self.headers.get('Content-Length', '0'))
                data = parse_qs(self.rfile.read(n).decode('utf-8'))
                g = lambda k, default='': data.get(k, [default])[0]
                cur = get_settings()
                save_settings({
                    "app": {"name": g("app_name").strip() or cur["app"]["name"], "tagline": g("tagline").strip()},
                    "practitioner": {"name": g("practitioner_name").strip(), "title": g("professional_title").strip(), "email": g("practitioner_email").strip(), "phone": g("practitioner_phone").strip(), "footer_text": g("footer_text").strip()},
                    "calculation": {
                        "parallel_orb": float(g("parallel_orb") or 1),
                        "aspect_orbs": {k: float(g(k)) for k in ("conjunction","opposition","trine","square","sextile")},
                        "house_orbs": {"angular": float(g("house_angular")), "other": float(g("house_other"))},
                    },
                })
                self.send_response(303); self.send_header("Location", "/settings?saved=1"); self.end_headers(); return
            except Exception as exc:
                self._send(error_page(str(exc)), 400); return
        if self.path != "/calculate":
            self._send(b"Not found", 404, "text/plain; charset=utf-8"); return
        try:
            n = int(self.headers.get('Content-Length', '0'))
            data = parse_qs(self.rfile.read(n).decode('utf-8'))
            g = lambda k, default='': data.get(k, [default])[0]
            name, date, local_time = g('name').strip(), g('date'), g('time')
            loc = resolve_location(
                g('location'), date, local_time,
                timezone_name=g('timezone').strip() or None,
                latitude=_float(g('latitude')), longitude=_float(g('longitude')),
                state_or_uf=g('state').strip() or None,
                country=g('country').strip() or None,
            )
            subject = Subject(
                name=name, date=date, local_time=local_time,
                utc_offset_hours=loc.utc_offset_hours,
                latitude=loc.latitude, longitude=loc.longitude,
                location_name=loc.display_name,
                legacy_latitude=_float(g('legacy_latitude')),
                legacy_longitude=_float(g('legacy_longitude')),
                classic_hsl_hours=_hsl(g('classic_hsl')),
            )
            classic = VegaClassicEngine(strict_chiron=False).calculate(subject)
            modern = ModernSwissEngine(strict_chiron=False).calculate(subject)
            classic['location_resolution'] = loc.to_dict()
            modern['location_resolution'] = loc.to_dict()
            comp = compare_charts(classic, modern)
            report = render_dual_report_html(classic, modern, comp, branding=_branding())
            insertion = f'''<div class="report-actions" style="max-width:1450px;margin:14px auto 0;padding:0 20px;display:flex;gap:14px;align-items:center;flex-wrap:wrap"><a href="/" style="color:#1d4ed8;text-decoration:none">← Novo mapa</a><a href="/history" style="color:#1d4ed8;text-decoration:none">Histórico</a><a href="/clients" style="color:#1d4ed8;text-decoration:none">Consulentes</a><a href="/settings" style="color:#1d4ed8;text-decoration:none">Configurações</a><span style="color:#64748b">Local: {html.escape(loc.display_name)} • {loc.latitude:.5f}, {loc.longitude:.5f} • {html.escape(loc.timezone_name)} • UTC {loc.utc_offset_hours:+g}</span></div>'''
            report = report.replace('</header>', '</header>' + insertion, 1)
            profile = {'email': g('email').strip(), 'phone': g('phone').strip(), 'notes': g('notes')}
            meta = save_chart_bundle(classic, modern, comp, report, profile=profile)
            saved_note = f'''<div style="max-width:1450px;margin:8px auto 0;padding:0 20px;color:#64748b;font-size:13px">Salvo no histórico: <a href="/report/{html.escape(meta['id'])}">{html.escape(meta['id'])}</a> · <a href="/client/{html.escape(meta['client_id'])}">Perfil do consulente</a> · <a href="/print/{html.escape(meta['id'])}/classic">Imprimir clássico</a> · <a href="/print/{html.escape(meta['id'])}/modern">Imprimir atual</a> · <a href="/bundle/{html.escape(meta['id'])}">Exportar ZIP</a></div>'''
            report = report.replace(insertion, insertion + saved_note, 1)
            chart_path(meta['id'], 'report.html').write_text(report, encoding='utf-8')
            self._send(report.encode('utf-8'))
        except Exception as exc:
            self._send(error_page(str(exc)), 400)

    def log_message(self, format, *args):
        print(f"[Astro Vega] {self.address_string()} - {format % args}")


def run(open_browser=True):
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    url = f"http://{HOST}:{PORT}/"
    print(f"Astro Vega aberto em {url}")
    print("Pressione Ctrl+C para encerrar.")
    if open_browser:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    run()
