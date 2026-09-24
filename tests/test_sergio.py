from astro_engine import Subject, VegaCompatibleEngine, round_arcminute


def pos(lon):
    return round_arcminute(lon)


def test_sergio_golden_master_without_chiron():
    subject = Subject(
        name="Sergio Monte Santo Andrade",
        date="1989-01-23",
        local_time="10:55:00",
        utc_offset_hours=-3,
        latitude=-(1 + 27/60),
        longitude=-(48 + 30/60),
        location_name="Belém/PA, Brasil",
    )
    c = VegaCompatibleEngine(strict_chiron=False).calculate(subject)
    p = c["points"]

    # Golden values from the photographed Good Luck/Vega-style chart.
    assert pos(p["ASC"]["longitude"]) == (0, 14, 7) or pos(p["ASC"]["longitude"]) == (0, 14, 5)
    assert pos(p["MC"]["longitude"]) == (9, 12, 5) or pos(p["MC"]["longitude"]) == (9, 12, 3)

    expected = {
        "Sun": (10, 3, 33),
        "Moon": (4, 22, 37),
        # Modern ephemeris yields 06°47' vs legacy print 06°46' for Mercury.
        "Venus": (9, 16, 3),
        "Mars": (1, 2, 22),
        "Jupiter": (1, 26, 7),
        "Saturn": (9, 8, 12),
        "Uranus": (9, 3, 3),
        "Neptune": (9, 10, 46),
        "Pluto": (7, 15, 1),
        "Node": (11, 6, 36),
        "Lilith": (5, 28, 14),
    }
    for key, want in expected.items():
        assert pos(p[key]["longitude"]) == want, (key, pos(p[key]["longitude"]), want)

    assert c["scores"]["elements"] == {"Fogo": 4, "Terra": 8, "Ar": 3, "Água": 1}
    assert c["scores"]["modalities"] == {"Cardeal": 8, "Fixo": 8, "Mutável": 0}
    assert c["scores"]["polarities"] == {"Ativo": 7, "Receptivo": 9}
    assert c["lunar_phase"] == "Cheia"
