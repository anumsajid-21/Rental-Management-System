import { db } from '../db/database.js';

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
