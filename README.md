# Astro Vega Engine V1.6

# Astro Vega Engine — v0.8 bridge Next.js + Supabase

Motor natal com duas trilhas de cálculo independentes, comparação e camada visual em SVG/HTML.

## 1. Clássico Vega

Objetivo: compatibilidade com relatórios Vega/Good Luck históricos.

- efeméride analítica Moshier solicitada explicitamente;
- HSL por fórmula clássica GMST + longitude;
- opção de `classic_hsl_hours` para reproduzir um relatório arquivado quando a HSL impressa é conhecida;
- casas Topocêntricas Polich/Page calculadas a partir de ARMC;
- Nodo médio, Lilith média, Fortuna `ASC + Lua - Sol`;
- orbes 9/8/7/6/4;
- casas interpretativas 10°/5°;
- pontuação 2/1.

**Importante:** o modo clássico não inventa offsets ocultos em planetas. Quando um relatório antigo fornece HSL, ela é tratada como entrada auditável de compatibilidade.

## 2. Precisão Atual

Objetivo: cálculo astronômico moderno preservando o mesmo perfil interpretativo.

- solicita Swiss Ephemeris (`FLG_SWIEPH`);
- casas `houses_ex` Topocêntricas;
- HSL pelo tempo sideral do Swiss Ephemeris;
- mesmas regras interpretativas do modo clássico para comparação limpa.

Se os arquivos Swiss não estiverem instalados, a biblioteca pode recorrer ao fallback Moshier para alguns corpos. O JSON registra os `retflags`.

## 3. Comparador

`compare_charts()` calcula:

- diferença angular por planeta/ponto em minutos de arco;
- diferença das 12 cúspides;
- igualdade do minuto exibido;
- mudanças de casa geométrica e interpretativa;
- aspectos presentes apenas em um motor;
- igualdade das pontuações e fase lunar.

## 4. Camada visual — nova na v0.3

`renderers.py` gera:

- roda natal SVG vetorial;
- linhas internas de aspectos, com harmônicos e tensos diferenciados;
- 12 signos, cúspides, casas, ASC, MC e pontos;
- matriz 16×16 no padrão Vega;
- triângulo superior: aspectos zodiacais;
- triângulo inferior: paralelos e contraparalelos de declinação;
- relatório HTML autocontido com três abas:
  - **Clássico Vega**
  - **Precisão Atual**
  - **Comparativo**

Nenhuma biblioteca de front-end é necessária para abrir o relatório HTML.

## Exemplo visual

```bash
python run_sergio_visual.py
```

Gera:

- `sergio_classic_wheel.svg`
- `sergio_modern_wheel.svg`
- `sergio_classic_matrix.svg`
- `sergio_modern_matrix.svg`
- `sergio_dual_report.html`

## Testes

Na pasta do projeto:

```bash
PYTHONPATH=. pytest -q
```

Estado atual: **6 testes passando**.

## Estrutura

```text
astro_engine.py          motor astronômico e regras Vega/Good Luck
renderers.py             roda, matriz e relatório HTML
run_sergio.py            exemplo legado simples
run_sergio_dual.py       comparação textual
run_sergio_visual.py     geração da interface visual estática
tests/                   testes de regressão e renderização
```

## Próximos módulos

1. resolvedor de cidade e timezone histórico;
2. entrada gráfica para novo consulente;
3. exportação PDF A4/A3 com template profissional;
4. configuração de orbes e aspectos menores;
5. interpretação textual autoral;
6. empacotamento desktop/web.

## Observação sobre Quíron

Para a precisão completa do Swiss Ephemeris em Quíron, o ambiente deve possuir o arquivo de asteroides correspondente (`seas_18.se1` no intervalo contemporâneo). O motor pode operar com `strict_chiron=False` e registrar a ausência como aviso.

## V0.4 — Entrada real do usuário e fuso histórico

A V0.4 adiciona uma aplicação local no navegador, sem depender de Flask ou outro framework web.

### Executar

```bash
python run_app.py
```

O navegador abre em `http://127.0.0.1:8765`.

A tela pede nome, data, hora e local e oferece campos avançados auditáveis. O fuso não é tratado como um simples número fixo: quando há um identificador IANA (por exemplo `America/Belem`), o programa consulta o `zoneinfo` da própria plataforma para descobrir o deslocamento UTC que vigorava naquela data, preservando mudanças históricas e horário de verão.

A resolução de local segue esta ordem:

1. coordenadas/fuso fornecidos manualmente;
2. geocodificação via Nominatim quando houver internet;
3. `timezonefinder`, se estiver instalado, para descobrir o fuso IANA pelas coordenadas;
4. fallback de UF para o Brasil;
5. solicitação explícita do fuso se nada acima for suficiente.

O formulário mantém latitude, longitude, fuso IANA e HSL clássico visíveis nas opções avançadas para que nenhum dado importante fique escondido. A HSL clássica é opcional e serve exclusivamente para reproduzir relatórios Vega arquivados.

### Segurança de cálculo

O motor nunca inventa silenciosamente um UTC offset. O offset histórico é derivado de IANA tzdata. Quíron continua sendo omitido com aviso caso `seas_18.se1` não esteja disponível; os demais cálculos continuam válidos.

## V0.5 — Histórico local e pacote de handoff

A V0.5 adiciona:

- histórico local automático em `saved_charts/`;
- reabertura de relatórios já calculados;
- download dos JSONs Clássico, Atual e Comparativo;
- `storage.py` com persistência local isolada da camada de cálculo;
- pasta `handoff/` preparada para migração futura pelo Google Antigravity;
- `netlify.toml` de referência para a fase web;
- manifesto de projeto e contrato de migração.

### Importante sobre Netlify

O servidor Python atual é um protótipo desktop/local e **não deve ser publicado diretamente no Netlify**. O handoff final prevê migração para Next.js/TypeScript, preservando os testes matemáticos como contrato. O Netlify recomenda Node 24+ no fluxo atual com Antigravity.

## V0.6 — Consulentes, busca e exportação profissional

A V0.6 transforma o histórico simples em uma estrutura de atendimento:

- perfis locais de consulentes em `saved_clients/`;
- agrupamento determinístico por nome + data de nascimento;
- e-mail, telefone e observações internas opcionais;
- tela `/clients` com busca;
- página individual do consulente com todos os mapas salvos;
- busca no histórico por nome, data, local ou ID;
- relatório de impressão A4 separado para cada motor;
- botão **Imprimir / Salvar em PDF** usando a impressão nativa do navegador;
- exportação ZIP de cada mapa contendo relatório, três JSONs, metadados e perfil do consulente;
- endpoint `/health` agora informa a versão 0.6.

Rotas principais do protótipo local:

```text
/                     novo mapa
/history              histórico pesquisável
/clients              consulentes
/client/<id>           perfil do consulente
/report/<id>           relatório interativo
/print/<id>/classic    impressão Clássico Vega
/print/<id>/modern     impressão Precisão Atual
/bundle/<id>           pacote ZIP portátil do mapa
```

O relatório impresso não inclui observações internas do consulente. O ZIP, por ser uma exportação administrativa, inclui `client.json`; deve ser tratado como dado pessoal.

Estado atual da suíte: **10 testes passando**.

## V0.7 — Configuração profissional e Supabase-ready

- Tela local `/settings` para identidade do aplicativo, profissional e parâmetros auditáveis.
- Branding aplicado aos relatórios novos e versões de impressão.
- Arquitetura de produção definida como **Netlify + Supabase Auth/Postgres/RLS**.
- Migração SQL inicial em `supabase/migrations/001_initial_schema.sql`.
- `.env.example` sem segredos reais.
- Configurações locais continuam sendo apenas protótipo; em produção migram para `practitioner_profiles.app_settings`.

Os parâmetros Vega/Good Luck aparecem na tela de configuração para auditoria, mas os golden tests continuam sendo o contrato de compatibilidade. Alterar orbes cria um perfil personalizado e não deve mudar silenciosamente o perfil clássico validado.


## V0.8 — Contrato web congelado e ponte Next.js/Supabase

A V0.8 cria uma fronteira formal entre o motor Python validado e a futura aplicação do Antigravity:

- `contracts/`: JSON Schemas do `ChartResult`, comparador e envelope persistido;
- `golden/`: snapshots de regressão de Sérgio, versão 1;
- `web/`: esqueleto Next.js/TypeScript com contratos, perfil Vega/Good Luck, Supabase SSR, login por magic link, dashboard e health endpoint;
- `supabase/migrations/002_updated_at_triggers.sql`: timestamps mantidos pelo banco;
- `supabase/tests/rls_smoke.sql`: plano de teste de isolamento;
- `handoff/WEB_PORT_CONTRACT_V0_8.md`: ordem obrigatória de migração para impedir divergência matemática.

O diretório `web/` é uma ponte de produção, não ainda a substituição do motor Python. Primeiro ele deve renderizar os `golden/`; depois o cálculo é portado com testes diferenciais Python × TypeScript.

## V0.9 — TypeScript mathematical parity

V0.9 begins the real web-engine port. Deterministic astrology/math rules have been ported from Python to `web/src/lib/astrology/math.ts` and are tested against the immutable Sérgio golden fixtures.

Run the cross-language golden suite from `web/`:

```bash
npm run test:math
```

Reference result: **86 assertions passed**.

The astronomy backend (planetary ephemerides, Topocentric/Polich-Page house astronomy and sidereal-time variants) remains Python-authoritative until a browser/server TypeScript astronomy provider is selected and independently validated.

## V1.0 — three consultation profiles frozen

The web contract now treats **Clássico Vega**, **Precisão Atual**, and **Comparativo** as permanent first-class consultation profiles. Astronomy is isolated behind `AstronomyProvider`; deterministic Vega/Good Luck rules remain in the validated TypeScript math layer. See `handoff/ASTRONOMY_BACKEND_DECISION_V1_0.md`.

## V1.2 — Swiss Ephemeris WASM adapter

The web bridge now contains `SwissWasmAstronomyProvider`, implementing the astronomy boundary for all three consultation profiles. Classic uses Moshier for major bodies plus the validated legacy HSL/ARMC route; Modern uses Swiss files; Comparative invokes both. See `handoff/ASTRONOMY_WASM_IMPLEMENTATION_V1_1.md`.


## V1.2 real-WASM validation gate
A production-only numerical gate now exists at `cd web && npm run test:wasm-real`. It uses the actual WASM package, not the injected fake runtime. See `validation/VALIDATION_STATUS_V1_2.md`. The three profiles remain mandatory: Classic Vega, Current Precision, Comparative.

## V1.3 — Auditable reverse-engineering corpus

`corpus/corpus-index.v1.json` is now the canonical registry of historical compatibility evidence. A historical case is allowed to become a golden oracle only when its original Vega source provides enough auditable input/output data. Missing cases are explicitly marked `pending_source_recovery`; expected values must never be backfilled from Swiss/Moshier or from Astro Vega itself.

Validate the registry with `python validation/validate_corpus.py`. The three consultation profiles remain mandatory: Clássico Vega (`vega_classic`), Precisão Atual (`modern_swiss`) and Comparativo (`comparative`).


## V1.5 validation freeze
Deterministic compatibility rules are frozen. Public Vega evidence tests are executable and passing. See `validation/ACCEPTANCE_MATRIX_V1_5.md`. Real WASM numerical validation remains the V1.6 gate.

## V1.7 RC — entrega para Antigravity

A preparação matemática está congelada. Os três perfis obrigatórios são **Clássico Vega**, **Precisão Atual** e **Comparativo**. Para a migração final, comece por `START_HERE.md` e execute `./scripts/antigravity_bootstrap.sh`.

Status pré-handoff: Python 16/16 PASS; TypeScript matemática 86/86 PASS; contrato dos três perfis 11/11 PASS; AstronomyProvider 18/18 PASS; corpus PASS. O teste WASM real, typecheck completo e build Next.js devem ser executados no Antigravity após a instalação das dependências, pois `npm install` sofreu timeout neste ambiente.
