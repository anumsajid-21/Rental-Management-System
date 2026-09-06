import { db } from '../db/database.js';

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
};
