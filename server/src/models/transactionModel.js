import { db } from '../db/database.js';

const listFilteredStmt = db.prepare(
  `SELECT t.*, u.name AS tenant_name, p.name AS property_name, COALESCE(t.rent_month, rp.rent_month) AS rent_month
   FROM transactions t
   JOIN users u ON u.id = t.tenant_id
   LEFT JOIN properties p ON p.id = t.property_id
   LEFT JOIN rent_payments rp ON rp.id = t.rent_payment_id
   WHERE t.owner_id = @ownerId
     AND (@search IS NULL OR u.name LIKE '%' || @search || '%' OR p.name LIKE '%' || @search || '%' OR t.id LIKE '%' || @search || '%')
     AND (@status IS NULL OR t.status = @status)
     AND (@type IS NULL OR t.type = @type)
   ORDER BY t.created_at DESC`
);

const findOwnedStmt = db.prepare(
  `SELECT t.*, u.name AS tenant_name, u.email AS tenant_email,
          p.name AS property_name, COALESCE(p.address, p.location) AS property_address,
          COALESCE(t.rent_month, rp.rent_month) AS rent_month
   FROM transactions t
   JOIN users u ON u.id = t.tenant_id
   LEFT JOIN properties p ON p.id = t.property_id
   LEFT JOIN rent_payments rp ON rp.id = t.rent_payment_id
   WHERE t.id = ? AND t.owner_id = ?`
);

const SELECT_BASE = `
  SELECT t.*, p.name AS property_name, un.unit_number
  FROM transactions t
  LEFT JOIN rentals r ON r.id = t.rental_id
  LEFT JOIN properties p ON p.id = COALESCE(t.property_id, r.property_id)
  LEFT JOIN units un ON un.id = r.unit_id
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
  list(ownerId, { search, status, type } = {}) {
    const s = search && String(search).trim() ? String(search).trim() : null;
    const st = status && status !== 'all' ? status : null;
    const ty = type && type !== 'all' ? type : null;
    return listFilteredStmt.all({ ownerId, search: s, status: st, type: ty });
  },

  /** Authorisation-safe: transaction only if it belongs to this owner. */
  findByIdAndOwner: (id, ownerId) => findOwnedStmt.get(id, ownerId) || null,

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

  listForAdmin({
    status = '',
    tenantId = '',
    ownerId = '',
    propertyId = '',
    startDate = '',
    endDate = '',
    page = 1,
    limit = 20,
  } = {}) {
    const clauses = [];
    const params = [];
    if (status) {
      clauses.push('t.status = ?');
      params.push(status);
    }
    if (tenantId) {
      clauses.push('t.tenant_id = ?');
      params.push(tenantId);
    }
    if (ownerId) {
      clauses.push('t.owner_id = ?');
      params.push(ownerId);
    }
    if (propertyId) {
      clauses.push('COALESCE(t.property_id, r.property_id) = ?');
      params.push(propertyId);
    }
    if (startDate) {
      clauses.push("date(COALESCE(t.payment_date, t.created_at)) >= date(?)");
      params.push(startDate);
    }
    if (endDate) {
      clauses.push("date(COALESCE(t.payment_date, t.created_at)) <= date(?)");
      params.push(endDate);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const from = `
      FROM transactions t
      LEFT JOIN rentals r ON r.id = t.rental_id
      LEFT JOIN properties p ON p.id = COALESCE(t.property_id, r.property_id)
      LEFT JOIN users u ON u.id = t.tenant_id
    `;
    const total = db.prepare(`SELECT COUNT(*) AS count ${from} ${where}`).get(...params).count;
    const offset = (page - 1) * limit;
    const transactions = db
      .prepare(
        `SELECT t.*, u.name AS tenant_name, p.name AS property_name ${from} ${where}
         ORDER BY t.created_at DESC LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset)
      .map((row) => ({
        ...mapTransaction(row),
        tenantName: row.tenant_name,
        ownerId: row.owner_id,
        propertyId: row.property_id,
        paymentMonth: row.rent_month,
      }));
    return { transactions, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  },

  getRecent(limit = 5) {
    return db
      .prepare(
        `${SELECT_BASE} ORDER BY t.created_at DESC LIMIT ?`
      )
      .all(limit)
      .map(mapTransaction);
  },

  getTotalRevenue() {
    const row = db
      .prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE status = 'paid'`)
      .get();
    return row.total;
  },

  getCountsByStatus() {
    return db
      .prepare('SELECT status, COUNT(*) AS count FROM transactions GROUP BY status')
      .all();
  },
};
