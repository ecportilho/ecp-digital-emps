# ECP Emps — Especificação de Design & Identidade Visual

> **Versão:** 2.0
> **Data:** 20/04/2026
> **Status:** Implementado (MVP funcional)
> **Repositório:** `ecp-digital-emps`

---

## 1. Princípio de Design

O ECP Emps compartilha **100% da identidade visual** do ecp-digital-bank. A diferenciação entre PF e PJ acontece por **contexto e conteúdo**, nunca por mudança de tema, cores ou tipografia. O "look and feel" permanece idêntico quando o usuário alterna entre perfis (via `ProfileSwitcher`, que hoje redireciona o navegador para o app PF externo).

O que muda entre PF e PJ:
- **Sidebar:** itens de menu focados em gestão empresarial (Cobrancas, Time, Empresa)
- **Header:** exibe nome da empresa + badge `PJ`
- **Dashboard:** cash flow, resumo de cobranças, transações recentes categorizadas
- **Funcionalidades:** boletos, multi-usuários, cartões corporativos

O que **não** muda:
- Paleta (backgrounds, lime accent, semânticas)
- Tipografia (Inter)
- Border radius (18px cards, 13px controls)
- Componentes UI (Button, Card, Input, Modal, Badge)
- Dark theme
- Comportamento responsivo

---

## 2. Identidade Visual

Valores reais extraídos de `web/tailwind.config.ts` e `web/src/styles/globals.css`.

### 2.1. Paleta de Cores

| Token (Tailwind) | Hex / RGBA | Uso |
|------------------|------------|-----|
| `background` | `#0b0f14` | Fundo principal |
| `surface` | `#131c28` | Cards e superfícies elevadas |
| `secondary-bg` | `#0f1620` | Sidebar, header |
| `border` | `#27364a` | Bordas e separadores |

### 2.2. Cor de Acento (Lime)

| Token | Valor | Uso |
|-------|-------|-----|
| `lime` (DEFAULT) | `#b7ff2a` | CTAs, links ativos, saldo, logo |
| `lime.pressed` | `#7ed100` | Estado hover/pressed |
| `lime.dim` | `rgba(183, 255, 42, 0.12)` | Fundos de estado ativo, badges lime, avatar do header |

### 2.3. Cores Semânticas

| Token | Hex | Uso |
|-------|-----|-----|
| `success` | `#3dff8b` | Valores positivos, boletos pagos, entradas no cash flow |
| `warning` | `#ffcc00` | Alertas, boletos pendentes |
| `danger` | `#ff4d4d` | Erros, valores negativos, boletos vencidos, saídas |
| `info` | `#4da3ff` | Informações, role Financeiro |

### 2.4. Tipografia

| Token | Valor |
|-------|-------|
| `text-primary` | `#eaf2ff` |
| `text-secondary` | `#a9b7cc` |
| `text-tertiary` | `#7b8aa3` |
| Família | **Inter** (fallback `system-ui`, `sans-serif`) |

Definida como fonte padrão via `fontFamily.sans` no Tailwind e como `--font-family` em `globals.css`.

### 2.5. Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `rounded-card` | `18px` | Cards, modais, menus dropdown |
| `rounded-control` | `13px` | Buttons, inputs, chips |

### 2.6. Variáveis CSS (referência)

`web/src/styles/globals.css:5-36`:

```css
:root {
  /* Backgrounds */
  --color-background: #0b0f14;
  --color-surface: #131c28;
  --color-secondary-bg: #0f1620;

  /* Borders */
  --color-border: #27364a;

  /* Accent */
  --color-lime: #b7ff2a;
  --color-lime-pressed: #7ed100;
  --color-lime-dim: rgba(183, 255, 42, 0.12);

  /* Text */
  --color-text-primary: #eaf2ff;
  --color-text-secondary: #a9b7cc;
  --color-text-tertiary: #7b8aa3;

  /* Semantic */
  --color-success: #3dff8b;
  --color-warning: #ffcc00;
  --color-danger: #ff4d4d;
  --color-info: #4da3ff;

  /* Radius */
  --radius-card: 18px;
  --radius-control: 13px;

  /* Typography */
  --font-family: 'Inter', sans-serif;
}
```

Scrollbar customizada (6px, thumb `--color-border`, hover `--color-text-tertiary`) também vem do `globals.css`.

---

## 3. Tecnologias de Estilização

| Tecnologia | Versão | Papel |
|-----------|--------|-------|
| **Tailwind CSS** | 3.4 | Utility-first, configurado em `tailwind.config.ts` |
| **PostCSS + Autoprefixer** | 8.4 / 10.4 | Pipeline CSS |
| **Lucide React** | 0.400 | Ícones SVG (usado em todas as páginas) |

Nenhuma biblioteca de animação (Framer Motion etc.) está instalada. As animações são pequenos utilitários Tailwind (`transition-colors`, `transition-all`, `animate-pulse`, `animate-spin`) e classes custom `animate-in fade-in zoom-in-95` (definidas inline).

---

## 4. Componentes de UI Implementados

### 4.1. Base (`web/src/components/ui/`)

| Componente | Arquivo | Destaques observados no código |
|------------|---------|--------------------------------|
| **Button** | `Button.tsx` | 4 variantes (`primary`, `secondary`, `ghost`, `danger`) × 3 tamanhos (`sm`, `md`, `lg`); suporta `loading` (spinner SVG) e `icon` |
| **Card** | `Card.tsx` | Surface com `rounded-card` + `border-border`; exporta também `CardHeader` com `title/subtitle/action` |
| **Input** | `Input.tsx` | `forwardRef`; props `label`, `error`, `hint`, `iconLeft`, `iconRight`; foco em `ring-lime/30` |
| **Modal** | `Modal.tsx` | Overlay `black/60 + backdrop-blur-sm`; escape key fecha; `body.overflow hidden` enquanto aberto; 3 tamanhos (sm/md/lg) |
| **Badge** | `Badge.tsx` | 6 variantes (`success`, `warning`, `danger`, `info`, `lime`, `neutral`) com borda translúcida 20%; exporta `InvoiceStatusBadge` e `RoleBadge` |

### 4.2. Layout PJ (`web/src/components/layout/`)

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| **SidebarPJ** | `SidebarPJ.tsx` | Fixa 280px em `lg+`; header com logo `⬢ ECP Emps`, nome fantasia, natureza + CNPJ formatado; 8 itens (Dashboard, Extrato, Pix, Cobrancas, Cartoes, Time, Empresa, Perfil); item ativo com fundo `lime-dim` + texto `lime`; botão "Alternar para PF" no rodapé |
| **HeaderPJ** | `HeaderPJ.tsx` | Barra superior com `ProfileSwitcher` + badge lime `PJ` à esquerda; à direita sino de notificações com dot `danger` e avatar "MS" no fundo `lime-dim` |
| **ProfileSwitcher** | `ProfileSwitcher.tsx` | Dropdown em `rounded-card` mostrando "Conta Pessoal (PF)" e a empresa atual (PJ); clicar em PF redireciona para `VITE_PF_APP_URL`; indicador dot lime/tertiary para ativo/inativo |

### 4.3. Componentes previstos em v1.0 e NÃO implementados separadamente

Os componentes abaixo aparecem na spec de 2026-03 como peças dedicadas, mas no código atual são **inline** dentro das páginas (não há arquivos dedicados):

- `BalanceCardPJ` — inline em `pj-dashboard.tsx:115`
- `CashFlowChart` — inline em `pj-dashboard.tsx:163` (barras manuais com `h-48` + `bg-success/30` / `bg-danger/30`)
- `InvoiceSummary` — inline em `pj-dashboard.tsx:202`
- `QuickActionsPJ` — inline em `pj-dashboard.tsx:144` (grid de 2–4 cards)
- `InvoiceForm` / `InvoiceList` / `InvoicePreview` — inline em `invoices-novo.tsx` e `invoices-lista.tsx`
- `MobileNavPJ` — não existe
- `CorporateCardDisplay` / `CardLimitBar` / `CardHolderBadge` — inline em `cartoes-lista.tsx`
- `MemberList` / `InviteModal` / `PermissionsMatrix` — inline em `team.tsx`

Os badges pré-configurados `InvoiceStatusBadge` e `RoleBadge`, por outro lado, **estão implementados** em `Badge.tsx:40-61`.

---

## 5. Páginas (14 rotas reais)

Definidas em `web/src/routes/index.tsx`:

| # | Página | Rota | Arquivo |
|---|--------|------|---------|
| 1 | Login (dev) | `/` (quando não autenticado) | `login.tsx` |
| 2 | Dashboard PJ | `/pj/dashboard` | `pj-dashboard.tsx` |
| 3 | Extrato | `/pj/extrato` | `pj-extrato.tsx` |
| 4 | Pix Enviar | `/pj/pix/enviar` | `pj-pix-enviar.tsx` |
| 5 | Pix Receber | `/pj/pix/receber` | `pj-pix-receber.tsx` |
| 6 | Pix Chaves | `/pj/pix/chaves` | `pj-pix-chaves.tsx` |
| 7 | Lista de Cobranças | `/pj/cobrancas` | `invoices-lista.tsx` |
| 8 | Nova Cobrança | `/pj/cobrancas/nova` | `invoices-novo.tsx` (wizard 3 steps) |
| 9 | Detalhe de Cobrança | `/pj/cobrancas/:id` | `invoices-detalhe.tsx` |
| 10 | Cartões — Lista | `/pj/cartoes` | `cartoes-lista.tsx` |
| 11 | Cartões — Fatura | `/pj/cartoes/:id/fatura` | `cartoes-fatura.tsx` |
| 12 | Time | `/pj/time` | `team.tsx` |
| 13 | Empresa | `/pj/empresa` | `empresa.tsx` |
| 14 | Perfil | `/pj/perfil` | inline placeholder em `index.tsx:15` |

A rota raiz `/` redireciona para `/pj/dashboard`.

### 5.1. Tela de Login (diferença notável vs. spec v1.0)

A spec v1.0 previa que o login fosse herdado do ecp-digital-bank. A implementação atual possui **tela de login standalone** (`login.tsx`) com:

- Logo `⬡ ECP Emps` em lime `#b7ff2a`, tamanho 28px, weight 800
- Card central com email + senha
- **Quick login de 7 empresas** (demo) com senha `Senha@123`
- Estilos inline em `style={{ ... }}` reforçando os mesmos hex codes do tema

---

## 6. Sidebar PJ — Itens Reais

Do código (`SidebarPJ.tsx:14-23`):

```
┌─────────────────────────────┐
│  ⬢ ECP Emps                 │
│  {nomeFantasia}             │
│  {natureza} • {cnpjFormatado}│
├─────────────────────────────┤
│  ▢ Dashboard               │  /pj/dashboard
│  ≡ Extrato                 │  /pj/extrato
│  ⚡ Pix                    │  /pj/pix/enviar
│  🗎 Cobrancas              │  /pj/cobrancas
│  💳 Cartoes                │  /pj/cartoes
│  👥 Time                   │  /pj/time
│  🏢 Empresa                │  /pj/empresa
│  👤 Perfil                 │  /pj/perfil
├─────────────────────────────┤
│  ● Alternar para PF        │  → ProfileSwitcher redirect
└─────────────────────────────┘
```

Ícones Lucide utilizados: `LayoutDashboard`, `ScrollText`, `Zap`, `FileText`, `CreditCard`, `Users`, `Building2`, `UserCircle`.

Texto é **sem acentos** em alguns itens (`Cobrancas`, `Cartoes`) por decisão intencional do front-end — evita problemas de encoding em legendas.

---

## 7. Estado e Comportamento

### 7.1. Estado Ativo nos NavLinks

```tsx
isActive
  ? 'bg-lime-dim text-lime'
  : 'text-text-secondary hover:text-text-primary hover:bg-surface'
```

### 7.2. Estados dos Botões

Definidos em `Button.tsx:14-23`:

| Variante | Estado padrão | Hover | Focus ring |
|----------|---------------|-------|------------|
| `primary` | `bg-lime text-background` | `bg-lime-pressed` | `ring-lime/30` |
| `secondary` | `bg-surface border-border text-text-primary` | `bg-secondary-bg` | `ring-border/30` |
| `ghost` | `bg-transparent text-text-secondary` | `bg-surface text-text-primary` | `ring-border/20` |
| `danger` | `bg-danger/10 text-danger border-danger/20` | `bg-danger/20` | `ring-danger/30` |

Disabled: `opacity-50 cursor-not-allowed`.

### 7.3. Skeleton Loading

Em `pj-dashboard.tsx:58`: `animate-pulse bg-border/40 rounded-control`. Usado no carregamento inicial do dashboard.

---

## 8. Mapeamento de Badges

### 8.1. Status de Boleto — `InvoiceStatusBadge`

`Badge.tsx:40`:

| Status | Variante | Label |
|--------|----------|-------|
| `pending` | `warning` | Pendente |
| `paid` | `success` | Pago |
| `overdue` | `danger` | Vencido |
| `cancelled` | `neutral` | Cancelado |

### 8.2. Role — `RoleBadge`

`Badge.tsx:52`:

| Role | Variante | Label |
|------|----------|-------|
| `admin` | `lime` | Admin |
| `financial` | `info` | Financeiro |
| `viewer` | `neutral` | Visualizador |

### 8.3. Transação no Dashboard

Em `pj-dashboard.tsx:50-56` há um `categoryLabels` que mapeia `pix_received → Pix Recebido`, `pix_sent → Pix Enviado`, `boleto_paid → Boleto Pago`, `card_purchase → Compra Cartao`, `transfer_pf → Transferencia PF`. Transações `credit` recebem badge `success`, `debit` recebem `neutral`.

---

## 9. Layout do Dashboard (referência implementada)

Estrutura de `pj-dashboard.tsx`:

1. **BalanceCard** — Card com gradiente `from-surface to-secondary-bg`
   - Nome fantasia + CNPJ formatado
   - Botão `Eye/EyeOff` para mostrar/ocultar saldo
   - Saldo em texto `text-3xl font-bold text-lime`
   - Subtexto `text-success`: "Rendendo 100% CDI" com ícone `TrendingUp`

2. **Quick Actions** — Grid 2/4 colunas com 4 cards:
   - Enviar Pix (`Send`) → `/pj/pix/enviar`
   - Cobrar (`QrCode`) → `/pj/cobrancas/nova`
   - Transferir PF/PJ (`ArrowLeftRight`) → `/pj/pix/enviar`
   - Novo Cartao (`CreditCard`) → `/pj/cartoes`

3. **Cash Flow Chart** — Card com 7 barras duplas (entrada/saída) em `h-36`
   - Entradas: `bg-success/30`
   - Saídas: `bg-danger/30`
   - Tooltip nativo via `title`
   - Labels de dia da semana em `text-[10px]` capitalizados

4. **Invoice Summary** — 3 linhas com ícone circular + contador:
   - Pendentes: `Clock` em `warning/10`
   - Pagos: `CheckCircle2` em `success/10`
   - Vencidos: `AlertTriangle` em `danger/10`

5. **Recent Transactions** — lista com até 5 itens:
   - Avatar circular com `TrendingUp` (credit) ou `TrendingDown` (debit)
   - Nome + badge de categoria
   - Valor formatado `+/- R$ ...` em verde/vermelho e data

---

## 10. Responsividade

Do uso efetivo de `hidden lg:flex` na sidebar e classes grid:

| Breakpoint | Comportamento |
|-----------|---------------|
| `lg` (≥ 1024px) | Sidebar 280px visível + conteúdo principal |
| `md` (≥ 768px) | Quick actions em 4 colunas, cash flow + invoices lado a lado |
| `< md` | Stack vertical, quick actions em 2 colunas |
| `< lg` | Sidebar oculta; **mobile bottom nav NÃO está implementado** (diferente da spec v1.0) |

---

## 11. Identidade do Login (Ecossistema)

A tela de login cita explicitamente o ecossistema completo (`login.tsx:204`):

> "Ecossistema ECP — ecp-digital-bank (PF) + ecp-digital-emps (PJ) + ecp-digital-food"

---

## 12. Diferenças visuais vs. spec 2026-03

| Elemento | Spec 2026-03 | Implementado 2026-04 |
|----------|--------------|----------------------|
| Login | "Herdado do ecp-digital-bank" | Tela própria com quick buttons para 7 empresas (dev) |
| Logo sidebar | `⬡ ECP Emps` + subtítulo estático | `⬢ ECP Emps` + nome fantasia dinâmico + CNPJ formatado |
| ProfileSwitcher | Alterna in-place | Redireciona para URL externa (`VITE_PF_APP_URL`) |
| Mobile nav | `MobileNavPJ` com 5 itens | Não existe |
| Componentes dedicados (InvoiceForm, CashFlowChart etc.) | Arquivos separados | Inline dentro das páginas |
| Onboarding | Rota `/pj/onboarding` | Não existe |
| Perfil do operador | Página completa | Placeholder em 2 linhas |

---

*Documento gerado para o projeto ECP Emps — v2.0 (20/04/2026).*
*Identidade visual alinhada ao ecp-digital-bank; diferenciação apenas por conteúdo e contexto PJ.*
