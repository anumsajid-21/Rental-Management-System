<<<<<<< HEAD
import { db } from '../db/database.js';

const findByIdStmt = db.prepare('SELECT * FROM properties WHERE id = ?');
const listStmt = db.prepare(`
  SELECT p.*, u.name as owner_name, u.email as owner_email
=======
import crypto from 'node:crypto';
import { db } from '../db/database.js';

const PROPERTY_TYPES = ['apartment', 'house', 'studio', 'shop', 'office'];
const PROPERTY_STATUSES = ['available', 'occupied', 'maintenance', 'inactive', 'unavailable'];

/* Reusable scalar sub-selects so list queries expose unit availability. */
const AVAILABLE_UNITS_SQL = `(SELECT COUNT(*) FROM units u WHERE u.property_id = p.id AND u.status = 'available')`;
const TOTAL_UNITS_SQL = `(SELECT COUNT(*) FROM units u WHERE u.property_id = p.id)`;

const SELECT_BASE = `
  SELECT p.*, ow.name AS owner_name,
         ${AVAILABLE_UNITS_SQL} AS available_units,
         ${TOTAL_UNITS_SQL} AS total_units
>>>>>>> 89a2e32bf6f31a866729cdbd13dfda64daff2406
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
<<<<<<< HEAD
    address: row.address,
    city: row.city,
    propertyType: row.property_type,
    status: row.status,
    createdAt: row.created_at
=======
    location: row.location || row.address || '',
    address: row.address || row.location || '',
    city: row.city || null,
    propertyType: row.property_type,
    description: row.description,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    rent: row.rent ?? row.monthly_rent ?? 0,
    monthly_rent: row.monthly_rent ?? row.rent ?? 0,
    amenities: JSON.parse(row.amenities || '[]'),
    imageUrl: row.image_url || null,
    status: row.status,
    availableUnits: row.available_units ?? 0,
    totalUnits: row.total_units ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    owner_name: row.owner_name || '',
  };
}

function mapUnit(row) {
  if (!row) return null;
  return {
    id: row.id,
    propertyId: row.property_id,
    unitNumber: row.unit_number,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    rent: row.rent,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
>>>>>>> 89a2e32bf6f31a866729cdbd13dfda64daff2406
  };
}

const findByOwnerStmt = db.prepare(
  `SELECT p.*, (u.name || '') AS owner_name FROM properties p
   JOIN users u ON u.id = p.owner_id
   WHERE p.owner_id = ? ORDER BY p.created_at DESC`
);
const findByIdAndOwnerStmt = db.prepare(
  'SELECT * FROM properties WHERE id = ? AND owner_id = ?'
);
const duplicateStmt = db.prepare(
  `SELECT id FROM properties
   WHERE owner_id = ? AND LOWER(TRIM(name)) = LOWER(TRIM(?))
     AND LOWER(TRIM(COALESCE(NULLIF(address,''), location))) = LOWER(TRIM(?))`
);
const insertOwnerStmt = db.prepare(
  `INSERT INTO properties (id, owner_id, name, address, location, city, property_type, description, bedrooms, bathrooms, monthly_rent, rent, status)
   VALUES (@id, @owner_id, @name, @address, @location, @city, @property_type, @description, @bedrooms, @bathrooms, @monthly_rent, @rent, @status)`
);

export const propertyModel = {
<<<<<<< HEAD
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
=======
  PROPERTY_TYPES,
  PROPERTY_STATUSES,

  listByOwner: (ownerId) => findByOwnerStmt.all(ownerId),

  /** Authorisation-safe: returns the property only if it belongs to ownerId. */
  findByIdAndOwner: (id, ownerId) => findByIdAndOwnerStmt.get(id, ownerId),

  isDuplicateForOwner: (ownerId, name, address) =>
    Boolean(duplicateStmt.get(ownerId, name, address)),

  createForOwner(data) {
    const id = crypto.randomUUID();
    const address = String(data.address).trim();
    const monthlyRent = Number(data.monthlyRent) || 0;
    insertOwnerStmt.run({
      id,
      owner_id: data.ownerId,
      name: String(data.name).trim(),
      address,
      location: address,
      city: data.city ? String(data.city).trim() : null,
      property_type: data.propertyType || 'apartment',
      description: data.description ? String(data.description).trim() : '',
      bedrooms: Number(data.bedrooms) || 0,
      bathrooms: Number(data.bathrooms) || 0,
      monthly_rent: monthlyRent,
      rent: monthlyRent,
      status: data.status || 'available',
    });
    return findByIdAndOwnerStmt.get(id, data.ownerId);
  },

  /**
   * List properties with optional filters (search, location, type, rent range,
   * availability). All filters are optional — absent filters are skipped.
   */
  list(filters = {}) {
    const clauses = [];
    const params = [];

    if (filters.q) {
      clauses.push('(p.name LIKE ? OR p.location LIKE ? OR p.address LIKE ? OR p.description LIKE ?)');
      const like = `%${filters.q}%`;
      params.push(like, like, like, like);
    }
    if (filters.location) {
      clauses.push('(p.location LIKE ? OR p.address LIKE ?)');
      params.push(`%${filters.location}%`, `%${filters.location}%`);
    }
    if (filters.type) {
      clauses.push('p.property_type = ?');
      params.push(filters.type);
    }
    if (filters.minRent !== undefined && filters.minRent !== '' && filters.minRent !== null) {
      clauses.push('COALESCE(NULLIF(p.rent, 0), p.monthly_rent) >= ?');
      params.push(Number(filters.minRent));
    }
    if (filters.maxRent !== undefined && filters.maxRent !== '' && filters.maxRent !== null) {
      clauses.push('COALESCE(NULLIF(p.rent, 0), p.monthly_rent) <= ?');
      params.push(Number(filters.maxRent));
    }
    if (filters.availableOnly) {
      clauses.push(`p.status = 'available' AND ${AVAILABLE_UNITS_SQL} > 0`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = db
      .prepare(`${SELECT_BASE} ${where} ORDER BY p.created_at DESC, p.name ASC`)
      .all(...params);
    return rows.map(mapProperty);
  },

  listTypes() {
    return db
      .prepare('SELECT DISTINCT property_type FROM properties ORDER BY property_type ASC')
      .all()
      .map((r) => r.property_type);
  },

  findById(id) {
    return mapProperty(db.prepare(`${SELECT_BASE} WHERE p.id = ?`).get(id));
  },

  listUnits(propertyId) {
    return db
      .prepare('SELECT * FROM units WHERE property_id = ? ORDER BY unit_number ASC')
      .all(propertyId)
      .map(mapUnit);
  },

  findUnitById(id) {
    return mapUnit(db.prepare('SELECT * FROM units WHERE id = ?').get(id));
>>>>>>> 89a2e32bf6f31a866729cdbd13dfda64daff2406
  },
};
