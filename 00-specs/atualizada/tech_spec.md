# ECP Emps — Especificação Técnica

> **Versão:** 2.0
> **Data:** 20/04/2026
> **Status:** Implementado (MVP funcional)
> **Repositório:** `ecp-digital-emps`

---

## 1. Stack Tecnológica — v2.0

A stack segue o padrão do ecp-digital-bank, com **um `npm run dev` na raiz** subindo API + Web. Sem Docker, sem banco externo em desenvolvimento. Banco de dados SQLite em arquivo único (`database-emps.sqlite`).

### 1.1. Ambiente de Desenvolvimento — Windows 11

| Requisito | Versão | Motivo |
|-----------|--------|--------|
| **Node.js** | 18+ (LTS 20 recomendado) | Runtime do projeto |
| **Python** | 3.12+ | Compilação do `better-sqlite3` via `node-gyp` |
| **VS Build Tools 2022** | — | Compilador C++ para módulos nativos |
| **Git** | 2.40+ | Controle de versão |

### 1.2. Back-end (API)

Localização: `03-product-delivery/server/`

| Tecnologia | Versão (package.json) | Papel |
|-----------|-----------------------|-------|
| **TypeScript** | ^5.5.0 | Linguagem base (`type: module`) |
| **Fastify** | ^5.0.0 | Servidor HTTP |
| **@fastify/cors** | ^10.0.0 | CORS |
| **@fastify/helmet** | ^12.0.0 | Headers de segurança (CSP desabilitado) |
| **Zod** | ^3.23.0 | Validação de inputs |
| **better-sqlite3** | ^11.0.0 | Driver SQLite síncrono (WAL + FKs ON) |
| **bcryptjs** | ^2.4.3 | Hash de senhas e números de cartão (10 rounds) |
| **jsonwebtoken** | ^9.0.2 | JWT (mesmo `JWT_SECRET` do ecp-digital-bank) |
| **uuid** | ^10.0.0 | Geração de UUID v4 |
| **dotenv** | ^16.6.1 | Carrega `.env` |
| **pino-pretty** | ^13.1.3 | Logs coloridos em dev |
| **tsx** | ^4.19.0 | Executor TS com watch mode |

### 1.3. Front-end (Web App)

Localização: `03-product-delivery/web/`

| Tecnologia | Versão (package.json) | Papel |
|-----------|-----------------------|-------|
| **TypeScript** | ^5.6.0 | Tipagem |
| **React** | ^18.3.0 | UI |
| **React DOM** | ^18.3.0 | — |
| **React Router** | ^6.26.0 | Navegação SPA |
| **Tailwind CSS** | ^3.4.0 | Estilização |
| **Lucide React** | ^0.400.0 | Ícones |
| **Vite** | ^5.4.0 | Build tool (porta `5175`, `strictPort: true`) |
| **@vitejs/plugin-react** | ^4.3.0 | Plugin React |
| **PostCSS** | ^8.4.0 + **Autoprefixer** ^10.4.0 | Pipeline CSS |

Sem React Query, Zustand ou Axios. O state é `useState`/`useEffect` e o HTTP client é uma classe própria `ApiPJClient` (`web/src/services/api-pj.ts`) baseada em `fetch`.

---

## 2. Regras Invioláveis de Código (Implementadas)

1. **TypeScript strict** — sem `any` nos módulos principais
2. **Schemas Zod são a fonte de verdade** — tipos via `z.infer<>` (ex.: `createInvoiceSchema` → `CreateInvoiceInput`)
3. **Dinheiro sempre em centavos (INTEGER)** — `amount`, `balance`, `limit_cents`, `used_cents`, `paid_amount` etc.
4. **IDs são UUID v4** — `generateId()` em `server/src/shared/utils/uuid.ts`
5. **Erros padronizados** — `AppError(status, ErrorCode, message)` com enum `ErrorCode`
6. **Soft delete** — `companies.deleted_at`, `pj_pix_keys.deleted_at`, team members usa `status = 'removed'`
7. **Logs estruturados** — `pino` via Fastify logger (`pino-pretty` em dev)
8. **Secrets em `.env`** — `JWT_SECRET`, `ECP_PAY_API_KEY`, `ECP_PAY_WEBHOOK_SECRET`
9. **Validação na borda** — todo `request.body` / `request.query` passa por `schema.parse()`
10. **Transações atômicas** — `db.transaction(() => { ... })()` (better-sqlite3)
11. **Imports com extensão `.js`** — imports relativos usam `.js` (TS compilado para ESM)
12. **Sem compilação nativa extra além de better-sqlite3** — bcryptjs é pure JS
13. **RBAC obrigatório em toda rota protegida** — `requireRole('admin' | 'financial' | 'viewer')`
14. **Audit log em ações sensíveis** — toda mutação registra em `pj_audit_logs`
15. **Idempotência ECP Pay** — `X-Idempotency-Key` gerado por UUID v4 em toda chamada POST
16. **Idempotência webhook** — webhook de recebimento checa `reference_id` antes de creditar

### Regras da v1.0 NÃO implementadas

- CNPJ validado com módulo 11 no schema (o util `cnpj.ts` existe mas o Zod aceita string livre)
- Boleto no formato FEBRABAN real (há geração mock em `shared/utils/boleto.ts` quando ECP Pay está offline)

---

## 3. Modelo de Dados (SQLite)

Arquivo: `server/database-emps.sqlite` (WAL mode, `PRAGMA foreign_keys = ON`, `busy_timeout = 5000`)

Migrations: `server/src/database/migrations/001-initial.sql` + `002-dev-users.sql`.

### 3.1. Tabelas Implementadas (13 no total)

```sql
-- companies (empresas)
CREATE TABLE companies (
  id                TEXT PRIMARY KEY,            -- UUID v4
  owner_user_id     TEXT NOT NULL,               -- user_id compartilhado com PF
  cnpj              TEXT NOT NULL UNIQUE,
  razao_social      TEXT NOT NULL,
  nome_fantasia     TEXT,
  natureza_juridica TEXT NOT NULL,               -- mei | ei | ltda (no seed)
  endereco          TEXT,                        -- JSON
  status            TEXT NOT NULL DEFAULT 'pending_validation',
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at        TEXT
);

-- pj_accounts (conta PJ)
CREATE TABLE pj_accounts (
  id                   TEXT PRIMARY KEY,
  company_id           TEXT NOT NULL REFERENCES companies(id),
  agency               TEXT NOT NULL DEFAULT '0001',
  number               TEXT NOT NULL UNIQUE,
  balance              INTEGER NOT NULL DEFAULT 0,
  daily_transfer_limit INTEGER NOT NULL DEFAULT 1000000,  -- R$ 10.000 em centavos
  status               TEXT NOT NULL DEFAULT 'active',
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- team_members (multi-usuários + RBAC)
CREATE TABLE team_members (
  id           TEXT PRIMARY KEY,
  company_id   TEXT NOT NULL REFERENCES companies(id),
  user_id      TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'viewer',   -- admin | financial | viewer
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active',   -- active | invited | removed
  invited_at   TEXT NOT NULL DEFAULT (datetime('now')),
  accepted_at  TEXT,
  removed_at   TEXT
);

-- pj_transactions (extrato)
CREATE TABLE pj_transactions (
  id                       TEXT PRIMARY KEY,
  account_id               TEXT NOT NULL REFERENCES pj_accounts(id),
  operator_id              TEXT NOT NULL,        -- user_id do executor
  type                     TEXT NOT NULL,        -- credit | debit
  category                 TEXT NOT NULL,        -- pix_sent | pix_received | boleto_paid | boleto_received | card_purchase | transfer_pf | split_received | tax | fee
  amount                   INTEGER NOT NULL,     -- centavos (positivo)
  balance_after            INTEGER NOT NULL,
  direction                TEXT NOT NULL,        -- in | out
  description              TEXT,
  counterpart_name         TEXT,
  counterpart_document     TEXT,
  counterpart_institution  TEXT,
  pix_key                  TEXT,
  pix_key_type             TEXT,
  boleto_code              TEXT,
  reference_id             TEXT UNIQUE,          -- idempotency key
  status                   TEXT NOT NULL DEFAULT 'pending',
  created_at               TEXT NOT NULL DEFAULT (datetime('now'))
);

-- pj_pix_keys (chaves Pix)
CREATE TABLE pj_pix_keys (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies(id),
  account_id  TEXT NOT NULL REFERENCES pj_accounts(id),
  type        TEXT NOT NULL,                    -- cnpj | email | phone | random
  value       TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at  TEXT
);

-- invoices (cobranças / boletos)
CREATE TABLE invoices (
  id                 TEXT PRIMARY KEY,
  company_id         TEXT NOT NULL REFERENCES companies(id),
  account_id         TEXT NOT NULL REFERENCES pj_accounts(id),
  operator_id        TEXT NOT NULL,
  customer_name      TEXT NOT NULL,
  customer_document  TEXT NOT NULL,
  customer_email     TEXT,
  amount             INTEGER NOT NULL,
  due_date           TEXT NOT NULL,              -- YYYY-MM-DD
  description        TEXT,
  barcode            TEXT,                       -- 47 dígitos
  digitable_line     TEXT,
  pix_qrcode         TEXT,
  pix_copy_paste     TEXT,
  interest_rate      INTEGER DEFAULT 100,        -- 1% a.m. em basis points
  penalty_rate       INTEGER DEFAULT 200,        -- 2% em basis points
  discount_days      INTEGER DEFAULT 0,
  discount_amount    INTEGER DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'pending',  -- pending | paid | overdue | cancelled
  paid_at            TEXT,
  paid_amount        INTEGER,
  notification_sent  INTEGER DEFAULT 0,
  type               TEXT NOT NULL DEFAULT 'single',   -- single | installment | recurring
  installment_of     INTEGER,
  installment_total  INTEGER,
  parent_invoice_id  TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- corporate_cards (cartões corporativos)
CREATE TABLE corporate_cards (
  id           TEXT PRIMARY KEY,
  company_id   TEXT NOT NULL REFERENCES companies(id),
  account_id   TEXT NOT NULL REFERENCES pj_accounts(id),
  holder_id    TEXT NOT NULL REFERENCES team_members(id),
  card_number  TEXT NOT NULL,                   -- bcrypt hash
  last4        TEXT NOT NULL,
  card_holder  TEXT NOT NULL,
  card_expiry  TEXT NOT NULL,                   -- MM/YYYY
  limit_cents  INTEGER NOT NULL DEFAULT 0,
  used_cents   INTEGER NOT NULL DEFAULT 0,
  due_day      INTEGER NOT NULL DEFAULT 25,
  status       TEXT NOT NULL DEFAULT 'active',  -- active | blocked | cancelled
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- corporate_card_purchases (compras no cartão)
CREATE TABLE corporate_card_purchases (
  id                 TEXT PRIMARY KEY,
  card_id            TEXT NOT NULL REFERENCES corporate_cards(id),
  company_id         TEXT NOT NULL REFERENCES companies(id),
  description        TEXT NOT NULL,
  merchant_name      TEXT NOT NULL,
  merchant_category  TEXT,
  amount             INTEGER NOT NULL,
  status             TEXT NOT NULL DEFAULT 'completed',
  purchased_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- corporate_invoices (faturas do cartão)
CREATE TABLE corporate_invoices (
  id               TEXT PRIMARY KEY,
  card_id          TEXT NOT NULL REFERENCES corporate_cards(id),
  reference_month  TEXT NOT NULL,               -- "2026-04"
  total_cents      INTEGER NOT NULL DEFAULT 0,
  due_date         TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'open',  -- open | closed | paid | overdue
  paid_at          TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- pj_notifications
CREATE TABLE pj_notifications (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies(id),
  user_id     TEXT,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  type        TEXT NOT NULL,                    -- transaction | invoice | security | team | system
  is_read     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- pj_pix_rate_limit
CREATE TABLE pj_pix_rate_limit (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES pj_accounts(id),
  window_start    TEXT NOT NULL,
  transfer_count  INTEGER NOT NULL DEFAULT 0
);

-- pj_audit_logs
CREATE TABLE pj_audit_logs (
  id           TEXT PRIMARY KEY,
  company_id   TEXT NOT NULL REFERENCES companies(id),
  user_id      TEXT NOT NULL,
  action       TEXT NOT NULL,
  resource     TEXT NOT NULL,
  resource_id  TEXT,
  metadata     TEXT,                            -- JSON
  ip_address   TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- pj_dev_users (dev-only: login standalone)
CREATE TABLE pj_dev_users (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  cpf            TEXT NOT NULL,
  phone          TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 3.2. Índices

Definidos em `001-initial.sql:177-199` e `002-dev-users.sql:15`. Cobrem FKs, lookup por CNPJ, status e datas das queries de dashboard/extrato.

---

## 4. Contratos da API (Rotas REST)

Base URL: `http://localhost:3334`

Prefixos e autenticação em `server/src/app.ts:38-50`. Todo endpoint abaixo (exceto `/auth/pj/dev-login`, `/webhooks/*` e `/health`) exige `Authorization: Bearer <jwt>` e é protegido por `requireRole`.

### 4.1. Auth PJ

| Método | Rota | Descrição | Perfil |
|--------|------|-----------|--------|
| POST | `/auth/pj/dev-login` | Login standalone (dev): email + senha `Senha@123` | público |
| POST | `/auth/pj/switch` | Gerar JWT com `companyId + role` específicos | autenticado |
| GET | `/auth/pj/me` | Dados do usuário + empresa ativa + role | viewer |

### 4.2. Companies

| Método | Rota | Descrição | Perfil |
|--------|------|-----------|--------|
| POST | `/companies` | Criar empresa | autenticado |
| GET | `/companies/me` | Dados da empresa do usuário | viewer |
| PATCH | `/companies/me` | Atualizar cadastro | admin |

### 4.3. PJ Accounts

| Método | Rota | Descrição | Perfil |
|--------|------|-----------|--------|
| GET | `/pj/accounts/me` | Dados da conta | viewer |
| GET | `/pj/accounts/me/balance` | Saldo em centavos | viewer |
| POST | `/pj/accounts/transfer-pf` | Transferir PF↔PJ (mock) | financial |

### 4.4. Pix PJ

| Método | Rota | Descrição | Perfil |
|--------|------|-----------|--------|
| POST | `/pj/pix/transfer` | Enviar Pix | financial |
| GET | `/pj/pix/keys` | Listar chaves | viewer |
| POST | `/pj/pix/keys` | Registrar chave | admin |
| DELETE | `/pj/pix/keys/:id` | Desativar chave | admin |
| POST | `/pj/pix/qrcode` | QR Code de cobrança (integra ECP Pay) | financial |
| GET | `/pj/pix/lookup` | Consultar chave destino (mock) | financial |

### 4.5. Invoices (Boletos)

| Método | Rota | Descrição | Perfil |
|--------|------|-----------|--------|
| POST | `/pj/invoices` | Emitir boleto (integra ECP Pay) | financial |
| GET | `/pj/invoices` | Listar (filtros: status, search, startDate, endDate, page, limit) | viewer |
| GET | `/pj/invoices/summary` | Resumo por status | viewer |
| GET | `/pj/invoices/:id` | Detalhe | viewer |
| PATCH | `/pj/invoices/:id` | Cancelar | financial |
| POST | `/pj/invoices/:id/resend` | Marcar `notification_sent=1` | financial |

### 4.6. Transactions PJ

| Método | Rota | Descrição | Perfil |
|--------|------|-----------|--------|
| GET | `/pj/transactions` | Extrato (cursor + filtros) | viewer |
| GET | `/pj/transactions/summary` | Resumo por categoria + netFlow | viewer |
| GET | `/pj/transactions/:id` | Detalhe | viewer |

### 4.7. Corporate Cards

| Método | Rota | Descrição | Perfil |
|--------|------|-----------|--------|
| POST | `/pj/cards` | Criar cartão para membro | admin |
| GET | `/pj/cards` | Listar (exclui cancelados) | viewer |
| GET | `/pj/cards/:id` | Detalhe | viewer |
| PATCH | `/pj/cards/:id/limit` | Ajustar limite | admin |
| PATCH | `/pj/cards/:id/block` | Bloquear/desbloquear | admin |
| GET | `/pj/cards/:id/invoice` | Fatura atual | viewer |
| GET | `/pj/cards/:id/purchases` | Compras | viewer |

### 4.8. Team

| Método | Rota | Descrição | Perfil |
|--------|------|-----------|--------|
| POST | `/pj/team` | Convidar membro | admin |
| GET | `/pj/team` | Listar membros | viewer |
| PATCH | `/pj/team/:id/role` | Alterar role | admin |
| DELETE | `/pj/team/:id` | Remover | admin |

### 4.9. Notifications

| Método | Rota | Descrição | Perfil |
|--------|------|-----------|--------|
| GET | `/pj/notifications` | Listar | viewer |
| GET | `/pj/notifications/unread-count` | Contador | viewer |
| PATCH | `/pj/notifications/:id/read` | Marcar como lida | viewer |
| POST | `/pj/notifications/read-all` | Marcar todas | viewer |

### 4.10. Dashboard

| Método | Rota | Descrição | Perfil |
|--------|------|-----------|--------|
| GET | `/pj/dashboard` | Saldo + cash flow 7 dias + boletos + tx recentes | viewer |

### 4.11. Webhooks (sem JWT, autenticado por header)

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/webhooks/payment-received` | Credita conta PJ a partir de split liquidado pelo ECP Pay | `X-Webhook-Secret` |

### 4.12. Health

| Método | Rota | Resposta |
|--------|------|----------|
| GET | `/health` | `{ status: 'ok', service: 'ecp-emps-api' }` |

**Total implementado: 37 endpoints** (10 módulos + webhook + health).

---

## 5. Estrutura de Pastas (Real)

```
ecp-digital-emps/
├── 00-specs/
├── 01-strategic-context/
├── 02-product-discovery/
├── 03-product-delivery/                 # código de produção
│   ├── database-emps.sqlite             # banco na raiz do delivery
│   ├── database-emps.sqlite-shm
│   ├── database-emps.sqlite-wal
│   ├── package.json                     # raiz do delivery (scripts agregadores)
│   ├── tsconfig.base.json
│   ├── server/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── database-emps.sqlite         # banco também pode ser gerado aqui
│   │   └── src/
│   │       ├── app.ts                   # Fastify + CORS + helmet + rotas
│   │       ├── server.ts                # bootstrap porta 3334
│   │       ├── database/
│   │       │   ├── connection.ts        # better-sqlite3 + WAL + FKs
│   │       │   ├── seed.ts              # 7 empresas + 7 dev users
│   │       │   └── migrations/
│   │       │       ├── 001-initial.sql
│   │       │       ├── 002-dev-users.sql
│   │       │       └── run.ts
│   │       ├── modules/
│   │       │   ├── auth-pj/             # dev-login + switch + me
│   │       │   ├── companies/
│   │       │   ├── pj-accounts/
│   │       │   ├── pj-pix/
│   │       │   ├── invoices/
│   │       │   ├── pj-transactions/
│   │       │   ├── corporate-cards/
│   │       │   ├── team/
│   │       │   ├── pj-notifications/
│   │       │   ├── pj-dashboard/
│   │       │   └── webhooks/            # NOVO — payment-received (ECP Pay)
│   │       ├── services/
│   │       │   └── ecp-pay-client.ts    # NOVO — HTTP client para ECP Pay
│   │       ├── shared/
│   │       │   ├── errors/
│   │       │   │   ├── app-error.ts
│   │       │   │   └── error-codes.ts   # 25 códigos enumerados
│   │       │   ├── middleware/
│   │       │   │   ├── auth-pj.ts       # JWT + carrega company/role
│   │       │   │   ├── rbac.ts          # requireRole(minimumRole)
│   │       │   │   └── error-handler.ts
│   │       │   └── utils/
│   │       │       ├── money.ts
│   │       │       ├── uuid.ts
│   │       │       ├── cnpj.ts
│   │       │       └── boleto.ts        # fallback FEBRABAN mock
│   │       └── types/
│   │           └── fastify.d.ts         # userId / companyId / role / activeProfile
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── tailwind.config.ts
│       ├── vite.config.ts               # porta 5175, proxy /api → 3334
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx                  # gate de auth + layout
│           ├── routes/
│           │   ├── index.tsx            # 14 rotas
│           │   ├── login.tsx            # dev-login com 7 quick buttons
│           │   ├── pj-dashboard.tsx
│           │   ├── pj-extrato.tsx
│           │   ├── pj-pix-enviar.tsx
│           │   ├── pj-pix-receber.tsx
│           │   ├── pj-pix-chaves.tsx
│           │   ├── invoices-lista.tsx
│           │   ├── invoices-novo.tsx    # wizard 3 steps
│           │   ├── invoices-detalhe.tsx
│           │   ├── cartoes-lista.tsx
│           │   ├── cartoes-fatura.tsx
│           │   ├── team.tsx
│           │   └── empresa.tsx
│           ├── components/
│           │   ├── layout/
│           │   │   ├── SidebarPJ.tsx
│           │   │   ├── HeaderPJ.tsx
│           │   │   └── ProfileSwitcher.tsx
│           │   └── ui/
│           │       ├── Button.tsx       # 4 variantes × 3 tamanhos
│           │       ├── Card.tsx
│           │       ├── Input.tsx
│           │       ├── Modal.tsx
│           │       └── Badge.tsx        # + InvoiceStatusBadge + RoleBadge
│           ├── hooks/
│           │   ├── useAuthPJ.ts
│           │   └── useFetch.ts
│           ├── services/
│           │   └── api-pj.ts            # ApiPJClient (fetch + JWT)
│           ├── lib/
│           │   ├── formatters.ts        # formatCurrency/Cnpj/Cpf/Date
│           │   └── cnpj.ts
│           ├── styles/
│           │   └── globals.css          # variáveis CSS do tema dark
│           └── vite-env.d.ts
├── 04-product-operation/
├── 05-docs/
└── (sem package.json na raiz do repositório)
```

Observação: não existe `package.json` na raiz do repositório nem `tsconfig.base.json` na raiz; ambos estão em `03-product-delivery/`.

---

## 6. Variáveis de Ambiente

Carregadas em `server/src/server.ts:3-4` (busca `.env` no cwd e no parent).

```bash
# Servidor
PORT=3334
HOST=0.0.0.0
NODE_ENV=development
LOG_LEVEL=info

# JWT (DEVE coincidir com o JWT_SECRET do ecp-digital-bank)
JWT_SECRET=ecp-digital-bank-dev-secret-mude-em-producao

# Banco PJ
DATABASE_PATH=./database-emps.sqlite

# CORS
CORS_ORIGIN=http://localhost:5175

# Integração com ECP Pay (gateway)
ECP_PAY_URL=http://localhost:3335
ECP_PAY_API_KEY=ecp-emps-dev-key
ECP_PAY_WEBHOOK_SECRET=ecp-pay-webhook-secret-dev

# Front-end
VITE_API_URL=http://localhost:3334
VITE_PF_APP_URL=https://bank.ecportilho.com   # destino do switch PF no ProfileSwitcher
```

---

## 7. Scripts

### 7.1. Server (`server/package.json`)

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "migrate": "tsx src/database/migrations/run.ts",
    "seed": "tsx src/database/seed.ts"
  }
}
```

### 7.2. Web (`web/package.json`)

```json
{
  "scripts": {
    "dev": "vite --port 5175",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

Não há `concurrently` configurado — cada app sobe por conta própria em terminais separados (ou gerenciado externamente).

---

## 8. Integrações Externas

### 8.1. ECP Pay Client (`server/src/services/ecp-pay-client.ts`)

Classe `ecpPayClient` com métodos:

- `createPixCharge(input)` — POST `/pay/pix` → `{ transaction_id, provider_id, qr_code, qr_code_text, expiration, status }`
- `createBoletoCharge(input)` — POST `/pay/boleto` → `{ transaction_id, barcode, digitable_line, pdf_url, pix_qr_code, pix_copy_paste, ... }`
- `createCardCharge(input)` — POST `/pay/card`
- `getTransaction(transactionId)` — GET `/pay/transactions/:id`
- `refund(transactionId, amount?, reason?)` — POST `/pay/transactions/:id/refund`

Todo request POST inclui `X-API-Key`, `X-Source-App: ecp-emps`, `X-Idempotency-Key: <uuid>`.

### 8.2. Webhook Receiver (`server/src/modules/webhooks/`)

Payload esperado em `POST /webhooks/payment-received`:

```ts
{
  transaction_id: string;
  split_id: string;
  account_id: string;        // CNPJ do restaurante
  account_name: string;
  amount: number;            // centavos
  source_app: string;        // "ecp-food" etc.
  description?: string;
  reference_id?: string;     // chave de idempotência
}
```

Header: `X-Webhook-Secret: <ECP_PAY_WEBHOOK_SECRET>`.

---

## 9. Dados de Seed (Demonstração)

Executar `npm run seed` no diretório `server/`. Se já houver empresas no banco, o seed para sem erro.

Cria:
- **7 dev users** com senha `Senha@123` (bcrypt 10 rounds)
- **7 empresas** com contas PJ ativas, chaves Pix, cartão corporativo, faturas, compras, transações, notificações e audit log inicial
- **Boletos variados** (pagos, vencidos, pendentes)

Mapeamento resumido:

| Empresa | CNPJ | Natureza | Dono | Saldo inicial |
|---------|------|----------|------|---------------|
| AB Design Studio | 12.345.678/0001-95 | MEI | Marina Silva | R$ 8.750,00 |
| Pasta & Fogo | 34.567.890/0001-12 | MEI | Carlos Mendes | R$ 23.456,00 |
| Sushi Wave | 45.678.901/0001-23 | MEI | Aisha Santos | R$ 18.765,00 |
| Burger Lab | 56.789.012/0001-34 | EI | Roberto Tanaka | R$ 35.678,00 |
| Green Bowl Co. | 67.890.123/0001-45 | MEI | Francisca Lima | R$ 9.854,00 |
| Pizza Club 24h | 78.901.234/0001-56 | LTDA | Lucas Ndongo | R$ 45.210,00 |
| Brasa & Lenha | 89.012.345/0001-67 | MEI | Patricia Werneck | R$ 52.347,00 |

---

## 10. Segurança e Compliance

| Item | Implementação |
|------|---------------|
| JWT HS256 com expiração 24h | `auth-pj.service.ts:47`, `JWT_SECRET` compartilhado com PF |
| Senhas e números de cartão hasheados | `bcrypt.hashSync(..., 10)` (`auth-pj.service.ts`, `corporate-cards.service.ts:87`) |
| RBAC hierárquico | `rbac.ts:7` — admin=3, financial=2, viewer=1 |
| Audit log em mutações | toda ação `create_*`, `update_*`, `delete_*`, `send_pix`, `cancel_invoice` etc. grava em `pj_audit_logs` |
| CORS restrito | `app.ts:28` — origin único controlado por `CORS_ORIGIN` |
| Helmet | `app.ts:33` — CSP desabilitado (dev); demais headers ativos |
| Rate limit Pix | 20/hora por conta — tabela `pj_pix_rate_limit` |
| Idempotência ECP Pay | `X-Idempotency-Key` UUID por requisição POST |
| Idempotência webhook | Checa `reference_id` em `pj_transactions` antes de creditar |
| Soft delete | `companies.deleted_at`, `pj_pix_keys.deleted_at`, team via status |
| Transações atômicas | `db.transaction()` em todo fluxo que modifica saldo + extrato + audit |
| Foreign keys ON | `PRAGMA foreign_keys = ON` em `connection.ts:12` |
| WAL mode | `PRAGMA journal_mode = WAL` |

### Pendências de segurança conhecidas

- `JWT_SECRET` default hardcoded em `auth-pj.ts:14` e `auth-pj.service.ts:8` — precisa ser obrigatório via `.env` em produção
- Webhook secret default `ecp-pay-webhook-secret-dev` — idem
- CSP do helmet desabilitado
- `pj_audit_logs.ip_address` é gravado sempre como `NULL` (request IP não está sendo capturado)

---

*Documento gerado para o projeto ECP Emps — v2.0 (20/04/2026)*
*Stack observada: TypeScript 5.5/5.6 + Fastify 5.0 + better-sqlite3 11 + React 18.3 + Vite 5.4 + Tailwind 3.4.*
