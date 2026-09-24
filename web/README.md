# Astro Vega Web Bridge — V0.8

Este diretório é o ponto de entrada para Google Antigravity/Netlify.

Ainda não substitui o motor Python. O objetivo desta etapa é fixar:

- contratos TypeScript;
- Auth Supabase;
- persistência Supabase;
- estrutura Next.js;
- boundary entre cálculo e UI.

## Sequência de trabalho no Antigravity

1. `npm install`
2. copiar `.env.local.example` para `.env.local` e preencher URL/anon key;
3. executar migrations Supabase `001` e `002`;
4. `npm run dev`;
5. validar login e dashboard;
6. importar `../golden/*.v1.json` como fixtures temporários;
7. criar roda/matriz/tabelas usando os fixtures;
8. só depois portar o cálculo Python para TypeScript/WASM/server runtime.

## Deploy Netlify

O `netlify.toml` na raiz usa `base = "web"`. Configure as variáveis Supabase no painel/integração do Netlify; não versionar chaves reais.
