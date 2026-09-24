# Supabase no Astro Vega

A versão web final deve usar **Supabase Auth + Postgres com RLS**. O protótipo Python continua usando arquivos locais apenas como referência funcional.

## Entidades

- `practitioner_profiles`: perfil e preferências do astrólogo.
- `clients`: consulentes; e-mail, telefone e observações são privados.
- `charts`: resultados completos dos motores em JSONB e metadados para busca.

Todos os registros são vinculados a `auth.users` e protegidos por RLS usando `auth.uid()`.

## Variáveis de ambiente no Next.js/Netlify

Frontend público:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Server-side, apenas quando necessário:

- `SUPABASE_SERVICE_ROLE_KEY`

**Nunca** expor `SUPABASE_SERVICE_ROLE_KEY` no browser. O fluxo normal de leitura/gravação do usuário deve funcionar com sessão autenticada + RLS, sem service role.

A integração oficial Netlify↔Supabase pode provisionar variáveis automaticamente. O Antigravity deve mapear os nomes gerados para os nomes esperados pelo framework, sem versionar segredos.

## Regra de privacidade

Geocodificação recebe somente a string de local. Nome do consulente, e-mail, telefone, notas e mapa completo não devem ser enviados ao provedor de geocodificação.
