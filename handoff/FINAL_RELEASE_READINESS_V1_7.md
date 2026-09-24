# Astro Vega V1.7 — Final Release Readiness

## Purpose
This is the final handoff candidate for Google Antigravity. The project has three mandatory consultation profiles:

1. `vega_classic` — Classic Vega compatibility profile.
2. `modern_swiss` — Modern astronomical precision profile.
3. `comparative` — deterministic comparison of Classic vs Modern; never a third ephemeris.

## Frozen mathematics
Do not change these values to satisfy a library:

- Tropical zodiac, geocentric planetary positions.
- Topocentric / Polich-Page houses (`T`).
- Mean North Node.
- Mean lunar apogee / Lilith.
- Chiron enabled.
- Part of Fortune = `ASC + Moon - Sun` for day and night.
- Major aspect orbs: conjunction 9°, opposition 8°, trine 7°, square 6°, sextile 4°.
- Interpretive cusp orbs: 10° before angular cusps (1/4/7/10), 5° before all others.
- Parallel / contra-parallel supported, default 1°.
- Scores: Sun/Moon/ASC/MC = 2; Mercury through Pluto = 1; Node/Lilith/Chiron/Fortune = 0.
- Lunar phase = four 90° Moon-Sun quadrants.
- Display rounding = nearest arcminute.
- Archived Classic HSL may be supplied as an auditable compatibility input.

## Mandatory gate
Run from repository root:

```bash
./scripts/antigravity_bootstrap.sh
```

or, after dependencies are installed:

```bash
./scripts/final_acceptance.sh
```

A release is accepted only when all stages return PASS:

1. Python reference/corpus tests.
2. Corpus structural validation.
3. TypeScript deterministic, three-profile and provider tests.
4. Real `@swisseph/browser` WASM numerical test.
5. TypeScript typecheck.
6. Next.js production build.

## Current environment limitation
The preparation environment could not complete `npm install @swisseph/browser` because package installation timed out. This is an infrastructure/network block, not a mathematical PASS. Therefore **do not label real WASM as validated until `npm run test:wasm-real` executes successfully in Antigravity/CI**.

## Failure policy
If real WASM differs from the frozen profile:

- STOP.
- Preserve the failing report.
- Determine whether the wrapper flags, ephemeris files, UTC conversion, house API, ARMC/HSL transformation or version is wrong.
- Do not alter frozen Vega/Good Luck rules to make the library pass.

## Production architecture
- Netlify: Next.js hosting/runtime.
- Supabase Auth + Postgres + RLS: practitioner, clients, charts and settings.
- No service role key in the browser.
- Persist `classic_result`, `modern_result`, `comparison_result` as versioned JSONB snapshots.

## Licensing gate
Before production distribution, decide Swiss Ephemeris / wrapper licensing. Do not assume a closed-source commercial deployment is automatically compatible with AGPL licensing.
