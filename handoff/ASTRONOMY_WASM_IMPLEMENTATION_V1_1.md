# Astronomy WASM implementation — V1.1

This version implements the browser astronomy adapter while preserving the three consultation profiles:

1. **Clássico Vega** — Moshier for major planets, Mean Node, Mean Apogee, Swiss Chiron, Polich/Page houses driven by validated legacy HSL/ARMC. If an archived HSL is supplied it has precedence.
2. **Precisão Atual** — Swiss Ephemeris files for planets/points/Chiron and current Polich/Page house calculation.
3. **Comparativo** — executes both engines and compares results using the already validated deterministic layer. It is not a third independent ephemeris.

## Important implementation detail: classic ARMC in the browser

`@swisseph/browser` exposes `calculateHouses(jd, lat, lon, HouseSystem.PolichPage)` but its documented high-level API does not expose `houses_armc`.

The adapter therefore reproduces the exact target ARMC without inventing a correction:

- calculate Greenwich ARMC at the same JD with longitude 0;
- derive a synthetic longitude `targetARMC - greenwichARMC`;
- call the same Polich/Page Swiss house routine using that synthetic longitude.

Because house cusps are a function of ARMC, latitude and obliquity, this is a coordinate transformation equivalent to supplying the desired local sidereal rotation to the house routine.

## Frozen astronomical selections

- Tropical zodiac
- Geocentric positions
- Mean North Node (body id 10)
- Mean Lunar Apogee/Lilith (body id 12)
- Chiron (body id 15)
- Polich/Page Topocentric houses (`T`)
- Classic major planets: Moshier flag
- Modern: Swiss Ephemeris flag
- Equatorial second pass for declination
- Speed enabled for retrogradation and applying/separating aspects

Do not replace Mean Node with True Node or Mean Apogee with Osculating Apogee.
Do not replace Polich/Page with a similarly named topocentric coordinate flag.

## Runtime package

Target package: `@swisseph/browser` 1.3.x or a validated pinned successor.
Before final production release, pin the exact package version and rerun the full differential corpus.

## Chiron

Moshier does not provide Chiron. Classic mode deliberately uses Swiss asteroid data for Chiron only. This mirrors the Python reference behavior and prevents silent omission.

## Acceptance gates before production

The real WASM runtime must be run against the full reverse-engineering corpus used to validate the Vega/Good Luck profile. Passing unit mocks is necessary but not sufficient.

No rule may be changed merely to make a new package pass. A discrepancy means: investigate input/timezone/coordinate precision, wrapper behavior, or replace/patch the backend.
