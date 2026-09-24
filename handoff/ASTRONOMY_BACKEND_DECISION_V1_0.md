# Astronomy Backend Decision V1.0

## Non-negotiable compatibility target

The three consultation profiles are permanent:

1. **Clássico Vega** — historical compatibility.
2. **Precisão Atual** — modern astronomical precision.
3. **Comparativo** — runs both and compares them.

The interpretation rules are the already validated Vega/Good Luck profile and must not be changed to accommodate a library.

## Recommended web backend

Use Swiss Ephemeris compiled to WebAssembly, preferably through a maintained TypeScript wrapper that exposes:

- Moshier and Swiss ephemerides separately;
- Mean Node;
- Mean Lunar Apogee;
- Chiron with asteroid ephemeris data;
- equatorial declination and longitude speed;
- Polich/Page (`T`) houses;
- ASC, MC and ARMC.

Current candidate: `@swisseph/browser` (WASM) because it exposes Moshier by default, optional Swiss ephemeris data, Mean Node/Mean Apogee, Chiron, and Polich/Page. Before production, pin an exact package version and run the full differential test corpus.

## Profile mapping

### Clássico Vega

- Planet positions: **Moshier**.
- Historical house path: validated legacy GMST/HSL -> ARMC -> Polich/Page.
- If an archived Vega HSL is available, use it explicitly; never invent offsets.
- Output rounding: nearest arcminute.

### Precisão Atual

- Planet positions: **Swiss Ephemeris files**.
- House path: current Swiss sidereal time / Polich-Page.
- Same astrology profile after raw astronomy is calculated.

### Comparativo

- Execute both independently.
- Compare raw positions, ASC/MC, 12 cusps, geometric and interpretive houses, and aspect-set changes.
- Never average the two results.

## Acceptance gate

No astronomy adapter can become production-default merely because it compiles. It must pass the historical corpus used during reverse engineering plus the immutable golden fixtures. Any discrepancy must be investigated. Do not edit expected data to make a new library pass.

## Deployment recommendation

For Netlify + Supabase, prefer client-side WASM calculation or a WASM-capable server function. Supabase Edge Functions support WASM, but client-side calculation avoids native Node addon portability issues and keeps the same astronomy runtime across local and deployed builds.

## Licensing

Swiss Ephemeris and wrappers may impose AGPL/commercial licensing requirements. Resolve licensing before public/proprietary deployment.
