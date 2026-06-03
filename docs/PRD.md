# PRD — Keve Marketplace B2B (Busca Reversa)

**Versão:** 2.0  
**Status:** Discovery consolidado  
**Data:** jun/2026  
**Stack alvo:** React (web/PWA) + Supabase · Mobile nativo em fase posterior

---

## 1. Visão do produto

### 1.1 Problema

**Compradores** precisam procurar fornecedores manualmente, solicitar vários orçamentos em canais dispersos, negociar separadamente e validar credibilidade sem referência confiável.

**Fornecedores** têm dificuldade em encontrar demanda qualificada, alto custo de aquisição e baixa previsibilidade de vendas.

### 1.2 Solução

Plataforma marketplace baseada em **busca reversa**: o comprador publica uma demanda; o sistema identifica fornecedores elegíveis (categoria + localização + catálogo); fornecedores enviam propostas; comprador compara e negocia **dentro da plataforma**; o fechamento comercial ocorre **fora** da plataforma (pagamento e logística externos).

### 1.3 Posicionamento

- Referência de mercado: **OLX** (comportamento local, classificado regional).
- Diferencial: **notificação direta** a fornecedores relevantes + **dinâmica de cotação/leilão** centralizada.
- A plataforma é **intermediadora de conexões**, não marketplace transacional.

### 1.4 Princípios de produto (decisões do kickoff)

| Princípio | Regra |
|-----------|-------|
| Sem pagamento de pedido | Plataforma não processa pagamento entre comprador e fornecedor |
| Sem logística | Plataforma não gerencia envio de mercadorias |
| Monitoramento de integridade | Acompanha status do pedido para reputação e confiança |
| Curadoria > alarmismo | Foco em fornecedores verificados; sem avisos excessivos de "cuidado" |
| Compra local | Prioridade geográfica (cidade/região) |
| Propostas unificadas | Respostas agrupadas por demanda/produto; evitar bombardeio de notificações |

---

## 2. Objetivos e KPIs

### 2.1 Objetivos de negócio

- Criar marketplace regionalizado B2B
- Escalar base de fornecedores verificados
- Gerar recorrência via assinatura SaaS
- Reduzir tempo médio de cotação
- Aumentar taxa de conversão demanda → pedido fechado

### 2.2 KPIs

| KPI | Descrição |
|-----|-----------|
| Tempo médio — primeira resposta | Demanda publicada → primeira proposta recebida |
| Tempo médio — fechamento | Demanda publicada → pedido concluído |
| Taxa conversão demanda → pedido | Demandas que viram pedido |
| Taxa resposta fornecedor | Demandas notificadas → proposta enviada |
| Fornecedores ativos | Fornecedores com ≥1 proposta no período |
| Pedidos abandonados | Pedidos cancelados ou expirados |
| Score reputacional médio | Média de avaliações (comprador e fornecedor) |
| MRR | Receita recorrente de assinaturas |

---

## 3. Personas e papéis

### 3.1 Comprador

**Objetivo:** Encontrar produtos e fornecedores confiáveis rapidamente.

**Permissões:** Publicar demandas · Comparar propostas · Negociar via chat · Aceitar proposta · Acompanhar pedido · Avaliar fornecedor · Gerenciar assinatura

### 3.2 Fornecedor

**Objetivo:** Receber oportunidades qualificadas na região.

**Permissões:** Cadastrar catálogo · Responder demandas · Enviar propostas · Negociar via chat · Acompanhar pedidos · Avaliar comprador · Gerenciar assinatura

**Requisito:** Passar por verificação interna (CNPJ + documentos) para receber selo **Verificado**.

### 3.3 Comercial (interno)

**Objetivo:** Captar e onboardar fornecedores/compradores.

**Permissões:** CRM de leads · Convites · Funil comercial · Visualizar métricas de captação

### 3.4 Admin (interno)

**Objetivo:** Operar e moderar a plataforma.

**Permissões:** Aprovar/recusar fornecedores · Moderar conteúdo · Configurar fluxos de pedido · Dashboards · Auditoria · Gestão de categorias e planos

---

## 4. Modelo de monetização

### 4.1 Assinatura recorrente (SaaS)

- Período inicial de **teste gratuito** (trial temporal — ex.: 14 dias)
- Após trial: planos pagos com limites diferenciados
- Cobrança via gateway externo (**Asaas**) — assinatura da plataforma, **não** pagamento de pedidos
- Pagamento de pedido entre usuários permanece **100% externo** (evita comissão de app stores no mobile)

### 4.2 Planos (referência MVP)

| Recurso | Free / Trial | Pro | Gold |
|---------|--------------|-----|------|
| Demandas/mês (comprador) | 3 | 15 | Ilimitado |
| Propostas/mês (fornecedor) | 5 | 30 | Ilimitado |
| Itens no catálogo | 10 | 50 | 200 |
| Prioridade no match | — | — | Sim |
| Selo verificado | Após aprovação | Após aprovação | Após aprovação |

*Valores e limites finais a definir com área comercial.*

---

## 5. Escopo funcional

### 5.1 MVP (entrega inicial — web)

| # | Módulo | Incluído no MVP |
|---|--------|-----------------|
| 1 | Landing + captação | ✅ |
| 2 | Autenticação + RBAC | ✅ |
| 3 | Cadastro/onboarding + verificação CNPJ | ✅ |
| 4 | Catálogo do fornecedor | ✅ |
| 5 | Busca reversa (demandas) | ✅ |
| 6 | Motor de match + notificações | ✅ |
| 7 | Propostas (mural por demanda) | ✅ |
| 8 | Chat contextual | ✅ |
| 9 | Workflow de pedido (simplificado) | ✅ |
| 10 | Reputação bidirecional | ✅ |
| 11 | Notificações (in-app + e-mail) | ✅ |
| 12 | Admin (aprovações + dashboards básicos) | ✅ Parcial |
| 13 | Assinaturas e limites (Asaas) | ✅ |

### 5.2 Fora do MVP (V2+)

- Push nativo (app React Native)
- Antifraude avançado / IA de matching
- CRM comercial completo
- Configuração de múltiplos fluxos de pedido no admin (3–5 cenários)
- Auditoria automatizada de comprovantes
- Machine learning de ranking

---

## 6. Requisitos funcionais detalhados

### 6.1 Landing e captação

- LP para comprador e fornecedor (rotas distintas ou seções)
- Formulário de lead com consentimento LGPD
- SEO básico (meta tags, URLs amigáveis)
- Analytics (eventos de conversão)

### 6.2 Autenticação e RBAC

- Login e-mail/senha via Supabase Auth
- Papéis: `buyer`, `supplier`, `commercial`, `admin`
- Um usuário pode ter perfil comprador **e/ou** fornecedor (decisão técnica: perfis separados ligados ao mesmo `auth.users`)
- Guards de rota no frontend por papel
- RLS no backend como fonte de verdade

### 6.3 Cadastro e onboarding

**Comprador:** dados básicos + empresa (CNPJ opcional ou obrigatório — validar com comercial).

**Fornecedor:**
1. Consulta CNPJ (API externa) com autopreenchimento
2. Upload de documentos (CNPJ, comprovante) → Supabase Storage
3. Status: `pendente` → `em_revisao` → `aprovado` | `recusado`
4. Selo **Verificado** após aprovação admin
5. Fornecedor **não recebe matches** enquanto status ≠ `aprovado`

### 6.4 Catálogo do fornecedor

**Campos:** nome, SKU, categoria, descrição, marca, preço referência, imagem, cidade, ativo.

**UX (decisão Keven):**
- Imagens **pequenas** em grid denso
- Título abaixo ou ao lado da imagem — **nunca sobrepondo** a foto
- Grid responsivo: mais colunas em desktop, menos em mobile

**Limites:** respeitar `max_catalog_items` do plano ativo.

### 6.5 Busca reversa (demandas)

**Fluxo:**
```
Comprador cria demanda
  → Sistema valida cota mensal do plano
  → Motor de match encontra fornecedores elegíveis
  → Notificações enviadas (agrupadas)
  → Fornecedores enviam propostas
  → Comprador vê propostas UNIFICADAS por demanda
  → Negociação via chat
  → Aceite → Pedido criado
  → Acompanhamento externo (comprovante, rastreio)
  → Conclusão → Avaliações mútuas
```

**Campos da demanda:** produto/descrição, categoria, quantidade, cidade/UF, raio (opcional), prazo desejado, observações, anexos (opcional).

**Geolocalização (web):** sugestão de cidade via browser geolocation API com fallback manual.

### 6.6 Motor de match

**Critérios (peso sugerido):**
1. Categoria compatível com catálogo ou tags do fornecedor
2. Mesma cidade ou dentro do raio configurado
3. Fornecedor com status `aprovado` + selo verificado
4. Plano Gold → prioridade na fila de notificação
5. Reputação do fornecedor (desempate)

**Comportamento de notificação:**
- Agrupar alertas por demanda (não 1 push/e-mail por fornecedor individual para o comprador)
- Fornecedor recebe 1 notificação por demanda elegível
- Digest opcional se múltiplas demandas na mesma hora (V2)

### 6.7 Propostas

Fornecedor envia por demanda:
- Valor · Prazo de entrega · Validade da proposta · Quantidade · Mensagem

**Tela do comprador:** todas as propostas da demanda X em um único painel, ordenáveis por preço/prazo/reputação.

**Limites:** respeitar `max_offers_monthly` do plano do fornecedor.

### 6.8 Chat contextual

- Chat vinculado à demanda + proposta (ou thread por par comprador-fornecedor dentro da demanda)
- Mensagens em tempo real (Supabase Realtime)
- Anexos de imagem (Storage)
- Histórico persistente
- **Proteção anti-desintermediação (MVP):** filtro regex bloqueando telefone, e-mail e links em mensagens enquanto contato não liberado
- **Reveal Contact:** comprador pode revelar contato após aceitar proposta ou ação explícita; dados sensíveis expostos via view SQL com RLS

### 6.9 Workflow de pedido

**Estados MVP (simplificado):**

```
RASCUNHO → PUBLICADA → OFERTAS_RECEBIDAS → EM_NEGOCIACAO
  → PROPOSTA_ACEITA → AGUARDANDO_CONFIRMACAO_EXTERNA
  → CONCLUIDO | CANCELADO | EXPIRADO
```

**Estados estendidos (pós-aceite, monitoramento externo):**

```
AGUARDANDO_CONFIRMACAO_EXTERNA
  → PAGAMENTO_INFORMADO (comprovante anexado pelo comprador)
  → ENVIO_INFORMADO (link/código de rastreio pelo fornecedor)
  → ENTREGUE (confirmação mútua)
  → CONCLUIDO
```

**SLAs por etapa (decisão kickoff):**
- Prazo padrão: **24 horas** por ação pendente (configurável no admin — V2)
- Lembrete via e-mail (+ push no app nativo futuro) antes do vencimento
- Expiração do prazo → impacto na reputação (registro em `reputation_events`)
- Cancelamento por impasse → registro auditável

> **Nota:** Pagamento e envio são **informados** na plataforma, não **processados**. Comprovantes são evidência para reputação, não validação financeira.

### 6.10 Reputação (bidirecional)

**Após pedido `CONCLUIDO`:**
- Comprador avalia fornecedor (1–5 estrelas + comentário opcional)
- Fornecedor avalia comprador (1–5 estrelas + comentário opcional)

**Métricas públicas no perfil:**
- Nota média · Pedidos concluídos · Taxa de resposta · Cancelamentos · Cumprimento de prazos (SLA)

**Regra:** avaliação só permitida uma vez por pedido, após status `CONCLUIDO`.

### 6.11 Notificações

| Canal | MVP (web) | Mobile (futuro) |
|-------|-----------|-----------------|
| In-app (badge + lista) | ✅ | ✅ |
| E-mail (lembretes, digest) | ✅ | ✅ |
| Push nativo | — | ✅ |

**Eventos notificáveis:**
- Nova demanda compatível (fornecedor)
- Nova proposta recebida (comprador) — agrupada por demanda
- Mensagem de chat
- Prazo de ação próximo ao vencimento
- Mudança de status do pedido
- Aprovação/recusa de cadastro fornecedor

### 6.12 Admin

**MVP:**
- Fila de aprovação de fornecedores (documentos + dados)
- Dashboard: usuários ativos, demandas, propostas, MRR
- Gestão de categorias
- Logs de auditoria básicos

**V2:**
- Configuração de 3–5 cenários de fluxo de pedido (action item kickoff)
- Moderação de chat e denúncias
- Configuração de SLAs por etapa

### 6.13 Assinaturas e limites

- Checkout Asaas (Pix, boleto, cartão) em página web
- Webhook Asaas → Edge Function → atualiza `subscriptions`
- Paywall no frontend ao esgotar cotas (demandas, propostas, catálogo)
- Trial: acesso Pro por N dias; downgrade automático para Free

---

## 7. Requisitos não funcionais

| Requisito | Meta |
|-----------|------|
| Usuários cadastrados | 100.000 |
| Usuários simultâneos | 5.000 – 10.000 |
| Disponibilidade | 99,9% |
| Latência API (P95) | < 300 ms |
| PWA | Instalável, responsivo, offline mínimo (shell + cache estático) |
| LGPD | Consentimento, exportação e exclusão de dados |
| Acessibilidade | WCAG 2.1 AA (web) |
| Segurança | RLS em todas as tabelas sensíveis; Storage com policies |

---

## 8. Plataformas

### 8.1 Fase 1 — Web (prioridade)

- React + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- PWA (service worker, manifest)
- Responsivo mobile-first

### 8.2 Fase 2 — Mobile nativo

- React Native (Expo)
- **Mesmo backend Supabase** (Auth, DB, Storage, Realtime, Edge Functions)
- Push nativo via Expo Notifications
- Geolocalização nativa
- Deep linking para telas de demanda/chat

> O mobile **não duplica** regras de negócio. Toda validação crítica vive no Postgres (RLS, triggers, functions) e Edge Functions.

---

## 9. Integrações externas

| Serviço | Uso |
|---------|-----|
| Supabase | Auth, DB, Storage, Realtime, Edge Functions |
| Asaas | Assinaturas SaaS (não pagamento de pedido) |
| API CNPJ | Validação e autopreenchimento (ReceitaWS, BrasilAPI ou similar) |
| Resend / SendGrid | E-mail transacional |
| Sentry (opcional) | Monitoramento de erros |

---

## 10. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Fraude / fornecedor falso | Verificação rigorosa + selo + curadoria |
| Desintermediação (contato fora) | Chat com filtro + reveal controlado |
| Baixa adesão de fornecedores | Match geolocalizado + notificação direta |
| Abandono de pedidos | SLAs + lembretes + impacto reputacional |
| Concorrência simultânea em demanda | Locks otimistas + status atômico no Postgres |
| LGPD / responsabilidade | Termos claros; plataforma não processa pagamento |
| Escalabilidade | Índices, connection pooling, cache de leitura (V2) |

---

## 11. Pendências e validações

- [ ] Validar aspectos jurídicos da intermediação (action item kickoff)
- [ ] Consolidar concepções comerciais com Elias (planos, preços, trial)
- [ ] Definir 3–5 cenários de fluxo configuráveis no admin
- [ ] Aprovar wireframes das telas principais
- [ ] Escolher provedor definitivo de API CNPJ

---

## 12. Critérios de aceite do MVP

1. Comprador publica demanda e recebe propostas agrupadas na mesma tela
2. Fornecedor verificado recebe notificação de demanda compatível na sua região
3. Chat funcional com bloqueio de contato até reveal
4. Fluxo de pedido com SLAs de 24h e lembretes por e-mail
5. Avaliação mútua após conclusão
6. Admin aprova fornecedor e visualiza métricas básicas
7. Assinatura via Asaas ativa/desativa limites corretamente
8. PWA instalável em mobile e usable em desktop

---

*Documento derivado do kickoff discovery (trans.md) e revisão da documentação anterior (docsbase/).*
