# 🎨 DESIGN SYSTEM - LUNA CRM PLATFORM

Sistema de design técnico e detalhado para plataforma CRM com React + Tailwind.

**Versão:** 4.0  
**Última atualização:** 29/12/2024  
**Plataforma:** Luna SDR & CRM

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
- **Púrpura Vibrante** (`brand-accent`) em CTAs de conversão — destaque comercial (do roxo do logo)
- **Branco e cinzas claros** para legibilidade em listagens densas (catálogo, propostas)
- Todas as cores em **HSL** para opacidade dinâmica e temas claro/escuro

### 2.2 Light Theme (`:root`)

```css
:root {
  /* ===== CORE COLORS ===== */
  --background: 220 20% 97%;           /* Fundo claro #F5F6F8 */
  --foreground: 237 60% 12%;           /* Texto principal — azul escuro indigo */

  /* ===== BRAND COLORS — Keve B2B (derived from SVG logos) ===== */
  --brand: 221 94% 59%;                /* Azul primário #3472F9 */
  --brand-dark: 237 60% 34%;           /* Navy premium #222889 */
  --brand-primary: 221 94% 59%;        /* Botões e links principais */
  --brand-primary-dark: 221 94% 49%;   /* Hover botão primário */
  --brand-accent: 262 85% 59%;         /* CTA conversão #7F3CEF */
  --brand-muted: 237 30% 95%;          /* Superfícies neutras de marca */

  /* ===== BRAND GRADIENT & ACCENTS FROM LOGOS ===== */
  --brand-gradient-start: 266 84% 60%; /* Purple #8E45EF */
  --brand-gradient-end: 202 98% 50%;   /* Cyan/Blue #03A0FB */
  --brand-purple-start: 262 85% 59%;   /* Vibrant Purple #7F3CEF */
  --brand-purple-end: 263 60% 34%;     /* Deep Purple #492289 */

  /* ===== SEMANTIC SURFACES ===== */
  --card: 0 0% 100%;
  --card-foreground: 237 60% 12%;

  --popover: 0 0% 100%;
  --popover-foreground: 237 60% 12%;

  /* ===== PRIMARY (Ações principais — azul) ===== */
  --primary: 221 94% 59%;
  --primary-foreground: 0 0% 100%;

  /* ===== SECONDARY (Superfícies neutras) ===== */
  --secondary: 220 18% 94%;
  --secondary-foreground: 237 50% 18%;

  /* ===== MUTED (Elementos sutis) ===== */
  --muted: 220 15% 95%;
  --muted-foreground: 220 12% 45%;

  /* ===== ACCENT (CTAs de conversão — púrpura) ===== */
  --accent: 262 85% 59%;
  --accent-foreground: 0 0% 100%;

  /* ===== DESTRUCTIVE (Erros/Exclusões) ===== */
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 100%;

  /* ===== INPUTS & BORDERS ===== */
  --border: 220 14% 88%;               /* #D9DEE8 */
  --input: 220 14% 96%;
  --ring: 221 94% 59%;                 /* Focus ring — azul primário */

  /* ===== BORDER RADIUS ===== */
  --radius: 1rem;                      /* 16px — bordas suaves marketplace */

  /* ===== SIDEBAR ===== */
  --sidebar-background: 220 15% 96%;
  --sidebar-foreground: 237 60% 12%;
  --sidebar-primary: 221 94% 59%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 221 94% 59% / 0.1;
  --sidebar-accent-foreground: 221 94% 49%;
  --sidebar-border: 220 14% 88%;
  --sidebar-ring: 221 94% 59%;

  /* ===== CHANNEL COLORS (Integrações) ===== */
  --whatsapp: 142 70% 45%;
  --instagram: 340 75% 55%;
  --facebook: 221 44% 41%;
  --telegram: 200 75% 50%;
  --twitter: 203 89% 53%;
  --email: 220 15% 40%;
  --livechat: 221 94% 59%;

  /* ===== STATUS COLORS ===== */
  --success: 142 76% 36%;
  --warning: 38 92% 50%;               /* Alinhado à família laranja */
  --warning-foreground: 38 92% 25%;
  --error: 0 72% 51%;
  --info: 199 89% 48%;

  /* ===== ONLINE STATUS ===== */
  --online: 142 76% 45%;
  --offline: 220 10% 50%;
  --away: 38 92% 50%;
  --busy: 0 72% 51%;

  /* ===== TRANSITIONS ===== */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 2.3 Dark Theme (`.dark`)

```css
.dark {
  /* ===== CORE COLORS ===== */
  --background: 237 50% 8%;            /* Deep brand dark background */
  --foreground: 209 100% 96%;          /* Ice Blue #EAF5FF (from logo-clara text) */

  /* ===== BRAND COLORS ===== */
  --brand: 221 94% 64%;                /* Sightly brighter for dark mode */
  --brand-dark: 237 60% 34%;
  --brand-primary: 221 94% 64%;
  --brand-primary-dark: 221 94% 54%;
  --brand-accent: 262 85% 59%;
  --brand-muted: 237 30% 16%;

  /* ===== BRAND GRADIENT & ACCENTS FROM LOGOS ===== */
  --brand-gradient-start: 266 84% 60%;
  --brand-gradient-end: 202 98% 50%;
  --brand-purple-start: 262 85% 59%;
  --brand-purple-end: 263 60% 34%;

  /* ===== SEMANTIC SURFACES ===== */
  --card: 237 40% 12%;
  --card-foreground: 209 100% 96%;

  --popover: 237 40% 12%;
  --popover-foreground: 209 100% 96%;

  /* ===== PRIMARY ===== */
  --primary: 221 94% 64%;
  --primary-foreground: 0 0% 100%;

  /* ===== SECONDARY ===== */
  --secondary: 237 35% 15%;
  --secondary-foreground: 0 0% 95%;

  /* ===== MUTED ===== */
  --muted: 237 30% 16%;
  --muted-foreground: 220 10% 72%;

  /* ===== ACCENT (púrpura — mantém conversão) ===== */
  --accent: 262 85% 59%;
  --accent-foreground: 0 0% 100%;

  /* ===== DESTRUCTIVE ===== */
  --destructive: 0 72% 60%;
  --destructive-foreground: 0 0% 100%;

  /* ===== INPUTS & BORDERS ===== */
  --border: 237 25% 20%;
  --input: 237 25% 15%;
  --ring: 221 94% 64%;

  /* ===== SIDEBAR DARK ===== */
  --sidebar-background: 237 50% 6%;
  --sidebar-foreground: 209 100% 96%;
  --sidebar-primary: 221 94% 64%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 221 94% 64% / 0.15;
  --sidebar-accent-foreground: 221 94% 70%;
  --sidebar-border: 237 25% 20%;
  --sidebar-ring: 221 94% 64%;

  /* ===== STATUS COLORS (mais brilhantes) ===== */
  --success: 142 76% 45%;
  --warning: 38 92% 55%;
  --error: 0 72% 60%;
  --info: 199 89% 55%;

  /* ===== ONLINE STATUS ===== */
  --online: 142 76% 50%;
  --offline: 220 10% 40%;
  --away: 38 92% 55%;
  --busy: 0 72% 60%;
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
<button className="bg-purple-600 text-white">
<p className="text-gray-500">
```

### 2.5 Tokens de Marca

| Token | Hex | HSL | Uso |
|-------|-----|-----|-----|
| `brand-dark` | `#222889` | `237 60% 34%` | Hero, navbar, áreas premium (do texto do logo escuro) |
| `brand-primary` | `#3472F9` | `221 94% 59%` | Botões primários, links, focus ring (do azul elétrico do logo) |
| `brand-primary-dark` | `#0b57f8` | `221 94% 49%` | Hover de botão primário |
| `brand-accent` | `#7F3CEF` | `262 85% 59%` | CTAs de conversão (cadastro, publicar demanda, upgrade) |
| `brand-gradient-start` | `#8E45EF` | `266 84% 60%` | Início do gradiente principal (Roxo do logo) |
| `brand-gradient-end` | `#03A0FB` | `202 98% 50%` | Fim do gradiente principal (Azul Claro do logo) |
| `brand-purple-start` | `#7F3CEF` | `262 85% 59%` | Início do gradiente de blocos (Púrpura do logo) |
| `brand-purple-end` | `#492289` | `263 60% 34%` | Fim do gradiente de blocos (Púrpura Escuro do logo) |
| `neutral-light` | `#F5F6F8` | `220 20% 97%` | Fundos e inputs |
| `neutral-border` | `#D9DEE8` | `220 14% 88%` | Bordas de cards e divisores |
| `text-on-dark` | `#EAF5FF` | `209 100% 96%` | Textos sobre fundo escuro (Ice Blue do logo claro) |

### 2.6 Regras Visuais de Cor

**Botão primário (ação padrão — azul)**

```tsx
<Button className="bg-primary hover:bg-brand-primary-dark text-primary-foreground rounded-xl">
  Salvar
</Button>
```

**CTA de conversão (púrpura — cadastro, publicar, upgrade)**

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

**Botão secundário sobre fundo escuro**

```tsx
<Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
  Saiba mais
</Button>
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
  CRM
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
  <BottomNav />  {/* lg:hidden fixed bottom-0 */}
  
  {/* Floating Elements */}
  <AgentChatLauncher />  {/* z-40, bottom-20 mobile, bottom-4 desktop */}
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
                    │ LAUNCHER │ ← Floating (z-40)
                    │   FAB    │
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

**Arquivo:** `src/components/layout/Sidebar.tsx`

#### Estrutura

```tsx
<aside className="hidden lg:flex flex-col w-60 h-screen fixed left-0 top-0 z-40 py-4 px-3 glass-sidebar">
  
  {/* LOGO */}
  <div className="flex items-center gap-3 mb-4 px-2">
    <div className="w-9 h-9 rounded-lg bg-foreground/10 flex items-center justify-center p-1.5">
      <img src={logoIcon} className="w-full h-full dark:brightness-0 dark:invert" />
    </div>
    <img src={logoText} className="h-5 dark:brightness-0 dark:invert" />
  </div>
  
  {/* TENANT SWITCHER (opcional - Super Admin) */}
  <TenantSwitcher />
  
  {/* NAVIGATION */}
  <nav className="flex-1 overflow-y-auto scrollbar-custom">
    <NavSection title="CRM">
      <NavItem to="/crm" icon={Kanban} label="Pipeline" />
      <NavItem to="/crm/deals" icon={Briefcase} label="Deals" />
      {/* ... */}
    </NavSection>
    
    <NavSection title="Conversas">
      <NavItem to="/inbox" icon={Inbox} label="Caixa de Entrada" badge={counts?.inbox} />
      {/* ... */}
    </NavSection>
  </nav>
  
  {/* BOTTOM SECTION */}
  <div className="pt-3 space-y-0.5 border-t border-sidebar-border/50">
    <NavItem to="/settings" icon={Settings} label="Configurações" />
    
    {/* User Profile Card */}
    <div className="flex items-center gap-2.5 p-2 rounded-lg bg-secondary/40 mt-2">
      {/* Avatar com status online */}
      {/* Nome + Status */}
      {/* Botão Logout */}
    </div>
  </div>
  
</aside>
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

**Arquivo:** `src/components/layout/Header.tsx`

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
      <input placeholder="Buscar conversas, contatos..." className="flex-1 bg-transparent text-sm outline-none" />
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

**Arquivo:** `src/components/layout/BottomNav.tsx`

#### Estrutura

```tsx
<nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden glass-bottomnav px-2 pb-safe-bottom">
  <div className="flex items-center justify-center gap-2 py-2 max-w-md mx-auto">
    
    {/* Left side - 2 items */}
    <div className="flex items-center gap-1">
      <NavItem to="/" icon={Inbox} hasNotification />
      <NavItem to="/ai-agents" icon={Bot} />
    </div>
    
    {/* FAB Central */}
    <button 
      onClick={() => navigate('/crm/deals')}
      className="flex items-center justify-center w-14 h-14 -mt-6 rounded-full bg-foreground text-background shadow-lg glow-silver-strong hover:scale-105 transition-transform"
    >
      <Briefcase size={24} strokeWidth={2.5} />
    </button>
    
    {/* Right side - 2 items */}
    <div className="flex items-center gap-1">
      <NavItem to="/calendar" icon={Calendar} />
      <NavItem to="/contacts" icon={Users} />
    </div>
    
  </div>
</nav>
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
| Cor | Inversão (fg/bg) | `bg-foreground text-background` |
| Elevação | Negativa top | `-mt-6` |
| Efeito | Glow + scale | `glow-silver-strong hover:scale-105` |

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
| `z-40` | Sidebar, Bottom Nav, Launchers | Navegação principal |
| `z-50` | Modais, Drawers, Overlays | Elementos que sobrepõem tudo |

### Conflitos Conhecidos

```tsx
// Setup Widget vs Chat Launcher
// SetupWidget: z-50 (aparece durante onboarding)
// ChatLauncher: z-40 (aparece quando setup 100%)
// Lógica: Nunca aparecem juntos
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
<NavLink aria-label="Ir para Pipeline">
  <Kanban />
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

*Design System mantido pela equipe Luna CRM.*  
*Última atualização: 29/12/2024*
