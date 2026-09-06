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
  {
<<<<<<< HEAD
    // Shared core tables (additive; used by owner rent/transactions/maintenance/
    // reports/csv-import modules). Property CRUD (Person 2) and the tenant
    // portal (Person 1) read/write these same tables.
    id: '002_shared_core_tables',
    up: `
      CREATE TABLE IF NOT EXISTS properties (
        id            TEXT PRIMARY KEY,
        owner_id      TEXT NOT NULL REFERENCES users(id),
        name          TEXT NOT NULL,
        address       TEXT NOT NULL,
        city          TEXT,
        property_type TEXT NOT NULL DEFAULT 'apartment'
                      CHECK (property_type IN ('apartment','house','studio','shop','office')),
        description   TEXT,
        bedrooms      INTEGER NOT NULL DEFAULT 0,
        bathrooms     INTEGER NOT NULL DEFAULT 0,
        monthly_rent  REAL NOT NULL DEFAULT 0,
        status        TEXT NOT NULL DEFAULT 'available'
                      CHECK (status IN ('available','occupied','maintenance','inactive')),
        created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties (owner_id);

      CREATE TABLE IF NOT EXISTS rentals (
        id           TEXT PRIMARY KEY,
        property_id  TEXT NOT NULL REFERENCES properties(id),
        tenant_id    TEXT NOT NULL REFERENCES users(id),
        monthly_rent REAL NOT NULL,
        start_date   TEXT NOT NULL,
        end_date     TEXT,
        status       TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('pending','active','ended')),
        created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      CREATE INDEX IF NOT EXISTS idx_rentals_property ON rentals (property_id);
      CREATE INDEX IF NOT EXISTS idx_rentals_tenant ON rentals (tenant_id);

      CREATE TABLE IF NOT EXISTS rent_payments (
        id           TEXT PRIMARY KEY,
        rental_id    TEXT NOT NULL REFERENCES rentals(id),
        property_id  TEXT NOT NULL REFERENCES properties(id),
        tenant_id    TEXT NOT NULL REFERENCES users(id),
        rent_month   TEXT NOT NULL,           -- 'YYYY-MM'
        amount       REAL NOT NULL,
        due_date     TEXT NOT NULL,           -- 'YYYY-MM-DD'
        payment_date TEXT,                    -- set when paid
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
        owner_id        TEXT NOT NULL REFERENCES users(id),
        tenant_id       TEXT NOT NULL REFERENCES users(id),
        property_id     TEXT NOT NULL REFERENCES properties(id),
        rent_payment_id TEXT REFERENCES rent_payments(id),
        type            TEXT NOT NULL DEFAULT 'rent_payment'
                        CHECK (type IN ('rent_payment','refund')),
        amount          REAL NOT NULL,
        status          TEXT NOT NULL DEFAULT 'completed'
                        CHECK (status IN ('completed','pending','failed','refunded')),
        reference       TEXT,
        created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      CREATE INDEX IF NOT EXISTS idx_transactions_owner ON transactions (owner_id);

      CREATE TABLE IF NOT EXISTS maintenance_requests (
        id          TEXT PRIMARY KEY,
        property_id TEXT NOT NULL REFERENCES properties(id),
        tenant_id   TEXT NOT NULL REFERENCES users(id),
        title       TEXT NOT NULL,
        description TEXT NOT NULL,
        priority    TEXT NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low','medium','high')),
        status      TEXT NOT NULL DEFAULT 'submitted'
                    CHECK (status IN ('submitted','in_progress','resolved')),
        created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      CREATE INDEX IF NOT EXISTS idx_maintenance_property ON maintenance_requests (property_id);
=======
    id: '002_tenant_portal_entities',
    up: `
      ALTER TABLE users ADD COLUMN phone TEXT;

      CREATE TABLE IF NOT EXISTS properties (
        id            TEXT PRIMARY KEY,
        owner_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name          TEXT NOT NULL,
        location      TEXT NOT NULL,
        property_type TEXT NOT NULL,
        description   TEXT NOT NULL DEFAULT '',
        bedrooms      INTEGER NOT NULL DEFAULT 0,
        bathrooms     INTEGER NOT NULL DEFAULT 0,
        rent          REAL NOT NULL DEFAULT 0,
        amenities     TEXT NOT NULL DEFAULT '[]',
        image_url     TEXT,
        status        TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'unavailable')),
        created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );

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
        unit_id      TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
        owner_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        monthly_rent REAL NOT NULL,
        start_date   TEXT NOT NULL,
        end_date     TEXT,
        status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
        created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id           TEXT PRIMARY KEY,
        rental_id    TEXT NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
        tenant_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rent_month   TEXT NOT NULL,
        amount       REAL NOT NULL,
        payment_date TEXT,
        status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue')),
        created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );

      CREATE TABLE IF NOT EXISTS maintenance_requests (
        id             TEXT PRIMARY KEY,
        tenant_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        property_id    TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        unit_id        TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
        category       TEXT NOT NULL CHECK (category IN ('Plumbing', 'Electrical', 'Air Conditioning', 'Appliance', 'Structural', 'Cleaning', 'Security', 'Other')),
        title          TEXT NOT NULL,
        description    TEXT NOT NULL,
        priority       TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
        status         TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_progress', 'resolved', 'rejected')),
        owner_response TEXT,
        created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );

      CREATE INDEX IF NOT EXISTS idx_units_property ON units (property_id);
      CREATE INDEX IF NOT EXISTS idx_rental_requests_tenant ON rental_requests (tenant_id, status);
      CREATE INDEX IF NOT EXISTS idx_rentals_tenant ON rentals (tenant_id, status);
      CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON transactions (tenant_id, rent_month);
      CREATE INDEX IF NOT EXISTS idx_maintenance_tenant ON maintenance_requests (tenant_id, status);
>>>>>>> 923d021c23ead306b3ac70d9a2ca64035bd3d424
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
