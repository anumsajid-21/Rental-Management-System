import { db } from '../db/database.js';

const listStmt = db.prepare(`
  SELECT 
    r.*,
    t.name as tenant_name,
    t.email as tenant_email,
    p.name as property_name,
    p.city as property_city,
    u.unit_number
  FROM rentals r
  JOIN users t ON r.tenant_id = t.id
  JOIN properties p ON r.property_id = p.id
  JOIN units u ON r.unit_id = u.id
  WHERE (? = '' OR r.status = ?)
  ORDER BY r.created_at DESC
  LIMIT ? OFFSET ?
`);
const countStmt = db.prepare(`
  SELECT COUNT(*) as count
  FROM rentals
  WHERE (? = '' OR status = ?)
`);
const countByStatusStmt = db.prepare(`
  SELECT status, COUNT(*) as count
  FROM rentals
  GROUP BY status
`);

export function toPublicRental(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    tenantEmail: row.tenant_email,
    propertyId: row.property_id,
    propertyName: row.property_name,
    propertyCity: row.property_city,
    unitId: row.unit_id,
    unitNumber: row.unit_number,
    rentAmount: row.rent_amount,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const rentalModel = {
  list: ({ status = '', page = 1, limit = 20 }) => {
    const offset = (page - 1) * limit;
    
    const rentals = listStmt.all(status, status, limit, offset);
    const { count } = countStmt.get(status, status);
    
    return {
      rentals: rentals.map(toPublicRental),
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  },

  getCountsByStatus: () => {
    return countByStatusStmt.all();
  },
};
