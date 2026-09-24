# Real WASM validation gate — V1.2

Antigravity must preserve the three consultation profiles: Classic Vega, Current Precision, and Comparative.

Before production deployment:

```bash
cd web
npm install
npm run test:all
npm run test:wasm-real
```

`test:wasm-real` is intentionally separate from mock/provider contract tests. It initializes the actual `@swisseph/browser` package and calls the production `SwissWasmAstronomyProvider`.

Do not weaken tolerances or alter the validated Vega/Good Luck rules to make a dependency pass. Investigate discrepancies first.

The current repository contains a complete machine-readable golden case for Sergio. The historical reverse-engineering corpus used to derive the rules was not fully serialized into this repository; reconstruct it as provenance-bearing fixtures before representing that the full corpus has been rerun by the web engine.
