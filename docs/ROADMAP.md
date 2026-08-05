# Keve B2B — Roadmap de Implementação

**Atualizado:** ago/2026  
**Projeto Supabase:** `wjoyobxpwkdyhnfrwbiu`

---

## Entregas reunião 03/08/2026 (Xcomerce)

| Fase | Escopo | Status |
|------|--------|--------|
| **1** | UX/nomenclatura: Início, Cadastro em Configurações, badge fornecedor | ✅ |
| **2** | Propostas: remover 20%, contato visível, header enriquecido, chat quick messages | ✅ |
| **3** | Notificações: pipeline DB + e-mail + realtime badge + prefs fornecedor | ✅ |
| **4** | Pedidos: comprovante → confirmação fornecedor, cards enriquecidos, imprimir | ✅ |
| **5** | Documentação + checklist QA | ✅ |

**Referência:** `Transcricao_Xcomerce_2026-08-03.md` · `docs/QA-CHECKLIST.md`

---

## Divisão de responsabilidades

| Responsável | Ação |
|-------------|------|
| **Time (Eduardo)** | Aplicar migrations no remoto, seeds, secrets EF, deploy functions, webhooks/cron, execução QA |
| **Repo (agente)** | Código web/mobile, edge functions, migrations SQL, documentação |

---

## Migrations

### Baseline (jun/2026)

| Arquivo | Status |
|---------|--------|
| `20260602100000_init.sql` | ✅ |
| `20260602110000_rls.sql` | ✅ |
| `20260602120000_triggers.sql` | ✅ |
| `20260602130000_realtime.sql` | ✅ |

### Reunião 03/08 (ago/2026)

| Arquivo | Conteúdo | Status |
|---------|----------|--------|
| `20260731160000_demand_prazo_timestamptz.sql` | Prazo desejado como timestamptz | ✅ |
| `20260803180000_remove_offer_market_floor.sql` | Remove piso 20%, contato liberado | ✅ |
| `20260805120000_notification_pipeline.sql` | `deliver_notification`, triggers | ✅ |
| `20260805140000_order_status_enum.sql` | Enum `COMPROVANTE_ENVIADO`, `PAGAMENTO_CONFIRMADO` | ✅ |
| `20260805140100_order_status_workflow.sql` | Fluxo pedidos + SLAs + notificações | ✅ |

### Pendente (se ainda não aplicada)

| Arquivo | Conteúdo | Bloqueia |
|---------|----------|----------|
| `20260603100000_storage.sql` | Buckets + policies Storage | Upload M2/M3/M4/M8/M9 |

**Comando:** `npx supabase db push --linked --yes`

---

## Edge Functions — Deploy

Secrets no dashboard: `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_SECRET`, `CRON_SECRET`

```bash
npx supabase functions deploy send-email
npx supabase functions deploy send-notification
npx supabase functions deploy match-demand
npx supabase functions deploy lookup-cnpj
npx supabase functions deploy create-checkout
npx supabase functions deploy asaas-webhook --no-verify-jwt
npx supabase functions deploy check-sla-deadlines --no-verify-jwt
```

| Function | Status ago/2026 |
|----------|-----------------|
| `send-notification` | ✅ Redeploy (prefs in-app/e-mail) |
| `check-sla-deadlines` | ✅ Redeploy (label `confirm_payment`) |
| Demais | Validar no dashboard |

### Webhook remoto (Database Webhook)

- Tabela: `demands`
- Evento: `UPDATE`
- Filtro: status → `PUBLICADA`
- URL: `https://wjoyobxpwkdyhnfrwbiu.supabase.co/functions/v1/match-demand`

### Cron (check-sla-deadlines)

- Schedule: `0 * * * *` (a cada hora)
- Header: `Authorization: Bearer {CRON_SECRET}`

---

## Módulos — Status e DoD

| Módulo | Rota principal | Status | DoD resumido |
|--------|----------------|--------|--------------|
| M1 Landing | `/`, `/para-*`, `/pricing` | ✅ | LP + lead CRM + planos DB |
| M2 Auth | `/auth/*`, `/settings/profile` | ✅ | Perfil editável, avatar, erros PT |
| M3 Cadastro | `/settings/profile?section=registration` | ✅ | Wizard → em_revisao + badge |
| M4 Catálogo | `/supplier/catalog` | ✅ | CRUD + imagens + cota |
| M5 Demandas | `/buyer/dashboard` | ✅ | CRUD + publicar + cota |
| M6 Match | `/supplier/board` | ✅ | Board matches + viewed |
| M7 Propostas | `/buyer/demands/:id` | ✅ | Enviar, contato visível, aceitar |
| M8 Chat | (em demand/offer detail) | ✅ | Realtime + quick messages |
| M9 Pedidos | `/buyer/orders`, `/supplier/orders` | ✅ | Fluxo comprovante + confirmação |
| M10 Reputação | `/profile/:userId` | ✅ | Avaliação pós-pedido + perfil |
| M11 Notificações | `/notifications` | ✅ | Pipeline + badge realtime |
| M12 Admin | `/admin/*` | ✅ | Approvals, metrics, categories, audit |
| M13 Billing | `/settings/billing`, `/pricing` | ✅ | Checkout Asaas + paywall |

---

## Checklist pós-deploy

### Infra

- [ ] Migration storage aplicada (se buckets ausentes)
- [ ] Edge functions deployadas + secrets
- [ ] Webhook `demands` → `match-demand`
- [ ] Cron `check-sla-deadlines`
- [ ] Seed admin executado

### QA funcional (detalhado)

Ver **[QA-CHECKLIST.md](./QA-CHECKLIST.md)** — fluxo E2E completo Fases 1–4.

### Smoke test rápido

- [ ] Signup buyer → subscription Free
- [ ] Signup supplier → cadastro → admin aprova
- [ ] Publicar demanda → matches no board
- [ ] Proposta → aceite → comprovante → confirmar pagamento → envio → concluído
- [ ] Notificações in-app + e-mail em proposta, chat e pedido

---

## Backlog pós-MVP (reunião 03/08)

- Renomear aba pedidos **Em produção** → **Em separação**
- Status **Pronto para retirada** no fluxo de pedidos
- Notificações WhatsApp
- Auto-proposta (ativar com planos pagos)
- Página pública do vendedor
- Remover banner estático do feed
- Métricas extras no header da proposta (taxa resposta, qtd. catálogo)

---

## Ordem de sprints (referência histórica)

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
| **S9** | **Ajustes reunião 03/08 (Fases 1–5)** |
