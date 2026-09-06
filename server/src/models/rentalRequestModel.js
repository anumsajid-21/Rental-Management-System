import { db } from '../db/database.js';

const listStmt = db.prepare(`
  SELECT 
    rr.*,
    t.name as tenant_name,
    t.email as tenant_email,
    p.name as property_name,
    p.city as property_city,
    u.unit_number,
    u.rent_amount
  FROM rental_requests rr
  JOIN users t ON rr.tenant_id = t.id
  JOIN properties p ON rr.property_id = p.id
  JOIN units u ON rr.unit_id = u.id
  WHERE (? = '' OR rr.status = ?)
  ORDER BY rr.created_at DESC
  LIMIT ? OFFSET ?
`);
const countStmt = db.prepare(`
  SELECT COUNT(*) as count
  FROM rental_requests
  WHERE (? = '' OR status = ?)
`);
const countByStatusStmt = db.prepare(`
  SELECT status, COUNT(*) as count
  FROM rental_requests
  GROUP BY status
`);

export function toPublicRentalRequest(row) {
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
    status: row.status,
    message: row.message,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const rentalRequestModel = {
  list: ({ status = '', page = 1, limit = 20 }) => {
    const offset = (page - 1) * limit;
    
    const requests = listStmt.all(status, status, limit, offset);
    const { count } = countStmt.get(status, status);
    
    return {
      requests: requests.map(toPublicRentalRequest),
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
