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
 *
 * Unified schema supporting both Tenant Portal and Owner Portal modules.
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
  {
    id: '002_unified_core_tables',
    up: `
      ALTER TABLE users ADD COLUMN phone TEXT;

      CREATE TABLE IF NOT EXISTS properties (
        id            TEXT PRIMARY KEY,
        owner_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name          TEXT NOT NULL,
        location      TEXT NOT NULL DEFAULT '',
        address       TEXT NOT NULL DEFAULT '',
        city          TEXT,
        property_type TEXT NOT NULL DEFAULT 'apartment',
        description   TEXT NOT NULL DEFAULT '',
        bedrooms      INTEGER NOT NULL DEFAULT 0,
        bathrooms     INTEGER NOT NULL DEFAULT 0,
        rent          REAL NOT NULL DEFAULT 0,
        monthly_rent  REAL NOT NULL DEFAULT 0,
        amenities     TEXT NOT NULL DEFAULT '[]',
        image_url     TEXT,
        status        TEXT NOT NULL DEFAULT 'available',
        created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties (owner_id);

      CREATE TABLE IF NOT EXISTS units (
        id          TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        unit_number TEXT NOT NULL,
        bedrooms    INTEGER NOT NULL DEFAULT 0,
        bathrooms   INTEGER NOT NULL DEFAULT 0,
        rent        REAL NOT NULL,
        status      TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved')),
        created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        UNIQUE (property_id, unit_number)
      );

      CREATE TABLE IF NOT EXISTS rental_requests (
        id            TEXT PRIMARY KEY,
        tenant_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        property_id   TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        unit_id       TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
        monthly_rent  REAL NOT NULL,
        move_in_date  TEXT NOT NULL,
        status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
        created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );

      CREATE TABLE IF NOT EXISTS rentals (
        id           TEXT PRIMARY KEY,
        tenant_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        property_id  TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        unit_id      TEXT REFERENCES units(id) ON DELETE SET NULL,
        owner_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
        monthly_rent REAL NOT NULL,
        start_date   TEXT NOT NULL,
        end_date     TEXT,
        status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'ended')),
        created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      CREATE INDEX IF NOT EXISTS idx_rentals_property ON rentals (property_id);
      CREATE INDEX IF NOT EXISTS idx_rentals_tenant ON rentals (tenant_id, status);

      CREATE TABLE IF NOT EXISTS rent_payments (
        id           TEXT PRIMARY KEY,
        rental_id    TEXT NOT NULL REFERENCES rentals(id),
        property_id  TEXT NOT NULL REFERENCES properties(id),
        tenant_id    TEXT NOT NULL REFERENCES users(id),
        rent_month   TEXT NOT NULL,
        amount       REAL NOT NULL,
        due_date     TEXT NOT NULL,
        payment_date TEXT,
        method       TEXT,
        notes        TEXT,
        status       TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','paid','overdue')),
        created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_rent_payment_month ON rent_payments (rental_id, rent_month);
      CREATE INDEX IF NOT EXISTS idx_rent_payments_property ON rent_payments (property_id);

      CREATE TABLE IF NOT EXISTS transactions (
        id              TEXT PRIMARY KEY,
        owner_id        TEXT REFERENCES users(id),
        tenant_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        property_id     TEXT REFERENCES properties(id),
        rental_id       TEXT REFERENCES rentals(id) ON DELETE CASCADE,
        rent_payment_id TEXT REFERENCES rent_payments(id),
        rent_month      TEXT,
        type            TEXT DEFAULT 'rent_payment'
                        CHECK (type IS NULL OR type IN ('rent_payment','refund')),
        amount          REAL NOT NULL,
        payment_date    TEXT,
        status          TEXT NOT NULL DEFAULT 'pending',
        reference       TEXT,
        created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      CREATE INDEX IF NOT EXISTS idx_transactions_owner ON transactions (owner_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON transactions (tenant_id, rent_month);

      CREATE TABLE IF NOT EXISTS maintenance_requests (
        id             TEXT PRIMARY KEY,
        property_id    TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        tenant_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        unit_id        TEXT REFERENCES units(id) ON DELETE SET NULL,
        category       TEXT,
        title          TEXT NOT NULL,
        description    TEXT NOT NULL,
        priority       TEXT NOT NULL DEFAULT 'medium'
                       CHECK (priority IN ('low','medium','high')),
        status         TEXT NOT NULL DEFAULT 'submitted'
                       CHECK (status IN ('submitted','in_progress','resolved','rejected')),
        owner_response TEXT,
        created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      CREATE INDEX IF NOT EXISTS idx_maintenance_property ON maintenance_requests (property_id);
      CREATE INDEX IF NOT EXISTS idx_maintenance_tenant ON maintenance_requests (tenant_id, status);

      CREATE INDEX IF NOT EXISTS idx_units_property ON units (property_id);
      CREATE INDEX IF NOT EXISTS idx_rental_requests_tenant ON rental_requests (tenant_id, status);
    `,
  },
  {
    id: '003_user_status_for_admin',
    up: `
      ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
    `,
  },
  {
    id: '004_maintenance_money_transfer',
    up: `
      ALTER TABLE maintenance_requests ADD COLUMN amount REAL DEFAULT 0;
      ALTER TABLE maintenance_requests ADD COLUMN transfer_status TEXT DEFAULT 'none';
      ALTER TABLE maintenance_requests ADD COLUMN transferred_amount REAL DEFAULT 0;
      ALTER TABLE maintenance_requests ADD COLUMN transferred_at TEXT;
    `,
  },
  {
    id: '005_pakistan_legal_ai',
    up: `
      CREATE TABLE IF NOT EXISTS legal_sources (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        short_name    TEXT,
        jurisdiction  TEXT NOT NULL,
        authority     TEXT NOT NULL,
        source_type   TEXT NOT NULL,
        year          INTEGER,
        source_url    TEXT,
        is_active     INTEGER NOT NULL DEFAULT 1,
        verified      INTEGER NOT NULL DEFAULT 1,
        last_verified TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );

      CREATE TABLE IF NOT EXISTS legal_knowledge_base (
        id            TEXT PRIMARY KEY,
        source_id     TEXT REFERENCES legal_sources(id) ON DELETE CASCADE,
        jurisdiction  TEXT NOT NULL,
        category      TEXT NOT NULL,
        section_rule  TEXT NOT NULL,
        title         TEXT NOT NULL,
        summary       TEXT NOT NULL,
        urdu_summary  TEXT,
        full_text     TEXT NOT NULL,
        practical_app TEXT,
        key_documents TEXT DEFAULT '[]',
        red_flags     TEXT DEFAULT '[]',
        authority_ref TEXT,
        effective_date TEXT,
        superseded    INTEGER NOT NULL DEFAULT 0,
        created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      CREATE INDEX IF NOT EXISTS idx_lkb_jur_cat ON legal_knowledge_base(jurisdiction, category);

      CREATE TABLE IF NOT EXISTS legal_terms (
        id             TEXT PRIMARY KEY,
        term_en        TEXT NOT NULL,
        term_ur        TEXT NOT NULL,
        term_roman     TEXT NOT NULL,
        category       TEXT NOT NULL,
        simple_meaning TEXT NOT NULL,
        legal_significance TEXT NOT NULL,
        when_required  TEXT NOT NULL,
        related_docs   TEXT DEFAULT '[]',
        common_mistakes TEXT DEFAULT '[]',
        relevant_authority TEXT NOT NULL,
        legal_source   TEXT NOT NULL,
        created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      CREATE INDEX IF NOT EXISTS idx_terms_search ON legal_terms(term_en, term_roman);

      CREATE TABLE IF NOT EXISTS legal_tax_rates (
        id             TEXT PRIMARY KEY,
        jurisdiction   TEXT NOT NULL,
        tax_type       TEXT NOT NULL,
        filer_type     TEXT NOT NULL,
        rate_percent   REAL NOT NULL,
        description    TEXT NOT NULL,
        statutory_ref  TEXT NOT NULL,
        effective_from TEXT NOT NULL,
        effective_to   TEXT,
        is_active      INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS legal_societies (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        jurisdiction    TEXT NOT NULL,
        city            TEXT NOT NULL,
        authority_type  TEXT NOT NULL,
        transfer_mode   TEXT NOT NULL,
        verification_office TEXT NOT NULL,
        ndc_required    INTEGER NOT NULL DEFAULT 1,
        common_frauds   TEXT DEFAULT '[]',
        checklist       TEXT DEFAULT '[]'
      );

      CREATE TABLE IF NOT EXISTS legal_audit_logs (
        id              TEXT PRIMARY KEY,
        user_id         TEXT,
        query           TEXT NOT NULL,
        jurisdiction    TEXT,
        category        TEXT,
        risk_level      TEXT NOT NULL DEFAULT 'low',
        escalated       INTEGER NOT NULL DEFAULT 0,
        citation_status TEXT NOT NULL DEFAULT 'verified',
        ip_address      TEXT,
        created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
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

import { seedLegalData } from './legalSeed.js';

// Apply migrations on module load so models can prepare statements against the final schema.
runMigrations();
seedLegalData();
