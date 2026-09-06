import { db } from '../db/database.js';

const findByIdStmt = db.prepare('SELECT * FROM properties WHERE id = ?');
const listStmt = db.prepare(`
  SELECT p.*, u.name as owner_name, u.email as owner_email
  FROM properties p
  JOIN users u ON p.owner_id = u.id
  WHERE (p.name LIKE ? OR p.address LIKE ? OR p.city LIKE ? OR ? = '')
    AND (? = '' OR p.city = ?)
    AND (? = '' OR p.status = ?)
    AND (? = '' OR p.property_type = ?)
    AND (? = '' OR p.owner_id = ?)
  ORDER BY p.created_at DESC
  LIMIT ? OFFSET ?
`);
const countStmt = db.prepare(`
  SELECT COUNT(*) as count
  FROM properties p
  WHERE (p.name LIKE ? OR p.address LIKE ? OR p.city LIKE ? OR ? = '')
    AND (? = '' OR p.city = ?)
    AND (? = '' OR p.status = ?)
    AND (? = '' OR p.property_type = ?)
    AND (? = '' OR p.owner_id = ?)
`);
const getUnitCountsStmt = db.prepare(`
  SELECT 
    COUNT(*) as total_units,
    SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_units,
    SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied_units,
    SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_units
  FROM units
  WHERE property_id = ?
`);

export function toPublicProperty(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    ownerEmail: row.owner_email,
    name: row.name,
    address: row.address,
    city: row.city,
    propertyType: row.property_type,
    status: row.status,
    createdAt: row.created_at
  };
}

export const propertyModel = {
  findById: (id) => {
    const row = findByIdStmt.get(id);
    if (!row) return null;
    
    const unitCounts = getUnitCountsStmt.get(id);
    return {
      ...toPublicProperty(row),
      totalUnits: unitCounts.total_units,
      availableUnits: unitCounts.available_units,
      occupiedUnits: unitCounts.occupied_units,
      maintenanceUnits: unitCounts.maintenance_units
    };
  },

  list: ({ search = '', city = '', status = '', propertyType = '', ownerId = '', page = 1, limit = 20 }) => {
    const offset = (page - 1) * limit;
    const searchPattern = search ? `%${search}%` : '';
    
    const properties = listStmt.all(
      searchPattern, searchPattern, searchPattern, search,
      city, city,
      status, status,
      propertyType, propertyType,
      ownerId, ownerId,
      limit, offset
    );
    
    const { count } = countStmt.get(
      searchPattern, searchPattern, searchPattern, search,
      city, city,
      status, status,
      propertyType, propertyType,
      ownerId, ownerId
    );
    
    return {
      properties: properties.map(toPublicProperty),
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  },
};
