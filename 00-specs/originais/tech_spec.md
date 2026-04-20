# ECP Emps — Especificação Técnica

> **Versão:** 1.0  
> **Data:** 28/03/2026  
> **Status:** Em desenvolvimento  
> **Repositório:** `ecp-digital-bank-emps`

---

## 1. Stack Tecnológica — v1.0

A stack do ECP Emps é idêntica à do ecp-digital-bank v3.0, garantindo consistência no ecossistema e reuso de conhecimento. O princípio é o mesmo: **um `npm run dev` na raiz liga tudo**. Sem Docker, sem banco externo, sem serviços na nuvem para o ambiente de desenvolvimento.

### 1.1. Ambiente de Desenvolvimento — Windows 11

> Os pré-requisitos são idênticos ao ecp-digital-bank. Consultar `05-docs/install/install-ecp-digital-bank-win.md` para detalhes.

| Requisito | Versão | Motivo |
|-----------|--------|--------|
| **Node.js** | 18+ (LTS 20 recomendado) | Runtime do projeto |
| **Python** | 3.12+ | Compilação do `better-sqlite3` via `node-gyp` |
| **VS Build Tools 2022** | — | Compilador C++ para módulos nativos |
| **Git** | 2.40+ | Controle de versão com LF line endings |

### 1.2. Comparativo com ecp-digital-bank

| Aspecto | ecp-digital-bank (PF) | ecp-digital-bank-emps (PJ) |
|---------|----------------------|---------------------------|
| Stack backend | Fastify 5.0 + SQLite3 | **Idêntica** |
| Stack frontend | React 18.3 + Vite 5.4 | **Idêntica** |
| Autenticação | JWT + bcryptjs | **Herda sessão do PF** + RBAC multi-usuário |
| Banco de dados | `database.sqlite` | `database-emps.sqlite` (arquivo separado) |
| Porta API | 3333 | **3334** |
| Porta Web | 5173 | **5174** |
| Módulos exclusivos | auth, pix, cards, transactions, payments, users, accounts, notifications | **companies, invoices (boletos), corporate-cards, team, pj-pix, pj-transactions, pj-accounts, pj-dashboard** |
| Módulos compartilhados | — | auth (via proxy para PF), shared utils, UI components |

### 1.3. Back-end (API)

| Tecnologia | Versão | Papel |
|-----------|--------|-------|
| **TypeScript** | 5.5 | Linguagem base |
| **Fastify** | 5.0 | Servidor HTTP de alta performance |
| **Zod** | 3.23 | Validação de inputs e contratos |
| **SQLite3** | — | Banco de dados em arquivo único (`database-emps.sqlite`) |
| **better-sqlite3** | — | Driver SQLite síncrono para Node.js |
| **tsx** | 4.19 | Executor TypeScript com hot reload |
| **bcryptjs** | — | Hash de senhas (pure JS, sem compilação nativa extra) |
| **jsonwebtoken** | — | Autenticação JWT (compatível com tokens do PF) |

### 1.4. Front-end (Web App / UI)

| Tecnologia | Versão | Papel |
|-----------|--------|-------|
| **TypeScript** | 5.6 | Tipagem segura |
| **React** | 18.3 | Biblioteca de UI |
| **React Router** | 6.26 | Navegação SPA |
| **Tailwind CSS** | 3.4 | Estilização utility-first |
| **Lucide React** | — | Ícones SVG |
| **Vite** | 5.4 | Build tool |

---

## 2. Regras Invioláveis de Código

Todas as 13 regras do ecp-digital-bank se aplicam. Adicionalmente:

1. **TypeScript strict sempre** — `"strict": true`. NUNCA `any`.
2. **Schemas Zod são a fonte de verdade** — tipos derivados via `z.infer<>`.
3. **Dinheiro sempre em centavos** — integer. NUNCA float.
4. **IDs são UUID v4** — NUNCA auto-increment.
5. **Erros padronizados** — `AppError` com `ErrorCode`.
6. **Soft delete** — NUNCA deletar fisicamente.
7. **Logs estruturados** — NUNCA `console.log` em produção.
8. **Secrets em variáveis de ambiente** — NUNCA commitar `.env`.
9. **Validação na borda** — todo input validado por Zod.
10. **Transações para operações compostas** — `BEGIN/COMMIT/ROLLBACK`.
11. **Imports com case exato** — previne quebra no CI Linux.
12. **Caminhos com `path.join()`** — compatibilidade Windows/Linux.
13. **Sem deps com compilação nativa desnecessária** — pure JS quando possível.
14. **NOVO — CNPJ validado com algoritmo de verificação** (2 dígitos verificadores, módulo 11).
15. **NOVO — Toda transação PJ inclui CNPJ e razão social nos metadados.**
16. **NOVO — Multi-usuários: toda ação registra o `userId` do operador, não apenas o `companyId`.**
17. **NOVO — Perfis de acesso (RBAC):** Admin, Financeiro, Visualizador. Middleware valida permissão por rota.
18. **NOVO — Boletos seguem especificação FEBRABAN** para código de barras e linha digitável.

---

## 3. Modelo de Dados (SQLite)

### 3.1. Tabelas Principais

```sql
-- Empresas
CREATE TABLE companies (
  id              TEXT PRIMARY KEY,           -- UUID v4
  owner_user_id   TEXT NOT NULL,              -- FK para users do ecp-digital-bank (CPF do responsável)
  cnpj            TEXT NOT NULL UNIQUE,
  razao_social    TEXT NOT NULL,
  nome_fantasia   TEXT,
  natureza_juridica TEXT NOT NULL,            -- mei | ei | eireli | ltda | slu
  endereco        TEXT,                       -- JSON: { logradouro, numero, complemento, bairro, cidade, uf, cep }
  status          TEXT NOT NULL DEFAULT 'pending_validation',  -- pending_validation | active | suspended | closed
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at      TEXT
);

-- Contas PJ
CREATE TABLE pj_accounts (
  id              TEXT PRIMARY KEY,
  company_id      TEXT NOT NULL REFERENCES companies(id),
  agency          TEXT NOT NULL DEFAULT '0001',
  number          TEXT NOT NULL UNIQUE,       -- 8 dígitos + 1 dígito verificador
  balance         INTEGER NOT NULL DEFAULT 0, -- centavos, NUNCA negativo
  daily_transfer_limit INTEGER NOT NULL DEFAULT 1000000, -- R$ 10.000 padrão em centavos
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Time da empresa (multi-usuários)
CREATE TABLE team_members (
  id              TEXT PRIMARY KEY,
  company_id      TEXT NOT NULL REFERENCES companies(id),
  user_id         TEXT NOT NULL,              -- FK para users do ecp-digital-bank
  role            TEXT NOT NULL DEFAULT 'viewer', -- admin | financial | viewer
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active', -- active | invited | removed
  invited_at      TEXT NOT NULL DEFAULT (datetime('now')),
  accepted_at     TEXT,
  removed_at      TEXT
);

-- Transações PJ
CREATE TABLE pj_transactions (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES pj_accounts(id),
  operator_id     TEXT NOT NULL,              -- user_id de quem executou (auditoria)
  type            TEXT NOT NULL,              -- credit | debit
  category        TEXT NOT NULL,              -- pix_sent | pix_received | boleto_paid | boleto_received | card_purchase | transfer_pf | transfer_pj | fee | tax
  amount          INTEGER NOT NULL,           -- centavos (sempre positivo)
  balance_after   INTEGER NOT NULL,           -- saldo após transação
  direction       TEXT NOT NULL,              -- in | out
  description     TEXT,
  counterpart_name TEXT,
  counterpart_document TEXT,                  -- CNPJ ou CPF
  counterpart_institution TEXT,
  pix_key         TEXT,
  pix_key_type    TEXT,
  boleto_code     TEXT,
  reference_id    TEXT UNIQUE,                -- idempotency_key
  status          TEXT NOT NULL DEFAULT 'pending',
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Chaves Pix PJ
CREATE TABLE pj_pix_keys (
  id              TEXT PRIMARY KEY,
  company_id      TEXT NOT NULL REFERENCES companies(id),
  account_id      TEXT NOT NULL REFERENCES pj_accounts(id),
  type            TEXT NOT NULL,              -- cnpj | email | phone | random
  value           TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at      TEXT
);

-- Boletos emitidos (cobranças)
CREATE TABLE invoices (
  id              TEXT PRIMARY KEY,
  company_id      TEXT NOT NULL REFERENCES companies(id),
  account_id      TEXT NOT NULL REFERENCES pj_accounts(id),
  operator_id     TEXT NOT NULL,              -- quem emitiu
  customer_name   TEXT NOT NULL,
  customer_document TEXT NOT NULL,            -- CPF ou CNPJ do pagador
  customer_email  TEXT,
  amount          INTEGER NOT NULL,           -- centavos
  due_date        TEXT NOT NULL,
  description     TEXT,
  barcode         TEXT,                       -- código de barras 47 dígitos
  digitable_line  TEXT,                       -- linha digitável
  pix_qrcode      TEXT,                       -- QR Code Pix embutido no boleto
  pix_copy_paste  TEXT,                       -- Pix copia e cola
  interest_rate   INTEGER DEFAULT 100,        -- 1% a.m. em basis points
  penalty_rate    INTEGER DEFAULT 200,        -- 2% multa em basis points
  discount_days   INTEGER DEFAULT 0,          -- dias antes do vencimento para desconto
  discount_amount INTEGER DEFAULT 0,          -- valor desconto em centavos
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | paid | overdue | cancelled
  paid_at         TEXT,
  paid_amount     INTEGER,                    -- valor efetivamente pago
  notification_sent INTEGER DEFAULT 0,        -- 0 = não, 1 = sim
  type            TEXT NOT NULL DEFAULT 'single', -- single | installment | recurring
  installment_of  INTEGER,                    -- parcela X
  installment_total INTEGER,                  -- de Y
  parent_invoice_id TEXT,                     -- para parcelamentos, referência ao boleto pai
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Cartões corporativos
CREATE TABLE corporate_cards (
  id              TEXT PRIMARY KEY,
  company_id      TEXT NOT NULL REFERENCES companies(id),
  account_id      TEXT NOT NULL REFERENCES pj_accounts(id),
  holder_id       TEXT NOT NULL REFERENCES team_members(id), -- titular do cartão
  card_number     TEXT NOT NULL,              -- armazenado com hash, últimos 4 para exibição
  last4           TEXT NOT NULL,
  card_holder     TEXT NOT NULL,              -- nome impresso
  card_expiry     TEXT NOT NULL,              -- MM/YYYY
  limit_cents     INTEGER NOT NULL DEFAULT 0,
  used_cents      INTEGER NOT NULL DEFAULT 0,
  due_day         INTEGER NOT NULL DEFAULT 25,
  status          TEXT NOT NULL DEFAULT 'active', -- active | blocked | cancelled
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Compras no cartão corporativo
CREATE TABLE corporate_card_purchases (
  id              TEXT PRIMARY KEY,
  card_id         TEXT NOT NULL REFERENCES corporate_cards(id),
  company_id      TEXT NOT NULL REFERENCES companies(id),
  description     TEXT NOT NULL,
  merchant_name   TEXT NOT NULL,
  merchant_category TEXT,                     -- mcc_code → categoria legível
  amount          INTEGER NOT NULL,           -- centavos
  status          TEXT NOT NULL DEFAULT 'completed', -- pending | completed | cancelled | refunded
  purchased_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Faturas do cartão corporativo
CREATE TABLE corporate_invoices (
  id              TEXT PRIMARY KEY,
  card_id         TEXT NOT NULL REFERENCES corporate_cards(id),
  reference_month TEXT NOT NULL,              -- "2026-03"
  total_cents     INTEGER NOT NULL DEFAULT 0,
  due_date        TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open', -- open | closed | paid | overdue
  paid_at         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Notificações PJ
CREATE TABLE pj_notifications (
  id              TEXT PRIMARY KEY,
  company_id      TEXT NOT NULL REFERENCES companies(id),
  user_id         TEXT,                       -- null = todos do time | user_id = específico
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  type            TEXT NOT NULL,              -- transaction | invoice | security | team | system
  is_read         INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Rate limiting Pix PJ
CREATE TABLE pj_pix_rate_limit (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES pj_accounts(id),
  window_start    TEXT NOT NULL,
  transfer_count  INTEGER NOT NULL DEFAULT 0
);

-- Audit log PJ (toda ação registrada)
CREATE TABLE pj_audit_logs (
  id              TEXT PRIMARY KEY,
  company_id      TEXT NOT NULL REFERENCES companies(id),
  user_id         TEXT NOT NULL,              -- quem executou
  action          TEXT NOT NULL,              -- create_company | send_pix | create_invoice | block_card | add_member | ...
  resource        TEXT NOT NULL,              -- company | transaction | invoice | card | team_member
  resource_id     TEXT,
  metadata        TEXT,                       -- JSON com detalhes adicionais
  ip_address      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 3.2. Índices

```sql
CREATE INDEX idx_companies_owner ON companies(owner_user_id);
CREATE INDEX idx_companies_cnpj ON companies(cnpj);
CREATE INDEX idx_pj_accounts_company ON pj_accounts(company_id);
CREATE INDEX idx_team_company ON team_members(company_id);
CREATE INDEX idx_team_user ON team_members(user_id);
CREATE INDEX idx_pj_tx_account ON pj_transactions(account_id);
CREATE INDEX idx_pj_tx_created ON pj_transactions(created_at);
CREATE INDEX idx_pj_tx_category ON pj_transactions(category);
CREATE INDEX idx_pj_tx_status ON pj_transactions(status);
CREATE INDEX idx_pj_pix_keys_company ON pj_pix_keys(company_id);
CREATE INDEX idx_pj_pix_keys_value ON pj_pix_keys(value);
CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due ON invoices(due_date);
CREATE INDEX idx_invoices_customer ON invoices(customer_document);
CREATE INDEX idx_corp_cards_company ON corporate_cards(company_id);
CREATE INDEX idx_corp_cards_holder ON corporate_cards(holder_id);
CREATE INDEX idx_corp_purchases_card ON corporate_card_purchases(card_id);
CREATE INDEX idx_pj_notif_company ON pj_notifications(company_id);
CREATE INDEX idx_pj_audit_company ON pj_audit_logs(company_id);
CREATE INDEX idx_pj_audit_user ON pj_audit_logs(user_id);
CREATE INDEX idx_pj_audit_action ON pj_audit_logs(action);
```

---

## 4. Contratos da API (Rotas REST)

Base URL: `http://localhost:3334`

### 4.1. Auth PJ (proxy + RBAC)

| Método | Rota | Descrição | Perfil mínimo |
|--------|------|-----------|---------------|
| POST | `/auth/pj/switch` | Alternar para perfil PJ (herda sessão PF) | — |
| GET | `/auth/pj/me` | Dados da empresa ativa + perfil do usuário | Viewer |

### 4.2. Companies

| Método | Rota | Descrição | Perfil mínimo |
|--------|------|-----------|---------------|
| POST | `/companies` | Criar empresa (abertura de conta PJ) | — |
| GET | `/companies/me` | Dados da empresa do usuário autenticado | Viewer |
| PATCH | `/companies/me` | Atualizar dados cadastrais | Admin |

### 4.3. PJ Accounts

| Método | Rota | Descrição | Perfil mínimo |
|--------|------|-----------|---------------|
| GET | `/pj/accounts/me` | Dados da conta PJ | Viewer |
| GET | `/pj/accounts/me/balance` | Saldo atual (centavos) | Viewer |
| POST | `/pj/accounts/transfer-pf` | Transferir entre PF↔PJ (mesma titularidade) | Financial |

### 4.4. Pix PJ

| Método | Rota | Descrição | Perfil mínimo |
|--------|------|-----------|---------------|
| POST | `/pj/pix/transfer` | Enviar Pix PJ | Financial |
| GET | `/pj/pix/keys` | Listar chaves Pix da empresa | Viewer |
| POST | `/pj/pix/keys` | Registrar chave Pix PJ | Admin |
| DELETE | `/pj/pix/keys/:id` | Desativar chave Pix | Admin |
| POST | `/pj/pix/qrcode` | Gerar QR Code de cobrança | Financial |
| GET | `/pj/pix/lookup` | Consultar chave Pix (destinatário) | Financial |

### 4.5. Invoices (Boletos)

| Método | Rota | Descrição | Perfil mínimo |
|--------|------|-----------|---------------|
| POST | `/pj/invoices` | Emitir boleto de cobrança | Financial |
| GET | `/pj/invoices` | Listar boletos (filtros: status, período) | Viewer |
| GET | `/pj/invoices/:id` | Detalhe de um boleto | Viewer |
| PATCH | `/pj/invoices/:id/cancel` | Cancelar boleto pendente | Financial |
| POST | `/pj/invoices/:id/resend` | Reenviar notificação | Financial |
| GET | `/pj/invoices/summary` | Resumo: emitidos, pagos, vencidos, total | Viewer |

### 4.6. Transactions PJ

| Método | Rota | Descrição | Perfil mínimo |
|--------|------|-----------|---------------|
| GET | `/pj/transactions` | Extrato PJ (paginação cursor-based) | Viewer |
| GET | `/pj/transactions/:id` | Detalhe de transação | Viewer |
| GET | `/pj/transactions/summary` | Resumo por categoria e período | Viewer |

### 4.7. Corporate Cards

| Método | Rota | Descrição | Perfil mínimo |
|--------|------|-----------|---------------|
| POST | `/pj/cards` | Criar cartão corporativo para membro | Admin |
| GET | `/pj/cards` | Listar cartões da empresa | Viewer |
| GET | `/pj/cards/:id` | Detalhe do cartão | Viewer |
| PATCH | `/pj/cards/:id/limit` | Ajustar limite | Admin |
| PATCH | `/pj/cards/:id/block` | Bloquear/desbloquear | Admin |
| GET | `/pj/cards/:id/invoice` | Fatura atual do cartão | Viewer |
| GET | `/pj/cards/:id/purchases` | Compras do cartão | Viewer |

### 4.8. Team

| Método | Rota | Descrição | Perfil mínimo |
|--------|------|-----------|---------------|
| POST | `/pj/team` | Convidar membro (e-mail + perfil) | Admin |
| GET | `/pj/team` | Listar membros da empresa | Viewer |
| PATCH | `/pj/team/:id/role` | Alterar perfil de acesso | Admin |
| DELETE | `/pj/team/:id` | Remover membro | Admin |

### 4.9. Notifications PJ

| Método | Rota | Descrição | Perfil mínimo |
|--------|------|-----------|---------------|
| GET | `/pj/notifications` | Listar notificações | Viewer |
| GET | `/pj/notifications/unread-count` | Contador de não lidas | Viewer |
| PATCH | `/pj/notifications/:id/read` | Marcar como lida | Viewer |
| POST | `/pj/notifications/read-all` | Marcar todas como lidas | Viewer |

### 4.10. Dashboard PJ

| Método | Rota | Descrição | Perfil mínimo |
|--------|------|-----------|---------------|
| GET | `/pj/dashboard` | Dados agregados (saldo, entradas, saídas, boletos, cartões) | Viewer |

**Total: 35 endpoints (8 módulos exclusivos PJ)**

---

## 5. Estrutura de Pastas

```
ecp-digital-bank-emps/
├── server/
│   ├── src/
│   │   ├── app.ts                  # Instância Fastify + plugins
│   │   ├── server.ts               # Entry point — porta 3334
│   │   ├── database/
│   │   │   ├── connection.ts       # Conexão SQLite3 (database-emps.sqlite)
│   │   │   ├── migrations/         # Scripts SQL de criação de tabelas
│   │   │   └── seed.ts             # Dados iniciais (empresa demo)
│   │   ├── modules/
│   │   │   ├── auth-pj/            # Proxy auth + switch PF→PJ + RBAC
│   │   │   │   ├── auth-pj.routes.ts
│   │   │   │   ├── auth-pj.service.ts
│   │   │   │   └── auth-pj.schema.ts
│   │   │   ├── companies/          # Cadastro e gestão de empresas
│   │   │   │   ├── companies.routes.ts
│   │   │   │   ├── companies.service.ts
│   │   │   │   └── companies.schema.ts
│   │   │   ├── pj-accounts/        # Conta PJ + saldo + transferência PF↔PJ
│   │   │   │   ├── pj-accounts.routes.ts
│   │   │   │   ├── pj-accounts.service.ts
│   │   │   │   └── pj-accounts.schema.ts
│   │   │   ├── pj-pix/             # Pix empresarial (chaves CNPJ, QR, transferência)
│   │   │   │   ├── pj-pix.routes.ts
│   │   │   │   ├── pj-pix.service.ts
│   │   │   │   └── pj-pix.schema.ts
│   │   │   ├── invoices/           # Boletos de cobrança (emissão, gestão, régua)
│   │   │   │   ├── invoices.routes.ts
│   │   │   │   ├── invoices.service.ts
│   │   │   │   └── invoices.schema.ts
│   │   │   ├── pj-transactions/    # Extrato PJ + categorização + resumo
│   │   │   │   ├── pj-transactions.routes.ts
│   │   │   │   ├── pj-transactions.service.ts
│   │   │   │   └── pj-transactions.schema.ts
│   │   │   ├── corporate-cards/    # Cartões corporativos + faturas + compras
│   │   │   │   ├── corporate-cards.routes.ts
│   │   │   │   ├── corporate-cards.service.ts
│   │   │   │   └── corporate-cards.schema.ts
│   │   │   ├── team/               # Multi-usuários + convites + RBAC
│   │   │   │   ├── team.routes.ts
│   │   │   │   ├── team.service.ts
│   │   │   │   └── team.schema.ts
│   │   │   ├── pj-notifications/   # Notificações da empresa
│   │   │   │   ├── pj-notifications.routes.ts
│   │   │   │   ├── pj-notifications.service.ts
│   │   │   │   └── pj-notifications.schema.ts
│   │   │   └── pj-dashboard/       # Dados agregados do dashboard PJ
│   │   │       ├── pj-dashboard.routes.ts
│   │   │       └── pj-dashboard.service.ts
│   │   ├── shared/
│   │   │   ├── errors/
│   │   │   │   ├── app-error.ts
│   │   │   │   └── error-codes.ts  # Inclui códigos PJ: CNPJ_INVALID, COMPANY_NOT_FOUND, etc.
│   │   │   ├── middleware/
│   │   │   │   ├── auth-pj.ts      # Middleware JWT + verificação de company + role
│   │   │   │   ├── rbac.ts         # Middleware de permissão por perfil (admin, financial, viewer)
│   │   │   │   └── error-handler.ts
│   │   │   └── utils/
│   │   │       ├── money.ts        # centavos ↔ reais
│   │   │       ├── uuid.ts         # UUID v4
│   │   │       ├── cnpj.ts         # Validação CNPJ (módulo 11, 2 dígitos verificadores)
│   │   │       └── boleto.ts       # Geração de código de barras e linha digitável
│   │   └── types/
│   │       └── fastify.d.ts        # Extensão com company, role, etc.
│   ├── tsconfig.json
│   ├── package.json
│   └── database-emps.sqlite        # Banco PJ (gerado automaticamente)
│
├── web/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                 # Layout com toggle PF/PJ
│   │   ├── routes/
│   │   │   ├── index.tsx           # Configuração central de rotas PJ
│   │   │   ├── pj-dashboard.tsx    # Dashboard empresarial
│   │   │   ├── pj-extrato.tsx      # Extrato PJ com categorias empresariais
│   │   │   ├── pj-pix/
│   │   │   │   ├── enviar.tsx
│   │   │   │   ├── receber.tsx
│   │   │   │   └── chaves.tsx
│   │   │   ├── invoices/
│   │   │   │   ├── lista.tsx       # Lista de boletos emitidos
│   │   │   │   ├── novo.tsx        # Emissão de boleto
│   │   │   │   └── detalhe.tsx     # Detalhe do boleto + status
│   │   │   ├── cartoes/
│   │   │   │   ├── lista.tsx       # Cartões corporativos
│   │   │   │   └── fatura.tsx      # Fatura do cartão
│   │   │   ├── team.tsx            # Gestão do time + convites
│   │   │   ├── empresa.tsx         # Dados cadastrais da empresa
│   │   │   └── perfil.tsx          # Perfil do usuário operador
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── SidebarPJ.tsx   # Menu PJ (itens diferentes do PF)
│   │   │   │   ├── HeaderPJ.tsx    # Header com toggle PF/PJ + nome da empresa
│   │   │   │   ├── MobileNavPJ.tsx
│   │   │   │   └── ProfileSwitcher.tsx # Componente toggle PF↔PJ
│   │   │   ├── ui/                 # MESMOS componentes do ecp-digital-bank
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Table.tsx
│   │   │   │   └── Badge.tsx
│   │   │   ├── dashboard-pj/
│   │   │   │   ├── BalanceCardPJ.tsx
│   │   │   │   ├── CashFlowChart.tsx
│   │   │   │   ├── InvoiceSummary.tsx
│   │   │   │   └── QuickActionsPJ.tsx
│   │   │   ├── invoices/
│   │   │   │   ├── InvoiceForm.tsx
│   │   │   │   ├── InvoiceList.tsx
│   │   │   │   └── InvoiceStatusBadge.tsx
│   │   │   ├── team/
│   │   │   │   ├── MemberList.tsx
│   │   │   │   ├── InviteModal.tsx
│   │   │   │   └── RoleBadge.tsx
│   │   │   └── cartoes/
│   │   │       ├── CorporateCardDisplay.tsx
│   │   │       └── CardLimitBar.tsx
│   │   ├── hooks/
│   │   │   ├── useAuthPJ.ts        # Hook de auth PJ (company, role)
│   │   │   ├── useFetch.ts
│   │   │   ├── useBalancePJ.ts
│   │   │   └── useProfileSwitch.ts # Hook para alternar PF↔PJ
│   │   ├── services/
│   │   │   ├── api-pj.ts           # Instância fetch para API PJ (porta 3334)
│   │   │   ├── companies.service.ts
│   │   │   ├── pj-pix.service.ts
│   │   │   ├── invoices.service.ts
│   │   │   ├── corporate-cards.service.ts
│   │   │   ├── team.service.ts
│   │   │   └── pj-transactions.service.ts
│   │   ├── lib/
│   │   │   ├── formatters.ts       # Formata CNPJ, moeda, datas
│   │   │   ├── validators.ts       # Validações client-side (CNPJ, etc.)
│   │   │   └── cnpj.ts             # Formatação e validação CNPJ
│   │   └── styles/
│   │       └── globals.css         # MESMAS variáveis CSS do ecp-digital-bank
│   ├── index.html
│   ├── tailwind.config.ts          # MESMA configuração
│   ├── vite.config.ts              # Proxy para localhost:3334
│   ├── tsconfig.json
│   └── package.json
│
├── 00-specs/                       # Especificações (este diretório)
│   ├── product_briefing_espec.md
│   ├── tech_spec.md
│   └── design_spec.md
│
├── package.json                    # Scripts raiz
├── database-emps.sqlite            # Banco PJ
├── .env
├── .env.example
├── .gitattributes
├── .gitignore
├── .npmrc
├── tsconfig.base.json
└── README.md
```

---

## 6. Variáveis de Ambiente

```bash
# ECP Emps — Variáveis de Ambiente
# Copiar para .env — NUNCA commitar

# Servidor
PORT=3334
HOST=0.0.0.0
NODE_ENV=development
LOG_LEVEL=info

# JWT (MESMA chave do ecp-digital-bank para compartilhar sessão)
JWT_SECRET=ecp-digital-bank-dev-secret-mude-em-producao

# Banco de Dados PJ
DATABASE_PATH=./database-emps.sqlite

# CORS
CORS_ORIGIN=http://localhost:5174

# Referência ao ecp-digital-bank (PF) para integração
PF_API_URL=http://localhost:3333

# Front-end
VITE_API_URL=http://localhost:3334
VITE_PF_APP_URL=http://localhost:5173
```

---

## 7. Scripts de Desenvolvimento

```json
{
  "scripts": {
    "dev": "concurrently --kill-others \"npm run dev:server\" \"npm run dev:web\"",
    "dev:server": "cd server && tsx watch src/server.ts",
    "dev:web": "cd web && vite --port 5174",
    "build": "cd web && vite build",
    "db:migrate": "cd server && tsx src/database/migrations/run.ts",
    "db:seed": "cd server && tsx src/database/seed.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint . --ext .ts,.tsx"
  }
}
```

---

## 8. Dados de Seed (Demonstração)

| Dado | Valor |
|------|-------|
| **Empresa** | AB Design Studio |
| **CNPJ** | 12.345.678/0001-95 |
| **Natureza** | MEI |
| **Responsável** | Marina Silva (mesma do ecp-digital-bank PF) |
| **Saldo PJ** | R$ 8.750,00 |
| **Chaves Pix** | CNPJ + e-mail comercial |
| **Cartão corporativo** | **** 8721 (limite R$ 3.000) |
| **Boletos emitidos** | 5 (2 pagos, 1 vencido, 2 pendentes) |
| **Team** | Marina (Admin) + João (Financeiro convidado) |
| **Transações** | 15+ (Pix recebidos de clientes, pagamentos a fornecedores, compras no cartão) |

---

## 9. Segurança e Compliance

- Autenticação JWT compartilhada com ecp-digital-bank (mesma `JWT_SECRET`)
- RBAC (Role-Based Access Control) em todas as rotas PJ
- Audit log de toda ação com `user_id`, `company_id`, `action`, `ip_address`
- CNPJ validado com algoritmo módulo 11 (2 dígitos verificadores)
- Dados de cartão corporativo: número completo NUNCA retornado em queries normais
- Rate limiting: máx 20 Pix/hora por empresa
- CORS configurado exclusivamente para `localhost:5174`
- Helmet para headers de segurança HTTP
- Transações financeiras atômicas (BEGIN/COMMIT/ROLLBACK)
- Boletos com código de barras conforme padrão FEBRABAN

---

*Documento gerado para o projeto ECP Emps — v1.0*  
*Stack: TypeScript + Fastify 5.0 + SQLite3 + React 18.3 + Vite 5.4*
