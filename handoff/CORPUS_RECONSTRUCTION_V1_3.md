# Corpus reconstruction gate — V1.3

The reverse-engineering conclusions are frozen, but historical expected values are accepted only when their original Vega evidence is recoverable. V1.3 introduces `corpus/corpus-index.v1.json` and `validation/validate_corpus.py`.

## Non-negotiable rule
Do not synthesize a historical Vega expected result with Swiss Ephemeris, Moshier, Astro Vega, or another calculator. The implementation under test cannot manufacture its own oracle.

## Three consultation profiles
Every complete corpus case must remain compatible with the application contract: `vega_classic`, `modern_swiss`, and `comparative`. Comparative is a comparison profile, not an independent ephemeris.

## Current state
- Sergio 1989: complete golden fixture.
- Bolsonaro, Natalia, Gabrielle, Karla: indexed research evidence, pending recovery of enough original source fields to become machine-validatable.
- Additional cases from the earlier research should be added only as their source reports are recovered.

## Acceptance
Run `python validation/validate_corpus.py`, the Python reference tests, TypeScript golden tests, provider tests, and the real-WASM gate when the package/runtime is available. No compatibility constant may be changed solely to make a new library pass.
