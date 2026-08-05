# Checklist QA — Reunião 03/08/2026

**Objetivo:** validar as entregas das Fases 1–4 antes de liberar uso com fornecedores reais.  
**Ambientes:** web responsivo (PWA) + apps mobile comprador/fornecedor (Expo).  
**Projeto Supabase:** `wjoyobxpwkdyhnfrwbiu`

---

## Pré-requisitos

- [ ] Migrations `20260803180000` até `20260805140100` aplicadas no remoto
- [ ] Edge Functions `send-notification` e `check-sla-deadlines` deployadas
- [ ] Secrets: `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `CRON_SECRET`
- [ ] Cron `check-sla-deadlines` ativo (`0 * * * *`)
- [ ] Par de contas de teste: 1 comprador + 1 fornecedor aprovado

---

## Fase 1 — UX e nomenclatura

| # | Cenário | Web | Mobile comprador | Mobile fornecedor |
|---|---------|-----|------------------|-------------------|
| 1.1 | Menu inferior/topo exibe **Início** (não "Feed") | ☐ | ☐ | — |
| 1.2 | Onboarding fornecedor acessível em **Configurações → Cadastro** | ☐ | ☐ | ☐ |
| 1.3 | Fornecedor pendente vê badge vermelho e é redirecionado ao cadastro | ☐ | — | ☐ |
| 1.4 | Data de cadastro visível na seção Cadastro | ☐ | ☐ | ☐ |
| 1.5 | Item "Onboard" removido do menu principal | ☐ | — | ☐ |

---

## Fase 2 — Propostas e contato

| # | Cenário | Web | Mobile |
|---|---------|-----|--------|
| 2.1 | Fornecedor envia proposta **sem** limite de 20% abaixo do preço de referência | ☐ | ☐ |
| 2.2 | Preço de referência unitário ainda exibido na tela de proposta | ☐ | ☐ |
| 2.3 | Contato do fornecedor (CNPJ, telefone, e-mail) visível **sem** botão "Revelar" | ☐ | ☐ |
| 2.4 | Header da proposta (comprador) mostra contato junto à localização | ☐ | ☐ |
| 2.5 | Mensagens rápidas no chat preenchem o campo de texto | ☐ | ☐ |
| 2.6 | Prazo desejado da demanda aceita data+hora (fornecedor) | ☐ | ☐ |

---

## Fase 3 — Notificações

| # | Cenário | Web | Mobile |
|---|---------|-----|--------|
| 3.1 | Nova proposta → notificação in-app + e-mail (comprador) | ☐ | ☐ |
| 3.2 | Nova mensagem de chat → notificação in-app + e-mail | ☐ | ☐ |
| 3.3 | Badge atualiza em tempo real sem recarregar página | ☐ | ☐ |
| 3.4 | Clique na notificação navega para rota correta (`data.route`) | ☐ | ☐ |
| 3.5 | Preferências do **fornecedor** usam tipos de notificação corretos | ☐ | ☐ |
| 3.6 | Desabilitar e-mail/in-app nas preferências é respeitado | ☐ | ☐ |

---

## Fase 4 — Pedidos (fluxo pós-aceite)

### Fluxo E2E principal

| Passo | Ação | Resultado esperado | ☐ |
|-------|------|-------------------|---|
| 4.1 | Comprador aceita proposta | Pedido criado; status **Aguardando pagamento** | |
| 4.2 | Comprador anexa comprovante (PDF/imagem) | Status → **Comprovante enviado**; fornecedor notificado | |
| 4.3 | Card do fornecedor mostra nome + telefone do comprador | Dados visíveis sem abrir detalhe | |
| 4.4 | Fornecedor clica **Confirmar pagamento** no card | Status → **Pagamento confirmado**; pedido vai para aba pós-pagamento | |
| 4.5 | Fornecedor clica **Imprimir pedido** (web) ou **Compartilhar** (mobile) | Documento/resumo com dados do pedido e cliente | |
| 4.6 | Fornecedor informa envio | Status → **Envio informado** | |
| 4.7 | Comprador confirma recebimento | Status → **Entregue** | |
| 4.8 | Comprador confirma conclusão | Status → **Concluído**; reputação habilitada | |

### Abas fornecedor (lista de pedidos)

| Aba | Deve incluir status | ☐ |
|-----|---------------------|---|
| Aceito / Aguardando pagamento | `PROPOSTA_ACEITA`, `AGUARDANDO_CONFIRMACAO_EXTERNA`, `COMPROVANTE_ENVIADO` | |
| Em produção* | `PAGAMENTO_CONFIRMADO`, `ENVIO_INFORMADO`, `ENTREGUE` (+ legado `PAGAMENTO_INFORMADO`) | |
| Concluído | `CONCLUIDO`, `CANCELADO`, `EXPIRADO` | |

\* Label na UI ainda é **Em produção**; reunião sugeriu renomear para **Em separação** (pendente).

### SLAs

| # | Cenário | ☐ |
|---|---------|---|
| 4.9 | Após comprovante, SLA **Confirmar pagamento** criado para fornecedor | |
| 4.10 | Lembrete SLA exibe label legível (não `confirm_payment` cru) | |
| 4.11 | Histórico/timeline registra cada transição de status | |

---

## Regressão rápida

| # | Cenário | ☐ |
|---|---------|---|
| R.1 | Publicar demanda → match no board do fornecedor | |
| R.2 | Cota de propostas mensal respeitada | |
| R.3 | Chat bloqueia telefone/e-mail antes de aceite (se ainda aplicável pós-reveal global) | |
| R.4 | Admin aprova fornecedor → notificação + acesso ao board | |
| R.5 | Cancelamento de pedido exige motivo e registra log | |

---

## Itens fora de escopo (reunião 03/08 — não bloqueiam QA)

- Renomear aba **Em produção** → **Em separação**
- Status intermediário **Pronto para retirada** (entre envio e concluído)
- Notificações WhatsApp
- Auto-proposta (permanece desativada até planos pagos)
- Página pública do vendedor (estilo Chope)
- Remoção do banner estático do feed
- Métricas extras no header da proposta (taxa de resposta, qtd. catálogo)

---

## Registro de execução

| Data | Executor | Ambiente | Resultado | Observações |
|------|----------|----------|-----------|-------------|
| | | | | |

---

*Derivado de `Transcricao_Xcomerce_2026-08-03.md` e entregas Fases 1–4 (ago/2026).*
