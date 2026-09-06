/**
 * DEVELOPMENT / TEST SEED DATA — completely separate from production logic.
 *
 *   npm run seed:dev        (from the server folder)
 *
 * Behaviour:
 *  - NEVER resets or replaces the existing database; it only ADDS rows.
 *  - Idempotent: if the seed owner account already exists, the whole seed is
 *    skipped.
 *  - Uses the same real tables the app uses: users, properties, rentals,
 *    rent_payments, transactions, maintenance_requests.
 *
 * Demo login created (if not already present):
 *    owner:   owner@rms.dev   / password: password123
 *    tenants: ali@rms.dev, sara@rms.dev, hamza@rms.dev  / password: password123
 */
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db, runMigrations } from './database.js';

runMigrations();

const PASSWORD = 'password123';
const OWNER_EMAIL = 'owner@rms.dev';

const alreadySeeded = db.prepare('SELECT id FROM users WHERE email = ?').get(OWNER_EMAIL);
if (alreadySeeded) {
  console.log(`[seed:dev] Seed owner ${OWNER_EMAIL} already exists — nothing to do.`);
  console.log('[seed:dev] Login: owner@rms.dev / password123');
  process.exit(0);
}

const SALT = bcrypt.hashSync(PASSWORD, 10);
const uuid = () => crypto.randomUUID();
const monthsAgo = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
};
const iso = (d) => d.toISOString().slice(0, 10);
const monthKey = (d) => d.toISOString().slice(0, 7);

const insertUser = db.prepare(
  'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)'
);
const insertProperty = db.prepare(
  `INSERT INTO properties (id, owner_id, name, address, city, property_type, description, bedrooms, bathrooms, monthly_rent, status, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
const insertRental = db.prepare(
  `INSERT INTO rentals (id, property_id, tenant_id, monthly_rent, start_date, end_date, status, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);
const insertRentPayment = db.prepare(
  `INSERT OR IGNORE INTO rent_payments (id, rental_id, property_id, tenant_id, rent_month, amount, due_date, payment_date, method, notes, status, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
const insertTransaction = db.prepare(
  `INSERT INTO transactions (id, owner_id, tenant_id, property_id, rent_payment_id, type, amount, status, reference, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
const insertMaintenance = db.prepare(
  `INSERT INTO maintenance_requests (id, property_id, tenant_id, title, description, priority, status, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

const seed = db.transaction(() => {
  // --- users ---
  const ownerId = uuid();
  insertUser.run(ownerId, 'Demo Owner', OWNER_EMAIL, SALT, 'property_owner');
  const tenants = [
    ['Ali Raza', 'ali@rms.dev'],
    ['Sara Khan', 'sara@rms.dev'],
    ['Hamza Iqbal', 'hamza@rms.dev'],
  ].map(([name, email]) => {
    const id = uuid();
    insertUser.run(id, name, email, SALT, 'tenant');
    return { id, name };
  });

  // --- properties (8, mixed statuses/types) ---
  const properties = [
    ['Green View Apartments', '12-B Gulberg III', 'Lahore', 'apartment', 'Spacious 2-bed near MM Alam Road', 2, 2, 45000, 'occupied'],
    ['Sunny Villa', 'Block D DHA Phase 6', 'Karachi', 'house', 'Family house with garden and garage', 4, 3, 120000, 'occupied'],
    ['City Studio Loft', 'Nazimabad Block 2', 'Karachi', 'studio', 'Compact studio for young professionals', 1, 1, 28000, 'available'],
    ['Iqbal Residency', 'F-11/3', 'Islamabad', 'apartment', 'Modern 3-bed with view of Margalla Hills', 3, 2, 85000, 'occupied'],
    ['The Corner Shop', 'Liberty Market', 'Lahore', 'shop', 'Prime retail space, high footfall', 0, 1, 95000, 'occupied'],
    ['Executive Office Suite', 'Blue Area', 'Islamabad', 'office', 'Furnished office floor with parking', 0, 2, 150000, 'available'],
    ['Lake View House', 'Sector E-7', 'Islamabad', 'house', 'Colonial style house near the lake', 5, 4, 210000, 'maintenance'],
    ['Old City Flat', 'Walled City, Dehli Gate', 'Lahore', 'apartment', 'Renovated 1-bed in heritage building', 1, 1, 22000, 'inactive'],
  ].map(([name, address, city, type, desc, beds, baths, rent, status], i) => {
    const id = uuid();
    const created = monthsAgo(6 - i);
    insertProperty.run(id, ownerId, name, address, city, type, desc, beds, baths, rent, status, created.toISOString());
    return { id, name, rent, status };
  });

  // --- rentals: 4 active + 1 pending + 1 ended ---
  const rentals = [
    { property: properties[0], tenant: tenants[0], status: 'active', start: monthsAgo(6) },
    { property: properties[1], tenant: tenants[1], status: 'active', start: monthsAgo(5) },
    { property: properties[3], tenant: tenants[2], status: 'active', start: monthsAgo(4) },
    { property: properties[4], tenant: tenants[1], status: 'active', start: monthsAgo(3) },
    { property: properties[6], tenant: tenants[0], status: 'pending', start: monthsAgo(0) },
    { property: properties[2], tenant: tenants[2], status: 'ended', start: monthsAgo(6), end: monthsAgo(1) },
  ].map((r) => {
    const id = uuid();
    insertRental.run(
      id, r.property.id, r.tenant.id, r.property.rent,
      iso(r.start), r.end ? iso(r.end) : null, r.status, r.start.toISOString()
    );
    return { ...r, id };
  });


  // --- rent payments for the last 6 months on each active rental ---
  // Deterministic pattern: older months paid, recent months a paid/overdue mix,
  // so the reports charts show a realistic spread.
  let txCount = 0;
  for (const rental of rentals.filter((r) => r.status === 'active')) {
    for (let m = 5; m >= 0; m -= 1) {
      const monthDate = monthsAgo(m);
      const month = monthKey(monthDate);
      const due = iso(new Date(monthDate.getFullYear(), monthDate.getMonth(), 5));
      const paid = m > 1 || ((rental.property.rent + m) % 3 !== 0);
      const overdue = !paid && m > 0;
      const id = uuid();
      insertRentPayment.run(
        id, rental.id, rental.property.id, rental.tenant.id,
        month, rental.property.rent, due,
        paid ? iso(new Date(monthDate.getFullYear(), monthDate.getMonth(), 6 + (rental.property.rent % 20))) : null,
        paid ? ['bank_transfer', 'cash', 'easypaisa'][(rental.property.rent + m) % 3] : null,
        null,
        paid ? 'paid' : overdue ? 'overdue' : 'pending',
        monthDate.toISOString()
      );
      if (paid) {
        txCount += 1;
        insertTransaction.run(
          uuid(), ownerId, rental.tenant.id, rental.property.id, id,
          'rent_payment', rental.property.rent, 'completed',
          `TRX-${month}-${txCount}`, monthDate.toISOString()
        );
      }
    }
  }

  // --- maintenance requests (mixed status/priority) ---
  const maintenance = [
    [0, tenants[0], 'Leaking kitchen tap', 'Water drips continuously under the sink; cabinet is getting wet.', 'medium', 'submitted'],
    [1, tenants[1], 'AC not cooling', 'Bedroom AC runs but blows warm air. Probably needs gas refill.', 'high', 'in_progress'],
    [3, tenants[2], 'Broken window latch', 'Window in the lounge does not lock properly.', 'low', 'resolved'],
    [4, tenants[1], 'Shop shutter jammed', 'Front shutter sticks halfway; needs lubrication or repair.', 'medium', 'in_progress'],
    [6, tenants[0], 'Garden water pump noisy', 'Pump makes loud grinding noise when switched on.', 'high', 'submitted'],
    [0, tenants[0], 'Repaint corridor', 'Corridor walls are scuffed after last year move-ins.', 'low', 'resolved'],
  ];
  for (const [pi, tenant, title, desc, priority, status] of maintenance) {
    const created = monthsAgo((priority.length + title.length) % 5);
    insertMaintenance.run(
      uuid(), properties[pi].id, tenant.id, title, desc,
      priority, status, created.toISOString(), created.toISOString()
    );
  }

  return { properties: properties.length, tenants: tenants.length, txCount };
});

const result = seed();
console.log(`[seed:dev] Created demo owner, ${result.tenants} tenants, ${result.properties} properties,`);
console.log(`[seed:dev] rentals + 6 months of rent payments, ${result.txCount} transactions, 6 maintenance requests.`);
console.log('[seed:dev] Login: owner@rms.dev / password123');

