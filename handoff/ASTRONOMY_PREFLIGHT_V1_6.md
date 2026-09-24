# Astronomy Preflight V1.6

Do not reinterpret the validated Vega profile. The three consultation profiles are immutable product behavior:
- `classic` → Classic Vega / engine `vega_classic`
- `modern` → Current Precision / engine `modern_swiss`
- `comparative` → runs both and compares them; it is not a third ephemeris.

## Exact commands for the network-enabled implementation environment
```bash
cd web
npm install
npm run test:all
npm run test:wasm-real
npm run typecheck
npm run build
```

If `test:wasm-real` fails numerically, preserve the golden fixtures and frozen rules. Diagnose wrapper flags, ephemeris file loading, UTC conversion, ARMC/HSL, house-system call, body IDs, or wrapper semantics. Do not introduce magic offsets.

## Known current-environment limitation
The package installation timed out here, so V1.6 deliberately does not claim a real-WASM PASS. The harness is ready for Antigravity/CI to execute.

## Source licensing
`@swisseph/browser` 1.3.1 is AGPL-3.0. Swiss Ephemeris is dual-licensed. Resolve licensing before proprietary/commercial deployment.
