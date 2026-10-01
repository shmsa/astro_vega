# Relatório Técnico: Correções Astro Vega v1.0 RC Pós-Validação Rommel

**Data**: 01/10/2026  
**Ambiente**: Homologação / Staging Netlify  
**URL de Staging**: [https://astro-vega-staging.netlify.app](https://astro-vega-staging.netlify.app)  
**Deploy Único**: [https://6abe8497c429c51bf8017496--astro-vega-staging.netlify.app](https://6abe8497c429c51bf8017496--astro-vega-staging.netlify.app)  
**Status dos Gates de Aceite**: **7/7 PASS (100% aprovado)**  
**Status da Suíte de Regressão Rommel (Casos A-G)**: **7/7 PASS (100% aprovado)**  

---

## 1. Contexto e Diretrizes Gerais

Após a comparação do mapa natal de **Sergio Henrique Monte Santo Andrade (23/01/1989, 10:55, Belém/PA)** com o mapa original produzido por **Erwin Rommel (Good Luck / Vega)**, foram identificados e corrigidos 5 pontos essenciais de persistência, apresentação e usabilidade clássica.

### Salvaguardas Cumpridas Integralmente:
1. **Motor Astronômico Intocado**: Fórmulas analíticas Moshier, Swiss Ephemeris, Topocêntrico Polich-Page, nodos médios, Lilith média, Parte da Fortuna, tabelas de aspectos e orbes permaneceram 100% congelados.
2. **Salvaguarda 1 (Imutabilidade de Cálculos)**: O método `updateChart` atualiza **exclusivamente** campos editoriais (`chart_name`, `notes`, `tags`). Snapshots JSONB, coordenadas, efemérides, versões e metadados de cálculo são imutáveis após a criação do mapa.
3. **Salvaguarda 2 (math.ts Congelado)**: O arquivo `web/src/lib/astrology/math.ts` foi mantido 100% intacto. Toda a formatação zodiacal, parsing de HSL e formatação das casas interpretativas foi implementada no utilitário de apresentação `web/src/lib/astrology/format.ts`.
4. **Escopo de Deploy Restrito**: Deploy executado **exclusivamente no ambiente de staging** do Netlify (`astro-vega-staging.netlify.app`). Nenhuma promoção para produção foi realizada.

---

## 2. Detalhamento das 5 Correções

### Item 1: Bug de Persistência no Campo `tags` (Prioridade Bloqueadora)
* **Causa Raiz**: No SQL de inserção em `web/src/lib/services/charts.ts`, a cláusula `COALESCE($22, '{}')` continha o literal de string `'{}'`. O PostgreSQL inferiu o tipo do parâmetro `$22` como `text` em vez de `text[]`, gerando o erro `column "tags" is of type text[] but expression is of type text`.
* **Solução Implementada**:
  - Ajustado o binding SQL para `COALESCE($22::text[], '{}'::text[])`.
  - Normalização segura no serviço para garantir array nativo: `Array.isArray(input.tags) ? input.tags : []`.
  - Implementado `UpdateChartEditorialInput` e a função `updateChart(userId, chartId, input)` em `web/src/lib/services/charts.ts`, atualizando exclusivamente `chart_name`, `notes` e `tags`.
  - Adicionados handlers `PATCH` e `PUT` em `web/src/app/api/charts/[id]/route.ts`.
* **Validação**: Testado com sucesso via `npm run test:crud` e `npm run test:regression` com:
  - Tags vazias `[]` -> persistidas como `text[]`.
  - Tag única `['natal']` -> persistida como `text[]`.
  - Múltiplas tags `['astrologia', 'sergio', 'golden']` -> persistidas como `text[]`.
  - Atualização editorial para `['arquivo', 'rommel', 'validado']` -> persistida com integridade.

### Item 2: Casas Interpretativas (Regra Vega 10°/5°)
* **Conceito**: A astrologia clássica do Vega adota a regra de antecipação de cúspides: planetas situados até 10° antes de cúspides angulares (Casas 1, 4, 7, 10) e até 5° antes das demais cúspides antecipam a influência da casa seguinte.
* **Solução Implementada**:
  - Criada a função `formatHouseDisplay(geometric, interpretive)` em `web/src/lib/astrology/format.ts`.
  - `TablesView.tsx`: Exibição visual com badge `G/I`, texto `Casa G → I` com destaque sutil e nota técnica explicativa no rodapé.
  - `ComparativeView.tsx`: Comparação clara entre as transições de casa clássica e moderna.
* **Validação Sergio 1989**:
  - Mercúrio: Casa 10 → 11 (`10/11`) ✅
  - Saturno: Casa 9 → 10 (`9/10`) ✅
  - Urano: Casa 9 → 10 (`9/10`) ✅
  - Netuno: Casa 9 → 10 (`9/10`) ✅
  - Plutão: Casa 7 → 8 (`7/8`) ✅

### Item 3: Exposição de HSL Histórica no Clássico Vega
* **Conceito**: Mapas arquivados do Vega/Good Luck impressos utilizavam tábuas históricas com HSL específica (para Sergio: `18:52:24` = `18.873333h`), enquanto o recálculo puramente computacional gera pequenas variações de frações de segundos.
* **Solução Implementada**:
  - Implementadas funções `parseHslString` e `formatHslString` em `web/src/lib/astrology/format.ts`.
  - Criada seção expansível *"Opções avançadas / Reprodução histórica Vega"* em `web/src/app/charts/new/page.tsx` para os perfis `vega_classic` e `comparative`.
  - O campo aceita formato `HH:MM:SS` (ex: `18:52:24`), repassa `classic_hsl_hours` para o subject do backend e registra `historical_hsl: '18:52:24'` e `historical_hsl_override: true` em `calculation_metadata`.
  - `TablesView.tsx` destaca a origem documental quando o override está ativo.
* **Validação**:
  - Com HSL `18:52:24`: Clássico resulta em ASC 14°05' Áries / MC 12°03' Capricórnio ✅
  - Moderno permanece isolado e inalterado: ASC 14°07' Áries / MC 12°05' Capricórnio ✅

### Item 4: Notação Zodiacal na Mandala e Eixos
* **Solução Implementada**:
  - Implementada `formatZodiacPrecise(longitude, options)` com arredondamento preciso para o minuto de arco mais próximo (`14°05' Áries`, `12°03' Capricórnio`), com suporte opcional a segundos (`14°04'49"`).
  - Atualizado `NatalWheelSvg.tsx`:
    - Rodapé exibe notação formal dos eixos principais: `ASC: 14°05' Áries (14.08°)` e `MC: 12°03' Capricórnio (282.05°)`.
    - Cúspides 1 a 12 possuem tooltips interativas exibindo a posição zodiacal exata em graus e minutos.

### Item 5: Impressão e Exportação do Relatório Comparativo
* **Solução Implementada**:
  - Em `ChartResultViewer.tsx`, adicionado botão duplo:
    1. `🖨️ Imprimir esta análise` (imprime a aba selecionada).
    2. `📑 Relatório Comparativo Completo` (ativa modo de impressão completo).
  - No modo comparativo completo, renderiza de forma sequencial e limpa:
    - Cabeçalho de Identificação do Consulente e Dados de Entrada.
    - Análise Clássica Vega (Mandala, Tabela e Síntese).
    - Análise Precisão Atual / Swiss Ephemeris.
    - Comparativo Técnico Ponto a Ponto e Desvios de Cúspides.
    - Metadados de Auditoria e Fontes de Efemérides.
  - Regras de `@media print` garantem quebras de página limpas (`page-break-before: always`) e omissão de elementos de navegação/botões.
  - Renderização puramente client-side dos snapshots existentes, **sem nenhum recálculo**.

---

## 3. Matriz de Testes e Validação de Aceite

### A. Suíte de Regressão Específica Sergio Rommel (`web/tests/regression-sergio.mjs`)
| Caso | Descrição | Resultado |
|---|---|---|
| **Caso A** | Moderno sem HSL: ASC 14°07' Áries, MC 12°05' Capricórnio | **PASS** |
| **Caso B** | Clássico normal sem override de HSL (Moshier + HSL padrão) | **PASS** |
| **Caso C** | Clássico com HSL 18:52:24: ASC 14°05' Áries, MC 12°03' Capricórnio | **PASS** |
| **Caso D** | Comparativo com HSL: Clássico ajustado, Moderno isolado | **PASS** |
| **Caso E** | Persistência Neon: Snapshots salvos e recarregados 100% idênticos, sem recálculo | **PASS** |
| **Caso F** | Tags: `[]`, `['natal']`, múltiplas e atualização editorial isolada | **PASS** |
| **Caso G** | Casas interpretativas 10°/5° (Mercúrio 10/11, Saturno 9/10, etc.) e notação zodiacal | **PASS** |

### B. Gates Finais de Aceite (`./scripts/final_acceptance.sh`)
```
[1/7] Python reference + corpus: pytest -q ................ 13 passed in 0.44s (PASS)
[2/7] Corpus structural validation: validate_corpus.py .... PASS
[3/7] Web dependency presence ............................. PASS
[4/7] TypeScript deterministic / profile / provider ....... PASS
[5/7] Real Swiss/Moshier WASM numerical gate .............. 70/70 PASS
[6/7] Typecheck (tsc --noEmit) ............................ 0 errors (PASS)
[7/7] Production build (next build Turbopack) ............. 18 routes compiled (PASS)
=== PASS: V1.7 acceptance gate complete ===
```

### C. Smoke Test em Tempo Real no Staging Netlify
```
=== Smoke Testing Staging Deploy ===
[1/4] Checking /api/health ............................. HTTP 200 (ok: true, v1.0-rc)
[2/4] Checking /dashboard unauthenticated redirect ...... HTTP 307 -> /login
[3/4] Checking /login page ............................. HTTP 200
[4/4] Testing Auth & Calculation on Staging ............ HTTP 200 (SUCCESS!)
      - Classic ASC: 14.08031° (14°05' Áries)
      - Modern ASC:  14.11260° (14°07' Áries)
      - Mercury:     Casa 10 -> 11
      - Saturn:      Casa 9 -> 10
      - Pluto:       Casa 7 -> 8
=== ALL STAGING SMOKE TESTS PASSED! ===
```

---

## 4. Arquivos Modificados e Adicionados

- `web/src/lib/astrology/format.ts` **[NOVO]**: Camada de apresentação pura para casas interpretativas, notação zodiacal e HSL.
- `web/src/lib/astrology/index.ts`: Re-exportação segura da camada de apresentação.
- `web/src/lib/services/charts.ts`: Correção do cast `COALESCE($22::text[], '{}'::text[])` e implementação do `updateChart` editorial.
- `web/src/app/api/charts/[id]/route.ts`: Endpoints `PATCH` e `PUT` para atualização editorial.
- `web/src/app/charts/new/page.tsx`: Interface para reprodução histórica com HSL arquivada.
- `web/src/components/astrology/TablesView.tsx`: Apresentação `G → I` com badges `10/11`, tooltips e footnote.
- `web/src/components/astrology/ComparativeView.tsx`: Comparação de casas interpretativas.
- `web/src/components/astrology/NatalWheelSvg.tsx`: Notação zodiacal nos eixos ASC/MC e cúspides.
- `web/src/components/astrology/ChartResultViewer.tsx`: Botões e visualização do relatório comparativo completo para impressão/PDF.
- `web/tests/crud-rls.mjs`: Testes automatizados de tags vazias, singulares, múltiplas e atualização editorial.
- `web/tests/regression-sergio.mjs` **[NOVO]**: Suíte completa de regressão para os Casos A a G.
- `netlify.toml`: Ajuste do diretório de publicação para `web/.next`.
- `.gitignore`: Inclusão de `.netlify/` e artefatos de build.

---

## 5. Instruções para Próximos Agentes de IA

1. O motor matemático (`web/src/lib/astrology/math.ts`) e os fixtures de ouro (`golden/`) estão **congelados** e validados com precisão astronômica rigorosa contra o cálculo original de Erwin Rommel. Não altere fórmulas nem tolerâncias.
2. Qualquer adição estética ou de texto deve ser inserida em `web/src/lib/astrology/format.ts` ou nos componentes React.
3. Para validar alterações futuras, execute sempre:
   ```bash
   npm run test:crud         # Testa isolamento multi-tenant Neon e persistência de tags
   npm run test:regression   # Executa os casos A a G do mapa mestre
   ./scripts/final_acceptance.sh  # Executa os 7 gates oficiais do projeto
   ```
4. O deploy em produção continua bloqueado até homologação formal do usuário; deploys continuam apontados exclusivamente para `astro-vega-staging.netlify.app`.
