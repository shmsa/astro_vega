# Astro Vega — Validation Status V1.6

## Decision
V1.6 is the astronomical pre-release gate. The validated Vega/Good Luck rules remain frozen. The three consultation profiles are mandatory: Classic Vega, Current Precision, Comparative.

## Executed in this environment
- Python reference/corpus suite: 16/16 PASS.
- TypeScript pure-math golden suite: 86/86 PASS.
- Three-profile contract suite: 11/11 PASS.
- AstronomyProvider contract suite: 18/18 PASS.
- TypeScript pipeline import defect found during full preflight and corrected in V1.6.

## Real WASM gate
`@swisseph/browser` 1.3.1 is the pinned browser provider candidate. A real execution harness exists at `web/tests/real-wasm-golden.mjs` and is invoked with `npm run test:wasm-real`.

The package could not be installed in the current execution environment: `npm install --no-audit --no-fund` timed out. Therefore real WASM status is **BLOCKED BY ENVIRONMENT**, not PASS and not mathematical FAIL. No numerical result was fabricated.

## Release rule
V1.7 may be marked FINAL/RC only after, in a network-enabled Node environment:
1. `npm ci` or `npm install` succeeds;
2. `npm run test:all` passes;
3. `npm run test:wasm-real` passes;
4. `npm run typecheck` passes;
5. `npm run build` passes;
6. any WASM residual beyond the frozen tolerance is investigated, never hidden by changing the validated astrology profile.

## Licensing gate
The selected `@swisseph/browser` package is AGPL-3.0 and Swiss Ephemeris itself has AGPL/commercial licensing. Before a closed-source or commercial production deployment, the owner must choose an AGPL-compatible distribution model or obtain the applicable commercial licensing. This is a production/legal deployment gate, not an astronomy-rule change.
