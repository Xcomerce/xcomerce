<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="apps/web/public/logo-clara.svg">
    <source media="(prefers-color-scheme: light)" srcset="apps/web/public/logo-dark.svg">
    <img alt="XCOMERCE Logo" src="apps/web/public/logo-dark.svg" width="300">
  </picture>
</p>

# XCOMERCE

Plataforma B2B de marketplace para conexão entre compradores e fornecedores verificados.

## Estrutura do monorepo

```
apps/
  web/          # Frontend React (Vite + TypeScript)
  mobile/       # App mobile (em desenvolvimento)
packages/
  shared/       # Tipos e utilitários compartilhados
supabase/
  migrations/   # Schema e políticas RLS
  functions/    # Edge Functions
  seed*.sql     # Seeds de desenvolvimento
docs/           # Documentação (módulos, design system, edge functions)
```

## Pré-requisitos

- Node.js 20+
- npm (workspaces) ou pnpm
- [Supabase CLI](https://supabase.com/docs/guides/cli) para banco local

## Configuração

1. Instale as dependências na raiz:

   ```bash
   npm install
   ```

2. Copie as variáveis de ambiente do app web:

   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

3. Ajuste `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em `apps/web/.env.local` (projeto do [Dashboard](https://supabase.com/dashboard) — não depende do MCP do Cursor). Ver [docs/SUPABASE-ENV.md](docs/SUPABASE-ENV.md).

4. (Opcional) Suba o Supabase local e aplique migrations:

   ```bash
   supabase start
   supabase db reset
   ```

## Scripts

| Comando      | Descrição              |
| ------------ | ---------------------- |
| `npm run dev`    | Dev server do app web  |
| `npm run build`  | Build de produção      |
| `npm run lint`   | ESLint no app web      |

## Documentação

Consulte a pasta [`docs/`](docs/) para design system, módulos e edge functions.
