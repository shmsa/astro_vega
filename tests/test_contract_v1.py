import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(name):
    return json.loads((ROOT / 'golden' / name).read_text(encoding='utf-8'))


def test_chart_result_contract_v1():
    for name in ('sergio_classic.v1.json', 'sergio_modern.v1.json'):
        d = load(name)
        required = {'engine','subject','utc','julian_day_ut','settings','ascendant','midheaven','cusps','points','aspects','declination_aspects','scores','lunar_phase','warnings'}
        assert required <= set(d)
        assert len(d['cusps']) == 12
        assert d['engine']['id'] in {'vega_classic','modern_swiss'}
        assert d['settings']['house_system_code'] == 'T'
        assert d['settings']['aspect_orbs'] == {'conjunction':9.0,'sextile':4.0,'square':6.0,'trine':7.0,'opposition':8.0}
        assert d['settings']['house_cusp_orbs'] == {'angular':10.0,'other':5.0}


def test_comparison_contract_v1():
    d = load('sergio_comparison.v1.json')
    assert {'subject','classic_engine','modern_engine','points','cusps','aspect_changes','scores_equal','lunar_phase_equal'} <= set(d)
    assert len(d['cusps']) == 12
    assert set(d['aspect_changes']) >= {'classic_only','modern_only','same_count'}
