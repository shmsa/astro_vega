import json
import zipfile
from io import BytesIO
import storage


def test_storage_roundtrip(tmp_path, monkeypatch):
    charts = tmp_path / 'charts'; clients = tmp_path / 'clients'
    charts.mkdir(); clients.mkdir()
    monkeypatch.setattr(storage, 'DATA_DIR', charts)
    monkeypatch.setattr(storage, 'CLIENT_DIR', clients)
    c = {'subject': {'name':'Teste','date':'2000-01-01','local_time':'12:00','location_name':'Belém'}}
    meta = storage.save_chart_bundle(c, c, {'ok': True}, '<html>ok</html>', profile={'email':'teste@example.com','phone':'9999','notes':'nota'})
    assert storage.chart_path(meta['id'], 'report.html').exists()
    assert storage.list_charts()[0]['name'] == 'Teste'
    client = storage.get_client(meta['client_id'])
    assert client['email'] == 'teste@example.com'
    assert storage.list_clients(query='teste')[0]['chart_count'] == 1
    data = storage.export_chart_zip(meta['id'])
    with zipfile.ZipFile(BytesIO(data)) as zf:
        assert 'report.html' in zf.namelist()
        assert 'client.json' in zf.namelist()
        assert json.loads(zf.read('classic.json'))['subject']['name'] == 'Teste'
