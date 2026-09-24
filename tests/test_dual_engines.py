from astro_engine import (
    Subject,
    VegaClassicEngine,
    ModernSwissEngine,
    compare_charts,
    round_arcminute,
)


def sergio():
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


def test_classic_reproduces_archived_angles_from_hsl():
    c = VegaClassicEngine(strict_chiron=False).calculate(sergio())
    assert round_arcminute(c["points"]["ASC"]["longitude"]) == (0, 14, 5)
    assert round_arcminute(c["points"]["MC"]["longitude"]) == (9, 12, 3)
    assert abs(c["house_calculation"]["hsl_hours"] - (18 + 52/60 + 24/3600)) < 1e-12


def test_modern_preserves_modern_angles():
    m = ModernSwissEngine(strict_chiron=False).calculate(sergio())
    assert round_arcminute(m["points"]["ASC"]["longitude"]) == (0, 14, 7)
    assert round_arcminute(m["points"]["MC"]["longitude"]) == (9, 12, 5)


def test_comparison_detects_angle_differences_but_same_scores():
    s = sergio()
    c = VegaClassicEngine(strict_chiron=False).calculate(s)
    m = ModernSwissEngine(strict_chiron=False).calculate(s)
    comp = compare_charts(c, m)
    assert comp["points"]["ASC"]["same_display_minute"] is False
    assert comp["points"]["MC"]["same_display_minute"] is False
    assert comp["scores_equal"] is True
    assert comp["lunar_phase_equal"] is True
