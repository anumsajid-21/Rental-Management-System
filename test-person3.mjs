/**
 * Person 3 end-to-end test script (run: node test-person3.mjs with server on :5000).
 * Uses the real API + real database. Simulates Person 2 / Person 1 data (rentals,
 * maintenance requests) directly through the DB the same way their modules will.
 */
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(new URL('./server/package.json', import.meta.url));
const BetterSqlite3 = require('better-sqlite3');

const BASE = 'http://localhost:5000';

async function api(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

const assert = (cond, label) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`);
  if (!cond) process.exitCode = 1;
};

const openDb = () => new BetterSqlite3('./server/data/rental.db');

const uniq = Date.now();
const ownerA = { name: 'Owner A', email: `ownera${uniq}@t.com`, password: 'password123', role: 'property_owner' };
const ownerB = { name: 'Owner B', email: `ownerb${uniq}@t.com`, password: 'password123', role: 'property_owner' };
const tenant1 = { name: 'Tenant One', email: `t1${uniq}@t.com`, password: 'password123', role: 'tenant' };
const tenant2 = { name: 'Tenant Two', email: `t2${uniq}@t.com`, password: 'password123', role: 'tenant' };

const t = await api('POST', '/api/auth/register', ownerA);
assert(t.status === 201, 'register owner A');
const tokenA = t.data.token;
const idA = t.data.user.id;
const tB = await api('POST', '/api/auth/register', ownerB);
const tokenB = tB.data.token;
const idB = tB.data.user.id;
const tt1 = await api('POST', '/api/auth/register', tenant1);
const tt2 = await api('POST', '/api/auth/register', tenant2);
const idT1 = tt1.data.user.id, idT2 = tt2.data.user.id;

// Role guard
const noAuth = await api('GET', '/api/owner/rent/overview');
assert(noAuth.status === 401, 'unauthenticated request rejected');
const tenantBlocked = await api('GET', '/api/owner/rent/overview', null, tt1.data.token);
assert(tenantBlocked.status === 403, 'tenant blocked from owner routes');

// CSV import: 2 valid rows, 2 invalid
const csv = [
  'Property Name,Address,City,Property Type,Description,Bedrooms,Bathrooms,Monthly Rent,Status',
  'Villa Alpha,1 Main St,Lahore,house,Nice,3,2,100000,available',
  'Flat Beta,2 Side St,Karachi,apartment,Cozy,2,1,50000,occupied',
  ',3 Nowhere St,Lahore,house,,3,2,90000,available',
  'Bad Rent Flat,4 Side St,Karachi,apartment,,1,1,not_a_number,available',
].join('\n');
const prev = await api('POST', '/api/owner/import/preview', { csv }, tokenA);
assert(prev.status === 200 && prev.data.preview.totalRows === 4 && prev.data.preview.validRows === 2 && prev.data.preview.errorRows === 2,
  `CSV preview validation (${prev.data.preview?.errorRows} error rows detected)`);
const emptyConfirm = await api('POST', '/api/owner/import/confirm', { rows: [] }, tokenA);
assert(emptyConfirm.status === 400, 'empty confirm rejected');
const conf = await api('POST', '/api/owner/import/confirm', { rows: prev.data.preview.valid.map((v) => v.data) }, tokenA);
assert(conf.status === 201 && conf.data.importedCount === 2, 'CSV confirmed import inserts 2 properties');
const dup = await api('POST', '/api/owner/import/preview', { csv }, tokenA);
assert(dup.data.preview.validRows === 0, 'duplicate detection on second import attempt');

// Simulate Person 1/2: tenant rental + maintenance request for owner A's Flat Beta,
// inserted into the shared DB exactly the way their modules will.
const db = openDb();
const flat = db.prepare("SELECT id FROM properties WHERE owner_id = ? AND name = 'Flat Beta'").get(idA);
const villa = db.prepare("SELECT id FROM properties WHERE owner_id = ? AND name = 'Villa Alpha'").get(idA);
assert(Boolean(flat && villa), 'imported properties exist and belong to owner A');
const wrongOwner = db.prepare('SELECT COUNT(*) c FROM properties WHERE owner_id = ?').get(idB);
assert(wrongOwner.c === 0, 'owner B owns no imported properties');
db.prepare("INSERT INTO rentals (id, property_id, tenant_id, monthly_rent, start_date, status) VALUES (?,?,?,?,?,'active')")
  .run(crypto.randomUUID(), flat.id, idT1, 50000, '2026-09-01');
db.prepare("INSERT INTO rentals (id, property_id, tenant_id, monthly_rent, start_date, status) VALUES (?,?,?,?,?,'pending')")
  .run(crypto.randomUUID(), villa.id, idT2, 100000, '2026-09-15');
db.prepare("INSERT INTO maintenance_requests (id, property_id, tenant_id, title, description, priority) VALUES (?,?,?,?,?,?)")
  .run(crypto.randomUUID(), flat.id, idT1, 'Leaking tap', 'Kitchen tap is leaking badly', 'high');
db.close();

// Rent: generate + overview + record payment
const gen = await api('POST', '/api/owner/rent/generate', null, tokenA);
assert(gen.status === 201 && gen.data.created === 1, `rent generated for active rental only (${gen.data?.created})`);
const recs = await api('GET', '/api/owner/rent/records', null, tokenA);
assert(recs.data.records.length === 1 && recs.data.records[0].tenant_name === 'Tenant One', 'rent records owner-scoped');
const ov = await api('GET', '/api/owner/rent/overview', null, tokenA);
assert(ov.data.overview.totalExpected === 50000 && ov.data.overview.pending + ov.data.overview.overdue === 50000,
  'overview totals correct (unpaid rent classified as pending or overdue)');
const pay = await api('POST', `/api/owner/rent/records/${recs.data.records[0].id}/payment`, { method: 'cash' }, tokenA);
assert(pay.status === 200 && pay.data.rent.status === 'paid', 'payment recorded');
const payAgain = await api('POST', `/api/owner/rent/records/${recs.data.records[0].id}/payment`, { method: 'cash' }, tokenA);
assert(payAgain.status === 400, 'double payment rejected');
const tx = await api('GET', '/api/owner/transactions', null, tokenA);
assert(tx.data.transactions.length === 1 && tx.data.transactions[0].amount === 50000, 'payment created transaction');
const ov2 = await api('GET', '/api/owner/rent/overview', null, tokenA);
assert(ov2.data.overview.collected === 50000 && ov2.data.overview.pending === 0, 'overview updated after payment');
const txB = await api('GET', '/api/owner/transactions', null, tokenB);
assert(txB.data.transactions.length === 0, 'owner B sees no transactions');

// Maintenance flow
const maint = await api('GET', '/api/owner/maintenance', null, tokenA);
assert(maint.data.requests.length === 1 && maint.data.requests[0].title === 'Leaking tap', 'owner A sees tenant request');
const maintB = await api('GET', '/api/owner/maintenance', null, tokenB);
assert(maintB.data.requests.length === 0, 'owner B sees no maintenance requests');
const mr = maint.data.requests[0];
const bad = await api('PATCH', `/api/owner/maintenance/${mr.id}/status`, { status: 'resolved' }, tokenA);
assert(bad.status === 400, 'invalid transition submitted→resolved rejected');
const ok1 = await api('PATCH', `/api/owner/maintenance/${mr.id}/status`, { status: 'in_progress' }, tokenA);
assert(ok1.status === 200, 'submitted→in_progress allowed');
const ok2 = await api('PATCH', `/api/owner/maintenance/${mr.id}/status`, { status: 'resolved' }, tokenA);
assert(ok2.status === 200 && ok2.data.request.status === 'resolved', 'in_progress→resolved allowed');
const dbr = openDb();
const stored = dbr.prepare('SELECT status FROM maintenance_requests WHERE id = ?').get(mr.id).status;
dbr.close();
assert(stored === 'resolved', 'status persisted in database (tenant portal will see it)');

// Reports owner-scoped
const rep = await api('GET', '/api/owner/reports', null, tokenA);
assert(rep.data.report.properties.total === 2 && rep.data.report.properties.occupied === 1, 'report properties correct');
assert(rep.data.report.revenue.paidRent === 50000, 'report revenue matches DB');
assert(rep.data.report.maintenance.resolved === 1, 'report maintenance counts');
assert(rep.data.report.tenants.totalTenants === 2 && rep.data.report.tenants.activeTenants === 1 && rep.data.report.tenants.pendingRequests === 1, 'report tenant counts');
const repB = await api('GET', '/api/owner/reports', null, tokenB);
assert(repB.data.report.properties.total === 0 && repB.data.report.revenue.totalRent === 0, 'owner B report empty (no leakage)');

// Cross-owner access to individual records
const detailB = await api('GET', `/api/owner/rent/records/${recs.data.records[0].id}`, null, tokenB);
assert(detailB.status === 404, 'owner B cannot read owner A rent record');
const txDetailB = await api('GET', `/api/owner/transactions/${tx.data.transactions[0].id}`, null, tokenB);
assert(txDetailB.status === 404, 'owner B cannot read owner A transaction');

console.log('\nDone.');
