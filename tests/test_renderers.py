from astro_engine import Subject, VegaClassicEngine, ModernSwissEngine, compare_charts
from renderers import render_wheel_svg, render_aspect_matrix_svg, render_dual_report_html


def subject():
    return Subject(
        name="Sergio Monte Santo Andrade",
        date="1989-01-23",
        local_time="10:55:00",
        utc_offset_hours=-3,
        latitude=-(1 + 27/60),
        longitude=-(48 + 30/60),
        location_name="Belém/PA, Brasil",
        classic_hsl_hours=18 + 52/60 + 24/3600,
    )


def test_svg_renderers_have_expected_content():
    c = VegaClassicEngine(strict_chiron=False).calculate(subject())
    wheel = render_wheel_svg(c)
    matrix = render_aspect_matrix_svg(c)
    assert wheel.startswith('<svg')
    assert 'Clássico Vega' in wheel
    assert 'Quadro de Aspectos' in matrix
    assert '☉' in matrix


def test_dual_html_contains_tabs():
    s = subject()
    c = VegaClassicEngine(strict_chiron=False).calculate(s)
    m = ModernSwissEngine(strict_chiron=False).calculate(s)
    comp = compare_charts(c, m)
    html = render_dual_report_html(c, m, comp)
    assert 'Clássico Vega' in html
    assert 'Precisão Atual' in html
    assert 'Comparativo' in html
    assert 'sergio' not in html.lower() or 'Sergio' in html


def test_print_report_is_a4_ready():
    from renderers import render_print_report_html
    c = VegaClassicEngine(strict_chiron=False).calculate(subject())
    page = render_print_report_html(c, 'Mapa Natal — Clássico Vega')
    assert '@page' in page
    assert 'size:A4' in page
    assert 'Imprimir / Salvar em PDF' in page
    assert 'Quadro de Aspectos' in page
