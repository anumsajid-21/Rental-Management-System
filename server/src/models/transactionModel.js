import { db } from '../db/database.js';

<<<<<<< HEAD
const listStmt = db.prepare(`
  SELECT 
    t.*,
    tenant.name as tenant_name,
    tenant.email as tenant_email,
    owner.name as owner_name,
    owner.email as owner_email,
    p.name as property_name,
    u.unit_number
  FROM transactions t
  JOIN users tenant ON t.tenant_id = tenant.id
  JOIN users owner ON t.owner_id = owner.id
  JOIN rentals r ON t.rental_id = r.id
  JOIN properties p ON r.property_id = p.id
  JOIN units u ON r.unit_id = u.id
  WHERE (? = '' OR t.status = ?)
    AND (? = '' OR t.tenant_id = ?)
    AND (? = '' OR t.owner_id = ?)
    AND (? = '' OR r.property_id = ?)
    AND (? = '' OR t.payment_date >= ?)
    AND (? = '' OR t.payment_date <= ?)
  ORDER BY t.created_at DESC
  LIMIT ? OFFSET ?
`);
const countStmt = db.prepare(`
  SELECT COUNT(*) as count
  FROM transactions t
  JOIN rentals r ON t.rental_id = r.id
  WHERE (? = '' OR t.status = ?)
    AND (? = '' OR t.tenant_id = ?)
    AND (? = '' OR t.owner_id = ?)
    AND (? = '' OR r.property_id = ?)
    AND (? = '' OR t.payment_date >= ?)
    AND (? = '' OR t.payment_date <= ?)
`);
const recentStmt = db.prepare(`
  SELECT 
    t.*,
    tenant.name as tenant_name,
    owner.name as owner_name,
    p.name as property_name
  FROM transactions t
  JOIN users tenant ON t.tenant_id = tenant.id
  JOIN users owner ON t.owner_id = owner.id
  JOIN rentals r ON t.rental_id = r.id
  JOIN properties p ON r.property_id = p.id
  ORDER BY t.created_at DESC
  LIMIT 10
`);
const countByStatusStmt = db.prepare(`
  SELECT status, COUNT(*) as count
  FROM transactions
  GROUP BY status
`);
const totalRevenueStmt = db.prepare(`
  SELECT COALESCE(SUM(amount), 0) as total
  FROM transactions
  WHERE status = 'paid'
`);
=======
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
>>>>>>> 89a2e32bf6f31a866729cdbd13dfda64daff2406

export function toPublicTransaction(row) {
  return {
    id: row.id,
    rentalId: row.rental_id,
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    tenantEmail: row.tenant_email,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    ownerEmail: row.owner_email,
    propertyName: row.property_name,
    unitNumber: row.unit_number,
    amount: row.amount,
    paymentMonth: row.payment_month,
    paymentDate: row.payment_date,
    status: row.status,
    paymentMethod: row.payment_method,
    createdAt: row.created_at
  };
}

export const transactionModel = {
<<<<<<< HEAD
  list: ({ 
    status = '', 
    tenantId = '', 
    ownerId = '', 
    propertyId = '', 
    startDate = '', 
    endDate = '',
    page = 1, 
    limit = 20 
  }) => {
    const offset = (page - 1) * limit;
    
    const transactions = listStmt.all(
      status, status,
      tenantId, tenantId,
      ownerId, ownerId,
      propertyId, propertyId,
      startDate, startDate,
      endDate, endDate,
      limit, offset
=======
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
>>>>>>> 89a2e32bf6f31a866729cdbd13dfda64daff2406
    );
    
    const { count } = countStmt.get(
      status, status,
      tenantId, tenantId,
      ownerId, ownerId,
      propertyId, propertyId,
      startDate, startDate,
      endDate, endDate
    );
    
    return {
      transactions: transactions.map(toPublicTransaction),
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  },

  getRecent: () => {
    return recentStmt.all().map(toPublicTransaction);
  },

  getCountsByStatus: () => {
    return countByStatusStmt.all();
  },

  getTotalRevenue: () => {
    const { total } = totalRevenueStmt.get();
    return total;
  },
};
