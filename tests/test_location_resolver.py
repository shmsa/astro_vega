from location_resolver import historical_utc_offset_hours, infer_brazil_timezone, resolve_location


def test_belem_historical_offset_1989():
    assert infer_brazil_timezone('PA') == 'America/Belem'
    assert historical_utc_offset_hours('1989-01-23', '10:55:00', 'America/Belem') == -3.0


def test_manual_location_resolution_without_network():
    r = resolve_location(
        'Belém, PA, Brasil', '1989-01-23', '10:55:00',
        latitude=-1.45, longitude=-48.50, timezone_name='America/Belem',
        state_or_uf='PA', country='Brasil'
    )
    assert r.latitude == -1.45
    assert r.longitude == -48.50
    assert r.timezone_name == 'America/Belem'
    assert r.utc_offset_hours == -3.0
