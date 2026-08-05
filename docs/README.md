# Documentação — Keve Marketplace B2B

Documentação revisada do projeto, alinhada ao kickoff de discovery (jun/2026), à reunião Xcomerce (03/08/2026) e focada em **aplicação web React + Supabase** como produto principal. Os apps mobile (Expo) reutilizam o mesmo backend.

---

## Índice

| Documento | Status | Descrição |
|-----------|--------|-----------|
| [PRD.md](./PRD.md) | ✅ Atual | Product Requirements Document completo |
| [ARQUITETURA.md](./ARQUITETURA.md) | ✅ Atual | Stack, estrutura de pastas e backend compartilhado |
| [MODULOS.md](./MODULOS.md) | ✅ Atual | Detalhamento funcional por módulo |
| [ROADMAP.md](./ROADMAP.md) | ✅ Atual | Fases de entrega e status das migrations |
| [QA-CHECKLIST.md](./QA-CHECKLIST.md) | ✅ Novo | Checklist de testes pós-deploy (reunião 03/08) |
| [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) | ✅ Atual | Contratos request/response das Edge Functions |
| [SCHEMA.md](./SCHEMA.md) | ⚠️ Parcial | Modelo de dados — atualizar enums de pedido |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | ✅ Atual | Tokens, componentes e padrões UI (React + Tailwind) |

---

## Princípios desta documentação

1. **Web first** — React (Vite) + Supabase é o produto de referência.
2. **Backend único** — Auth, Postgres, RLS, Storage, Realtime e Edge Functions servem web e mobile.
3. **Mobile em paralelo** — React Native (Expo) consome as mesmas APIs; push nativo em evolução.
4. **MVP enxuto** — Escopo mínimo viável claramente separado de V2/V3.
5. **Alinhamento com negócio** — Decisões das reuniões registradas como requisitos.

---

## Referências

- `Transcricao_Xcomerce_2026-08-03.md` — Reunião de validação funcional e ajustes (ago/2026).
- `trans.md` — Transcrição/resumo Kickoff Discovery (jun/2026).
- `docsbase/` — Documentação anterior (Expo-first); histórico.

---

*Última atualização: ago/2026*
