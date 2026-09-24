# Vega reverse-engineering corpus

This directory is the permanent audit corpus for the Vega/Good Luck compatibility profile.

A case is **machine-validatable** only when it contains enough source evidence to reconstruct both the birth input and the expected Vega output. Historical cases mentioned during research but not preserved with complete source values must remain `pending_source_recovery`; they must never be fabricated from modern ephemerides.

## Required profiles
Every accepted case is evaluated through:
1. `vega_classic` — compatibility calculation.
2. `modern_swiss` — current-precision calculation.
3. `comparative` — deterministic comparison of the two results.

## Provenance levels
- `primary_archive`: original/archived Vega report supplied or preserved.
- `public_vega_report`: public Vega-generated report with enough fields to audit.
- `official_documentation`: Sadhana/Vega documentation; validates software capabilities/settings, not a person's expected chart values.
- `research_note`: conclusion from earlier reverse engineering whose raw chart source still needs recovery.

Never regenerate an expected Vega value from Swiss/Moshier and label it historical evidence.

## V1.4 source-backed partial fixtures
Natalia, Gabrielle and Karla are now preserved as `public_evidence_partial`. This status is deliberately weaker than `golden_complete`: it permits regression checks only for facts explicitly visible in the public Vega report (birth input, reported sign/house facts, and cusp-transition statements). It does not permit synthesizing missing exact Vega longitudes or cusps.
