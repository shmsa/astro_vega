# Validation Freeze V1.5

V1.5 is the deterministic compatibility freeze before real-WASM validation.

Do not reinterpret or tune the frozen Vega rules during the Antigravity port. The three consultation profiles are mandatory: Classic Vega, Current Precision, Comparative. Comparative is a derived comparison of the first two, never a third ephemeris.

Public partial fixtures are evidence tests, not synthetic golden masters. Missing historical longitudes/cusps must never be filled from the implementation being tested.

A timezone normalization bug was corrected in the Natalia fixture: Vega's printed Brazilian convention `+03:00` denotes three hours west of Greenwich; the software contract uses `utc_offset_hours=-3`. The original notation remains preserved as `source_timezone_notation`.

Acceptance matrix: `validation/ACCEPTANCE_MATRIX_V1_5.md`.
Next gate: V1.6 real `@swisseph/browser` execution against preserved goldens and Python reference.
