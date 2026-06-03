# Arquitetura Técnica — Keve Marketplace B2B

**Versão:** 2.0  
**Data:** jun/2026  
**Foco:** Aplicação web React + Supabase · Backend compartilhado com app nativo futuro

---

## 1. Visão geral

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENTES                                       │
├──────────────────────────────┬──────────────────────────────────────────┤
│   Web (Fase 1)               │   Mobile (Fase 2)                         │
│   React + Vite + PWA         │   React Native + Expo                     │
│   Tailwind + shadcn/ui       │   NativeWind                              │
└──────────────┬───────────────┴──────────────────┬───────────────────────┘
               │                                   │
               │         Supabase Client SDK         │
               └─────────────────┬─────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     BACKEND COMPARTILHADO (Supabase)                     │
├─────────────┬──────────────┬──────────────┬──────────────┬──────────────┤
│    Auth     │  PostgreSQL  │   Storage    │   Realtime   │ Edge Functions│
│             │  + RLS       │  (documentos │  (chat,      │ (webhooks,   │
│             │  + triggers  │   imagens)   │   notif.)    │  e-mail,     │
│             │              │              │              │  match jobs) │
└─────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
              ┌──────────┐              ┌──────────┐
              │  Asaas   │              │  Resend  │
              │ (SaaS    │              │ (e-mail) │
              │ billing) │              └──────────┘
              └──────────┘
```

### Princípios arquiteturais

1. **Backend único** — Web e mobile consomem o mesmo projeto Supabase.
2. **Regras no servidor** — Validações críticas em RLS, triggers e Edge Functions; clientes são "thin".
3. **Web first** — `apps/web` é o produto principal; `apps/mobile` entra depois sem refatorar backend.
4. **Tipos compartilhados** — `packages/shared` evita divergência de contratos entre clientes.
5. **Sem BFF customizado no MVP** — Supabase Client + Edge Functions cobrem o necessário.

---

## 2. Stack tecnológica

### 2.1 Web (Fase 1)

| Camada | Tecnologia |
|--------|------------|
| Framework | React 18 + Vite 5 |
| Linguagem | TypeScript 5 |
| Roteamento | React Router 6 |
| Estilo | Tailwind CSS 3 + shadcn/ui |
| Design System | [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) — fonte de verdade UI |
| Estado servidor | TanStack Query 5 |
| Tema | next-themes (light/dark) |
| Forms | React Hook Form + Zod |
| PWA | vite-plugin-pwa |
| Deploy | Vercel / Cloudflare Pages |

### 2.2 Backend (compartilhado)

| Camada | Tecnologia |
|--------|------------|
| BaaS | Supabase |
| Banco | PostgreSQL 15 |
| Auth | Supabase Auth (e-mail/senha) |
| Arquivos | Supabase Storage |
| Tempo real | Supabase Realtime |
| Serverless | Supabase Edge Functions (Deno) |
| Migrations | Supabase CLI (`supabase/migrations/`) |

### 2.3 Mobile (Fase 2 — placeholder)

| Camada | Tecnologia |
|--------|------------|
| Framework | React Native + Expo |
| Navegação | Expo Router |
| Estilo | NativeWind |
| Push | expo-notifications |
| Geo | expo-location |

---

## 3. Estrutura do monorepo

```
keve-marketplace-b2b/
├── apps/
│   ├── web/                          # ← Produto principal (React PWA)
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── app/                  # Providers, rotas raiz
│   │   │   ├── pages/                # Páginas por domínio
│   │   │   │   ├── auth/
│   │   │   │   ├── buyer/
│   │   │   │   ├── supplier/
│   │   │   │   ├── admin/
│   │   │   │   └── landing/
│   │   │   ├── components/
│   │   │   │   ├── ui/               # shadcn/ui
│   │   │   │   ├── layout/           # Sidebar, Header, BottomNav
│   │   │   │   ├── demands/
│   │   │   │   ├── offers/
│   │   │   │   ├── chat/
│   │   │   │   ├── catalog/
│   │   │   │   └── billing/
│   │   │   ├── hooks/
│   │   │   ├── services/             # Chamadas Supabase
│   │   │   ├── lib/                  # Utils, supabase client
│   │   │   ├── config/               # routes, navigation, env
│   │   │   └── types/                # Re-export de @keve/shared
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   └── mobile/                       # ← Fase 2 (React Native)
│       └── README.md                 # Placeholder até iniciar mobile
│
├── packages/
│   └── shared/                       # Tipos e constantes compartilhados
│       ├── src/
│       │   ├── types/                # Demand, Offer, Order, Profile...
│       │   ├── constants/            # Status enums, plan limits
│       │   └── validators/           # Schemas Zod compartilhados
│       └── package.json
│
├── supabase/
│   ├── config.toml
│   ├── migrations/                   # SQL versionado
│   ├── seed.sql                      # Dados de dev (planos, categorias)
│   └── functions/                    # Edge Functions
│       ├── asaas-webhook/
│       ├── send-email/
│       ├── send-push/                # Fase 2 (mobile)
│       ├── match-demand/             # Disparo pós-insert demanda
│       └── check-sla-deadlines/      # Cron de lembretes SLA
│
├── docs/                             # Documentação (esta pasta)
├── docsbase/                         # Docs anteriores (histórico)
├── trans.md                          # Transcrição kickoff
├── package.json                      # Workspace root
└── pnpm-workspace.yaml
```

---

## 4. Estrutura interna — `apps/web`

### 4.1 Rotas (React Router)

```
/                           → Landing
/auth/login
/auth/register/buyer
/auth/register/supplier
/pricing

/buyer/dashboard            → Demandas do comprador
/buyer/demands/new
/buyer/demands/:id          → Propostas agrupadas + chat
/buyer/orders/:id

/supplier/board             → Mural de oportunidades (match)
/supplier/catalog
/supplier/offers/:id        → Proposta + chat

/admin/approvals
/admin/metrics
/admin/categories

/settings/profile
/settings/billing
```

### 4.2 Layouts por papel

Padrões visuais e navegação definidos em [DESIGN_SYSTEM.md §7](./DESIGN_SYSTEM.md#7-componentes-de-layout).

| Papel | Layout mobile | Layout desktop |
|-------|---------------|----------------|
| Comprador | Bottom nav (4 itens) | Sidebar + header |
| Fornecedor | Bottom nav (4 itens) | Sidebar + header |
| Admin | Sidebar colapsável | Sidebar fixa |

### 4.3 Camada de dados (web)

```
Page → Hook (useQuery/useMutation) → Service → Supabase Client
                                              ↓
                                    RLS + Postgres / Realtime
```

**Exemplo:**
- `pages/buyer/DemandDetailPage.tsx`
- `hooks/useDemandOffers.ts`
- `services/demands.ts`
- `supabase.from('offers').select(...)` com RLS

---

## 5. Backend compartilhado — Supabase

### 5.1 Domínios de dados

| Domínio | Tabelas principais |
|---------|-------------------|
| Identidade | `profiles`, `buyer_profiles`, `supplier_profiles`, `companies` |
| Catálogo | `categories`, `products` |
| Demandas | `demands`, `demand_matches` |
| Propostas | `offers`, `offer_messages` |
| Pedidos | `orders`, `order_status_logs`, `order_sla_deadlines` |
| Reputação | `ratings`, `reputation_events` |
| Notificações | `notifications`, `notification_preferences` |
| Billing | `plans`, `subscriptions` |
| Admin | `documents`, `audit_logs`, `workflow_configs` (V2) |
| Mobile (F2) | `user_push_tokens` |

> Schema detalhado em [SCHEMA.md](./SCHEMA.md). RLS em migration futura.

### 5.2 Segurança (RLS)

Toda tabela com dados de usuário **deve** ter RLS habilitado.

| Padrão | Regra |
|--------|-------|
| Leitura própria | `auth.uid() = user_id` |
| Leitura cruzada | Via demanda/pedido (comprador ↔ fornecedor envolvido) |
| Admin | Role `admin` via claim JWT ou tabela `user_roles` |
| Contatos sensíveis | View `v_offers_public` oculta telefone/e-mail até reveal |
| Storage | Policy por bucket + pasta do usuário |

### 5.3 Lógica no Postgres (triggers/functions)

| Evento | Ação |
|--------|------|
| INSERT `demands` (status PUBLICADA) | Trigger chama Edge Function `match-demand` |
| UPDATE `orders` (mudança status) | Insert em `order_status_logs` + notificação |
| INSERT `offers` | Incrementa contador mensal; notifica comprador (agrupado) |
| SLA vencendo | Cron `check-sla-deadlines` → e-mail + `reputation_events` |

### 5.4 Edge Functions (visão)

| Function | Trigger | Responsabilidade |
|----------|---------|------------------|
| `match-demand` | DB webhook / trigger | Encontra fornecedores, cria `demand_matches`, dispara notificações |
| `send-email` | Chamada interna | Envia e-mail transacional (Resend) |
| `asaas-webhook` | HTTP POST Asaas | Atualiza `subscriptions` |
| `check-sla-deadlines` | Cron (pg_cron ou Supabase cron) | Lembretes e penalidades de SLA |
| `send-push` | Fase 2 | Expo Push API para tokens mobile |

> Contratos detalhados em [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md).

### 5.5 Realtime (chat)

- Canal: `offer_messages:demand_id=eq.{id}`
- Presença opcional (typing indicator — V2)
- Web e mobile usam o mesmo channel pattern

---

## 6. Integração web ↔ mobile (futuro)

```
                    ┌─────────────────┐
                    │ packages/shared  │
                    │ (types, enums)   │
                    └────────┬────────┘
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         apps/web      apps/mobile     supabase/
         (React)       (Expo RN)       migrations
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                    Supabase Project (1)
                    - Mesmas tabelas
                    - Mesmas RLS policies
                    - Mesmas Edge Functions
                    - Auth compartilhado (mesmo auth.users)
```

**O que muda no mobile:**
- UI nativa (Expo Router, NativeWind)
- Push via `expo-notifications` → tabela `user_push_tokens`
- Geolocalização nativa (`expo-location`)
- Deep links (`keve://demand/:id`)

**O que NÃO muda:**
- Schema Postgres
- RLS policies
- Edge Functions (exceto `send-push` ativado)
- Fluxos de negócio e estados de pedido

---

## 7. PWA (web)

| Requisito | Implementação |
|-----------|---------------|
| Instalável | `manifest.webmanifest` via vite-plugin-pwa |
| Responsivo | Mobile-first Tailwind |
| Offline mínimo | Cache de shell estático; dados sempre online |
| Notificações web | V2 — Web Push API (opcional; e-mail cobre MVP) |

---

## 8. Ambientes

| Ambiente | Supabase | Web | Asaas |
|----------|----------|-----|-------|
| Local | `supabase start` | `pnpm dev` (localhost:5173) | Sandbox |
| Staging | Projeto Supabase staging | Preview deploy | Sandbox |
| Production | Projeto Supabase prod | Domínio prod | Produção |

**Variáveis de ambiente (web):**
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ASAAS_PUBLIC_KEY=        # se necessário no client
```

**Secrets (Edge Functions):**
```
ASAAS_API_KEY=
ASAAS_WEBHOOK_SECRET=
RESEND_API_KEY=
CNPJ_API_TOKEN=
```

---

## 9. Observabilidade

| Ferramenta | Uso |
|------------|-----|
| Supabase Dashboard | Logs DB, Auth, Edge Functions |
| Sentry (web) | Erros frontend |
| Supabase Advisors | Performance e security lint |

---

## 10. Decisões de arquitetura (ADRs resumidos)

| # | Decisão | Motivo |
|---|---------|--------|
| ADR-01 | Supabase como backend único | Velocidade MVP, Auth+DB+Realtime integrados |
| ADR-02 | Web React separado de mobile | Entrega mais rápida; PWA cobre mobile inicial |
| ADR-03 | Monorepo com `packages/shared` | Evitar drift de tipos web/mobile |
| ADR-04 | RLS como security layer principal | Funciona igual para web e mobile |
| ADR-05 | Asaas só para assinatura SaaS | Pagamento de pedido externo (decisão negócio) |
| ADR-06 | Match via Edge Function | Lógica complexa fora do client; notificações centralizadas |
| ADR-07 | SLA via cron + e-mail no MVP | Push nativo só na fase mobile |

---

## 11. Próximos documentos

| Arquivo | Conteúdo |
|---------|----------|
| [MODULOS.md](./MODULOS.md) | Spec funcional detalhada por módulo |
| [SCHEMA.md](./SCHEMA.md) | DDL, enums, índices (`init` ✅ · RLS 🔜) |
| [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) | Request/response, env vars, fluxos |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Tokens, componentes, padrões UI web |
| `ROADMAP.md` | Sprints e fases de entrega |

---

*Arquitetura alinhada ao PRD v2.0, [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) e kickoff discovery (trans.md).*
