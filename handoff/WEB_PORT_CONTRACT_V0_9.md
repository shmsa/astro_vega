# Web Port Contract V0.9 — Pure Math Parity

This version begins the mathematical port from Python to TypeScript while deliberately excluding ephemerides and house astronomy.

## Status

The following deterministic rules now exist in both Python and TypeScript and are covered by a golden cross-language test:

- angle normalization (`norm360`)
- angular distance
- signed shortest angular delta
- zodiac sign indexing
- nearest-arcminute rounding
- Portuguese zodiac formatting
- geometric house assignment from 12 precomputed cusps
- interpretive-house rule (10° angular / 5° other cusps)
- four-quadrant lunar phase
- Part of Fortune = ASC + Moon - Sun
- major-aspect detection with Vega/Good Luck orbs
- applying/separating approximation based on longitude speed
- parallel / contra-parallel detection
- element / modality / polarity scoring
- complete major-aspect list generation
- complete declination-aspect list generation
- classic-vs-modern comparison logic

## Golden parity suite

Run inside `web/`:

```bash
npm run test:math
```

The V0.9 reference run produces:

```text
TypeScript pure-math golden suite: 86 assertions passed.
```

The suite consumes the immutable Python-produced fixtures in `/golden` and verifies that the TypeScript implementation reproduces the same derived behavior.

## What is intentionally NOT ported yet

Do not invent or replace these pieces in TypeScript yet:

- planetary ephemerides
- Chiron ephemeris handling
- mean node / mean apogee astronomy
- topocentric Polich/Page cusp astronomy
- modern Swiss sidereal time
- classic Vega sidereal-time path
- historical timezone/location resolution

Those remain authoritative in Python until the next port phase has an explicitly validated astronomy backend.

## Source of truth order

1. Golden fixtures in `/golden`
2. Python `astro_engine.py`
3. `VEGA_GOODLUCK_PROFILE_V1`
4. TypeScript `math.ts`

If TypeScript and Python disagree, do not "fix" the fixtures. Diagnose the implementation and document any intentional schema change before updating a golden fixture.

## Compatibility requirement

A future browser calculation pipeline may call an astronomy provider to obtain raw longitudes, declinations, speeds, ASC/MC and 12 cusps. Once those raw values exist, all downstream interpretation should use the pure TypeScript functions in `web/src/lib/astrology/math.ts`.

This isolates the hard astronomical backend from the already-validated Vega/Good Luck interpretation rules.
