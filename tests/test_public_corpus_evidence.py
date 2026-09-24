import json
from pathlib import Path
import pytest
from astro_engine import Subject, VegaClassicEngine, SIGNS

ROOT = Path(__file__).resolve().parents[1]
CASES = [
    ROOT/'corpus'/'natalia_public_vega.v1.json',
    ROOT/'corpus'/'gabrielle_public_vega.v1.json',
    ROOT/'corpus'/'karla_public_vega.v1.json',
]
KEYS = {'Ascendant':'ASC','Midheaven':'MC'}

def load_case(path):
    return json.loads(path.read_text(encoding='utf-8'))

def subject_from_fixture(f):
    b=f['birth_input']
    return Subject(f['id'], b['date'], b['time']+(':00' if b['time'].count(':')==1 else ''),
                   b['utc_offset_hours'], b['latitude_deg'], b['longitude_deg'], b.get('location',''))

@pytest.mark.parametrize('path', CASES, ids=lambda p:p.stem)
def test_public_vega_partial_evidence(path):
    f=load_case(path)
    assert f['do_not_infer_missing_expected_values'] is True
    chart=VegaClassicEngine(strict_chiron=False).calculate(subject_from_fixture(f))
    for label, expected_sign in f.get('observed',{}).get('signs',{}).items():
        key=KEYS.get(label,label)
        assert SIGNS[chart['points'][key]['sign_index']] == expected_sign, (f['id'],label)
    for tr in f.get('observed',{}).get('interpretive_house_transitions',[]):
        p=chart['points'][tr['body']]
        assert p['house_geometric'] == tr['mathematical_house'], (f['id'],tr['body'],'geometric')
        assert p['house_interpretive'] == tr['interpreted_house'], (f['id'],tr['body'],'interpretive')
