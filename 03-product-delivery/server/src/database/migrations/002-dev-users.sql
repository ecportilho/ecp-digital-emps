-- ECP Emps — Dev Users (standalone authentication for development)
-- In production, auth is delegated to ecp-digital-bank (PF).
-- This table enables standalone dev/demo mode.

CREATE TABLE IF NOT EXISTS pj_dev_users (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  cpf             TEXT NOT NULL,
  phone           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pj_dev_users_email ON pj_dev_users(email);
