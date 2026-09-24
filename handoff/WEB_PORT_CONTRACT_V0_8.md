# V0.8 — Contrato de portabilidade Python → Next.js/Supabase

Esta versão congela o contrato público antes da migração. O objetivo é impedir que um agente de código altere silenciosamente a matemática durante o redesenho.

## Ordem obrigatória de migração

1. Copiar `web/src/lib/astrology/contracts.ts` e `profile.ts`.
2. Fazer o app Next.js consumir os fixtures em `golden/` sem calcular nada.
3. Reproduzir roda, matriz, tabelas e comparativo usando somente os fixtures.
4. Integrar Supabase Auth/RLS e persistir snapshots JSONB `schema_version=1`.
5. Somente então portar o motor matemático, módulo por módulo.
6. A implementação TypeScript deve ser comparada contra Python em golden tests.

## Invariantes numéricos

- longitudes internas não são arredondadas;
- apresentação arredonda ao minuto mais próximo;
- normalização angular usa [0,360);
- diferença angular usa o menor arco;
- clássico e moderno permanecem motores separados;
- não aplicar offsets mágicos para copiar relatórios antigos;
- HSL histórica, quando conhecida, é uma entrada auditável do modo clássico.

## Supabase

- `classic_result`, `modern_result`, `comparison_result` são snapshots imutáveis do cálculo daquela sessão;
- `schema_version` acompanha o contrato JSON;
- RLS por `owner_id = auth.uid()` é obrigatório;
- browser usa apenas anon key;
- service role não participa do CRUD cotidiano;
- `updated_at` é mantido por trigger no banco;
- notas/e-mail/telefone não são enviados a geocodificadores.

## Autenticação recomendada

Para presente/uso individual, magic link por e-mail é suficiente. Se o produto crescer, adicionar OAuth ou senha sem mudar o modelo de propriedade dos dados.

## Critério de aceite da porta TypeScript

Para o fixture de Sérgio:

- pontuação: Fogo 4, Terra 8, Ar 3, Água 1;
- modalidades: Cardeal 8, Fixo 8, Mutável 0;
- polaridades: Ativo 7, Receptivo 9;
- clássico: ASC ~14°05' Áries e MC ~12°03' Capricórnio quando HSL arquivada é fornecida;
- moderno: ASC ~14°07' Áries e MC ~12°05' Capricórnio no dataset atual;
- comparador detecta as diferenças de cúspides e aspecto limítrofe já registradas no golden fixture.
