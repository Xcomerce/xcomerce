# App Fornecedor — XCOMERCE (mobile)

App Expo do fluxo **fornecedor**, com paridade à web (`/supplier/*`).

## Pré-requisitos

- Node.js 20+
- Monorepo instalado na raiz: `npm install`
- Copiar `.env.example` para `.env` com credenciais Supabase

## Executar

```bash
# Na raiz do monorepo
npm run dev:mobile:fornecedor

# Ou direto no workspace
npm run start -w fornecedor
npm run web -w fornecedor      # http://localhost:8084
npm run android -w fornecedor
npm run ios -w fornecedor
```

> **Porta:** o fornecedor usa **8084** (comprador usa 8081/8083). Abra `http://localhost:8084` no navegador.

### Tela "Welcome to Expo" (app vazio)

Isso aparece quando o Metro serviu um bundle antigo sem as rotas do `app/`. Pare o servidor (Ctrl+C) e reinicie com cache limpo:

```bash
npx expo start --clear -w fornecedor
# ou
npm run start -w fornecedor -- --clear
```

No terminal, o primeiro bundle deve mostrar **~2500 módulos**, não ~700.

## Rotas principais

| Área | Rota mobile |
|------|-------------|
| Oportunidades | `/(app)/board` |
| Catálogo | `/(app)/catalog` |
| Novo produto | `/(app)/catalog/new` |
| Pedidos | `/(app)/orders` |
| Proposta | `/(app)/offers/[demandId]` |
| Onboarding | `/(app)/onboarding` |
| Auto-proposta | `/(app)/auto-offers` |
| Configurações | `/(app)/profile` |
| Plano | `/(app)/billing` |
| Notificações | `/(app)/notifications` |
| Suporte | `/(app)/support` |

## Tab bar

Oportunidades · Catálogo · **FAB** (volta ao board) · Pedidos · Perfil

## Guards

- Login exige role **supplier**
- Onboarding é **opcional** — acessível em Configurações, sem redirecionamento forçado
- Catálogo, pedidos, oportunidades e auto-proposta acessíveis independente do status de aprovação

## Stack

Expo SDK 52 · Expo Router · NativeWind · TanStack Query · Supabase · `@keve/shared`

## Lint

```bash
npm run lint -w fornecedor
```
