# Astro Vega — Acceptance Matrix V1.5

This matrix freezes the compatibility rules that must survive the Antigravity migration. A future library result never overrides these rules merely to make a test pass.

| Area | Frozen requirement | Evidence / gate | Status V1.5 |
|---|---|---|---|
| Profiles | `vega_classic`, `modern_swiss`, `comparative` | profile contract | PASS |
| Zodiac | Tropical, geocentric | reverse-engineering corpus | FROZEN |
| Houses | Topocentric / Polich-Page (`T`) | archived/public Vega evidence | FROZEN |
| Classic planets | Moshier request for Sun–Pluto | compatibility architecture | FROZEN |
| Node | Mean North Node | Vega evidence/configuration | FROZEN |
| Lilith | Mean lunar apogee | Vega evidence/configuration | FROZEN |
| Chiron | Swiss asteroid ephemeris when available | explicit profile requirement | FROZEN |
| Fortune | ASC + Moon − Sun, day and night | night-chart reverse engineering | FROZEN |
| Lunar phase | 4 x 90° Moon−Sun quadrants | reverse engineering | FROZEN |
| Zodiac aspects | 9/8/7/6/4° conj/opp/tri/sqr/sex | Vega configuration evidence | FROZEN |
| Declination | parallel / contra-parallel, 1° orb | matrix reverse engineering | FROZEN |
| Interpretive houses | 10° before angular cusps, 5° before others | Natalia/Gabrielle/Karla evidence | EXECUTABLE PASS |
| Scoring | Sun/Moon/ASC/MC=2; Mercury–Pluto=1; others=0 | exact Sergio reproduction | EXECUTABLE PASS |
| Display | nearest arcminute | historical output comparison | FROZEN |
| Classic HSL | archived HSL may override calculated HSL, auditable | Sergio archive | EXECUTABLE PASS |
| Modern | Swiss Ephemeris + modern sidereal/house path | golden contract | READY FOR REAL-WASM GATE |
| Comparative | derived only from Classic vs Modern | comparison contract | PASS |

## Source notation warning
Historical Vega Brazilian reports may print `Fuso +03:00` to mean **3 hours west of Greenwich**. Internal application contracts use ISO-style UTC offsets, therefore that source notation is normalized to `utc_offset_hours = -3`. The source notation is preserved separately in corpus fixtures.

## Release rule
V1.5 closes the deterministic/reverse-engineered rule gate. V1.6 must execute the real WASM numerical gate. V1.7 may be called Release Candidate only if all deterministic tests, real-WASM tests, TypeScript build/typecheck, contracts and three-profile checks pass with no unexplained numerical divergence.
