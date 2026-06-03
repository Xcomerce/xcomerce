# Documentação — Keve Marketplace B2B

Documentação revisada do projeto, alinhada ao kickoff de discovery (jun/2026) e focada em **aplicação web React + Supabase** como produto principal. O app nativo React Native reutilizará o mesmo backend.

---

## Índice

| Documento | Status | Descrição |
|-----------|--------|-----------|
| [PRD.md](./PRD.md) | ✅ Atual | Product Requirements Document completo |
| [ARQUITETURA.md](./ARQUITETURA.md) | ✅ Atual | Stack, estrutura de pastas e backend compartilhado |
| [MODULOS.md](./MODULOS.md) | ✅ Atual | Detalhamento funcional por módulo |
| [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) | ✅ Atual | Contratos request/response das Edge Functions |
| [SCHEMA.md](./SCHEMA.md) | ✅ Atual | Modelo de dados, enums e migration init |
| ROADMAP.md | 🔜 Próximo | Fases de entrega (MVP → V2) |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | ✅ Atual | Tokens, componentes e padrões UI (React + Tailwind) |

---

## Princípios desta documentação

1. **Web first** — React (Vite) + Supabase é o produto de referência.
2. **Backend único** — Auth, Postgres, RLS, Storage, Realtime e Edge Functions servem web e mobile.
3. **Mobile depois** — React Native consome as mesmas APIs; push nativo entra na fase mobile.
4. **MVP enxuto** — Escopo mínimo viável claramente separado de V2/V3.
5. **Alinhamento com negócio** — Decisões da reunião de kickoff registradas como requisitos, não como sugestões.

---

## Referências

- `docsbase/` — Documentação anterior (Expo-first); mantida como histórico.
- `trans.md` — Transcrição/resumo da reunião Kickoff Discovery | Keven (01/jun/2026).

---

*Última atualização: jun/2026*
