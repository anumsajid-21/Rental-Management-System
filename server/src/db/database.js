import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

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
        status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deactivated')),
        created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);
    `,
  },
  {
    id: '002_create_properties',
    up: `
      CREATE TABLE IF NOT EXISTS properties (
        id          TEXT PRIMARY KEY,
        owner_id    TEXT NOT NULL,
        name        TEXT NOT NULL,
        address     TEXT NOT NULL,
        city        TEXT NOT NULL,
        property_type TEXT NOT NULL CHECK (property_type IN ('apartment', 'house', 'commercial', 'studio')),
        status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
        created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties (owner_id);
      CREATE INDEX IF NOT EXISTS idx_properties_city ON properties (city);
      CREATE INDEX IF NOT EXISTS idx_properties_status ON properties (status);
    `,
  },
  {
    id: '003_create_units',
    up: `
      CREATE TABLE IF NOT EXISTS units (
        id          TEXT PRIMARY KEY,
        property_id TEXT NOT NULL,
        unit_number TEXT NOT NULL,
        bedrooms    INTEGER NOT NULL DEFAULT 1,
        bathrooms   INTEGER NOT NULL DEFAULT 1,
        square_feet INTEGER,
        rent_amount REAL NOT NULL,
        status      TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
        created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_units_property ON units (property_id);
      CREATE INDEX IF NOT EXISTS idx_units_status ON units (status);
    `,
  },
  {
    id: '004_create_rental_requests',
    up: `
      CREATE TABLE IF NOT EXISTS rental_requests (
        id          TEXT PRIMARY KEY,
        tenant_id   TEXT NOT NULL,
        property_id TEXT NOT NULL,
        unit_id     TEXT NOT NULL,
        status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        message     TEXT,
        created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
        FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_rental_requests_tenant ON rental_requests (tenant_id);
      CREATE INDEX IF NOT EXISTS idx_rental_requests_property ON rental_requests (property_id);
      CREATE INDEX IF NOT EXISTS idx_rental_requests_status ON rental_requests (status);
    `,
  },
  {
    id: '005_create_rentals',
    up: `
      CREATE TABLE IF NOT EXISTS rentals (
        id          TEXT PRIMARY KEY,
        tenant_id   TEXT NOT NULL,
        property_id TEXT NOT NULL,
        unit_id     TEXT NOT NULL,
        rent_amount REAL NOT NULL,
        start_date  TEXT NOT NULL,
        end_date    TEXT,
        status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled')),
        created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
        FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_rentals_tenant ON rentals (tenant_id);
      CREATE INDEX IF NOT EXISTS idx_rentals_property ON rentals (property_id);
      CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals (status);
    `,
  },
  {
    id: '006_create_transactions',
    up: `
      CREATE TABLE IF NOT EXISTS transactions (
        id          TEXT PRIMARY KEY,
        rental_id   TEXT NOT NULL,
        tenant_id   TEXT NOT NULL,
        owner_id    TEXT NOT NULL,
        amount      REAL NOT NULL,
        payment_month TEXT NOT NULL,
        payment_date TEXT,
        status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'failed')),
        payment_method TEXT,
        created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        FOREIGN KEY (rental_id) REFERENCES rentals(id) ON DELETE CASCADE,
        FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_transactions_rental ON transactions (rental_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON transactions (tenant_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_owner ON transactions (owner_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions (status);
      CREATE INDEX IF NOT EXISTS idx_transactions_payment_month ON transactions (payment_month);
    `,
  },
  {
    id: '007_create_maintenance_requests',
    up: `
      CREATE TABLE IF NOT EXISTS maintenance_requests (
        id          TEXT PRIMARY KEY,
        tenant_id   TEXT NOT NULL,
        property_id TEXT NOT NULL,
        unit_id     TEXT NOT NULL,
        title       TEXT NOT NULL,
        description TEXT,
        priority    TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        status      TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_progress', 'resolved', 'cancelled')),
        created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
        FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_maintenance_tenant ON maintenance_requests (tenant_id);
      CREATE INDEX IF NOT EXISTS idx_maintenance_property ON maintenance_requests (property_id);
      CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_requests (status);
      CREATE INDEX IF NOT EXISTS idx_maintenance_priority ON maintenance_requests (priority);
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

  // Ensure default seed admin account exists
  seedDefaultAdminAccount();
}

function seedDefaultAdminAccount() {
  const adminEmail = 'admin@rental.com';
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  
  if (!existing) {
    const adminId = crypto.randomUUID();
    const hash = bcrypt.hashSync('admin123', 10);
    
    db.transaction(() => {
      // 1. Seed Admin Account
      db.prepare(`
        INSERT INTO users (id, name, email, password, role, status)
        VALUES (?, 'System Admin', ?, ?, 'admin', 'active')
      `).run(adminId, adminEmail, hash);

      // 2. Seed Property Owner
      const ownerId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO users (id, name, email, password, role, status)
        VALUES (?, 'Sarah Jenkins', 'owner@rental.com', ?, 'property_owner', 'active')
      `).run(ownerId, hash);

      // 3. Seed Tenants
      const tenantId1 = crypto.randomUUID();
      db.prepare(`
        INSERT INTO users (id, name, email, password, role, status)
        VALUES (?, 'Alex Johnson', 'tenant@rental.com', ?, 'tenant', 'active')
      `).run(tenantId1, hash);

      const tenantId2 = crypto.randomUUID();
      db.prepare(`
        INSERT INTO users (id, name, email, password, role, status)
        VALUES (?, 'Michael Chen', 'mchen@rental.com', ?, 'tenant', 'active')
      `).run(tenantId2, hash);

      // 4. Seed Properties & Units
      const propId1 = crypto.randomUUID();
      db.prepare(`
        INSERT INTO properties (id, owner_id, name, address, city, property_type, status)
        VALUES (?, ?, 'Green Valley Apartments', '100 Main St', 'Austin', 'apartment', 'active')
      `).run(propId1, ownerId);

      const unitId1 = crypto.randomUUID();
      db.prepare(`
        INSERT INTO units (id, property_id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, status)
        VALUES (?, ?, '101', 2, 1, 850, 1450.00, 'occupied')
      `).run(unitId1, propId1);

      const unitId2 = crypto.randomUUID();
      db.prepare(`
        INSERT INTO units (id, property_id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, status)
        VALUES (?, ?, '102', 1, 1, 620, 1100.00, 'available')
      `).run(unitId2, propId1);

      // 5. Seed Active Rental
      const rentalId1 = crypto.randomUUID();
      db.prepare(`
        INSERT INTO rentals (id, tenant_id, property_id, unit_id, rent_amount, start_date, status)
        VALUES (?, ?, ?, ?, 1450.00, '2026-01-01', 'active')
      `).run(rentalId1, tenantId1, propId1, unitId1);

      // 6. Seed Transactions
      const txId1 = crypto.randomUUID();
      db.prepare(`
        INSERT INTO transactions (id, rental_id, tenant_id, owner_id, amount, payment_month, payment_date, status, payment_method)
        VALUES (?, ?, ?, ?, 1450.00, '2026-08', '2026-08-01', 'paid', 'credit_card')
      `).run(txId1, rentalId1, tenantId1, ownerId);

      const txId2 = crypto.randomUUID();
      db.prepare(`
        INSERT INTO transactions (id, rental_id, tenant_id, owner_id, amount, payment_month, payment_date, status, payment_method)
        VALUES (?, ?, ?, ?, 1450.00, '2026-09', '2026-09-01', 'paid', 'bank_transfer')
      `).run(txId2, rentalId1, tenantId1, ownerId);

      // 7. Seed Maintenance Request
      const maintId1 = crypto.randomUUID();
      db.prepare(`
        INSERT INTO maintenance_requests (id, tenant_id, property_id, unit_id, title, description, priority, status)
        VALUES (?, ?, ?, ?, 'AC Cooling Issue', 'The air conditioner is not cooling properly in the master bedroom.', 'high', 'in_progress')
      `).run(maintId1, tenantId1, propId1, unitId1);

      console.log('[db] seeded default admin and demo dataset successfully.');
    })();
  }
}
