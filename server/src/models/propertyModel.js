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
  },
};
