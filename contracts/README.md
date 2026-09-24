# Contratos públicos — Astro Vega v1

Esta pasta congela o formato de intercâmbio entre o motor Python de referência e a futura implementação TypeScript/Next.js.

Regras:

- `schema_version = 1` para snapshots persistidos no Supabase.
- mudanças incompatíveis exigem `schema_version = 2` e migração explícita;
- o Antigravity deve portar o contrato antes de portar a UI;
- JSONs em `golden/` são fixtures de regressão e não podem ser regravados automaticamente;
- campos numéricos astronômicos são armazenados em graus decimais com precisão integral; arredondamento para minuto é apenas de apresentação.

Arquivos:

- `chart-result.schema.json`: contrato dos resultados Clássico/Atual;
- `comparison-result.schema.json`: contrato do comparador;
- `supabase-record.schema.json`: envelope persistido na tabela `charts`.
