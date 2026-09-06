<<<<<<< HEAD
import crypto from 'node:crypto';
import { db } from '../db/database.js';

const PROPERTY_TYPES = ['apartment', 'house', 'studio', 'shop', 'office'];
const PROPERTY_STATUSES = ['available', 'occupied', 'maintenance', 'inactive'];

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
   WHERE owner_id = ? AND LOWER(TRIM(name)) = LOWER(TRIM(?)) AND LOWER(TRIM(address)) = LOWER(TRIM(?))`
);
const insertStmt = db.prepare(
  `INSERT INTO properties (id, owner_id, name, address, city, property_type, description, bedrooms, bathrooms, monthly_rent, status)
   VALUES (@id, @owner_id, @name, @address, @city, @property_type, @description, @bedrooms, @bathrooms, @monthly_rent, @status)`
);

export const propertyModel = {
  PROPERTY_TYPES,
  PROPERTY_STATUSES,

  listByOwner: (ownerId) => findByOwnerStmt.all(ownerId),

  /** Authorisation-safe: returns the property only if it belongs to ownerId. */
  findByIdAndOwner: (id, ownerId) => findByIdAndOwnerStmt.get(id, ownerId),

  isDuplicateForOwner: (ownerId, name, address) =>
    Boolean(duplicateStmt.get(ownerId, name, address)),

  createForOwner(data) {
    const id = crypto.randomUUID();
    insertStmt.run({
      id,
      owner_id: data.ownerId,
      name: String(data.name).trim(),
      address: String(data.address).trim(),
      city: data.city ? String(data.city).trim() : null,
      property_type: data.propertyType || 'apartment',
      description: data.description ? String(data.description).trim() : null,
      bedrooms: Number(data.bedrooms) || 0,
      bathrooms: Number(data.bathrooms) || 0,
      monthly_rent: Number(data.monthlyRent) || 0,
      status: data.status || 'available',
    });
    return findByIdAndOwnerStmt.get(id, data.ownerId);
=======
import { db } from '../db/database.js';

/* Reusable scalar sub-selects so list queries expose unit availability. */
const AVAILABLE_UNITS_SQL = `(SELECT COUNT(*) FROM units u WHERE u.property_id = p.id AND u.status = 'available')`;
const TOTAL_UNITS_SQL = `(SELECT COUNT(*) FROM units u WHERE u.property_id = p.id)`;

const SELECT_BASE = `
  SELECT p.*, ow.name AS owner_name,
         ${AVAILABLE_UNITS_SQL} AS available_units,
         ${TOTAL_UNITS_SQL} AS total_units
  FROM properties p
  JOIN users ow ON ow.id = p.owner_id
`;

function mapProperty(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.owner_name || null,
    name: row.name,
    location: row.location,
    propertyType: row.property_type,
    description: row.description,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    rent: row.rent,
    amenities: JSON.parse(row.amenities || '[]'),
    imageUrl: row.image_url || null,
    status: row.status,
    availableUnits: row.available_units ?? 0,
    totalUnits: row.total_units ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
  };
}

export const propertyModel = {
  /**
   * List properties with optional filters (search, location, type, rent range,
   * availability). All filters are optional — absent filters are skipped.
   */
  list(filters = {}) {
    const clauses = [];
    const params = [];

    if (filters.q) {
      clauses.push('(p.name LIKE ? OR p.location LIKE ? OR p.description LIKE ?)');
      const like = `%${filters.q}%`;
      params.push(like, like, like);
    }
    if (filters.location) {
      clauses.push('p.location LIKE ?');
      params.push(`%${filters.location}%`);
    }
    if (filters.type) {
      clauses.push('p.property_type = ?');
      params.push(filters.type);
    }
    if (filters.minRent !== undefined && filters.minRent !== '' && filters.minRent !== null) {
      clauses.push('p.rent >= ?');
      params.push(Number(filters.minRent));
    }
    if (filters.maxRent !== undefined && filters.maxRent !== '' && filters.maxRent !== null) {
      clauses.push('p.rent <= ?');
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
>>>>>>> 923d021c23ead306b3ac70d9a2ca64035bd3d424
  },
};
