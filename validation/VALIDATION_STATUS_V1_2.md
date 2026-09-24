# Astronomy validation status — V1.2

## Frozen consultation profiles
1. `vega_classic` — classic Vega-compatible calculation.
2. `modern_swiss` — current-precision Swiss Ephemeris calculation.
3. `comparative` — executes both profiles and compares them; it is not a third ephemeris.

## What is already executable offline
- Python reference suite.
- TypeScript pure-math golden suite.
- Three-profile contract suite.
- WASM provider contract suite with deterministic injected runtime.

## Real WASM gate
`npm run test:wasm-real` now exists and calls the actual `@swisseph/browser` runtime through the production adapter. It writes `validation/real_wasm_sergio.json` and fails if the modern longitude/ASC/MC residual exceeds 1.1 arcmin against the frozen golden map.

The current build environment could not install `@swisseph/browser` because package installation timed out, so no real-WASM numerical result is claimed in V1.2. This is a hard validation gate, not silently skipped evidence.

## Corpus rule
The earlier reverse-engineering conclusions remain frozen, but only Sergio's complete machine-readable golden fixtures are currently present in this project directory. Do not claim a machine rerun of the earlier ~30-map research corpus until those source cases are reconstructed as auditable fixtures (birth input + Vega expected output + source provenance).

## Production acceptance
A production candidate must pass all three profiles and the real-WASM gate. The broader historical corpus should then be represented as fixtures and rerun; rules must not be changed merely to accommodate a library discrepancy.
