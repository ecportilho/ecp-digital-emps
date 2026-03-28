-- ECP Emps — Initial Schema
-- All 12 tables + indexes

CREATE TABLE IF NOT EXISTS companies (
  id              TEXT PRIMARY KEY,
  owner_user_id   TEXT NOT NULL,
  cnpj            TEXT NOT NULL UNIQUE,
  razao_social    TEXT NOT NULL,
  nome_fantasia   TEXT,
  natureza_juridica TEXT NOT NULL,
  endereco        TEXT,
  status          TEXT NOT NULL DEFAULT 'pending_validation',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at      TEXT
);

CREATE TABLE IF NOT EXISTS pj_accounts (
  id              TEXT PRIMARY KEY,
  company_id      TEXT NOT NULL REFERENCES companies(id),
  agency          TEXT NOT NULL DEFAULT '0001',
  number          TEXT NOT NULL UNIQUE,
  balance         INTEGER NOT NULL DEFAULT 0,
  daily_transfer_limit INTEGER NOT NULL DEFAULT 1000000,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS team_members (
  id              TEXT PRIMARY KEY,
  company_id      TEXT NOT NULL REFERENCES companies(id),
  user_id         TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'viewer',
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',
  invited_at      TEXT NOT NULL DEFAULT (datetime('now')),
  accepted_at     TEXT,
  removed_at      TEXT
);

CREATE TABLE IF NOT EXISTS pj_transactions (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES pj_accounts(id),
  operator_id     TEXT NOT NULL,
  type            TEXT NOT NULL,
  category        TEXT NOT NULL,
  amount          INTEGER NOT NULL,
  balance_after   INTEGER NOT NULL,
  direction       TEXT NOT NULL,
  description     TEXT,
  counterpart_name TEXT,
  counterpart_document TEXT,
  counterpart_institution TEXT,
  pix_key         TEXT,
  pix_key_type    TEXT,
  boleto_code     TEXT,
  reference_id    TEXT UNIQUE,
  status          TEXT NOT NULL DEFAULT 'pending',
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pj_pix_keys (
  id              TEXT PRIMARY KEY,
  company_id      TEXT NOT NULL REFERENCES companies(id),
  account_id      TEXT NOT NULL REFERENCES pj_accounts(id),
  type            TEXT NOT NULL,
  value           TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at      TEXT
);

CREATE TABLE IF NOT EXISTS invoices (
  id              TEXT PRIMARY KEY,
  company_id      TEXT NOT NULL REFERENCES companies(id),
  account_id      TEXT NOT NULL REFERENCES pj_accounts(id),
  operator_id     TEXT NOT NULL,
  customer_name   TEXT NOT NULL,
  customer_document TEXT NOT NULL,
  customer_email  TEXT,
  amount          INTEGER NOT NULL,
  due_date        TEXT NOT NULL,
  description     TEXT,
  barcode         TEXT,
  digitable_line  TEXT,
  pix_qrcode      TEXT,
  pix_copy_paste  TEXT,
  interest_rate   INTEGER DEFAULT 100,
  penalty_rate    INTEGER DEFAULT 200,
  discount_days   INTEGER DEFAULT 0,
  discount_amount INTEGER DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending',
  paid_at         TEXT,
  paid_amount     INTEGER,
  notification_sent INTEGER DEFAULT 0,
  type            TEXT NOT NULL DEFAULT 'single',
  installment_of  INTEGER,
  installment_total INTEGER,
  parent_invoice_id TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS corporate_cards (
  id              TEXT PRIMARY KEY,
  company_id      TEXT NOT NULL REFERENCES companies(id),
  account_id      TEXT NOT NULL REFERENCES pj_accounts(id),
  holder_id       TEXT NOT NULL REFERENCES team_members(id),
  card_number     TEXT NOT NULL,
  last4           TEXT NOT NULL,
  card_holder     TEXT NOT NULL,
  card_expiry     TEXT NOT NULL,
  limit_cents     INTEGER NOT NULL DEFAULT 0,
  used_cents      INTEGER NOT NULL DEFAULT 0,
  due_day         INTEGER NOT NULL DEFAULT 25,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS corporate_card_purchases (
  id              TEXT PRIMARY KEY,
  card_id         TEXT NOT NULL REFERENCES corporate_cards(id),
  company_id      TEXT NOT NULL REFERENCES companies(id),
  description     TEXT NOT NULL,
  merchant_name   TEXT NOT NULL,
  merchant_category TEXT,
  amount          INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'completed',
  purchased_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS corporate_invoices (
  id              TEXT PRIMARY KEY,
  card_id         TEXT NOT NULL REFERENCES corporate_cards(id),
  reference_month TEXT NOT NULL,
  total_cents     INTEGER NOT NULL DEFAULT 0,
  due_date        TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open',
  paid_at         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pj_notifications (
  id              TEXT PRIMARY KEY,
  company_id      TEXT NOT NULL REFERENCES companies(id),
  user_id         TEXT,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  type            TEXT NOT NULL,
  is_read         INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pj_pix_rate_limit (
  id              TEXT PRIMARY KEY,
  account_id      TEXT NOT NULL REFERENCES pj_accounts(id),
  window_start    TEXT NOT NULL,
  transfer_count  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pj_audit_logs (
  id              TEXT PRIMARY KEY,
  company_id      TEXT NOT NULL REFERENCES companies(id),
  user_id         TEXT NOT NULL,
  action          TEXT NOT NULL,
  resource        TEXT NOT NULL,
  resource_id     TEXT,
  metadata        TEXT,
  ip_address      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_companies_owner ON companies(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON companies(cnpj);
CREATE INDEX IF NOT EXISTS idx_pj_accounts_company ON pj_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_team_company ON team_members(company_id);
CREATE INDEX IF NOT EXISTS idx_team_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pj_tx_account ON pj_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_pj_tx_created ON pj_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_pj_tx_category ON pj_transactions(category);
CREATE INDEX IF NOT EXISTS idx_pj_tx_status ON pj_transactions(status);
CREATE INDEX IF NOT EXISTS idx_pj_pix_keys_company ON pj_pix_keys(company_id);
CREATE INDEX IF NOT EXISTS idx_pj_pix_keys_value ON pj_pix_keys(value);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_document);
CREATE INDEX IF NOT EXISTS idx_corp_cards_company ON corporate_cards(company_id);
CREATE INDEX IF NOT EXISTS idx_corp_cards_holder ON corporate_cards(holder_id);
CREATE INDEX IF NOT EXISTS idx_corp_purchases_card ON corporate_card_purchases(card_id);
CREATE INDEX IF NOT EXISTS idx_pj_notif_company ON pj_notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_pj_audit_company ON pj_audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_pj_audit_user ON pj_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_pj_audit_action ON pj_audit_logs(action);
