import crypto from 'node:crypto';
import { db } from '../db/database.js';

const SELECT_BASE = `
  SELECT rr.*, p.name AS property_name,
         COALESCE(NULLIF(p.city, ''), p.location, p.address) AS property_city,
         COALESCE(NULLIF(p.location, ''), p.address) AS property_location,
         un.unit_number, t.name AS tenant_name, t.email AS tenant_email
  FROM rental_requests rr
  JOIN properties p ON p.id = rr.property_id
  JOIN units un ON un.id = rr.unit_id
  JOIN users t ON t.id = rr.tenant_id
`;

function mapRequest(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    propertyId: row.property_id,
    unitId: row.unit_id,
    monthlyRent: row.monthly_rent,
    rentAmount: row.monthly_rent,
    moveInDate: row.move_in_date,
    status: row.status,
    propertyName: row.property_name,
    propertyLocation: row.property_location,
    propertyCity: row.property_city,
    unitNumber: row.unit_number,
    tenantName: row.tenant_name,
    tenantEmail: row.tenant_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const insertStmt = db.prepare(`
  INSERT INTO rental_requests (id, tenant_id, property_id, unit_id, monthly_rent, move_in_date)
  VALUES (?, ?, ?, ?, ?, ?)
`);

export const rentalRequestModel = {
  create({ tenantId, propertyId, unitId, monthlyRent, moveInDate }) {
    const id = crypto.randomUUID();
    insertStmt.run(id, tenantId, propertyId, unitId, monthlyRent, moveInDate);
    return this.findById(id);
  },

  findById(id) {
    return mapRequest(db.prepare(`${SELECT_BASE} WHERE rr.id = ?`).get(id));
  },

  /** Tenant-scoped lookup: a tenant can only ever read their own request. */
  findByIdForTenant(id, tenantId) {
    return mapRequest(
      db.prepare(`${SELECT_BASE} WHERE rr.id = ? AND rr.tenant_id = ?`).get(id, tenantId)
    );
  },

  listByTenant(tenantId) {
    return db
      .prepare(`${SELECT_BASE} WHERE rr.tenant_id = ? ORDER BY rr.created_at DESC`)
      .all(tenantId)
      .map(mapRequest);
  },

  hasPendingForUnit(tenantId, unitId) {
    return Boolean(
      db
        .prepare(`SELECT 1 FROM rental_requests WHERE tenant_id = ? AND unit_id = ? AND status = 'pending'`)
        .get(tenantId, unitId)
    );
  },

  /** Only valid on pending requests — the statement guards the status. */
  cancel(id) {
    db.prepare(
      `UPDATE rental_requests SET status = 'cancelled', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE id = ? AND status = 'pending'`
    ).run(id);
  },

  list({ status = '', page = 1, limit = 20 } = {}) {
    const clauses = [];
    const params = [];
    if (status) {
      clauses.push('rr.status = ?');
      params.push(status);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const total = db.prepare(`SELECT COUNT(*) AS count FROM rental_requests rr ${where}`).get(...params).count;
    const offset = (page - 1) * limit;
    const rentalRequests = db
      .prepare(`${SELECT_BASE} ${where} ORDER BY rr.created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset)
      .map(mapRequest);
    return {
      requests: rentalRequests,
      rentalRequests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },

  getCountsByStatus() {
    return db
      .prepare('SELECT status, COUNT(*) AS count FROM rental_requests GROUP BY status')
      .all();
  },
};
