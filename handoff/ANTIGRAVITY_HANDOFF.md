# Astro Vega — Handoff para Google Antigravity / Netlify

Este repositório contém o motor de cálculo e o protótipo funcional local. O objetivo final é portar a aplicação para uma arquitetura web moderna, mantendo os resultados matemáticos validados pelo conjunto de testes.

## Objetivo do produto

Aplicação de mapa natal com três experiências:

1. **Clássico Vega** — compatibilidade com o comportamento histórico Vega/Good Luck.
2. **Precisão Atual** — cálculo astronômico moderno, preservando o mesmo perfil interpretativo.
3. **Comparativo** — diferenças entre os dois motores, inclusive ASC, MC, cúspides, posições, casas, aspectos e pontuações.

## Regras do perfil Vega/Good Luck já validadas

- Zodíaco tropical.
- Casas Topocêntricas / Polich-Page.
- Nodo Norte médio.
- Lilith = apogeu lunar médio.
- Fortuna = ASC + Lua - Sol, sem inversão noturna.
- Orbes maiores: conjunção 9°, oposição 8°, trígono 7°, quadratura 6°, sextil 4°.
- Casas interpretativas: 10° antes das cúspides angulares (1/4/7/10), 5° antes das demais.
- Pontuação: Sol/Lua/ASC/MC = 2; Mercúrio a Plutão = 1; Nodo/Lilith/Quíron/Fortuna = 0.
- Fases lunares por quadrantes de 90°.
- Paralelo/contraparalelo de declinação suportado; default de 1° configurável.
- Arredondamento visual ao minuto de arco mais próximo.

## Arquivos de referência

- `astro_engine.py`: motor e regras astrológicas.
- `renderers.py`: roda, matriz e relatório HTML.
- `location_resolver.py`: cidade, coordenadas, IANA timezone e offset histórico.
- `storage.py`: histórico local no protótipo.
- `tests/`: contrato matemático. **Não alterar os resultados esperados sem justificativa documentada.**

## Meta de migração para web

Recomendação: **Next.js + TypeScript** para facilitar execução no Netlify e manutenção pelo Antigravity.

Estrutura recomendada:

```text
src/
  app/
    page.tsx
    chart/[id]/page.tsx
    compare/page.tsx
  components/
    NatalWheel.tsx
    AspectMatrix.tsx
    ChartForm.tsx
    ComparisonTable.tsx
  lib/
    astrology/
      types.ts
      classic-engine.ts
      modern-engine.ts
      aspects.ts
      houses.ts
      scoring.ts
      fortune.ts
      lunar-phase.ts
    geo/
      geocode.ts
      timezone.ts
  server/
    functions/
      calculate.ts
      geocode.ts
```

## Requisito crítico

Portar primeiro o **contrato de dados**, depois a interface. Ambos os motores devem retornar o mesmo `ChartResult`.

Exemplo simplificado:

```ts
interface ChartResult {
  engine: 'classic' | 'modern';
  subject: Subject;
  bodies: Record<string, BodyPosition>;
  houses: HouseResult;
  aspects: Aspect[];
  declinationAspects: DeclinationAspect[];
  scores: Scores;
  lunarPhase: string;
  warnings: string[];
}
```

## Persistência

O protótipo usa arquivos JSON locais. Em produção no Netlify, trocar por armazenamento compatível com ambiente serverless. Opções possíveis:

- Netlify Blobs para histórico simples;
- banco externo (Supabase/Postgres) se houver autenticação, clientes e grande histórico;
- localStorage apenas se o histórico for deliberadamente restrito ao navegador.

Não depender de filesystem mutável em produção.

## Netlify

O projeto final deve incluir:

- `netlify.toml`;
- build reproduzível;
- variáveis de ambiente documentadas;
- nenhuma chave/token versionada;
- funções serverless para APIs que exijam segredo ou acesso externo;
- fallback de erro quando geocoding/timezone não puderem ser resolvidos.

A documentação atual do Netlify recomenda usar o contexto `https://netlify.ai` no Antigravity e, se desejado, conectar o Netlify MCP. Nunca colocar tokens do Netlify no repositório.

## Prompt inicial sugerido para Antigravity

> Abra este projeto como uma migração de protótipo científico para uma aplicação web de produção. Preserve integralmente os testes e regras matemáticas descritas em `handoff/ANTIGRAVITY_HANDOFF.md`. Converta gradualmente o motor para TypeScript, mantendo um golden test suite contra os JSONs e testes existentes. Use Next.js, gere uma interface responsiva com três abas (Clássico Vega, Precisão Atual, Comparativo) e prepare deploy no Netlify. Não altere regras astrológicas nem valores de orbe para simplificar implementação.

## Critério de aceite

A migração só está correta quando:

1. os golden tests passam;
2. o mapa de Sérgio mantém os valores esperados dentro das tolerâncias definidas;
3. o modo clássico e o modo atual continuam independentes;
4. a matriz e a roda são geradas a partir dos resultados, nunca hardcoded;
5. timezone histórico e localização são auditáveis;
6. o projeto faz build limpo no Netlify.

## Estado do protótipo V0.6

Além do cálculo e renderização, o protótipo agora possui um fluxo de atendimento que deve ser preservado conceitualmente na migração web:

- `saved_clients/`: perfis locais de consulentes;
- agrupamento por nome + data de nascimento no protótipo;
- histórico pesquisável;
- página individual do consulente;
- impressão A4 de cada motor;
- exportação ZIP portátil de um mapa;
- observações internas nunca aparecem no relatório impresso.

### Privacidade na versão web

Na migração para Netlify, **não** persistir e-mail, telefone, notas ou mapas em filesystem efêmero. Escolher explicitamente uma estratégia:

1. modo privado/local: dados somente no navegador (IndexedDB/localStorage, preferencialmente IndexedDB para volume);
2. modo com conta: autenticação + banco (ex. Supabase/Postgres) e regras de acesso por usuário;
3. Netlify Blobs apenas se o modelo de acesso e privacidade estiver bem definido.

O Antigravity deve tratar `client.json` e qualquer perfil como dados pessoais. Não enviar esses campos a serviços externos de geocodificação; geocodificação deve receber apenas o local pesquisado.

### Exportação

O comportamento esperado é:

- HTML interativo preserva três abas;
- impressão/PDF tem uma versão por motor, com layout A4;
- ZIP por mapa contém `report.html`, `classic.json`, `modern.json`, `comparison.json`, `meta.json` e, quando houver, `client.json`;
- na versão web, o ZIP deve ser montado em memória, sem depender de filesystem permanente.

## Atualização V0.7 — Netlify + Supabase definido como arquitetura de produção

A persistência final **não deve usar Netlify Blobs como fonte primária**. O alvo de produção é:

- **Netlify**: hosting, build e funções/server runtime quando necessário;
- **Supabase Auth**: autenticação do profissional;
- **Supabase Postgres**: consulentes, mapas e configurações;
- **Row Level Security (RLS)**: isolamento por `auth.uid()`;
- resultados dos motores em `jsonb`, preservando o contrato matemático integral.

O repositório agora contém `supabase/migrations/001_initial_schema.sql`, que cria:

- `practitioner_profiles`;
- `clients`;
- `charts`;
- índices;
- grants explícitos;
- RLS e policies separadas para SELECT/INSERT/UPDATE/DELETE.

### Regras obrigatórias para o Antigravity

1. Usar Supabase Auth antes de permitir acesso a consulentes/histórico.
2. O browser usa apenas URL pública + anon key e a sessão autenticada; autorização real fica no RLS.
3. `SUPABASE_SERVICE_ROLE_KEY` **nunca** pode usar prefixo `NEXT_PUBLIC_` nem chegar ao browser.
4. Evitar service role no CRUD normal. Só usar server-side em operação administrativa realmente necessária.
5. Geocodificação recebe apenas cidade/local; não recebe nome, telefone, e-mail, notas ou resultados do mapa.
6. Manter `classic_result`, `modern_result` e `comparison_result` como snapshots JSONB versionados (`schema_version`).
7. Usar UUIDs no banco; o hash local nome+nascimento da versão Python não é identificador de produção.
8. Implementar deleção de consulente e mapas, exportação e política de retenção de dados.
9. Executar testes de RLS antes do deploy de produção.

### Variáveis

Ver `.env.example`. O Netlify possui integração oficial com Supabase e pode provisionar variáveis de ambiente. Ajustar os nomes gerados para o cliente Supabase do framework escolhido sem versionar segredos.

### Configuração profissional

A V0.7 introduz `app_settings.json` no protótipo e a tela `/settings`. Na versão Supabase, as preferências do profissional devem migrar para `practitioner_profiles.app_settings`, mantendo defaults versionados no código para que um perfil corrompido não altere silenciosamente os golden tests.


## Atualização V0.8 — contrato TypeScript e Supabase executável

Antes de portar matemática, ler `handoff/WEB_PORT_CONTRACT_V0_8.md`. A V0.8 adiciona:

- contratos TypeScript em `web/src/lib/astrology/contracts.ts`;
- perfil imutável em `web/src/lib/astrology/profile.ts`;
- tipos e clientes Supabase SSR;
- fluxo inicial de Auth por magic link;
- dashboard protegido;
- golden fixtures versionados;
- JSON Schemas em `contracts/`;
- trigger de `updated_at`;
- teste Python do contrato V1.

**Não** recalcular ou regenerar os arquivos `golden/*.v1.json` durante a migração. Eles são a referência diferencial.

## V0.9 PORT STATUS — IMPORTANT

The deterministic post-ephemeris layer has already been ported to TypeScript in:

`web/src/lib/astrology/math.ts`

Do not reimplement these rules from scratch. Use the existing functions. They have a golden parity suite against Python-generated fixtures.

Validation command:

```bash
cd web
npm run test:math
```

Expected V0.9 result: `86 assertions passed`.

Astronomical ephemerides and Topocentric house astronomy are intentionally still Python-authoritative. Read `handoff/WEB_PORT_CONTRACT_V0_9.md` before porting any astronomy backend.

## V1.0 mandatory three-profile rule

The application MUST expose all three consultation profiles: `classic`, `modern`, and `comparative`. Do not collapse these into a single engine selector. The comparative profile executes both engines independently and compares results; it is not a third ephemeris algorithm. Read `ASTRONOMY_BACKEND_DECISION_V1_0.md` before implementing astronomy.

## V1.1 astronomy implementation

Use `web/src/lib/astrology/swiss-wasm-provider.ts` as the reference WASM adapter. Preserve all three consultation profiles: Classic, Modern, Comparative. Do not merge Classic and Modern into a single calculation path. The comparative profile calls both and reports differences.

Before deployment, install and pin a validated `@swisseph/browser` release, run the real-WASM differential corpus, and preserve the frozen Vega/Good Luck parameters established by reverse engineering.


## V1.2 mandatory real-WASM gate
Run `npm run test:wasm-real` after dependencies are installed. Preserve all three consultation profiles. See `REAL_WASM_VALIDATION_V1_2.md`.

## V1.7 RC — FINAL HANDOFF GATE

The final candidate is governed by `START_HERE.md` and `handoff/FINAL_RELEASE_READINESS_V1_7.md`.

Run:

```bash
./scripts/antigravity_bootstrap.sh
```

Do not deploy until the real WASM numerical gate, TypeScript typecheck and Next.js production build all PASS. The preparation environment passed Python 16/16, pure TypeScript math 86/86, three-profile contract 11/11, provider contract 18/18, and corpus validation. `npm install` timed out in the preparation environment, so real WASM is explicitly not pre-certified.
