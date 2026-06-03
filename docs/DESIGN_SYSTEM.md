# Design System — Keve Marketplace B2B

Sistema de design técnico para a plataforma de busca reversa B2B (React + Tailwind + shadcn/ui).

**Versão:** 2.0  
**Última atualização:** jun/2026  
**Plataforma:** Keve Marketplace B2B  
**Referência técnica:** [ARQUITETURA.md](./ARQUITETURA.md) · Caminho de código: `apps/web/src/`

---

## 📋 ÍNDICE

1. [Stack Tecnológica](#1-stack-tecnológica)
2. [Paleta de Cores (HSL)](#2-paleta-de-cores-hsl)
   - [2.5 Tokens de Marca](#25-tokens-de-marca)
   - [2.6 Regras Visuais de Cor](#26-regras-visuais-de-cor)
3. [Tipografia](#3-tipografia)
4. [Sistema de Espaçamento](#4-sistema-de-espaçamento)
5. [Arquitetura de Layout](#5-arquitetura-de-layout)
6. [Responsividade](#6-responsividade)
7. [Componentes de Layout](#7-componentes-de-layout)
   - [7.1 Sidebar (Desktop)](#71-sidebar-desktop)
   - [7.2 Mobile Sidebar](#72-mobile-sidebar)
   - [7.3 Header](#73-header)
   - [7.4 Bottom Navigation](#74-bottom-navigation)
   - [7.5 Grid de Catálogo](#75-grid-de-catálogo-fornecedor)
8. [Tema Claro/Escuro](#8-tema-claroescuro)
9. [Efeitos Visuais](#9-efeitos-visuais)
10. [Z-Index Scale](#10-z-index-scale)
11. [Safe Areas (iOS)](#11-safe-areas-ios)
12. [Acessibilidade](#12-acessibilidade)
13. [Animações](#13-animações)

---

## 1. Stack Tecnológica

```json
{
  "framework": {
    "react": "^18.3.1",
    "vite": "^5.0.0",
    "typescript": "^5.0.0"
  },
  "styling": {
    "tailwindcss": "^3.4.0",
    "tailwindcss-animate": "latest"
  },
  "components": {
    "shadcn-ui": "Radix UI primitives",
    "lucide-react": "^0.462.0"
  },
  "routing": "react-router-dom ^6.30.1",
  "state": "@tanstack/react-query ^5.83.0",
  "theme": "next-themes ^0.3.0",
  "forms": "react-hook-form + zod",
  "pwa": "vite-plugin-pwa",
  "animations": "framer-motion ^12.23.26"
}
```

---

## 2. Paleta de Cores (HSL)

### 2.1 Filosofia Visual

Identidade **B2B premium** para marketplace corporativo — confiança, velocidade e alto contraste (web + mobile).

Características:

- **Azul navy** (`brand-dark`) em hero, navbar e áreas premium — transmite robustez
- **Azul primário** (`brand-primary`) em ações principais — confiança
- **Laranja** (`brand-accent`) em CTAs de conversão — destaque comercial
- **Branco e cinzas claros** para legibilidade em listagens densas (catálogo, propostas)
- Todas as cores em **HSL** para opacidade dinâmica e temas claro/escuro

### 2.2 Light Theme (`:root`)

```css
:root {
  /* ===== CORE COLORS ===== */
  --background: 220 20% 97%;           /* Fundo claro #F5F6F8 */
  --foreground: 221 65% 12%;           /* Texto principal — azul quase preto */

  /* ===== BRAND COLORS — Keve B2B ===== */
  --brand: 221 78% 54%;                /* Azul primário #2F66F3 */
  --brand-dark: 221 67% 17%;           /* Navy premium #0D1F4D */
  --brand-primary: 221 78% 54%;        /* Botões e links principais */
  --brand-primary-dark: 221 80% 44%;   /* Hover botão primário */
  --brand-accent: 38 100% 50%;         /* CTA conversão #F5A000 */
  --brand-muted: 220 15% 95%;          /* Superfícies neutras de marca */

  /* ===== SEMANTIC SURFACES ===== */
  --card: 0 0% 100%;
  --card-foreground: 221 65% 12%;

  --popover: 0 0% 100%;
  --popover-foreground: 221 65% 12%;

  /* ===== PRIMARY (Ações principais — azul) ===== */
  --primary: 221 78% 54%;
  --primary-foreground: 0 0% 100%;

  /* ===== SECONDARY (Superfícies neutras) ===== */
  --secondary: 220 18% 94%;
  --secondary-foreground: 221 60% 18%;

  /* ===== MUTED (Elementos sutis) ===== */
  --muted: 220 15% 95%;
  --muted-foreground: 220 12% 45%;

  /* ===== ACCENT (CTAs de conversão — laranja) ===== */
  --accent: 38 100% 50%;
  --accent-foreground: 0 0% 100%;

  /* ===== DESTRUCTIVE (Erros/Exclusões) ===== */
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 100%;

  /* ===== INPUTS & BORDERS ===== */
  --border: 220 14% 88%;               /* #D9DEE8 */
  --input: 220 14% 96%;
  --ring: 221 78% 54%;                 /* Focus ring — azul primário */

  /* ===== BORDER RADIUS ===== */
  --radius: 1rem;                      /* 16px — bordas suaves marketplace */

  /* ===== SIDEBAR ===== */
  --sidebar-background: 220 15% 96%;
  --sidebar-foreground: 221 65% 12%;
  --sidebar-primary: 221 78% 54%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 221 78% 54% / 0.1;
  --sidebar-accent-foreground: 221 80% 44%;
  --sidebar-border: 220 14% 88%;
  --sidebar-ring: 221 78% 54%;

  /* ===== STATUS COLORS ===== */
  --success: 142 76% 36%;
  --warning: 38 92% 50%;
  --warning-foreground: 38 92% 25%;
  --error: 0 72% 51%;
  --info: 199 89% 48%;

  /* ===== TRANSITIONS ===== */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 2.3 Dark Theme (`.dark`)

```css
.dark {
  --background: 221 67% 11%;
  --foreground: 0 0% 98%;

  --brand: 221 78% 56%;
  --brand-dark: 221 67% 17%;
  --brand-primary: 221 78% 56%;
  --brand-primary-dark: 221 80% 48%;
  --brand-accent: 38 100% 50%;
  --brand-muted: 221 24% 20%;

  --card: 221 58% 14%;
  --card-foreground: 0 0% 98%;

  --popover: 221 58% 14%;
  --popover-foreground: 0 0% 98%;

  --primary: 221 78% 56%;
  --primary-foreground: 0 0% 100%;

  --secondary: 221 35% 18%;
  --secondary-foreground: 0 0% 95%;

  --muted: 221 24% 20%;
  --muted-foreground: 220 10% 72%;

  --accent: 38 100% 50%;
  --accent-foreground: 0 0% 100%;

  --destructive: 0 72% 60%;
  --destructive-foreground: 0 0% 100%;

  --border: 221 20% 24%;
  --input: 221 20% 18%;
  --ring: 221 78% 56%;

  --sidebar-background: 221 67% 9%;
  --sidebar-foreground: 0 0% 98%;
  --sidebar-primary: 221 78% 56%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 221 78% 56% / 0.15;
  --sidebar-accent-foreground: 221 78% 65%;
  --sidebar-border: 221 20% 24%;
  --sidebar-ring: 221 78% 56%;

  --success: 142 76% 45%;
  --warning: 38 92% 55%;
  --error: 0 72% 60%;
  --info: 199 89% 55%;
}
```

### 2.4 Como Usar Cores no Tailwind

```tsx
// ✅ CORRETO - Usando tokens semânticos
<div className="bg-background text-foreground">
<button className="bg-primary text-primary-foreground hover:bg-brand-primary-dark">
<button className="bg-accent text-accent-foreground">   {/* CTA conversão */}
<section className="bg-brand-dark text-white">          {/* Hero / navbar premium */}
<p className="text-muted-foreground">
<div className="border-border">

// ❌ ERRADO - Cores hardcoded
<div className="bg-white text-black">
<button className="bg-blue-600 text-white">
<button className="bg-orange-500 text-white">
<p className="text-gray-500">
```

### 2.5 Tokens de Marca

| Token | Hex | HSL | Uso |
|-------|-----|-----|-----|
| `brand-dark` | `#0D1F4D` | `221 67% 17%` | Hero, navbar, áreas premium |
| `brand-primary` | `#2F66F3` | `221 78% 54%` | Botões primários, links, focus ring |
| `brand-primary-dark` | — | `221 80% 44%` | Hover de botão primário |
| `brand-accent` | `#F5A000` | `38 100% 50%` | CTAs de conversão (cadastro, publicar demanda, upgrade) |
| `neutral-light` | `#F5F6F8` | `220 20% 97%` | Fundos e inputs |
| `neutral-border` | `#D9DEE8` | `220 14% 88%` | Bordas de cards e divisores |
| `text-on-dark` | `#FFFFFF` | `0 0% 100%` | Textos sobre fundo navy |

### 2.6 Regras Visuais de Cor

**Botão primário (ação padrão — azul)**

```tsx
<Button className="bg-primary hover:bg-brand-primary-dark text-primary-foreground rounded-xl">
  Salvar
</Button>
```

**CTA de conversão (laranja — cadastro, publicar, upgrade)**

```tsx
<Button className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl">
  Publicar demanda
</Button>
```

**Hero / navbar premium (navy)**

```tsx
<header className="bg-brand-dark text-white">
<section className="bg-brand-dark text-white">
```

**Cards de marketplace**

```tsx
<article className="rounded-2xl border border-border bg-card shadow-sm">
```

**Selo verificado / destaque Gold**

```tsx
<Badge className="bg-accent/15 text-accent border-accent/30">
  Verificado
</Badge>
```

---

## 3. Tipografia

### 3.1 Fontes (Google Fonts)

```html
<!-- Adicionado no index.css via @import -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### 3.2 Configuração Tailwind

```ts
// tailwind.config.ts
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],      // Corpo de texto
  display: ['Space Grotesk', 'system-ui', 'sans-serif'], // Títulos/Headers
}
```

### 3.3 Escala Tipográfica

| Elemento | Mobile | Desktop | Classes Tailwind |
|----------|--------|---------|------------------|
| **H1 (Hero)** | 30px | 48-60px | `text-3xl md:text-5xl lg:text-6xl font-bold font-display` |
| **H2 (Seção)** | 18px | 20px | `text-lg md:text-xl font-semibold font-display` |
| **H3 (Card)** | 16px | 16px | `text-base font-semibold` |
| **H4 (Subseção)** | 14px | 14px | `text-sm font-medium` |
| **Body** | 14px | 14-16px | `text-sm md:text-base` |
| **Caption** | 12px | 12px | `text-xs text-muted-foreground` |
| **Labels de Seção** | 11px | 11px | `text-[11px] uppercase tracking-wider font-medium text-muted-foreground/70` |
| **Badge/Pill** | 10-11px | 10-11px | `text-[10px]` ou `text-xs` |

### 3.4 Padrões de Uso

```tsx
// Títulos de página
<h1 className="font-display font-semibold text-lg lg:text-xl">
  {pageTitle}
</h1>

// Labels de seção (sidebar/navigation)
<span className="text-[11px] font-medium uppercase text-muted-foreground/70 tracking-wider">
  Principal
</span>

// Texto de usuário/nome
<p className="text-sm font-medium truncate">
  {userName}
</p>

// Texto secundário/subtítulo
<p className="text-[11px] text-muted-foreground truncate">
  Online
</p>

// Badges
<span className="text-xs px-1.5 py-0.5 rounded bg-foreground/10 text-foreground font-medium">
  12
</span>
```

---

## 4. Sistema de Espaçamento

### 4.1 Escala Base (Tailwind)

| Token | Pixels | Uso Principal |
|-------|--------|---------------|
| `0.5` | 2px | Micro ajustes |
| `1` | 4px | Gaps internos mínimos |
| `1.5` | 6px | Padding de badges |
| `2` | 8px | Gaps padrão pequenos |
| `2.5` | 10px | Padding de botões pequenos |
| `3` | 12px | Padding de cards/itens de nav |
| `4` | 16px | Padding de seção, gaps maiores |
| `6` | 24px | Espaçamento entre seções |
| `8` | 32px | Margens de página |

### 4.2 Padrões Recorrentes

| Contexto | Classes | Pixels |
|----------|---------|--------|
| **Page padding** | `px-4 lg:px-6` | 16px mobile, 24px desktop |
| **Section spacing** | `space-y-6` ou `mt-6` | 24px |
| **Card padding** | `p-3` | 12px |
| **Nav item padding** | `px-3 py-2` | 12px horizontal, 8px vertical |
| **Gap entre items** | `gap-2` ou `gap-3` | 8px ou 12px |
| **Sidebar width** | `w-60` | 240px |
| **Sidebar padding** | `py-4 px-3` | 16px vertical, 12px horizontal |
| **Header height** | `h-14` | 56px |
| **Bottom nav height** | ~72px | Inclui safe-area |

---

## 5. Arquitetura de Layout

### 5.1 Estrutura Principal

```tsx
// AppLayout.tsx - Estrutura base
<div className="min-h-screen w-full bg-background">
  {/* Sidebar - APENAS Desktop (lg:+) */}
  <Sidebar />  {/* hidden lg:flex w-60 fixed left-0 top-0 h-screen */}
  
  {/* Mobile Sidebar - Overlay no mobile */}
  <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
  
  {/* Área de conteúdo - Offset para sidebar no desktop */}
  <div className="lg:pl-60 min-h-screen flex flex-col">
    
    {/* Header - Sticky */}
    <Header onMenuClick={() => setIsSidebarOpen(true)} />
    {/* sticky top-0 z-30 h-14 */}
    
    {/* Main Content - Padding para bottom nav no mobile */}
    <main className="flex-1 pb-24 lg:pb-8">
      {children}
    </main>
    
  </div>
  
  {/* Bottom Navigation - APENAS Mobile */}
  <BottomNav />  {/* lg:hidden fixed bottom-0 — itens variam por papel (comprador/fornecedor) */}
</div>
```

### 5.2 Diagrama Visual

```
┌─────────────────────────────────────────────────────────────────┐
│                         VIEWPORT                                 │
├─────────┬───────────────────────────────────────────────────────┤
│         │                                                        │
│ SIDEBAR │              HEADER (sticky, z-30)                    │
│  w-60   ├────────────────────────────────────────────────────────┤
│ (lg:+)  │                                                        │
│ fixed   │                                                        │
│ z-40    │                  MAIN CONTENT                          │
│         │                                                        │
│         │               (pb-24 no mobile)                        │
│         │                                                        │
│         │                                                        │
│         ├────────────────────────────────────────────────────────┤
│         │            BOTTOM NAV (mobile only, z-40)              │
└─────────┴────────────────────────────────────────────────────────┘
                    ┌──────────┐
                    │   FAB    │ ← Ação principal por papel (ex.: nova demanda)
                    └──────────┘
```

---

## 6. Responsividade

### 6.1 Breakpoints

| Breakpoint | Min-Width | Uso |
|------------|-----------|-----|
| **Default** | 0px | Mobile portrait |
| **sm** | 640px | Mobile landscape / Phablets |
| **md** | 768px | Tablets portrait |
| **lg** | 1024px | Tablets landscape / Laptops pequenos |
| **xl** | 1280px | Desktops |
| **2xl** | 1536px | Telas grandes / Ultrawide |

### 6.2 Estratégia Mobile-First

```tsx
// Padrão: Mobile → Desktop
// Sempre defina mobile primeiro, depois adapte para telas maiores

// ❌ ERRADO - Desktop first
<div className="flex flex-row md:flex-col">

// ✅ CORRETO - Mobile first
<div className="flex flex-col md:flex-row">
```

### 6.3 Padrões de Responsividade

#### Sidebar
```tsx
// Desktop: Sidebar fixa visível
// Mobile: Sidebar oculta, acessível via menu hamburger

<aside className="hidden lg:flex flex-col w-60 h-screen fixed left-0 top-0">
  {/* Conteúdo */}
</aside>
```

#### Header
```tsx
// Mobile: Menu hamburger + Logo
// Desktop: Search bar + Ações

<header className="sticky top-0 z-30 h-14">
  {/* Menu hamburger - só mobile */}
  <button className="lg:hidden w-10 h-10">
    <Menu />
  </button>
  
  {/* Search - só desktop */}
  <div className="hidden lg:flex w-80">
    <input placeholder="Buscar..." />
  </div>
</header>
```

#### Bottom Navigation
```tsx
// Mobile: Nav fixa no bottom
// Desktop: Oculta (usa sidebar)

<nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
  {/* Nav items */}
</nav>
```

#### Content Offset
```tsx
// Compensa sidebar no desktop

<div className="lg:pl-60">
  {/* Conteúdo deslocado para não ficar atrás da sidebar */}
</div>
```

#### Main Padding
```tsx
// Compensa bottom nav no mobile

<main className="pb-24 lg:pb-8">
  {/* Conteúdo com padding extra no mobile */}
</main>
```

---

## 7. Componentes de Layout

### 7.1 Sidebar (Desktop)

**Arquivo:** `apps/web/src/components/layout/Sidebar.tsx`

Layouts distintos por papel — rotas conforme [ARQUITETURA.md §4.1](./ARQUITETURA.md#41-rotas-react-router).

#### Estrutura — Comprador

```tsx
<aside className="hidden lg:flex flex-col w-60 h-screen fixed left-0 top-0 z-40 py-4 px-3 glass-sidebar">
  {/* LOGO */}
  <div className="flex items-center gap-3 mb-4 px-2">...</div>

  <nav className="flex-1 overflow-y-auto scrollbar-custom">
    <NavSection title="Principal">
      <NavItem to="/buyer/dashboard" icon={LayoutList} label="Minhas demandas" />
      <NavItem to="/buyer/demands/new" icon={PlusCircle} label="Nova demanda" />
      <NavItem to="/buyer/orders" icon={Package} label="Pedidos" />
    </NavSection>
    <NavSection title="Conta">
      <NavItem to="/settings/billing" icon={CreditCard} label="Plano" />
      <NavItem to="/settings/profile" icon={Settings} label="Configurações" />
    </NavSection>
  </nav>
  {/* User Profile Card + Logout */}
</aside>
```

#### Estrutura — Fornecedor

```tsx
<nav className="flex-1 overflow-y-auto scrollbar-custom">
  <NavSection title="Principal">
    <NavItem to="/supplier/board" icon={LayoutGrid} label="Oportunidades" badge={counts?.matches} />
    <NavItem to="/supplier/catalog" icon={Boxes} label="Catálogo" />
    <NavItem to="/supplier/orders" icon={Package} label="Pedidos" />
  </NavSection>
  <NavSection title="Conta">
    <NavItem to="/settings/billing" icon={CreditCard} label="Plano" />
    <NavItem to="/settings/profile" icon={Settings} label="Configurações" />
  </NavSection>
</nav>
```

#### Estrutura — Admin

```tsx
<nav className="flex-1 overflow-y-auto scrollbar-custom">
  <NavSection title="Operação">
    <NavItem to="/admin/approvals" icon={ShieldCheck} label="Aprovações" badge={counts?.pending} />
    <NavItem to="/admin/metrics" icon={BarChart3} label="Métricas" />
    <NavItem to="/admin/categories" icon={Tags} label="Categorias" />
  </NavSection>
</nav>
```

#### Especificações

| Propriedade | Valor | Classe |
|-------------|-------|--------|
| Largura | 240px | `w-60` |
| Posição | Fixed left | `fixed left-0 top-0` |
| Altura | 100vh | `h-screen` |
| Z-index | 40 | `z-40` |
| Padding | 16px vertical, 12px horizontal | `py-4 px-3` |
| Background | Glass effect | `glass-sidebar` |
| Visibilidade | Desktop only | `hidden lg:flex` |

#### NavItem Component

```tsx
<NavLink
  to={to}
  className={cn(
    "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors",
    active
      ? "bg-sidebar-accent text-foreground"
      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
  )}
>
  <Icon size={18} />
  <span className="flex-1">{label}</span>
  {badge && (
    <span className="text-xs px-1.5 py-0.5 rounded bg-foreground/10 text-foreground font-medium">
      {badge}
    </span>
  )}
</NavLink>
```

#### NavSection Component

```tsx
<div className="mt-6 first:mt-0">
  <button className="flex items-center justify-between w-full px-3 mb-2 text-[11px] font-medium uppercase text-muted-foreground/70 tracking-wider hover:text-muted-foreground transition-colors">
    <span>{title}</span>
    <ChevronDown size={14} className={isOpen ? "rotate-0" : "-rotate-90"} />
  </button>
  {isOpen && <div className="space-y-0.5">{children}</div>}
</div>
```

---

### 7.2 Mobile Sidebar

**Arquivo:** `src/components/layout/MobileSidebar.tsx`

#### Estrutura

```tsx
<>
  {/* BACKDROP */}
  <div
    className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden"
    onClick={onClose}
  />
  
  {/* SIDEBAR */}
  <aside className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-sidebar-background border-r border-sidebar-border animate-slide-in-left lg:hidden overflow-y-auto">
    
    {/* Header com logo + botão fechar */}
    <div className="flex items-center justify-between p-4 border-b border-sidebar-border/50">
      {/* Logo */}
      <button onClick={onClose} className="w-10 h-10 rounded-xl hover:bg-secondary/50">
        <X size={20} />
      </button>
    </div>
    
    {/* Navigation - Mesma estrutura do desktop */}
    <nav className="p-3 space-y-6 flex-1">
      {/* Seções de navegação */}
    </nav>
    
    {/* Bottom Section */}
    <div className="p-3 pt-3 border-t border-sidebar-border/50">
      {/* Settings + User Profile */}
    </div>
    
  </aside>
</>
```

#### Especificações

| Propriedade | Valor | Classe |
|-------------|-------|--------|
| Largura | 288px | `w-72` |
| Posição | Fixed left, full height | `fixed left-0 top-0 bottom-0` |
| Z-index | 50 (acima de tudo) | `z-50` |
| Background | Solid | `bg-sidebar-background` |
| Animação | Slide in from left | `animate-slide-in-left` |
| Backdrop | 80% opacity + blur | `bg-background/80 backdrop-blur-sm` |
| Visibilidade | Mobile only | `lg:hidden` |

#### Comportamentos

- **Fecha com ESC:** `useEffect` escuta keydown
- **Fecha no backdrop:** Click handler no backdrop
- **Bloqueia scroll:** `document.body.style.overflow = "hidden"`

---

### 7.3 Header

**Arquivo:** `apps/web/src/components/layout/Header.tsx`

#### Estrutura

```tsx
<header className="sticky top-0 z-30 px-4 lg:px-6 h-14 flex items-center justify-between glass-navbar">
  
  {/* LEFT SIDE */}
  <div className="flex items-center gap-3">
    {/* Menu Hamburger - Mobile only */}
    <button 
      onClick={onMenuClick}
      className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-secondary/50"
    >
      <Menu size={24} />
    </button>
    
    {/* Page Title */}
    <h1 className="font-display font-semibold text-lg lg:text-xl truncate max-w-[180px] lg:max-w-none">
      {pageTitle}
    </h1>
  </div>
  
  {/* RIGHT SIDE */}
  <div className="flex items-center gap-2">
    {/* Search - Desktop only */}
    <div className="hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/50 w-80">
      <Search size={18} className="text-muted-foreground" />
      <input placeholder="Buscar demandas, produtos..." className="flex-1 bg-transparent text-sm outline-none" />
      <kbd className="hidden xl:inline-flex h-5 px-1.5 items-center rounded border border-border text-[10px] text-muted-foreground">
        ⌘K
      </kbd>
    </div>
    
    {/* Credits Badge */}
    <CreditsBadge />
    
    {/* Theme Toggle */}
    <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-secondary/50">
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
    
    {/* Notifications */}
    <NotificationsDropdown />
    
    {/* User Menu */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-secondary/50">
          <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center">
            {initials}
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Menu items */}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
  
</header>
```

#### Especificações

| Propriedade | Valor | Classe |
|-------------|-------|--------|
| Altura | 56px | `h-14` |
| Posição | Sticky top | `sticky top-0` |
| Z-index | 30 | `z-30` |
| Padding | 16px mobile, 24px desktop | `px-4 lg:px-6` |
| Background | Glass effect | `glass-navbar` |
| Layout | Flex between | `flex items-center justify-between` |

#### Touch Targets

Todos os botões interativos têm mínimo 40x40px (`w-10 h-10`) para acessibilidade mobile.

---

### 7.4 Bottom Navigation

**Arquivo:** `apps/web/src/components/layout/BottomNav.tsx`

Padrão **2-FAB-2** no mobile. FAB e itens variam por papel.

#### Comprador

```tsx
<nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden glass-bottomnav px-2 pb-safe-bottom">
  <div className="flex items-center justify-center gap-2 py-2 max-w-md mx-auto">
    <div className="flex items-center gap-1">
      <NavItem to="/buyer/dashboard" icon={LayoutList} />
      <NavItem to="/buyer/orders" icon={Package} />
    </div>
    <button
      onClick={() => navigate('/buyer/demands/new')}
      className="flex items-center justify-center w-14 h-14 -mt-6 rounded-full bg-accent text-accent-foreground shadow-lg glow-silver-strong hover:scale-105 transition-transform"
      aria-label="Nova demanda"
    >
      <Plus size={24} strokeWidth={2.5} />
    </button>
    <div className="flex items-center gap-1">
      <NavItem to="/notifications" icon={Bell} hasNotification />
      <NavItem to="/settings/profile" icon={User} />
    </div>
  </div>
</nav>
```

#### Fornecedor

```tsx
<div className="flex items-center gap-1">
  <NavItem to="/supplier/board" icon={LayoutGrid} hasNotification />
  <NavItem to="/supplier/catalog" icon={Boxes} />
</div>
<button
  onClick={() => navigate('/supplier/board')}
  className="... bg-accent text-accent-foreground ..."
  aria-label="Ver oportunidades"
>
  <Search size={24} strokeWidth={2.5} />
</button>
<div className="flex items-center gap-1">
  <NavItem to="/supplier/orders" icon={Package} />
  <NavItem to="/settings/profile" icon={User} />
</div>
```

#### NavItem Component

```tsx
<NavLink
  to={to}
  className={cn(
    "flex items-center justify-center w-12 h-12 rounded-xl transition-colors",
    isActive
      ? "text-foreground bg-secondary/50"
      : "text-muted-foreground hover:text-foreground"
  )}
>
  <div className="relative">
    <Icon size={22} />
    {hasNotification && (
      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive" />
    )}
  </div>
</NavLink>
```

#### Especificações

| Propriedade | Valor | Classe |
|-------------|-------|--------|
| Posição | Fixed bottom | `fixed bottom-0 left-0 right-0` |
| Z-index | 40 | `z-40` |
| Background | Glass effect | `glass-bottomnav` |
| Padding bottom | Safe area | `pb-safe-bottom` |
| Visibilidade | Mobile only | `lg:hidden` |
| Layout | 2-FAB-2 pattern | Flex centered |

#### FAB (Floating Action Button)

| Propriedade | Valor | Classe |
|-------------|-------|--------|
| Tamanho | 56x56px | `w-14 h-14` |
| Forma | Circular | `rounded-full` |
| Cor | Inversão ou accent | FAB comprador: `bg-accent` · FAB fornecedor: `bg-accent` |
| Elevação | Negativa top | `-mt-6` |
| Efeito | Glow + scale | `glow-silver-strong hover:scale-105` |

---

### 7.5 Grid de Catálogo (Fornecedor)

Decisão de produto (kickoff): imagens **pequenas**, título **abaixo** da foto — nunca sobreposto — para maximizar itens visíveis.

**Arquivo:** `apps/web/src/components/catalog/ProductGrid.tsx`

```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
  {products.map((product) => (
    <article key={product.id} className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-2">
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
        <img
          src={product.image_url}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
      <p className="line-clamp-2 text-xs font-medium text-foreground">{product.name}</p>
      <p className="text-[11px] text-muted-foreground">{product.preco_referencia}</p>
    </article>
  ))}
</div>
```

| Propriedade | Valor |
|-------------|-------|
| Imagem | ~64–80px efetivos em mobile (`aspect-square` no card) |
| Título | Abaixo da imagem, `text-xs`, máx. 2 linhas |
| Colunas | 2 → 3 → 4 → 5 conforme breakpoint |

---

## 8. Tema Claro/Escuro

### 8.1 Implementação

O tema é gerenciado pelo `next-themes`:

```tsx
// Configuração no App.tsx ou layout
import { ThemeProvider } from "next-themes";

<ThemeProvider attribute="class" defaultTheme="system">
  {children}
</ThemeProvider>
```

### 8.2 Toggle de Tema

```tsx
import { useTheme } from "next-themes";

const { theme, setTheme } = useTheme();

const toggleTheme = () => {
  setTheme(theme === 'dark' ? 'light' : 'dark');
};
```

### 8.3 Estratégia de Variáveis

- **Classe `.dark`** é adicionada ao `<html>` automaticamente
- Todas as cores são sobrescritas via CSS variables
- Componentes usam tokens semânticos que mudam automaticamente

### 8.4 Ajustes para Imagens/SVGs no Dark Mode

```tsx
// Inverter logos/ícones que são pretos em fundo branco
<img 
  src={logo} 
  className="dark:brightness-0 dark:invert" 
/>

// Ajustar opacidades
<div className="bg-foreground/10">  {/* Funciona em ambos os temas */}
```

---

## 9. Efeitos Visuais

### 9.1 Glass Effects (Glassmorphism)

```css
/* Navbar - blur moderado */
.glass-navbar {
  background: hsl(var(--background) / 0.9);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid hsl(var(--border) / 0.2);
}

/* Sidebar - sólido com borda sutil */
.glass-sidebar {
  background: hsl(var(--sidebar-background));
  border-right: 1px solid hsl(var(--sidebar-border) / 0.5);
}

/* Bottom Nav - blur forte */
.glass-bottomnav {
  background: hsl(var(--background) / 0.95);
  backdrop-filter: blur(16px);
  border-top: 1px solid hsl(var(--border) / 0.2);
}

/* Cards simples - sem blur */
.surface-card {
  background: hsl(var(--card) / 0.6);
  border: 1px solid hsl(var(--border) / 0.3);
}

/* Overlays/Modais - blur máximo */
.glass-overlay {
  background: hsl(var(--card) / 0.9);
  backdrop-filter: blur(16px);
  border: 1px solid hsl(var(--border) / 0.4);
}
```

### 9.2 Glow Effects

```css
/* Glow sutil - para hover states */
.glow-subtle {
  box-shadow: 0 0 12px hsl(var(--primary) / 0.1);
}

/* Glow silver - para elevação */
.glow-silver {
  box-shadow: 0 2px 8px hsl(var(--foreground) / 0.08);
}

/* Glow silver forte - para FABs */
.glow-silver-strong {
  box-shadow: 0 4px 16px hsl(var(--foreground) / 0.12);
}
```

### 9.3 Hover Effects

```css
/* Card hover - translação suave */
.card-hover {
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.card-hover:hover {
  transform: translateY(-2px);
}

/* Scale para FABs/botões */
.hover:scale-105  /* 5% - sutil */
```

---

## 10. Z-Index Scale

| Z-Index | Componente | Uso |
|---------|------------|-----|
| `z-10` | Elementos elevados | Badges, chips, overlays menores |
| `z-20` | Cards em hover | Elevação de cards interativos |
| `z-30` | Header | Header sticky |
| `z-40` | Sidebar, Bottom Nav, FAB | Navegação principal |
| `z-50` | Modais, Drawers, Overlays | Elementos que sobrepõem tudo |

### Conflitos Conhecidos

```tsx
// Modal CRUD vs Bottom Nav: modais usam z-50 e cobrem a nav
// Paywall de plano: z-50, bloqueia interação até dismiss ou upgrade
```

---

## 11. Safe Areas (iOS)

### 11.1 Variáveis de Ambiente CSS

```css
.pb-safe-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.h-safe-bottom {
  height: env(safe-area-inset-bottom, 0);
}
```

### 11.2 Configuração Tailwind

```ts
// tailwind.config.ts
spacing: {
  'safe-bottom': 'env(safe-area-inset-bottom)',
  'safe-top': 'env(safe-area-inset-top)',
}
```

### 11.3 Uso

```tsx
// Bottom Nav com safe area
<nav className="fixed bottom-0 ... pb-safe-bottom">

// Conteúdo com padding para safe area
<main className="pb-safe-bottom">
```

---

## 12. Acessibilidade

### 12.1 Touch Targets

```
Mínimo recomendado: 44x44px
Classes: min-w-[44px] min-h-[44px]
Ou: w-10 h-10 (40px) + padding
Ou: w-11 h-11 (44px)
Ou: w-12 h-12 (48px)
```

### 12.2 Focus States

```css
/* Remove outline padrão */
*:focus {
  outline: none;
}

/* Adiciona outline visível no focus-visible */
*:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
  border-radius: 4px;
}
```

### 12.3 Contraste de Cores

| Tipo | Ratio Mínimo |
|------|--------------|
| Texto normal | 4.5:1 |
| Texto grande (18px+) | 3:1 |
| UI components | 3:1 |

### 12.4 ARIA Labels

```tsx
// Botões de ícone
<button aria-label="Abrir menu">
  <Menu />
</button>

// Links de navegação
<NavLink aria-label="Ir para minhas demandas">
  <LayoutList />
</NavLink>

// Badges com notificações
<span aria-label="12 notificações não lidas">
  12
</span>
```

---

## 13. Animações

### 13.1 Keyframes Definidos

```css
/* Slide In (vertical) */
@keyframes slide-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Fade In */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Scale In */
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Slide In Left (para sidebar) */
@keyframes slide-in-left {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

/* Slide In Right (para drawers) */
@keyframes slide-in-right {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

/* Pulse Sutil */
@keyframes pulse-subtle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}

/* Shimmer (loading) */
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```

### 13.2 Classes de Animação

```ts
// tailwind.config.ts
animation: {
  "accordion-down": "accordion-down 0.2s ease-out",
  "accordion-up": "accordion-up 0.2s ease-out",
  "fade-in": "fade-in 0.3s ease-out",
  "fade-out": "fade-out 0.3s ease-out",
  "scale-in": "scale-in 0.2s ease-out",
  "scale-out": "scale-out 0.2s ease-out",
  "slide-in-right": "slide-in-right 0.3s ease-out",
  "slide-out-right": "slide-out-right 0.3s ease-out",
  "slide-in-left": "slide-in-left 0.3s ease-out",
  "slide-out-left": "slide-out-left 0.3s ease-out",
  "enter": "fade-in 0.3s ease-out, scale-in 0.2s ease-out",
  "exit": "fade-out 0.3s ease-out, scale-out 0.2s ease-out",
  "phase-pulse": "phase-pulse 20s ease-in-out infinite",
  "shimmer": "shimmer 6s ease-in-out infinite",
}
```

### 13.3 Timing Functions

```css
:root {
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);  /* Micro interações */
  --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);  /* Padrão */
  --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);  /* Modais/Sidebars */
}
```

---

## Checklist de Implementação

### Layout

- [x] Sidebar `w-60` desktop only (`hidden lg:flex`)
- [x] Content offset `lg:pl-60`
- [x] Bottom nav mobile only (`lg:hidden`)
- [x] Main padding `pb-24 lg:pb-8`
- [x] Page padding `px-4 lg:px-6`
- [x] Header `h-14` sticky `z-30`
- [x] Mobile sidebar com backdrop e animação

### Tipografia

- [x] `font-display` (Space Grotesk) para títulos
- [x] `font-sans` (Inter) para body
- [x] Section labels: `text-[11px] uppercase tracking-wider`
- [x] Títulos de página: `font-display font-semibold text-lg lg:text-xl`

### Cores

- [x] Usar tokens semânticos (nunca cores diretas)
- [x] Active states: `bg-sidebar-accent text-foreground`
- [x] Muted text: `text-muted-foreground`
- [x] Bordas sutis: `border-border/30`
- [x] Brand primary: Azul `#2F66F3` (HSL 221 78% 54%)
- [x] Brand dark: Navy `#0D1F4D` (HSL 221 67% 17%)
- [x] CTA conversão: Laranja `#F5A000` (HSL 38 100% 50%) via token `accent`

### Efeitos

- [x] Hover translate: `translateY(-2px)` máximo
- [x] Hover scale: `scale-105` máximo
- [x] Blur apenas em navbars/overlays
- [x] Transitions usando variáveis CSS

### Mobile

- [x] Touch targets mínimo 40x40px
- [x] Safe areas para notch (`pb-safe-bottom`)
- [x] FAB central no bottom nav
- [x] Sidebar fecha com ESC e backdrop

### Dark Mode

- [x] Todas as cores adaptadas
- [x] Logos com `dark:brightness-0 dark:invert`
- [x] Opacidades ajustadas (ex: accent 10% → 15%)

---

*Design System — Keve Marketplace B2B.*  
*Última atualização: jun/2026*
