# Public corpus recovery V1.4

V1.4 upgrades three historical reverse-engineering cases from research notes to source-backed public Vega evidence.

Recovered cases:
- Natalia Braga Iannone — 1990-09-21 10:31, Sao Paulo; Horoscopo Virtual Vega Plus PDF.
- Gabrielle Domingos Felix — 1987-11-01 04:30, Sao Paulo, -02:00 daylight-saving notation; Vega Plus Online report.
- Karla Cristina Dossi Joao — 2005-03-20 13:20, Vila Velha/ES; Vega Plus Online report.

These are intentionally `public_evidence_partial`, not `golden_complete`: the public interpretation reports expose birth inputs, signs/houses and explicit cusp-orb transition statements, but not a complete exact longitude/cusp table. Missing numerical values MUST NOT be reconstructed from the implementation under test and relabeled as Vega observations.

The recovered transition statements are especially useful because they independently preserve the behavior used to infer Vega's interpretive cusp-orb rule. The frozen compatibility rule remains 10 degrees before angular cusps (1/4/7/10) and 5 degrees before the other cusps.

Required consultation profiles remain immutable:
1. `vega_classic`
2. `modern_swiss`
3. `comparative` (comparison of the first two, not a third ephemeris)

Bolsonaro remains `pending_source_recovery`; the historical conclusion about the fixed Part of Fortune formula remains a research finding, but no public fixture is promoted until its source report is recovered.
