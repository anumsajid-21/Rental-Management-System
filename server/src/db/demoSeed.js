/**
 * DEMO / MOCK DATA GENERATOR — development & testing only.
 * Populates the REAL tables (properties, rentals, rent_payments,
 * transactions, maintenance_requests) with realistic sample data owned by
 * the given owner id. Separate from production logic: it is only invoked
 * from the dev seed script and the explicit "Load demo data" endpoint.
 *
 * Creates demo tenant accounts (…tenant@rms.dev) to own the rentals.
 */
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from './database.js';

const PASSWORD = 'password123';
const SALT = bcrypt.hashSync(PASSWORD, 10);
const uuid = () => crypto.randomUUID();

const monthsAgo = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
};
const iso = (d) => d.toISOString().slice(0, 10);
const monthKey = (d) => d.toISOString().slice(0, 7);

const findTenantByEmail = db.prepare('SELECT id FROM users WHERE email = ?');
const insertUser = db.prepare(
  'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)'
);
const countPropsStmt = db.prepare('SELECT COUNT(*) AS n FROM properties WHERE owner_id = ?');
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
   VALUES (?, ?, ?, ?, ?, 'rent_payment', ?, 'completed', ?, ?)`
);
const insertMaintenance = db.prepare(
  `INSERT INTO maintenance_requests (id, property_id, tenant_id, title, description, priority, status, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

export const demoData = {
  hasData: (ownerId) => countPropsStmt.get(ownerId).n > 0,
};

const PROPERTIES = [
  ['Green View Apartments', '12-B Gulberg III', 'Lahore', 'apartment', 'Spacious 2-bed near MM Alam Road', 2, 2, 45000, 'occupied'],
  ['Sunny Villa', 'Block D DHA Phase 6', 'Karachi', 'house', 'Family house with garden and garage', 4, 3, 120000, 'occupied'],
  ['City Studio Loft', 'Nazimabad Block 2', 'Karachi', 'studio', 'Compact studio for young professionals', 1, 1, 28000, 'available'],
  ['Iqbal Residency', 'F-11/3', 'Islamabad', 'apartment', 'Modern 3-bed with view of Margalla Hills', 3, 2, 85000, 'occupied'],
  ['The Corner Shop', 'Liberty Market', 'Lahore', 'shop', 'Prime retail space, high footfall', 0, 1, 95000, 'occupied'],
  ['Executive Office Suite', 'Blue Area', 'Islamabad', 'office', 'Furnished office floor with parking', 0, 2, 150000, 'available'],
  ['Lake View House', 'Sector E-7', 'Islamabad', 'house', 'Colonial style house near the lake', 5, 4, 210000, 'maintenance'],
  ['Old City Flat', 'Walled City, Dehli Gate', 'Lahore', 'apartment', 'Renovated 1-bed in heritage building', 1, 1, 22000, 'inactive'],
];

const TENANTS = [
  ['Ali Raza', 'ali.tenant@rms.dev'],
  ['Sara Khan', 'sara.tenant@rms.dev'],
  ['Hamza Iqbal', 'hamza.tenant@rms.dev'],
];

const MAINTENANCE = [
  [0, 0, 'Leaking kitchen tap', 'Water drips continuously under the sink; cabinet is getting wet.', 'medium', 'submitted'],
  [1, 1, 'AC not cooling', 'Bedroom AC runs but blows warm air. Probably needs gas refill.', 'high', 'in_progress'],
  [3, 2, 'Broken window latch', 'Window in the lounge does not lock properly.', 'low', 'resolved'],
  [4, 1, 'Shop shutter jammed', 'Front shutter sticks halfway; needs lubrication or repair.', 'medium', 'in_progress'],
  [6, 0, 'Garden water pump noisy', 'Pump makes loud grinding noise when switched on.', 'high', 'submitted'],
  [0, 0, 'Repaint corridor', 'Corridor walls are scuffed after move-ins.', 'low', 'resolved'],
];

Object.assign(demoData, {
  /**
   * Seed a full demo portfolio for the given owner.
   * @returns {{ properties, tenants, transactions, maintenance }}
   */
  seedForOwner(ownerId) {
    let tenants;
    const run = db.transaction(() => {
      // --- demo tenant accounts (shared, reused if they already exist) ---
      tenants = TENANTS.map(([name, email]) => {
        let id = findTenantByEmail.get(email)?.id;
        if (!id) {
          id = uuid();
          insertUser.run(id, name, email, SALT, 'tenant');
        }
        return { id, name };
      });

      // --- properties ---
      const props = PROPERTIES.map(([name, address, city, type, desc, beds, baths, rent, status], i) => {
        const id = uuid();
        insertProperty.run(
          id, ownerId, name, address, city, type, desc, beds, baths, rent, status,
          monthsAgo(6 - i).toISOString()
        );
        return { id, rent };
      });

      // --- rentals: 4 active + 1 pending + 1 ended ---
      const rentals = [
        { p: 0, t: 0, status: 'active', start: 6 },
        { p: 1, t: 1, status: 'active', start: 5 },
        { p: 3, t: 2, status: 'active', start: 4 },
        { p: 4, t: 1, status: 'active', start: 3 },
        { p: 6, t: 0, status: 'pending', start: 0 },
        { p: 2, t: 2, status: 'ended', start: 6, end: 1 },
      ].map((r) => {
        const id = uuid();
        const start = monthsAgo(r.start);
        insertRental.run(
          id, props[r.p].id, tenants[r.t].id, props[r.p].rent,
          iso(start), r.end !== undefined ? iso(monthsAgo(r.end)) : null,
          r.status, start.toISOString()
        );
        return { ...r, id };
      });

      // --- rent payments (last 6 months) + matching transactions ---
      let txCount = 0;
      for (const rental of rentals.filter((r) => r.status === 'active')) {
        for (let m = 5; m >= 0; m -= 1) {
          const monthDate = monthsAgo(m);
          const month = monthKey(monthDate);
          const due = iso(new Date(monthDate.getFullYear(), monthDate.getMonth(), 5));
          const paid = m > 1 || ((props[rental.p].rent + m) % 3 !== 0);
          const overdue = !paid && m > 0;
          const id = uuid();
          insertRentPayment.run(
            id, rental.id, props[rental.p].id, tenants[rental.t].id,
            month, props[rental.p].rent, due,
            paid ? iso(new Date(monthDate.getFullYear(), monthDate.getMonth(), 6 + (props[rental.p].rent % 20))) : null,
            paid ? ['bank_transfer', 'cash', 'easypaisa'][(props[rental.p].rent + m) % 3] : null,
            null,
            paid ? 'paid' : overdue ? 'overdue' : 'pending',
            monthDate.toISOString()
          );
          if (paid) {
            txCount += 1;
            insertTransaction.run(
              uuid(), ownerId, tenants[rental.t].id, props[rental.p].id, id,
              props[rental.p].rent, `TRX-${month}-${txCount}`, monthDate.toISOString()
            );
          }
        }
      }

      // --- maintenance requests ---
      for (const [pi, ti, title, desc, priority, status] of MAINTENANCE) {
        const created = monthsAgo((priority.length + title.length) % 5);
        insertMaintenance.run(
          uuid(), props[pi].id, tenants[ti].id, title, desc,
          priority, status, created.toISOString(), created.toISOString()
        );
      }

      return { txCount };
    });

    const { txCount } = run();
    return {
      properties: PROPERTIES.length,
      tenants: tenants.length,
      transactions: txCount,
      maintenance: MAINTENANCE.length,
    };
  },
});

