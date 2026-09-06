import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbFile = path.resolve(__dirname, '..', '..', process.env.DB_FILE || 'data/rental.db');

// Ensure the data directory exists (safe to call at boot).
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

export const db = new Database(dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Schema migrations. Add new entries to the bottom of this list — each runs
 * once (tracked in the _migrations table), so every teammate's clone converges
 * to the same schema with just `npm run init-db`.
 */
const MIGRATIONS = [
  {
    id: '001_create_users',
    up: `
      CREATE TABLE IF NOT EXISTS users (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        email       TEXT NOT NULL UNIQUE,
        password    TEXT NOT NULL,
        role        TEXT NOT NULL CHECK (role IN ('admin', 'property_owner', 'tenant')),
        created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);
    `,
  },
];

export function runMigrations() {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );`);

  const applied = new Set(db.prepare('SELECT id FROM _migrations').all().map((r) => r.id));

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;
    const run = db.transaction(() => {
      db.exec(migration.up);
      db.prepare('INSERT INTO _migrations (id) VALUES (?)').run(migration.id);
    });
    run();
    console.log(`[db] applied migration: ${migration.id}`);
  }
}
