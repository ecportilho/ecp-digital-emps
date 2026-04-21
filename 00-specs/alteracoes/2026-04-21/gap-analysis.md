# Gap Analysis — ecp-digital-emps (2026-04-21)

> Análise baseada nas specs 2.0 de 20/04/2026 (`product_briefing_spec.md`, `tech_spec.md`, `design_spec.md`) vs. código em `03-product-delivery/`.

As specs foram regeneradas a partir do código implementado em 20/04/2026 (seção 4.11 do briefing já reconhece explicitamente o que não foi implementado). Esta gap analysis foca em **gaps acionáveis não reconhecidos pela spec** — bugs latentes, regras violadas, segurança — além do item que o usuário já sinalizou (logout).

---

## Sumário executivo

- **Total de requisitos avaliados:** 47 (10 features principais + 16 regras de negócio + integrações + segurança)
- **✅ Implementados:** 42 (89%)
- **⚠️ Parcialmente implementados:** 3 (6%)
- **❌ Não implementados:** 2 (4%)

---

## Maiores riscos / bloqueios

1. **GAP-LOGOUT** (Alta / M) — Usuário não consegue deslogar pela UI. Função `logout()` existe em `web/src/hooks/useAuthPJ.ts:68` e é desestruturada em `App.tsx:8`, mas **nunca é invocada** em `HeaderPJ.tsx`, `SidebarPJ.tsx` ou `ProfileSwitcher.tsx`. Sessão fica aberta até o usuário limpar `localStorage.pj_token` manualmente.

2. **GAP-DAILY_LIMIT_NOT_ENFORCED** (Alta / S) — Campo `pj_accounts.daily_transfer_limit` (padrão R$ 10.000) existe no schema, é lido em `pj-pix.service.ts:67`, porém **nunca é comparado ao valor do Pix**. O `ErrorCode.DAILY_LIMIT_EXCEEDED` é declarado em `error-codes.ts:24` mas nunca é lançado. Usuário pode fazer Pix acima do limite diário configurado.

3. **GAP-SECRETS_DEFAULT_HARDCODED** (Alta / XS) — Três secrets têm fallbacks hardcoded que viram chaves públicas se `.env` não for ajustado em prod:
   - `JWT_SECRET` → `'ecp-digital-bank-dev-secret-mude-em-producao'` (`auth-pj.service.ts:8`, `shared/middleware/auth-pj.ts:14`)
   - `ECP_PAY_API_KEY` → `'ecp-emps-dev-key'` (`services/ecp-pay-client.ts:17`)
   - `ECP_PAY_WEBHOOK_SECRET` → `'ecp-pay-webhook-secret-dev'` (`modules/webhooks/webhooks.routes.ts:10`)

4. **GAP-AUDIT_IP_ALWAYS_NULL** (Média / XS) — Todos os INSERTs em `pj_audit_logs` gravam `ip_address = NULL`. `request.ip` do Fastify nunca é capturado. Quebra rastreabilidade exigida pela RN-08.

5. **GAP-TRANSFER_PF_MOCK_ONLY** (Média / L) — Feature 4.9 (Transferência PF↔PJ) em `pj-accounts.service.ts:47-99` grava transação `transfer_pf` localmente mas não comunica com `ecp-digital-bank`. Saldo PF nunca é ajustado. É um mock transparente ao usuário.

---

## Backend

### ✅ Implementado

- **Conta PJ (§4.1)** — `POST /companies`, saldo em centavos, agência fixa `0001`, limite diário configurável (porém ver gap #2)
- **Pix empresarial (§4.2)** — envio, CRUD chaves (máx 20), QR code ECP Pay + fallback, lookup mock, rate limit 20/hora via `pj_pix_rate_limit`
- **Boletos (§4.3)** — CRUD completo, integração `ecpPayClient.createBoletoCharge` + fallback FEBRABAN local, filtros, resumo, cancelar, reenviar (apenas marca flag)
- **Cartão corporativo (§4.4)** — criar com PAN hasheado em bcrypt 10 rounds, listar, ajustar limite, bloquear/desbloquear, fatura, compras
- **Team / RBAC (§4.5)** — convidar, listar, mudar role, remover — hierarquia `admin=3 > financial=2 > viewer=1` em `rbac.ts:7`
- **Transações / Extrato (§4.6)** — paginação cursor, filtros, resumo por categoria
- **Dashboard (§4.7)** — `GET /pj/dashboard` com cash flow 7 dias, resumo de boletos, 5 transações recentes
- **Notificações (§4.8)** — listar, unread count, marcar lida/todas
- **Webhook ECP Pay (§4.10)** — `POST /webhooks/payment-received` com `X-Webhook-Secret`, idempotente por `reference_id`
- **CNPJ módulo 11** — `validateCnpj()` em `companies.service.ts:25` está ativo (spec 2026-03 reportava como ausente — **já foi implementado**)
- **RN-01 a RN-07, RN-09 a RN-13, RN-15, RN-16** — todas validadas no código

### ⚠️ Parcialmente implementado

- **Transferência PF↔PJ (§4.9)** — `POST /pj/accounts/transfer-pf` existe em `pj-accounts.service.ts:47`. Atualiza `pj_accounts.balance`, insere `pj_transactions(category='transfer_pf')`, mas **não chama o backend PF**. Bancos isolados em DBs separados.
  - Esforço: L (requer design de contrato bancário → bancário)

- **Notificação de boleto (§4.3)** — `POST /pj/invoices/:id/resend` em `invoices.service.ts:240` só marca `notification_sent=1`. Não dispara email/SMS/push real.
  - Esforço: L

- **Rendimento CDI** — `web/src/routes/pj-dashboard.tsx:138` mostra "Rendendo 100% CDI" como string estática. Backend não calcula rendimento diário.
  - Esforço: M

### ❌ Não implementado

- **Onboarding guiado** (§4.11 spec) — sem rota `/pj/onboarding`.
- **Upload contrato social LTDA** (§4.11 spec) — sem endpoint ou UI.
- **Régua de cobrança automática D+1/D+3/D+7** (§4.11 spec) — só resend manual.
- **NF-e** (§4.11 spec) — fora do escopo MVP.

---

## Frontend

### ✅ Implementado

- Login com 7 quick buttons dev + senha `Senha@123`
- `SidebarPJ` 280px com 8 itens + "Alternar para PF" (redireciona externo)
- `HeaderPJ` com avatar, sino de notificações, badge PJ
- `ProfileSwitcher` dropdown
- 14 rotas (dashboard, extrato, pix-enviar/receber/chaves, cobrancas lista/nova/detalhe, cartoes lista/fatura, team, empresa, perfil-placeholder)
- Componentes UI: Button, Card, Input, Modal, Badge variantes
- Paginação e filtros com `limit` máximo 100 em cobrancas
- Wizard 3 passos em nova cobrança

### ⚠️ Parcialmente implementado

- **ProfileSwitcher** — "Alternar para PF" redireciona para `VITE_PF_APP_URL` externo em vez de alternar perfil in-app. Aceitável para arquitetura atual mas descolado da UX "unificada" prometida pelo briefing.
  - Arquivo: `web/src/components/layout/ProfileSwitcher.tsx:71-72`

### ❌ Não implementado

- **Botão Logout / Sair** — *gap crítico que o usuário já identificou*. Função `logout()` existe em `useAuthPJ.ts:68`:
  ```ts
  const logout = useCallback(() => {
    localStorage.removeItem('pj_token');
    setAuth(null);
    setError(null);
  }, []);
  ```
  Importada em `App.tsx:8` mas nunca é chamada. Nenhum dos três componentes de layout (`HeaderPJ`, `SidebarPJ`, `ProfileSwitcher`) oferece UI para acionar.
  - Esforço: **M** (adicionar botão + confirmação simples + redirect `/login`)

---

## Integrações (ECP Pay, Bank, Webhooks)

### ✅ Implementado
- **Outbound ECP Pay** — `ecpPayClient` com `X-API-Key`, `X-Source-App=ecp-emps`, `X-Idempotency-Key` UUID v4
- **Endpoints consumidos**: `/pay/pix`, `/pay/card`, `/pay/boleto`, `/pay/transactions/:id`, `/pay/transactions/:id/refund`
- **Fallback local** quando ECP Pay offline — gera code barras/linha digitável mock FEBRABAN e payload EMV Pix sem quebrar UX
- **Inbound webhook** — `/webhooks/payment-received` com `X-Webhook-Secret`, idempotente

### ⚠️ Parcialmente implementado

- **Logs de falha ECP Pay** — fallback silencioso em `invoices.service.ts:93-125`. Não há métrica/alerta quando ECP Pay cai e fallback é usado. Risco de não perceber degradação.
  - Esforço: S

### ❌ Não implementado

- **Integração bidirecional com ecp-digital-bank** — usuários PF e PJ compartilham `user_id` no seed, mas não há query cross-DB nem sincronização de transações. Implicação direta no GAP-TRANSFER_PF_MOCK_ONLY.

---

## Regras invioláveis / regras de negócio — status

| ID | Regra | Status | Observação |
|----|-------|--------|------------|
| RN-01 | Saldo insuficiente bloqueia Pix | ✅ | `pj-pix.service.ts:74` |
| RN-02 | Máx 20 chaves Pix por empresa | ✅ | `MAX_PIX_KEYS` |
| RN-03 | Rate limit 20 Pix/hora | ✅ | `MAX_PIX_PER_HOUR` |
| RN-04 | Valores em centavos | ✅ | consistente |
| RN-05 | UUID v4 | ✅ | `generateId()` |
| RN-06 | Soft delete | ✅ | `deleted_at` / `status='removed'` |
| RN-07 | Transações atômicas | ✅ | `db.transaction()()` |
| **RN-08** | **Audit log completo** | ⚠️ | **`ip_address` sempre NULL** |
| RN-09 | RBAC hierárquico | ✅ | `rbac.ts:7` |
| RN-10 | Número cartão hasheado | ✅ | bcrypt 10 rounds |
| RN-11 | Boleto cancelado imutável | ✅ | `invoices.service.ts:214` |
| RN-12 | Boleto pago não cancelável | ✅ | `invoices.service.ts:210` |
| RN-13 | Webhook idempotente | ✅ | por `reference_id` |
| **RN-14** | **JWT com secret compartilhado PF** | ⚠️ | **fallback hardcoded se `.env` faltar** |
| RN-15 | CORS restrito ao front | ✅ | `CORS_ORIGIN` |
| RN-16 | Idempotência ECP Pay | ✅ | `X-Idempotency-Key` UUID v4 |
| §5 | Limite diário Pix | ❌ | **criado no schema, nunca validado** |
| §5 | 2FA acima R$ 5.000 | ❌ | não implementado |
| §2 (tech) | CNPJ módulo 11 | ✅ | implementado (spec 2.0 diz que não era; foi corrigido) |

---

## Recomendações de priorização

| # | Item | Categoria | Esforço | Impacto |
|---|------|-----------|---------|---------|
| 1 | **Botão "Sair"** no Header + handler que chama `logout()` e navega para `/login` | Frontend | M | Alto — usabilidade / segurança |
| 2 | **Validar `daily_transfer_limit`** em `pixTransfer()` — lançar `DAILY_LIMIT_EXCEEDED` | Backend | S | Alto — compliance |
| 3 | **Remover fallbacks hardcoded** de `JWT_SECRET`, `ECP_PAY_API_KEY`, `ECP_PAY_WEBHOOK_SECRET` — falhar se `.env` não definir | Backend | XS | Alto — segurança |
| 4 | **Capturar `request.ip`** em todos os `pj_audit_logs` INSERT | Backend | XS | Médio — auditoria |
| 5 | **Métrica/log de fallback ECP Pay** — logar quando `createBoletoCharge` cai pro mock local | Backend | S | Médio — observabilidade |
| 6 | **Transferência PF↔PJ real** — contrato de API bidirecional com ecp-digital-bank | Backend | L | Médio — promessa do produto |
| 7 | **Envio real de email/SMS** no `resend` de boleto | Backend | L | Médio |
| 8 | **Rendimento CDI** real no dashboard (cálculo + job diário) | Backend | M | Baixo |
| 9 | Onboarding guiado | Frontend | L | Baixo |
| 10 | Upload contrato social LTDA | Full-stack | M | Baixo |

---

## Itens fora do escopo (reconhecidos pela spec §4.11)

Estes são **decisões explícitas** do MVP, não dívidas técnicas:

- Integração PF↔PJ com dashboard unificado (requer sincronização cross-DB)
- Alerta de "gasto pessoal na conta PJ"
- Régua de cobrança automática
- Consulta Receita Federal na abertura de conta
- Upload contrato social LTDA
- NF-e integrada
- Onboarding guiado / tour
- Perfil do operador (`/pj/perfil` é placeholder)
- Limite diário diurno/noturno por janela horária
- 2FA acima de R$ 5.000
