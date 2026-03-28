import fs from 'node:fs';
import path from 'node:path';
import { getDatabase, closeDatabase } from '../connection.js';

function runMigrations(): void {
  const db = getDatabase();
  const migrationsDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));

  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set(
    db.prepare('SELECT name FROM _migrations').all().map((row: Record<string, string>) => row.name)
  );

  const files = fs.readdirSync(migrationsDir)
    .filter((f: string) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.info(`[migrate] Skipping (already applied): ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    console.info(`[migrate] Applying: ${file}`);

    db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
    })();

    console.info(`[migrate] Applied: ${file}`);
  }

  closeDatabase();
  console.info('[migrate] Done.');
}

runMigrations();
