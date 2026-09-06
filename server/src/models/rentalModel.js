import { db } from '../db/database.js';

const SELECT_BASE = `
  SELECT r.*, p.name AS property_name, p.location AS property_location,
         un.unit_number, ow.name AS owner_name
  FROM rentals r
  JOIN properties p ON p.id = r.property_id
  JOIN units un ON un.id = r.unit_id
  JOIN users ow ON ow.id = r.owner_id
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
};
