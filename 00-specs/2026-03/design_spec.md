# ECP Emps — Especificação de Design & Identidade Visual

> **Versão:** 1.0  
> **Data:** 28/03/2026  
> **Status:** Em desenvolvimento  
> **Repositório:** `ecp-digital-bank-emps`

---

## 1. Princípio de Design

O ECP Emps compartilha **100% da identidade visual** do ecp-digital-bank. A diferenciação entre os perfis PF e PJ acontece por meio de **contexto e conteúdo**, nunca por mudança de tema, cores ou tipografia. Quando o usuário alterna entre PF e PJ, o layout muda (sidebar, dashboard, funcionalidades), mas o "look and feel" permanece idêntico — como o Nubank faz com a conta pessoal e a Nu Empresas.

O que muda entre PF e PJ:
- **Sidebar:** Itens de menu diferentes (Cobranças, Time, Cartões Corporativos)
- **Header:** Exibe nome da empresa + badge "PJ" em vez do nome pessoal
- **Dashboard:** Cards e gráficos específicos para gestão empresarial
- **Funcionalidades:** Boletos, multi-usuários, cartões corporativos

O que **não** muda:
- Paleta de cores (backgrounds, acento, semânticas)
- Tipografia (Inter)
- Border radius (18px cards, 13px controls)
- Componentes UI (Button, Card, Input, Modal, Table, Badge)
- Dark theme
- Comportamento responsivo

---

## 2. Identidade Visual (herdada do ecp-digital-bank)

### 2.1. Paleta de Cores

| Token | Valor | Uso |
|-------|-------|-----|
| Background | `#0b0f14` | Fundo principal da aplicação |
| Surface | `#131c28` | Cards, modais e superfícies elevadas |
| Secondary Background | `#0f1620` | Sidebar, áreas alternadas |
| Border | `#27364a` | Bordas de cards e separadores |

### 2.2. Cor de Acento

| Token | Valor | Uso |
|-------|-------|-----|
| Lime (Acento) | `#b7ff2a` | CTAs, links ativos, badges, destaques |
| Lime Pressed | `#7ed100` | Estado hover/pressed do acento |

### 2.3. Cores Semânticas

| Token | Valor | Uso |
|-------|-------|-----|
| Success | `#3dff8b` | Valores positivos, confirmações, boletos pagos |
| Warning | `#ffcc00` | Alertas, boletos próximos do vencimento |
| Danger | `#ff4d4d` | Erros, valores negativos, boletos vencidos |
| Info | `#4da3ff` | Informações, links, convites de time |

### 2.4. Tipografia

| Token | Valor | Uso |
|-------|-------|-----|
| Text Primary | `#eaf2ff` | Textos principais |
| Text Secondary | `#a9b7cc` | Textos auxiliares |
| Text Tertiary | `#7b8aa3` | Labels e placeholders |
| Fonte | Inter | Família tipográfica principal |

### 2.5. Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| Border Radius (Card) | 18px | Cards e superfícies |
| Border Radius (Control) | 13px | Botões e inputs |

---

## 3. Tecnologias de Estilização

| Tecnologia | Versão | Papel |
|-----------|--------|-------|
| **Tailwind CSS** | 3.4 | Estilização utility-first |
| **Lucide React** | — | Ícones SVG |

---

## 4. Componentes de UI (idênticos ao ecp-digital-bank)

Os componentes base são os mesmos. Reutilizar via cópia direta de `web/src/components/ui/`:

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| Button | `Button.tsx` | 4 variantes (primary, secondary, ghost, danger), 3 tamanhos |
| Card | `Card.tsx` | Container Surface com border radius 18px |
| Input | `Input.tsx` | Campo com validação, ícones, forwardRef |
| Modal | `Modal.tsx` | Diálogo com overlay e Escape key |
| Table | `Table.tsx` | Tabela de dados estilizada |
| Badge | `Badge.tsx` | Tags para status e categorias |

---

## 5. Componentes de Layout — Específicos PJ

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| SidebarPJ | `SidebarPJ.tsx` | Menu lateral com itens PJ: Dashboard, Extrato, Pix, Cobranças, Cartões, Time, Empresa |
| HeaderPJ | `HeaderPJ.tsx` | Barra superior com nome da empresa, badge "PJ", toggle PF↔PJ e notificações |
| MobileNavPJ | `MobileNavPJ.tsx` | Bottom tab com 5 itens PJ |
| ProfileSwitcher | `ProfileSwitcher.tsx` | Toggle visual PF↔PJ no header (dropdown ou switch) |

### 5.1. ProfileSwitcher — Componente-chave

O ProfileSwitcher é o elemento de UI que conecta os dois produtos. Design:

```
┌──────────────────────────────────┐
│  ● Marina Silva        [PF ▾]   │  ← Estado: perfil PF ativo
│    Conta pessoal                 │
├──────────────────────────────────┤
│  ○ AB Design Studio    [PJ]     │  ← Clicável: alterna para PJ
│    MEI • 12.345.678/0001-95     │
└──────────────────────────────────┘
```

- **Posição:** Header, lado esquerdo (substituindo o avatar/nome simples)
- **Comportamento:** Dropdown com as contas disponíveis
- **Indicador visual:** Dot verde no perfil ativo, dot cinza no inativo
- **Badge:** "PF" ou "PJ" com fundo `lime-dim` (`rgba(183, 255, 42, 0.12)`)
- **Animação:** Transição suave do sidebar e conteúdo ao alternar (fade 200ms)

---

## 6. Componentes Específicos PJ

### 6.1. Dashboard PJ

| Componente | Descrição |
|------------|-----------|
| **BalanceCardPJ** | Card de saldo com razão social, CNPJ formatado, show/hide saldo |
| **CashFlowChart** | Gráfico de barras: entradas (verde) vs saídas (vermelho) últimos 30 dias |
| **InvoiceSummary** | Mini-cards: X boletos pendentes, Y pagos, Z vencidos |
| **QuickActionsPJ** | Grid de ações: Enviar Pix, Cobrar (boleto), Novo cartão, Convidar membro |
| **RecentTransactionsPJ** | Últimas 5 transações com badge de categoria empresarial |
| **PFPJConsolidated** | Card opcional: "Visão unificada" — saldo PF + PJ lado a lado |

### 6.2. Cobranças (Invoices)

| Componente | Descrição |
|------------|-----------|
| **InvoiceForm** | Formulário multi-step: dados do cliente → valor/vencimento → juros/multa → preview |
| **InvoiceList** | Lista com filtros por status (badges coloridos), busca por cliente |
| **InvoiceStatusBadge** | Badge semântico: Pendente (warning), Pago (success), Vencido (danger), Cancelado (neutral) |
| **InvoicePreview** | Preview visual do boleto com código de barras + QR Code Pix |
| **InvoiceTimeline** | Mini timeline da cobrança: Emitido → Notificado → Pago (ou Vencido → Renotificado) |

### 6.3. Cartões Corporativos

| Componente | Descrição |
|------------|-----------|
| **CorporateCardDisplay** | Visual do cartão com nome do titular, últimos 4, empresa. Gradiente lime → dark |
| **CardLimitBar** | Barra de progresso: usado/limite com cores (verde < 50%, amarelo < 80%, vermelho > 80%) |
| **CardHolderBadge** | Badge com nome do titular + perfil (Admin/Financeiro) |

### 6.4. Time (Multi-usuários)

| Componente | Descrição |
|------------|-----------|
| **MemberList** | Lista de membros com avatar, nome, e-mail, perfil (role badge), status |
| **InviteModal** | Modal de convite: e-mail + seleção de perfil (Admin, Financeiro, Visualizador) |
| **RoleBadge** | Badge colorido por perfil: Admin (lime), Financeiro (info), Visualizador (neutral) |
| **PermissionsMatrix** | Tabela visual de "o que cada perfil pode fazer" (referência, não interativo) |

---

## 7. Páginas (12 telas PJ)

| # | Página | Rota | Descrição |
|---|--------|------|-----------|
| 1 | Abertura de Conta PJ | `/pj/onboarding` | Fluxo multi-step: CNPJ → dados → confirmação |
| 2 | Dashboard PJ | `/pj/dashboard` | Saldo, cash flow, boletos, ações rápidas |
| 3 | Extrato PJ | `/pj/extrato` | Transações com categorias empresariais + filtros |
| 4 | Pix Enviar PJ | `/pj/pix/enviar` | Envio de Pix com dados PJ (CNPJ, razão social) |
| 5 | Pix Receber PJ | `/pj/pix/receber` | Chaves PJ + QR Code empresarial |
| 6 | Pix Chaves PJ | `/pj/pix/chaves` | CRUD de chaves CNPJ, e-mail, telefone, aleatória |
| 7 | Nova Cobrança | `/pj/cobrancas/nova` | Emissão de boleto: form → preview → envio |
| 8 | Lista de Cobranças | `/pj/cobrancas` | Boletos emitidos com status, filtros e ações |
| 9 | Cartões Corporativos | `/pj/cartoes` | Lista de cartões + criação + fatura |
| 10 | Gestão do Time | `/pj/time` | Membros + convites + perfis de acesso |
| 11 | Dados da Empresa | `/pj/empresa` | Dados cadastrais, CNPJ, endereço, natureza jurídica |
| 12 | Perfil do Operador | `/pj/perfil` | Dados do usuário logado, alterar senha, sessões |

---

## 8. Sidebar PJ — Itens de Menu

```
┌─────────────────────────────┐
│  ⬡ ECP Emps                │
│  AB Design Studio           │
│  MEI • 12.345.678/0001-95   │
├─────────────────────────────┤
│  ◉ Dashboard                │  ← /pj/dashboard
│  📋 Extrato                 │  ← /pj/extrato
│  ⚡ Pix                     │  ← /pj/pix/enviar
│  📄 Cobranças               │  ← /pj/cobrancas     ★ NOVO PJ
│  💳 Cartões                 │  ← /pj/cartoes
│  👥 Time                    │  ← /pj/time           ★ NOVO PJ
│  🏢 Empresa                 │  ← /pj/empresa        ★ NOVO PJ
│  👤 Perfil                  │  ← /pj/perfil
├─────────────────────────────┤
│  [↔ Alternar para PF]       │  ← ProfileSwitcher
└─────────────────────────────┘
```

Itens marcados com ★ são exclusivos do perfil PJ. Os demais existem em ambos os perfis, mas com conteúdo e comportamento adaptados ao contexto empresarial.

---

## 9. Diferenças Visuais PF vs PJ

| Elemento | PF | PJ |
|----------|----|----|
| Header — Nome | "Marina Silva" | "AB Design Studio" + badge PJ |
| Header — Subtítulo | "Conta pessoal" | "MEI • 12.345.678/0001-95" |
| Sidebar — Logo | "ECP Banco Digital" | "ECP Emps" |
| Sidebar — Itens | 6 (Dashboard, Extrato, Pix, Cartões, Pagamentos, Perfil) | 8 (+ Cobranças, Time, Empresa) |
| Dashboard — Saldo | R$ X.XXX,XX | R$ X.XXX,XX + "Saldo empresarial" |
| Dashboard — Gráfico | Donut por categoria pessoal | Barras de cash flow (entradas vs saídas) |
| Dashboard — Actions | Enviar Pix, Pagar boleto | Enviar Pix, Cobrar (boleto), Novo cartão |
| Extrato — Categorias | Alimentação, Transporte, Lazer... | Fornecedores, Impostos, Marketing, Operacional... |
| Cartões | "Meu cartão virtual" | "Cartões da empresa" com titular por cartão |
| Notificações | Pessoais | "Boleto pago", "Novo membro", "Cartão bloqueado" |

---

## 10. Referência CSS — Variáveis do Tema

```css
/* web/src/styles/globals.css — IDÊNTICO ao ecp-digital-bank */

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

---

## 11. Badges de Status — Mapeamento PJ

### 11.1. Status de Boleto (Invoice)

| Status | Badge | Cor |
|--------|-------|-----|
| Pendente | `badge-warning` | Warning (#ffcc00) com fundo rgba |
| Pago | `badge-success` | Success (#3dff8b) com fundo rgba |
| Vencido | `badge-danger` | Danger (#ff4d4d) com fundo rgba |
| Cancelado | `badge-neutral` | Tertiary (#7b8aa3) com fundo rgba |

### 11.2. Perfil de Acesso (Role)

| Role | Badge | Cor |
|------|-------|-----|
| Admin | `badge-lime` | Lime (#b7ff2a) com fundo lime-dim |
| Financeiro | `badge-info` | Info (#4da3ff) com fundo rgba |
| Visualizador | `badge-neutral` | Tertiary (#7b8aa3) com fundo rgba |

### 11.3. Status de Empresa

| Status | Badge | Cor |
|--------|-------|-----|
| Pendente validação | `badge-warning` | Warning |
| Ativa | `badge-success` | Success |
| Suspensa | `badge-danger` | Danger |
| Encerrada | `badge-neutral` | Neutral |

### 11.4. Status de Membro do Time

| Status | Badge | Cor |
|--------|-------|-----|
| Ativo | `badge-success` | Success |
| Convidado | `badge-info` | Info |
| Removido | `badge-neutral` | Neutral |

---

## 12. Responsividade

O comportamento responsivo é idêntico ao ecp-digital-bank:

| Breakpoint | Comportamento |
|-----------|---------------|
| ≥ 1280px | Sidebar fixa (280px) + conteúdo fluido. Layout "desktop productivity" |
| 1024-1279px | Sidebar colapsável + conteúdo fullwidth |
| 768-1023px | Sem sidebar, bottom nav mobile com 5 itens |
| < 768px | Mobile-first: cards empilhados, tabelas com scroll horizontal |

O ProfileSwitcher no mobile aparece como primeiro item do bottom sheet de perfil (acessível via avatar).

---

*Documento gerado para o projeto ECP Emps — v1.0*  
*Identidade visual herdada do ecp-digital-bank*
