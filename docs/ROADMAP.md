# Keve B2B — Roadmap de Implementação

**Atualizado:** jun/2026  
**Projeto Supabase:** `wjoyobxpwkdyhnfrwbiu`

---

## Divisão de responsabilidades

| Responsável | Ação |
|-------------|------|
| **Time (Eduardo)** | Aplicar migrations no remoto, seeds, secrets EF, deploy functions, webhooks/cron |
| **Repo (agente)** | Código web, edge functions, migrations SQL (sem executar no remoto) |

---

## Migrations

### Aplicadas (baseline)

| Arquivo | Status |
|---------|--------|
| `20260602100000_init.sql` | ✅ Aplicada |
| `20260602110000_rls.sql` | ✅ Aplicada |
| `20260602120000_triggers.sql` | ✅ Aplicada |
| `20260602130000_realtime.sql` | ✅ Aplicada |

### Pendentes (aplicar quando indicado)

| Arquivo | Conteúdo | Bloqueia |
|---------|----------|----------|
| `20260603100000_storage.sql` | Buckets + policies Storage | Upload M2/M3/M4/M8/M9 |

**Comando sugerido:** SQL Editor ou `supabase db push` (CLI linkado)

---

## Edge Functions — Deploy

Secrets no dashboard: `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_SECRET`, `CRON_SECRET`

```bash
supabase functions deploy send-email
supabase functions deploy send-notification
supabase functions deploy match-demand
supabase functions deploy lookup-cnpj
supabase functions deploy create-checkout
supabase functions deploy asaas-webhook --no-verify-jwt
supabase functions deploy check-sla-deadlines --no-verify-jwt
```

### Webhook remoto (Database Webhook)

- Tabela: `demands`
- Evento: `UPDATE`
- Filtro: status → `PUBLICADA`
- URL: `https://wjoyobxpwkdyhnfrwbiu.supabase.co/functions/v1/match-demand`
- Header: `Authorization: Bearer {service_role_key}`

### Cron (check-sla-deadlines)

- Schedule: `0 * * * *` (a cada hora)
- Header: `Authorization: Bearer {CRON_SECRET}`

---

## Seed / Bootstrap

1. Confirmar `supabase/seed.sql` (planos + categorias) no remoto
2. Executar `supabase/seed_admin.sql` após criar usuário admin no Auth
3. Validar auth E2E: signup buyer/supplier, login, guards RBAC

---

## Módulos — Status e DoD

| Módulo | Rota principal | Status | DoD resumido |
|--------|----------------|--------|--------------|
| M1 Landing | `/`, `/para-*`, `/pricing` | ✅ | LP + lead CRM + planos DB |
| M2 Auth | `/auth/*`, `/settings/profile` | ✅ | Perfil editável, avatar, erros PT |
| M3 Onboarding | `/supplier/onboarding` | ✅ | Wizard 5 passos → em_revisao |
| M4 Catálogo | `/supplier/catalog` | ✅ | CRUD + imagens + cota |
| M5 Demandas | `/buyer/dashboard` | ✅ | CRUD + publicar + cota |
| M6 Match | `/supplier/board` | ✅ | Board matches + viewed |
| M7 Propostas | `/buyer/demands/:id` | ✅ | Enviar, reveal, aceitar |
| M8 Chat | (em demand/offer detail) | ✅ | Realtime + bloqueio contato |
| M9 Pedidos | `/buyer/orders`, `/supplier/orders` | ✅ | Workflow + SLAs + anexos |
| M10 Reputação | `/profile/:userId` | ✅ | Avaliação pós-pedido + perfil |
| M11 Notificações | `/notifications` | ✅ | Feed + badge + preferências |
| M12 Admin | `/admin/*` | ✅ | Approvals, metrics, categories, audit |
| M13 Billing | `/settings/billing`, `/pricing` | ✅ | Checkout Asaas + paywall |

---

## Checklist pós-deploy

- [ ] Migration storage aplicada
- [ ] Edge functions deployadas + secrets
- [ ] Webhook `demands` → `match-demand`
- [ ] Cron `check-sla-deadlines`
- [ ] Seed admin executado
- [ ] Signup buyer → subscription Free
- [ ] Signup supplier → onboarding → admin aprova
- [ ] Publicar demanda → matches no board
- [ ] Proposta → reveal → aceite → pedido
- [ ] Upgrade plano via checkout sandbox Asaas

---

## Ordem de sprints (referência)

| Sprint | Entrega |
|--------|---------|
| S0 | Types, storage migration, EF scaffold, ROADMAP |
| S1 | M2 profile + M13 billing |
| S2 | M3 onboarding + M12 approvals |
| S3 | M4 catálogo |
| S4 | M5 demandas + M6 board |
| S5 | M7 propostas |
| S6 | M8 chat + M9 pedidos |
| S7 | M10 reputação + M11 notificações |
| S8 | M12 admin completo + M1 landing |
