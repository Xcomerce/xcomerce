# App Mobile — Comprador (XCOMERCE)

Aplicativo React Native (Expo) para o fluxo do **comprador**, conectado ao mesmo backend Supabase da versão web.

## Stack

- Expo SDK 52 + Expo Router
- NativeWind (Tailwind)
- TanStack Query + Supabase JS
- `@keve/shared` (tipos e validadores)

## Pré-requisitos

- Node.js 20+
- npm (workspaces)
- [Expo Go](https://expo.dev/go) no celular **ou** Android Studio / Xcode para emulador

## Configuração

1. Na raiz do monorepo:

   ```bash
   npm install
   ```

2. Copie as variáveis de ambiente:

   ```bash
   cp apps/mobile/comprador/.env.example apps/mobile/comprador/.env
   ```

3. Edite `apps/mobile/comprador/.env`:

   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://wjoyobxpwkdyhnfrwbiu.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
   ```

## Executar

Na raiz do monorepo:

```bash
npm run dev:mobile:comprador
```

Ou dentro da pasta do app:

```bash
cd apps/mobile/comprador
npx expo start
```

- Pressione `a` para Android emulator
- Pressione `i` para iOS simulator (macOS)
- Escaneie o QR code com Expo Go

## Fluxos implementados

| Tela | Rota |
|------|------|
| Login / Cadastro / Recuperar senha | `/(auth)/*` |
| Feed de produtos | `/(app)/` |
| Lista de demandas | `/(app)/demands` |
| Nova demanda | `/(app)/demands/new` |
| Detalhe + propostas + chat | `/(app)/demands/[id]` |
| Pedidos | `/(app)/orders` |
| Detalhe do pedido + SLA | `/(app)/orders/[id]` |
| Perfil | `/(app)/profile` |
| Planos | `/(app)/billing` |
| Notificações | `/(app)/notifications` |
| Suporte | `/(app)/support` |

## Estrutura

```
apps/mobile/comprador/
  app/           # Rotas Expo Router
  src/
    components/  # UI mobile
    services/    # Adaptados da web
    hooks/       # React Query
    providers/   # Auth
    lib/         # Supabase, utils
```

## Próximos passos

- App do fornecedor em `apps/mobile/fornecedor/` (fase 2)
- Push notifications (expo-notifications)
- Deep linking
- Checkout Asaas in-app via WebBrowser
