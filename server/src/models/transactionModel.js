import { db } from '../db/database.js';

<<<<<<< HEAD
const listFilteredStmt = db.prepare(
  `SELECT t.*, u.name AS tenant_name, p.name AS property_name, rp.rent_month
   FROM transactions t
   JOIN users u ON u.id = t.tenant_id
   JOIN properties p ON p.id = t.property_id
   LEFT JOIN rent_payments rp ON rp.id = t.rent_payment_id
   WHERE t.owner_id = @ownerId
     AND (@search IS NULL OR u.name LIKE '%' || @search || '%' OR p.name LIKE '%' || @search || '%' OR t.id LIKE '%' || @search || '%')
     AND (@status IS NULL OR t.status = @status)
     AND (@type IS NULL OR t.type = @type)
   ORDER BY t.created_at DESC`
);

const findOwnedStmt = db.prepare(
  `SELECT t.*, u.name AS tenant_name, u.email AS tenant_email,
          p.name AS property_name, p.address AS property_address, rp.rent_month
   FROM transactions t
   JOIN users u ON u.id = t.tenant_id
   JOIN properties p ON p.id = t.property_id
   LEFT JOIN rent_payments rp ON rp.id = t.rent_payment_id
   WHERE t.id = ? AND t.owner_id = ?`
);

export const transactionModel = {
  list(ownerId, { search, status, type } = {}) {
    const s = search && String(search).trim() ? String(search).trim() : null;
    const st = status && status !== 'all' ? status : null;
    const ty = type && type !== 'all' ? type : null;
    return listFilteredStmt.all({ ownerId, search: s, status: st, type: ty });
  },

  /** Authorisation-safe: transaction only if it belongs to this owner. */
  findByIdAndOwner: (id, ownerId) => findOwnedStmt.get(id, ownerId) || null,
=======
const SELECT_BASE = `
  SELECT t.*, p.name AS property_name, un.unit_number
  FROM transactions t
  JOIN rentals r ON r.id = t.rental_id
  JOIN properties p ON p.id = r.property_id
  JOIN units un ON un.id = r.unit_id
`;

function mapTransaction(row) {
  if (!row) return null;
  return {
    id: row.id,
    rentalId: row.rental_id,
    tenantId: row.tenant_id,
    rentMonth: row.rent_month,
    amount: row.amount,
    paymentDate: row.payment_date || null,
    status: row.status,
    propertyName: row.property_name,
    unitNumber: row.unit_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const transactionModel = {
  /** Tenant-scoped list with optional status + rent-month range filters. */
  listByTenant(tenantId, filters = {}) {
    const clauses = ['t.tenant_id = ?'];
    const params = [tenantId];
    if (filters.status) {
      clauses.push('t.status = ?');
      params.push(filters.status);
    }
    if (filters.fromMonth) {
      clauses.push('t.rent_month >= ?');
      params.push(filters.fromMonth);
    }
    if (filters.toMonth) {
      clauses.push('t.rent_month <= ?');
      params.push(filters.toMonth);
    }
    return db
      .prepare(
        `${SELECT_BASE} WHERE ${clauses.join(' AND ')} ORDER BY t.rent_month DESC, t.created_at DESC`
      )
      .all(...params)
      .map(mapTransaction);
  },

  findByIdForTenant(id, tenantId) {
    return mapTransaction(
      db.prepare(`${SELECT_BASE} WHERE t.id = ? AND t.tenant_id = ?`).get(id, tenantId)
    );
  },

  listRecentByTenant(tenantId, limit = 5) {
    return db
      .prepare(`${SELECT_BASE} WHERE t.tenant_id = ? ORDER BY t.rent_month DESC, t.created_at DESC LIMIT ?`)
      .all(tenantId, limit)
      .map(mapTransaction);
  },

  listUnpaidByTenant(tenantId) {
    return db
      .prepare(
        `SELECT * FROM transactions WHERE tenant_id = ? AND status IN ('pending', 'overdue') ORDER BY rent_month ASC`
      )
      .all(tenantId)
      .map(mapTransaction);
  },

  sumPaidByTenant(tenantId) {
    const row = db
      .prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE tenant_id = ? AND status = 'paid'`)
      .get(tenantId);
    return row.total;
  },
>>>>>>> 923d021c23ead306b3ac70d9a2ca64035bd3d424
};
