import { db } from '../db/database.js';

const SELECT_BASE = `
  SELECT r.*, p.name AS property_name,
         COALESCE(NULLIF(p.location, ''), p.address) AS property_location,
         un.unit_number, ow.name AS owner_name
  FROM rentals r
  JOIN properties p ON p.id = r.property_id
  LEFT JOIN units un ON un.id = r.unit_id
  LEFT JOIN users ow ON ow.id = COALESCE(r.owner_id, p.owner_id)
`;

function mapRental(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    propertyId: row.property_id,
    unitId: row.unit_id,
    ownerId: row.owner_id,
    monthlyRent: row.monthly_rent,
    startDate: row.start_date,
    endDate: row.end_date || null,
    status: row.status,
    propertyName: row.property_name,
    propertyLocation: row.property_location,
    unitNumber: row.unit_number,
    ownerName: row.owner_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const rentalModel = {
  findActiveByTenant(tenantId) {
    return mapRental(
      db
        .prepare(`${SELECT_BASE} WHERE r.tenant_id = ? AND r.status = 'active' ORDER BY r.created_at DESC`)
        .get(tenantId)
    );
  },

  listByTenant(tenantId) {
    return db
      .prepare(`${SELECT_BASE} WHERE r.tenant_id = ? ORDER BY r.created_at DESC`)
      .all(tenantId)
      .map(mapRental);
  },

  hasActiveRentalForUnit(tenantId, unitId) {
    return Boolean(
      db
        .prepare(`SELECT 1 FROM rentals WHERE tenant_id = ? AND unit_id = ? AND status = 'active'`)
        .get(tenantId, unitId)
    );
  },

  list({ status = '', page = 1, limit = 20 } = {}) {
    const clauses = [];
    const params = [];
    if (status) {
      clauses.push('r.status = ?');
      params.push(status);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const total = db.prepare(`SELECT COUNT(*) AS count FROM rentals r ${where}`).get(...params).count;
    const offset = (page - 1) * limit;
    const rentals = db
      .prepare(`${SELECT_BASE} ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset)
      .map(mapRental);
    return { rentals, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  },

  getCountsByStatus() {
    return db
      .prepare('SELECT status, COUNT(*) AS count FROM rentals GROUP BY status')
      .all();
  },
};
