# START HERE — Astro Vega V1.7

This folder is the final engineering handoff candidate for Google Antigravity.

## First command

```bash
./scripts/antigravity_bootstrap.sh
```

This installs web dependencies and executes the full acceptance gate.

## Read in this order

1. `handoff/FINAL_RELEASE_READINESS_V1_7.md`
2. `validation/ACCEPTANCE_MATRIX_V1_5.md`
3. `handoff/VALIDATION_FREEZE_V1_5.md`
4. `handoff/ASTRONOMY_PREFLIGHT_V1_6.md`
5. `handoff/ANTIGRAVITY_HANDOFF.md`
6. `supabase/README.md`

## Non-negotiable product behavior
The UI must expose all three profiles:

- Clássico Vega
- Precisão Atual
- Comparativo

The comparative profile is derived from the first two and must never become a third astronomical calculation method.

## If a test fails
Do not “fix” a frozen orb, house rule, Node/Lilith choice, Fortune formula or scoring rule to fit a new library. Diagnose the backend implementation.
