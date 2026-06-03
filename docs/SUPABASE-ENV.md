# Supabase: .env.local vs MCP do Cursor

## São coisas diferentes

| Origem | O que é | Quem usa |
|--------|---------|----------|
| `apps/web/.env.local` | Projeto que o **frontend** chama | Vite / navegador |
| MCP `user-supabase` no Cursor | Outro acesso (se configurado) | Assistente no IDE |

O erro `wjoyobxpwkdyhnfrwbiu.supabase.co` no navegador prova que o **.env.local está conectado** ao projeto remoto `wjoyobxpwkdyhnfrwbiu`.

**HTTP 500** não significa “sem .env”. Significa que o Postgres/PostgREST do **seu** projeto respondeu com erro interno (schema, RLS, função, etc.).

## Configurar o app

1. No [Supabase Dashboard](https://supabase.com/dashboard) → projeto → **Settings** → **API**
2. Copie **Project URL** e **anon public** key
3. Crie `apps/web/.env.local`:

```env
VITE_SUPABASE_URL=https://wjoyobxpwkdyhnfrwbiu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

4. Reinicie o dev server (`npm run dev` na raiz)

## Corrigir erro 500 em `demands`

Na maioria dos casos o projeto remoto **não tem as migrations** deste repositório.

Na raiz do monorepo:

```bash
supabase login
supabase link --project-ref wjoyobxpwkdyhnfrwbiu
supabase db push
```

Opcional: seeds de demo

```bash
psql "$DATABASE_URL" -f supabase/seed_products.sql
```

## Conferir no Dashboard

- **Table Editor** → deve existir tabela `demands`
- **Logs** → API / Postgres no horário do erro (mensagem SQL real)

## MCP no Cursor

Para o assistente usar o **mesmo** projeto do app, configure o MCP Supabase com o `project_ref` `wjoyobxpwkdyhnfrwbiu` nas settings do Cursor — isso é independente do `.env.local`.
