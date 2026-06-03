# Keve Web App

Aplicação web React (Vite) do Keve Marketplace B2B.

## Pré-requisitos

- Node.js 20+
- npm (ou pnpm)
- Supabase CLI (opcional, para backend local)

## Setup

```bash
# Na raiz do monorepo
npm install

# Copiar variáveis de ambiente
cp apps/web/.env.example apps/web/.env.local

# Subir Supabase local (se tiver CLI)
supabase start
# Copie URL e anon key para apps/web/.env.local

# Dev server
npm run dev
```

App em http://localhost:5173

## Estrutura

```
src/
├── app/           # Router e providers
├── components/    # UI, layout, auth guards
├── config/        # Navegação e títulos
├── contexts/      # Auth context
├── hooks/
├── lib/           # Supabase client, utils
├── pages/         # Auth, landing, placeholders
├── providers/
└── services/      # Chamadas Supabase
```

## Auth

- Login: `/auth/login`
- Registro comprador: `/auth/register/buyer`
- Registro fornecedor: `/auth/register/supplier`
- Reset senha: `/auth/forgot-password`

Metadata no signup (`raw_user_meta_data`):

```json
{
  "full_name": "...",
  "phone": "...",
  "primary_role": "buyer"
}
```

Trigger `handle_new_user` cria profile, role e subscription Free.

## Papéis e rotas

| Papel | Dashboard |
|-------|-----------|
| buyer | `/buyer/dashboard` |
| supplier | `/supplier/board` |
| admin | `/admin/metrics` |

Shell responsivo: sidebar (desktop) + bottom nav (mobile) conforme `docs/DESIGN_SYSTEM.md`.
