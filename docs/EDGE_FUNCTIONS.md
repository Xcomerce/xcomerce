# Edge Functions — Contratos Request/Response

**Versão:** 2.0  
**Data:** jun/2026  
**Runtime:** Supabase Edge Functions (Deno)  
**Referência:** [ARQUITETURA.md](./ARQUITETURA.md) · [MODULOS.md](./MODULOS.md)

---

## Convenções globais

### Base URL

```
https://{project_ref}.supabase.co/functions/v1/{function-name}
```

Local:
```
http://127.0.0.1:54321/functions/v1/{function-name}
```

### Formato de erro padrão

```json
{
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Limite mensal de demandas atingido.",
    "details": {}
  }
}
```

| HTTP | Uso |
|------|-----|
| 200 | Sucesso |
| 201 | Recurso criado |
| 400 | Payload inválido |
| 401 | Não autenticado |
| 403 | Sem permissão |
| 404 | Recurso não encontrado |
| 409 | Conflito (idempotência, duplicata) |
| 422 | Regra de negócio violada |
| 500 | Erro interno |

### Autenticação

| Tipo | Header | Uso |
|------|--------|-----|
| Usuário logado | `Authorization: Bearer {jwt}` | Chamadas do client web/mobile |
| Service role | `Authorization: Bearer {service_role_key}` | Chamadas internas/triggers |
| Webhook | Header customizado + HMAC | Asaas, DB webhooks |
| Cron | `Authorization: Bearer {CRON_SECRET}` | Jobs agendados |

### Variáveis de ambiente (todas as functions)

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=          # quando validar JWT do caller
```

---

## Índice de functions

| Function | Trigger | MVP | Descrição |
|----------|---------|-----|-----------|
| `match-demand` | DB webhook / HTTP interno | ✅ | Match fornecedores + notificações |
| `send-email` | HTTP interno | ✅ | E-mail transacional (Resend) |
| `send-notification` | HTTP interno | ✅ | Orquestra in-app + e-mail (+ push F2) |
| `asaas-webhook` | HTTP POST Asaas | ✅ | Sync assinaturas |
| `create-checkout` | HTTP (client) | ✅ | Gera link checkout Asaas |
| `check-sla-deadlines` | Cron | ✅ | Lembretes e penalidades SLA |
| `lookup-cnpj` | HTTP (client) | ✅ | Proxy API CNPJ |
| `send-push` | HTTP interno | F2 | Expo Push API |

---

## 1. `match-demand`

Disparada quando uma demanda muda para status `PUBLICADA`.

### Trigger

**Opção A (recomendada):** Database Webhook no Supabase  
- Tabela: `demands`  
- Evento: `UPDATE`  
- Filtro: `status = 'PUBLICADA'` (transição)

**Opção B:** Postgres trigger → `pg_net.http_post` para a function

### Request (invocação interna)

```http
POST /functions/v1/match-demand
Authorization: Bearer {service_role_key}
Content-Type: application/json
```

```json
{
  "demand_id": "550e8400-e29b-41d4-a716-446655440000",
  "idempotency_key": "demand-550e8400-publish"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| demand_id | uuid | sim | ID da demanda publicada |
| idempotency_key | string | não | Evita reprocessamento duplicado |

### Response 200

```json
{
  "demand_id": "550e8400-e29b-41d4-a716-446655440000",
  "matches_created": 12,
  "suppliers_notified": 12,
  "skipped": {
    "already_matched": 0,
    "not_approved": 3,
    "out_of_region": 8
  },
  "processing_ms": 245
}
```

### Lógica interna

```
1. Buscar demanda (category, city, uf, raio_km)
2. Se idempotency_key já processado → 409
3. Query fornecedores elegíveis (aprovados + categoria + geo)
4. Calcular score por fornecedor
5. Ordenar (Gold first → score desc)
6. INSERT demand_matches (ON CONFLICT DO NOTHING)
7. Para cada match → chamar send-notification (tipo demand.matched)
8. Registrar processamento idempotente
9. Retornar resumo
```

### Erros

| code | HTTP | Quando |
|------|------|--------|
| `DEMAND_NOT_FOUND` | 404 | demand_id inválido |
| `DEMAND_NOT_PUBLISHED` | 422 | status ≠ PUBLICADA |
| `ALREADY_PROCESSED` | 409 | idempotency_key duplicado |

### Env vars adicionais

Nenhuma (usa Supabase client com service role).

---

## 2. `send-email`

Envio de e-mail transacional via Resend. Chamada **somente interna** (service role ou outras Edge Functions).

### Request

```http
POST /functions/v1/send-email
Authorization: Bearer {service_role_key}
Content-Type: application/json
```

```json
{
  "to": "fornecedor@empresa.com.br",
  "template": "demand_matched",
  "locale": "pt-BR",
  "data": {
    "supplier_name": "João Silva",
    "demand_title": "100 un. parafuso M8",
    "demand_city": "São Paulo",
    "action_url": "https://app.keve.com.br/supplier/board"
  },
  "idempotency_key": "email-demand-matched-abc123"
}
```

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| to | string | sim |
| template | string | sim |
| locale | string | não (default pt-BR) |
| data | object | sim |
| idempotency_key | string | recomendado |

### Templates MVP

| template | Destinatário | Variáveis data |
|----------|--------------|----------------|
| `demand_matched` | Fornecedor | supplier_name, demand_title, demand_city, action_url |
| `offer_received` | Comprador | buyer_name, demand_title, offer_count, action_url |
| `chat_message` | Ambos | sender_name, demand_title, preview, action_url |
| `order_status_changed` | Ambos | order_id, new_status, action_url |
| `sla_reminder` | Responsável | order_id, action_name, deadline_at, action_url |
| `sla_expired` | Ambos | order_id, action_name, action_url |
| `supplier_approved` | Fornecedor | supplier_name, action_url |
| `supplier_rejected` | Fornecedor | supplier_name, reason, action_url |
| `subscription_activated` | Usuário | plan_name, action_url |
| `subscription_past_due` | Usuário | plan_name, action_url |

### Response 200

```json
{
  "sent": true,
  "message_id": "re_abc123xyz",
  "template": "demand_matched"
}
```

### Response 422 (preferência opt-out)

```json
{
  "sent": false,
  "skipped": true,
  "reason": "user_opted_out"
}
```

### Env vars

```bash
RESEND_API_KEY=
EMAIL_FROM=noreply@keve.com.br
APP_URL=https://app.keve.com.br
```

---

## 3. `send-notification`

Orquestrador: cria registro in-app e dispara e-mail (e push na F2).

### Request

```http
POST /functions/v1/send-notification
Authorization: Bearer {service_role_key}
Content-Type: application/json
```

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "type": "offer.received",
  "title": "Nova proposta recebida",
  "body": "Você recebeu 1 nova proposta na demanda \"100 un. parafuso M8\".",
  "data": {
    "demand_id": "550e8400-e29b-41d4-a716-446655440000",
    "offer_id": "550e8400-e29b-41d4-a716-446655440002",
    "route": "/buyer/demands/550e8400-e29b-41d4-a716-446655440000"
  },
  "channels": ["in_app", "email"],
  "group_key": "demand-550e8400-offers",
  "idempotency_key": "notif-offer-abc"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| user_id | uuid | sim | Destinatário |
| type | string | sim | Evento (ver MODULOS M11) |
| title | string | sim | Título in-app |
| body | string | sim | Corpo in-app/e-mail |
| data | object | sim | Payload + route para deep link |
| channels | string[] | sim | `in_app`, `email`, `push` |
| group_key | string | não | Agrupa notificações (ex.: propostas por demanda) |
| idempotency_key | string | recomendado | |

### Comportamento de agrupamento

Se `group_key` informado e já existe notificação não lida com mesma key:
- Atualiza `body` com count incrementado
- Não cria duplicata
- Exemplo: "Você recebeu **3** novas propostas na demanda X"

### Response 200

```json
{
  "notification_id": "660e8400-e29b-41d4-a716-446655440003",
  "channels_sent": {
    "in_app": true,
    "email": true,
    "push": false
  },
  "grouped": false
}
```

### Response 200 (agrupado)

```json
{
  "notification_id": "660e8400-e29b-41d4-a716-446655440003",
  "channels_sent": {
    "in_app": true,
    "email": false
  },
  "grouped": true,
  "group_count": 3
}
```

---

## 4. `asaas-webhook`

Recebe eventos de assinatura do Asaas.

### Request (Asaas → Supabase)

```http
POST /functions/v1/asaas-webhook
Content-Type: application/json
asaas-access-token: {ASAAS_WEBHOOK_SECRET}
```

Payload exemplo (estrutura Asaas — adaptar conforme docs Asaas):

```json
{
  "event": "PAYMENT_CONFIRMED",
  "payment": {
    "id": "pay_abc123",
    "customer": "cus_xyz789",
    "subscription": "sub_def456",
    "value": 99.9,
    "status": "CONFIRMED",
    "billingType": "PIX"
  }
}
```

### Eventos processados (MVP)

| event Asaas | Ação |
|-------------|------|
| `PAYMENT_CONFIRMED` | `subscriptions.status = active`, atualiza period_end |
| `PAYMENT_OVERDUE` | `subscriptions.status = past_due` |
| `SUBSCRIPTION_DELETED` | `subscriptions.status = canceled` |
| `SUBSCRIPTION_UPDATED` | Sync plan_id se mudou |

### Response 200

```json
{
  "received": true,
  "event": "PAYMENT_CONFIRMED",
  "subscription_id": "550e8400-e29b-41d4-a716-446655440010",
  "new_status": "active"
}
```

### Response 401

Token inválido → Asaas retentará.

### Lógica interna

```
1. Validar asaas-access-token header
2. Parse event + payment/subscription
3. Buscar subscription por asaas_subscription_id ou asaas_customer_id
4. Mapear event → novo status
5. UPDATE subscriptions
6. Se ativou → send-notification (subscription_activated)
7. Se past_due → send-notification (subscription_past_due)
8. INSERT audit_logs
9. Retornar 200 (sempre que possível, para evitar retry storm)
```

### Env vars

```bash
ASAAS_WEBHOOK_SECRET=
ASAAS_API_KEY=              # para consultas complementares se necessário
```

---

## 5. `create-checkout`

Gera sessão/link de checkout Asaas para upgrade de plano.

### Request (client autenticado)

```http
POST /functions/v1/create-checkout
Authorization: Bearer {user_jwt}
Content-Type: application/json
```

```json
{
  "plan_id": "550e8400-e29b-41d4-a716-446655440020",
  "billing_type": "PIX",
  "success_url": "https://app.keve.com.br/settings/billing?success=1",
  "cancel_url": "https://app.keve.com.br/pricing"
}
```

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| plan_id | uuid | sim |
| billing_type | enum | sim | `PIX`, `BOLETO`, `CREDIT_CARD` |
| success_url | string | sim |
| cancel_url | string | sim |

### Response 200

```json
{
  "checkout_url": "https://www.asaas.com/c/abc123",
  "asaas_customer_id": "cus_xyz789",
  "expires_at": "2026-06-03T18:00:00Z"
}
```

### Erros

| code | HTTP | Quando |
|------|------|--------|
| `PLAN_NOT_FOUND` | 404 | plan_id inválido ou inativo |
| `ALREADY_SUBSCRIBED` | 409 | já tem assinatura active no mesmo plano |

### Env vars

```bash
ASAAS_API_KEY=
ASAAS_API_URL=https://api.asaas.com/v3
APP_URL=
```

---

## 6. `check-sla-deadlines`

Job cron para lembretes e penalidades de SLA em pedidos.

### Trigger

```http
POST /functions/v1/check-sla-deadlines
Authorization: Bearer {CRON_SECRET}
```

Agendamento sugerido: **a cada 15 minutos** (Supabase Cron ou pg_cron).

### Request

```json
{
  "dry_run": false
}
```

| Campo | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| dry_run | boolean | false | Se true, só retorna o que faria |

### Response 200

```json
{
  "checked_at": "2026-06-02T12:00:00Z",
  "reminders_sent": 5,
  "expired_processed": 2,
  "details": {
    "reminders": [
      {
        "order_id": "ord_001",
        "deadline_id": "sla_001",
        "responsible_user_id": "user_001",
        "action": "inform_payment"
      }
    ],
    "expired": [
      {
        "order_id": "ord_002",
        "deadline_id": "sla_002",
        "reputation_event_created": true,
        "order_status": "EXPIRADO"
      }
    ]
  }
}
```

### Lógica interna

```
1. Buscar order_sla_deadlines WHERE status = 'pending'
2. Para cada deadline:
   a. Se now >= deadline_at - 4h AND reminder_sent = false
      → send-notification (sla_reminder) → reminder_sent = true
   b. Se now >= deadline_at AND status = 'pending'
      → INSERT reputation_events (sla_missed)
      → send-notification (sla_expired) para ambas partes
      → UPDATE deadline status = 'expired'
      → Se configurado: UPDATE order status = 'EXPIRADO'
3. Retornar resumo
```

### Env vars

```bash
CRON_SECRET=
SLA_DEFAULT_HOURS=24
SLA_REMINDER_HOURS_BEFORE=4
```

---

## 7. `lookup-cnpj`

Proxy para API de CNPJ (evita expor token no client e centraliza cache).

### Request (client autenticado)

```http
GET /functions/v1/lookup-cnpj?cnpj=12345678000199
Authorization: Bearer {user_jwt}
```

### Response 200

```json
{
  "cnpj": "12345678000199",
  "razao_social": "Empresa Exemplo LTDA",
  "nome_fantasia": "Exemplo",
  "situacao": "ATIVA",
  "endereco": {
    "logradouro": "Rua Exemplo, 100",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "uf": "SP",
    "cep": "01001000"
  },
  "cached": false
}
```

### Response 404

```json
{
  "error": {
    "code": "CNPJ_NOT_FOUND",
    "message": "CNPJ não encontrado na Receita Federal."
  }
}
```

### Response 409

```json
{
  "error": {
    "code": "CNPJ_ALREADY_REGISTERED",
    "message": "Este CNPJ já está cadastrado na plataforma."
  }
}
```

### Regras

- Rate limit: 10 req/min por user_id
- Cache em memória ou tabela `cnpj_cache` (TTL 24h)
- Valida dígitos verificadores antes de chamar API externa

### Env vars

```bash
CNPJ_API_URL=https://brasilapi.com.br/api/cnpj/v1
CNPJ_API_TOKEN=              # se provedor exigir
```

---

## 8. `send-push` (Fase 2 — Mobile)

Envia push via Expo Push API para tokens registrados.

### Request (interno)

```http
POST /functions/v1/send-push
Authorization: Bearer {service_role_key}
Content-Type: application/json
```

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "Nova oportunidade",
  "body": "Demanda compatível em São Paulo",
  "data": {
    "route": "/supplier/board",
    "demand_id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "idempotency_key": "push-demand-matched-abc"
}
```

### Response 200

```json
{
  "sent": true,
  "tokens_targeted": 2,
  "tokens_success": 2,
  "tokens_failed": 0,
  "receipts": [
    { "token": "ExponentPushToken[xxx]", "status": "ok" }
  ]
}
```

### Lógica

```
1. Buscar user_push_tokens WHERE user_id AND active = true
2. Montar payload Expo Push API (batch até 100)
3. POST https://exp.host/--/api/v2/push/send
4. Desativar tokens inválidos (DeviceNotRegistered)
5. Retornar resumo
```

### Env vars

```bash
EXPO_ACCESS_TOKEN=           # opcional, para rate limits maiores
```

---

## Fluxos entre functions

### Publicar demanda

```
Client → INSERT demands (status=PUBLICADA) via Supabase Client + RLS
  → DB Webhook → match-demand
    → send-notification (fornecedores, type=demand.matched)
      → send-email (template=demand_matched)
      → [F2] send-push
```

### Nova proposta

```
Client → INSERT offers via Supabase Client + RLS
  → DB Trigger → send-notification (comprador, type=offer.received, group_key)
    → send-email (template=offer_received, debounced se grouped)
```

### Webhook Asaas

```
Asaas → asaas-webhook
  → UPDATE subscriptions
  → send-notification (subscription_activated | past_due)
    → send-email
```

### Cron SLA

```
Cron → check-sla-deadlines
  → send-notification (sla_reminder | sla_expired)
    → send-email
  → INSERT reputation_events
```

---

## Seguridade

| Function | Quem pode chamar |
|----------|------------------|
| `match-demand` | Service role / DB webhook apenas |
| `send-email` | Service role apenas |
| `send-notification` | Service role apenas |
| `asaas-webhook` | Asaas (validação token) |
| `create-checkout` | JWT usuário autenticado |
| `check-sla-deadlines` | Cron secret |
| `lookup-cnpj` | JWT autenticado |
| `send-push` | Service role apenas |

**Nunca** expor `SUPABASE_SERVICE_ROLE_KEY` no client web/mobile.

---

## Deploy e testes locais

```bash
# Servir function localmente
supabase functions serve match-demand --env-file supabase/.env.local

# Invocar
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/match-demand' \
  --header 'Authorization: Bearer {service_role_key}' \
  --header 'Content-Type: application/json' \
  --data '{"demand_id":"550e8400-e29b-41d4-a716-446655440000"}'

# Deploy
supabase functions deploy match-demand
supabase functions deploy asaas-webhook --no-verify-jwt
```

> `asaas-webhook` e `check-sla-deadlines` devem usar `--no-verify-jwt` (autenticação customizada).

---

## Próximos passos

- [ ] Implementar functions na ordem: `send-email` → `send-notification` → `match-demand` → `asaas-webhook` → `check-sla-deadlines`
- [ ] Definir payloads exatos Asaas após conta sandbox
- [ ] Documentar templates HTML de e-mail
- [ ] Adicionar testes Deno (`supabase/functions/_tests/`)

---

*Contratos alinhados ao PRD v2.0 e MODULOS.md.*
