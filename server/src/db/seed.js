/**
 * Demo seed for the Tenant Portal phase.
 * Usage: npm run seed (from /server)
 *
 * Creates a demo owner, two tenants, three properties with units, an active
 * rental (with rent transactions and maintenance requests) for the primary
 * demo tenant, and a pending rental request for the second tenant — useful
 * for verifying per-tenant data isolation.
 * Skips seeding when properties already exist.
 */
import 'dotenv/config';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from './database.js';

const uuid = () => crypto.randomUUID();
const PASSWORD = 'password123';

const isoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ym = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const shiftMonth = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const stamp = (d) => new Date(d).toISOString();

function svgImage(c1, c2) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='400' viewBox='0 0 640 400'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs><rect width='640' height='400' fill='url(#g)'/><circle cx='565' cy='55' r='150' fill='rgba(255,255,255,0.16)'/><g fill='none' stroke='rgba(255,255,255,0.95)' stroke-width='9' stroke-linecap='round' stroke-linejoin='round' transform='translate(280 158)'><path d='M0 62 V14 L42 -18 L84 14 V62 Z'/><path d='M28 62 V34 H56 V62'/></g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const hash = bcrypt.hashSync(PASSWORD, 10);

/* ---------- Users (idempotent per email) ---------- */
const insertUser = db.prepare(
  'INSERT INTO users (id, name, email, password, role, phone, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

function ensureUser(email, name, role, phone) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return existing.id;
  const id = uuid();
  insertUser.run(id, name, email, hash, role, phone, 'active');
  return id;
}

ensureUser('admin@example.com', 'System Admin', 'admin', '+92 300 0000001');
const ownerId = ensureUser('owner@example.com', 'Ahmed Raza', 'property_owner', '+92 321 4567890');
const tenantAId = ensureUser('tenant@example.com', 'Ayesha Khan', 'tenant', '+92 300 1234567');
const tenantBId = ensureUser('tenant2@example.com', 'Bilal Ahmed', 'tenant', '+92 345 9876543');

function printDemoAccounts() {
  console.log('[seed] Demo accounts (password: password123):');
  console.log('  admin          → admin@example.com');
  console.log('  tenant         → tenant@example.com');
  console.log('  tenant (2nd)   → tenant2@example.com');
  console.log('  property owner → owner@example.com');
}

const propertyCount = db.prepare('SELECT COUNT(*) AS c FROM properties').get().c;
if (propertyCount > 0) {
  console.log('[seed] properties already exist — property/data seed skipped (demo users ensured).');
  printDemoAccounts();
  process.exit(0);
}

console.log('[seed] seeding demo data…');

const now = new Date();
const prevMonth = shiftMonth(now, -1);
const nextMonth = shiftMonth(now, 1);

/* ---------- Properties + units ---------- */
const insertProperty = db.prepare(`
  INSERT INTO properties (id, owner_id, name, location, property_type, description, bedrooms, bathrooms, rent, amenities, image_url, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertUnit = db.prepare(`
  INSERT INTO units (id, property_id, unit_number, bedrooms, bathrooms, rent, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

function addProperty(p) {
  const propertyId = uuid();
  const unitIds = {};
  const createdAt = stamp(addDays(now, -30));
  insertProperty.run(
    propertyId, ownerId, p.name, p.location, p.type, p.description,
    p.bedrooms, p.bathrooms, p.rent, JSON.stringify(p.amenities), p.imageUrl, 'available',
    createdAt, createdAt
  );
  for (const u of p.units) {
    const unitId = uuid();
    unitIds[u.unitNumber] = unitId;
    insertUnit.run(unitId, propertyId, u.unitNumber, u.bedrooms, u.bathrooms, u.rent, u.status, createdAt, createdAt);
  }
  return { id: propertyId, unitIds };
}

const ocean = addProperty({
  name: 'Ocean View Apartments',
  type: 'Apartment',
  location: 'Clifton Block 4, Karachi',
  description:
    'Modern sea-facing apartments in the heart of Clifton. Wide balconies, cross ventilation and a quiet, well-maintained building a short walk from the shoreline.',
  bedrooms: 2,
  bathrooms: 2,
  rent: 45000,
  amenities: ['Sea View', 'Elevator', 'Backup Power', 'Secure Parking', '24/7 Security'],
  imageUrl: svgImage('#cfe3d4', '#9ec3ab'),
  units: [
    { unitNumber: '203', bedrooms: 2, bathrooms: 2, rent: 45000, status: 'available' },
    { unitNumber: '204', bedrooms: 2, bathrooms: 2, rent: 45000, status: 'occupied' },
    { unitNumber: '205', bedrooms: 3, bathrooms: 2, rent: 52000, status: 'available' },
  ],
});

const gulberg = addProperty({
  name: 'Gulberg Family House',
  type: 'House',
  location: 'Gulberg III, Lahore',
  description:
    'Spacious independent family house on a quiet street in Gulberg. Large lawn, covered garage and a separate servant quarter, close to markets and schools.',
  bedrooms: 4,
  bathrooms: 3,
  rent: 85000,
  amenities: ['Front Lawn', 'Garage', 'Servant Quarter', 'Backup Power'],
  imageUrl: svgImage('#e9e2d4', '#cbbd97'),
  units: [
    { unitNumber: 'Main House', bedrooms: 4, bathrooms: 3, rent: 85000, status: 'available' },
  ],
});

const green = addProperty({
  name: 'Green Residency',
  type: 'Studio',
  location: 'DHA Phase 6, Karachi',
  description:
    'Compact, fully furnished studios ideal for professionals. High-speed internet, rooftop terrace and daily security patrols included in the rent.',
  bedrooms: 1,
  bathrooms: 1,
  rent: 28000,
  amenities: ['Furnished', 'High-Speed Wi-Fi', 'Rooftop Terrace', 'Security'],
  imageUrl: svgImage('#dfe6dd', '#a9c4b2'),
  units: [
    { unitNumber: '501', bedrooms: 1, bathrooms: 1, rent: 28000, status: 'occupied' },
    { unitNumber: '502', bedrooms: 1, bathrooms: 1, rent: 30000, status: 'available' },
  ],
});

/* ---------- Active rental + transactions for tenant A ---------- */
const insertRental = db.prepare(`
  INSERT INTO rentals (id, tenant_id, property_id, unit_id, owner_id, monthly_rent, start_date, end_date, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const rentalId = uuid();
const startDate = isoDate(prevMonth); // 1st of last month
const endDate = isoDate(addDays(shiftMonth(now, 11), -1)); // +12 months - 1 day
insertRental.run(
  rentalId, tenantAId, ocean.id, ocean.unitIds['204'], ownerId, 45000,
  startDate, endDate, 'active', stamp(addDays(now, -35)), stamp(addDays(now, -35))
);

const insertTransaction = db.prepare(`
  INSERT INTO transactions (id, rental_id, tenant_id, rent_month, amount, payment_date, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
// Last month's rent — paid on the 5th.
insertTransaction.run(
  uuid(), rentalId, tenantAId, ym(prevMonth), 45000,
  isoDate(new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 5)), 'paid',
  stamp(prevMonth), stamp(new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 5))
);
// Current month's rent — pending.
insertTransaction.run(uuid(), rentalId, tenantAId, ym(now), 45000, null, 'pending', stamp(now), stamp(now));

/* ---------- Maintenance requests for tenant A ---------- */
const insertMaintenance = db.prepare(`
  INSERT INTO maintenance_requests (id, tenant_id, property_id, unit_id, category, title, description, priority, status, owner_response, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

insertMaintenance.run(
  uuid(), tenantAId, ocean.id, ocean.unitIds['204'],
  'Plumbing', 'Kitchen tap is leaking',
  'The cold water tap under the kitchen sink has been dripping constantly for two days. The cabinet below is starting to get wet.',
  'high', 'resolved',
  'Replaced the worn washer and sealed the pipe joint. Please check the water flow and let me know if it still drips.',
  stamp(addDays(now, -5)), stamp(addDays(now, -3))
);
insertMaintenance.run(
  uuid(), tenantAId, ocean.id, ocean.unitIds['204'],
  'Electrical', 'Parking gate light flickering',
  'The light next to the parking gate keeps flickering at night, which makes it hard to see the gate lock.',
  'low', 'in_progress', null,
  stamp(addDays(now, -4)), stamp(addDays(now, -2))
);
insertMaintenance.run(
  uuid(), tenantAId, ocean.id, ocean.unitIds['204'],
  'Air Conditioning', 'Bedroom AC making rattling noise',
  'The bedroom AC started making a loud rattling noise when it turns on. Cooling still works but the noise is getting worse.',
  'medium', 'submitted', null,
  stamp(addDays(now, -1)), stamp(addDays(now, -1))
);

/* ---------- Pending rental request for tenant B (isolation testing) ---------- */
const insertRentalRequest = db.prepare(`
  INSERT INTO rental_requests (id, tenant_id, property_id, unit_id, monthly_rent, move_in_date, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
insertRentalRequest.run(
  uuid(), tenantBId, green.id, green.unitIds['502'], 30000, isoDate(nextMonth),
  'pending', stamp(addDays(now, -2)), stamp(addDays(now, -2))
);

console.log('[seed] done.');
printDemoAccounts();

