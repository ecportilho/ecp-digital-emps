# ECP Emps — Product Briefing & Especificação Funcional

> **Versão:** 2.0
> **Data:** 20/04/2026
> **Status:** Implementado (MVP funcional)
> **Repositório:** `ecp-digital-emps`

---

## 1. Visão Geral do Produto

O **ECP Emps** é um banco digital web-first para microempreendedores individuais (MEIs), Empresários Individuais (EI) e Sociedades Limitadas (LTDA) brasileiras, focado em simplificar a gestão financeira empresarial com inteligência e transparência. Faz parte do ecossistema ECP, integrando-se ao **ecp-digital-bank** (conta PF) para oferecer uma experiência unificada, e ao **ecp-digital-pay** (gateway de pagamentos) e **ecp-digital-food** (plataforma de restaurantes) para um fluxo completo de recebimento.

A aplicação é composta por uma **API back-end** (Fastify 5 + SQLite3/better-sqlite3) rodando na porta `3334` e um **front-end web SPA** (React 18 + Vite 5 + Tailwind 3.4) servido em `http://localhost:5175`. O banco de dados é um arquivo único `database-emps.sqlite` (WAL mode + FKs ON).

Na versão atualmente implementada, o squad PF/PJ continua a ideia de perfis unificados, mas o login PJ **não depende** do PF: há um mecanismo de **dev-login standalone** (tabela `pj_dev_users`, endpoint `/auth/pj/dev-login`) que permite ao usuário entrar direto na conta PJ com email + senha `Senha@123`. O switch para PF é feito por redirecionamento externo para `VITE_PF_APP_URL` (ex.: `https://bank.ecportilho.com`).

---

## 2. Posicionamento e Diferenciais Implementados

### 2.1. Cenário Competitivo — Bancos Digitais PJ no Brasil (2026)

| Player | Clientes PJ | Foco | Pix PJ gratuito | Boleto gratuito | NF-e integrada | Gestão financeira | Web Desktop |
|--------|-------------|------|-----------------|-----------------|----------------|-------------------|-------------|
| **Nubank PJ** | 15M+ | MEI, EI, LTDA | Sim (ilimitado) | Sim | Não | Básica | Parcial |
| **Cora** | 1.4M+ | PMEs (Simples) | Sim | Sim (100/mês grátis) | Sim (pago) | Cora Pro (pago) | App + CoraWeb |
| **Inter PJ** | 5M+ | MEI a grande | Sim | Sim | Não | Básica | Parcial |
| **ECP Emps** | MVP | MEI, EI, LTDA | Sim (ilimitado) | Sim (via ECP Pay) | Não (futuro) | Cash flow 7 dias + resumo cobranças | **Sim (web-first)** |

### 2.2. Diferenciais Implementados

1. **Web-first real** — SPA em React 18 com layout lateral fixo 280px (`SidebarPJ`) otimizado para desktop 1280px+.
2. **Integração nativa com ECP Pay** — boletos e cobranças Pix são criados via `ecpPayClient` (`server/src/services/ecp-pay-client.ts`). Quando o ECP Pay está offline, o sistema faz fallback para geração local (mock FEBRABAN) transparente ao usuário.
3. **Webhook de recebimento automático** — `POST /webhooks/payment-received` (`server/src/modules/webhooks/webhooks.routes.ts`) credita automaticamente a conta PJ quando o ECP Pay liquida um split (ex.: repasse do ECP Food). Autenticado via `X-Webhook-Secret`. Idempotente por `reference_id`.
4. **Multi-empresas com RBAC** — 3 perfis hierárquicos (admin > financial > viewer) aplicados em todas as rotas via middleware `requireRole`.
5. **Seed sincronizado com ecossistema** — os 7 donos de empresa PJ compartilham `user_id` com usuários do ecp-digital-bank (PF), permitindo que o mesmo CPF acesse PF e PJ.

---

## 3. Público-Alvo

### 3.1. Segmento Primário — MEI (Microempreendedor Individual)

- **Perfil:** 22-45 anos, faturamento até R$ 81.000/ano
- **Atividades típicas:** Design, serviços de alimentação (restaurantes do ECP Food), comércio pequeno
- **Dores:** Mistura gastos PF/PJ, não sabe quanto o negócio realmente fatura, perde tempo com conciliação manual de recebimentos do app de delivery

### 3.2. Segmento Secundário — EI e LTDA

- **Perfil:** 1-5 funcionários, faturamento até R$ 360.000/ano
- **Atividades típicas:** Prestação de serviços, restaurantes, comércio local
- **Dores:** Múltiplos sócios precisam acessar a conta, diferentes níveis de permissão, cartões separados por sócio

### 3.3. Natureza Jurídica Suportada (implementado)

No campo `companies.natureza_juridica` o sistema aceita:

- `mei` — Microempreendedor Individual (padrão dos restaurantes do seed)
- `ei` — Empresário Individual (ex.: Burger Lab no seed)
- `ltda` — Sociedade Limitada (ex.: Pizza Club 24h no seed)

A spec anterior previa `eireli` e `slu` também, mas **esses tipos não estão representados no seed nem validados no schema** (o campo é livre-texto no backend).

---

## 4. Funcionalidades Principais (Implementado)

### 4.1. Conta Digital PJ

- Abertura via endpoint `POST /companies` (`server/src/modules/companies/companies.routes.ts:9`)
- Saldo em tempo real em centavos (`pj_accounts.balance`)
- Agência fixa `0001`, número da conta com 8 dígitos + dígito verificador
- Limite diário de transferência configurável (`pj_accounts.daily_transfer_limit`, padrão R$ 10.000 em centavos)
- **Rendimento CDI:** exibido no dashboard como "Rendendo 100% CDI" (`web/src/routes/pj-dashboard.tsx:138`) — texto estático, sem cálculo real no backend.

### 4.2. Pix Empresarial

Implementado em `server/src/modules/pj-pix/`:

- **Envio de Pix** — `POST /pj/pix/transfer` (role `financial+`), sempre gratuito
- **CRUD de chaves Pix** — `GET/POST/DELETE /pj/pix/keys` (listar: viewer, criar/deletar: admin)
  - Tipos aceitos: `cnpj`, `email`, `phone`, `random`
  - Limite: **20 chaves por empresa** (constante `MAX_PIX_KEYS` em `pj-pix.service.ts:31`)
- **QR Code de cobrança** — `POST /pj/pix/qrcode` (role `financial+`) integra com ECP Pay e retorna `qr_code + qr_code_text + expiration + ecpPayTransactionId`. Fallback local gera payload EMV mock.
- **Lookup de chave Pix** — `GET /pj/pix/lookup` (mock — retorna "Destinatário Exemplo")
- **Rate limiting:** máximo de 20 Pix/hora por conta (tabela `pj_pix_rate_limit`, constante `MAX_PIX_PER_HOUR`)

### 4.3. Emissão de Boletos (Cobranças)

Implementado em `server/src/modules/invoices/`:

- **Criar boleto** — `POST /pj/invoices` (role `financial+`): integra com `ecpPayClient.createBoletoCharge` e retorna código de barras 47 dígitos + linha digitável + QR Pix + copia-e-cola. Em caso de falha do ECP Pay, gera código de barras local (mock FEBRABAN via `generateBarcode`/`generateDigitableLine`).
- **Listagem** — `GET /pj/invoices` com filtros (`status`, `search` por cliente, `startDate`, `endDate`, `page`, `limit` máx 100)
- **Detalhe** — `GET /pj/invoices/:id`
- **Resumo** — `GET /pj/invoices/summary` — contadores por status + valores agregados
- **Cancelar** — `PATCH /pj/invoices/:id` (role `financial+`)
- **Reenviar notificação** — `POST /pj/invoices/:id/resend` (apenas marca `notification_sent = 1`; não envia email real)

Configuração de juros, multa e desconto disponível (`interest_rate`, `penalty_rate`, `discount_days`, `discount_amount` — todos em basis points/centavos). Boletos do tipo `single`, `installment` ou `recurring` são suportados pelo schema; o front-end usa apenas `single`.

### 4.4. Cartão Corporativo Virtual

Implementado em `server/src/modules/corporate-cards/`:

- **Criar cartão** — `POST /pj/cards` (role `admin`): associa a um `team_member`. Número completo é armazenado com `bcrypt.hashSync` (10 rounds); apenas `last4` é retornado.
- **Listar** — `GET /pj/cards` (exclui cartões `cancelled`)
- **Detalhe** — `GET /pj/cards/:id`
- **Ajustar limite** — `PATCH /pj/cards/:id/limit` (role `admin`)
- **Bloquear/Desbloquear** — `PATCH /pj/cards/:id/block` (role `admin`)
- **Fatura do mês** — `GET /pj/cards/:id/invoice` (retorna último `corporate_invoices`)
- **Compras** — `GET /pj/cards/:id/purchases`

Dia de fechamento configurável (`due_day`, padrão 25, range 1–28). Cada card rastreia `limit_cents`, `used_cents` e retorna `availableCents` calculado.

### 4.5. Multi-usuários (Team)

Implementado em `server/src/modules/team/`:

- **Convidar membro** — `POST /pj/team` (role `admin`): insere em `team_members` com status inicial e role (`admin`, `financial`, `viewer`)
- **Listar time** — `GET /pj/team`
- **Atualizar role** — `PATCH /pj/team/:id/role` (role `admin`)
- **Remover** — `DELETE /pj/team/:id` (role `admin`)

RBAC aplicado via middleware `requireRole(minimumRole)` (`server/src/shared/middleware/rbac.ts:13`) usando hierarquia:
`admin=3 > financial=2 > viewer=1`.

### 4.6. Transações / Extrato

Implementado em `server/src/modules/pj-transactions/`:

- **Listar** — `GET /pj/transactions` com paginação cursor-based e filtros (`category`, `type`, `period` em dias, `startDate`, `endDate`)
- **Detalhe** — `GET /pj/transactions/:id`
- **Resumo por categoria** — `GET /pj/transactions/summary` — agrupa por `category` retornando `totalIn`, `totalOut`, `count` e `netFlow`

Categorias implementadas no seed e em todo o código: `pix_sent`, `pix_received`, `boleto_paid`, `boleto_received`, `card_purchase`, `transfer_pf`, `split_received` (webhook do ECP Pay), `tax`.

### 4.7. Dashboard PJ

Endpoint único `GET /pj/dashboard` (`server/src/modules/pj-dashboard/pj-dashboard.service.ts`):

- Dados da empresa (nome fantasia + CNPJ)
- Saldo atual em centavos
- **Cash flow diário dos últimos 7 dias** (inflow/outflow por dia, preenche dias sem movimento com zero)
- Resumo de boletos (pendentes/pagos/vencidos com count + amount)
- 5 transações mais recentes

### 4.8. Notificações

Implementado em `server/src/modules/pj-notifications/`:

- `GET /pj/notifications` — listar com filtros
- `GET /pj/notifications/unread-count` — contador
- `PATCH /pj/notifications/:id/read` — marcar como lida
- `POST /pj/notifications/read-all` — marcar todas

Tipos: `transaction`, `invoice`, `security`, `team`, `system`.

### 4.9. Transferência PF ↔ PJ

- `POST /pj/accounts/transfer-pf` (role `financial+`) — rota existe, mas a integração real com o backend PF não está implementada (conta PF e PJ vivem em DBs separados; a transferência é local/mock).

### 4.10. Webhook ECP Pay (Novidade vs. spec 2026-03)

- `POST /webhooks/payment-received` sem JWT, autenticado por `X-Webhook-Secret` (`ECP_PAY_WEBHOOK_SECRET`, default `ecp-pay-webhook-secret-dev`)
- Credita automaticamente a conta PJ da empresa cujo CNPJ bate com `account_id` do payload
- Registra transação `split_received` e escreve em `pj_audit_logs`
- **Idempotente** por `reference_id` (se já processado, retorna `{ status: 'already_processed' }`)

### 4.11. Funcionalidades previstas na spec 2026-03 mas NÃO implementadas

- **Integração PF↔PJ com dashboard unificado** — não há cross-database query
- **Alerta de "gasto pessoal na conta PJ"** — não implementado
- **Régua de cobrança automática (D+1, D+3, D+7)** — apenas marcação manual via `resend`
- **Abertura de conta com consulta à Receita Federal** — endpoint existe mas sem integração externa
- **Upload de contrato social para LTDA** — não implementado
- **NF-e integrada** — não implementado (fora do escopo do MVP)
- **Onboarding guiado / tour** — não há tela `/pj/onboarding`
- **Perfil do operador (alterar senha, sessões)** — rota `/pj/perfil` existe mas é apenas um placeholder

---

## 5. Regras de Negócio (Implementadas)

| ID | Regra | Onde | Implementação |
|----|-------|------|---------------|
| RN-01 | Saldo insuficiente bloqueia Pix | `pj-pix.service.ts:74` | `account.balance < input.amount` → `INSUFFICIENT_BALANCE` |
| RN-02 | Limite de 20 chaves Pix por empresa | `pj-pix.service.ts:31, 133` | Constante `MAX_PIX_KEYS` |
| RN-03 | Rate limit 20 Pix/hora por conta | `pj-pix.service.ts:30, 42` | Tabela `pj_pix_rate_limit`, constante `MAX_PIX_PER_HOUR` |
| RN-04 | Valores monetários em centavos (integer) | Todos os módulos | `amount`, `balance`, `limit_cents` etc. são `INTEGER` |
| RN-05 | IDs UUID v4 | `server/src/shared/utils/uuid.ts` | `generateId()` |
| RN-06 | Soft delete em chaves Pix e empresas | `pj_pix_keys.deleted_at`, `companies.deleted_at` | Nunca deleta fisicamente |
| RN-07 | Transações atômicas | Todo serviço | `db.transaction(() => { ... })()` do better-sqlite3 |
| RN-08 | Audit log em toda ação sensível | `pj_audit_logs` | Create/update/delete registram `user_id`, `action`, `resource`, `metadata` |
| RN-09 | RBAC hierárquico | `rbac.ts:7` | `{ admin: 3, financial: 2, viewer: 1 }` |
| RN-10 | Número de cartão hasheado | `corporate-cards.service.ts:87` | `bcrypt.hashSync(rawNumber, 10)`, retorna apenas `last4` |
| RN-11 | Boleto cancelado não pode ser cancelado de novo | `invoices.service.ts:214` | `INVOICE_ALREADY_CANCELLED` |
| RN-12 | Boleto pago não pode ser cancelado | `invoices.service.ts:210` | `INVOICE_ALREADY_PAID` |
| RN-13 | Webhook idempotente | `webhooks.service.ts:19` | Busca por `reference_id` antes de creditar |
| RN-14 | JWT compartilhado com PF (secret) | `JWT_SECRET` env | Default `ecp-digital-bank-dev-secret-mude-em-producao` |
| RN-15 | CORS restrito ao front-end | `app.ts:28` | `CORS_ORIGIN` default `http://localhost:5175` |
| RN-16 | Idempotência ECP Pay | `ecp-pay-client.ts:130` | `X-Idempotency-Key` (UUID) em toda chamada POST |

### Regras da spec 2026-03 não implementadas

- Limite diário diurno/noturno de Pix específico por janela horária (só há `daily_transfer_limit` genérico)
- Autenticação reforçada acima de R$ 5.000 (não há fluxo 2FA)
- Validação de CNPJ por módulo 11 no schema (existe o util `cnpj.ts` mas o schema aceita qualquer string)

---

## 6. Personas (Seed — 7 empresas)

O seed em `server/src/database/seed.ts` cria 7 empresas, sendo 1 estúdio de design e 6 restaurantes espelhados do **ecp-digital-food**. Toda conta PJ tem dono mapeado a um usuário PF com mesmo `user_id`.

### P-01 — AB Design Studio (Marina Silva)
- CNPJ 12.345.678/0001-95 — MEI — `marina@email.com` — saldo R$ 8.750,00
- 5 boletos (2 pagos, 1 vencido, 2 pendentes), 10 transações variadas, 3 chaves Pix

### P-02 a P-07 — Restaurantes FoodFlow

| Persona | Empresa | CNPJ | Natureza | Saldo | Email |
|---------|---------|------|----------|-------|-------|
| Carlos Eduardo Mendes | Pasta & Fogo | 34.567.890/0001-12 | MEI | R$ 23.456,00 | carlos.mendes@email.com |
| Aisha Oliveira Santos | Sushi Wave | 45.678.901/0001-23 | MEI | R$ 18.765,00 | aisha.santos@email.com |
| Roberto Yukio Tanaka | Burger Lab | 56.789.012/0001-34 | EI | R$ 35.678,00 | roberto.tanaka@email.com |
| Francisca das Chagas Lima | Green Bowl Co. | 67.890.123/0001-45 | MEI | R$ 9.854,00 | francisca.lima@email.com |
| Lucas Gabriel Ndongo | Pizza Club 24h | 78.901.234/0001-56 | LTDA | R$ 45.210,00 | lucas.ndongo@email.com |
| Patricia Werneck de Souza | Brasa & Lenha | 89.012.345/0001-67 | MEI | R$ 52.347,00 | patricia.werneck@email.com |

Senha padrão de todos: `Senha@123`.

Cada restaurante tem transações típicas do setor: Pix recebidos de clientes (pedidos numerados), repasse semanal FoodFlow, pagamento de fornecedores, conta de energia, gás, DAS, aluguel, transferência PF↔PJ para pró-labore, iFood Ads no cartão etc.

---

## 7. Fluxos Principais (User Journeys Implementados)

### 7.1. Login na Conta PJ

1. Usuário acessa `http://localhost:5175/`
2. Se não autenticado: página de login (`web/src/routes/login.tsx`) mostra formulário + 7 botões de acesso rápido (dev)
3. Clica em uma empresa → email preenchido + senha `Senha@123` injetada
4. Front-end chama `POST /auth/pj/dev-login` → recebe JWT + dados da empresa
5. Token salvo em `localStorage.pj_token`
6. `useAuthPJ` chama `GET /auth/pj/me` para confirmar sessão
7. Redireciona para `/pj/dashboard`

### 7.2. Recebimento via ECP Pay (automático)

1. Cliente final paga um pedido no **ecp-digital-food**
2. ECP Food envia cobrança ao **ecp-digital-pay**
3. ECP Pay liquida e divide (split) entre ECP Food (plataforma) e restaurante (conta PJ no ECP Emps)
4. ECP Pay chama `POST http://localhost:3334/webhooks/payment-received` com `account_id = CNPJ do restaurante`
5. `creditAccountFromWebhook` identifica a empresa pelo CNPJ, credita `pj_accounts.balance`, insere transação `split_received` e audit log
6. Próximo refresh do dashboard mostra o novo saldo e a transação no extrato

### 7.3. Cobrança via Boleto

1. `/pj/cobrancas/nova` — wizard de 3 passos (`web/src/routes/invoices-novo.tsx`)
2. Passo 1: dados do cliente (nome, CPF/CNPJ com máscara, e-mail opcional, valor, vencimento, descrição)
3. Passo 2: toggles de juros (1% a.m.), multa (2%), desconto (5%) + preview do boleto
4. Passo 3: `POST /pj/invoices` → ECP Pay gera barcode + linha digitável + QR Pix (ou fallback local)
5. Tela de sucesso com botão "Copiar código de barras" e "Copiar link"

### 7.4. Pix Enviar

1. `/pj/pix/enviar` — formulário com chave + tipo + valor
2. `POST /pj/pix/transfer` valida saldo e rate limit
3. Atualiza `pj_accounts.balance`, insere transação `pix_sent`, audit log, retorna `balanceAfter`

### 7.5. Gestão de Time

1. `/pj/time` — lista membros (`GET /pj/team`)
2. Admin convida via modal → `POST /pj/team`
3. Admin ajusta role → `PATCH /pj/team/:id/role`
4. Admin remove → `DELETE /pj/team/:id`

---

## 8. Integração com o Ecossistema ECP

### 8.1. Mapa de Integrações Reais

| Sistema | Direção | Mecanismo |
|---------|---------|-----------|
| **ecp-digital-bank (PF)** | Usuário compartilhado | Mesmos `user_id` no seed; `JWT_SECRET` compartilhado; switch para PF redireciona para `VITE_PF_APP_URL` |
| **ecp-digital-pay** | Saída (API client) | `ecpPayClient` (Pix charge, Boleto charge, Card charge, refund) com `X-API-Key`, `X-Source-App: ecp-emps`, `X-Idempotency-Key` |
| **ecp-digital-pay** | Entrada (webhook) | `POST /webhooks/payment-received` autenticado por `X-Webhook-Secret` |
| **ecp-digital-food** | Indireta (via ECP Pay) | Cada restaurante FoodFlow tem conta PJ no ECP Emps. Splits de pedidos caem via webhook. |

### 8.2. Portas do Ecossistema (observado)

| Produto | Porta |
|---------|-------|
| ecp-digital-bank (PF) | 3333 / 5173 |
| **ecp-digital-emps (PJ)** | **3334 / 5175** |
| ecp-digital-pay | 3335 (inferido de `ECP_PAY_URL`) |

---

## 9. Métricas de Sucesso (MVP)

A telemetria de produto em si não está implementada no código. As métricas abaixo permanecem como objetivos do MVP e podem ser computadas diretamente a partir do SQLite:

| Métrica | Meta | Como medir (SQL sobre `database-emps.sqlite`) |
|---------|------|-----------------------------------------------|
| Contas PJ ativas | 500 | `SELECT COUNT(*) FROM companies WHERE status = 'active'` |
| Pix PJ / semana / empresa | 5+ | `SELECT account_id, COUNT(*) FROM pj_transactions WHERE category IN ('pix_sent','pix_received') AND created_at > ... GROUP BY account_id` |
| Boletos emitidos / mês | 1.000+ | `SELECT COUNT(*) FROM invoices WHERE status != 'cancelled'` |
| Saldo médio por empresa | — | `SELECT AVG(balance) FROM pj_accounts` |
| Splits FoodFlow recebidos / dia | — | `SELECT COUNT(*) FROM pj_transactions WHERE category = 'split_received'` |

---

*Documento gerado para o projeto ECP Emps — v2.0 (refletindo a implementação de 20/04/2026).*
*Ecossistema ECP: ecp-digital-bank (PF) + ecp-digital-emps (PJ) + ecp-digital-pay (gateway) + ecp-digital-food (delivery).*
