import crypto from 'node:crypto';
import { db } from '../db/database.js';

const ALLOWED_STATUSES = ['available', 'occupied', 'inactive'];
const ALLOWED_TYPES = ['apartment', 'house', 'studio', 'shop', 'office'];

/**
 * GET /api/owner/properties
 * List all properties owned by the authenticated owner.
 */
export function listProperties(req, res) {
  const search = req.query.search ? `%${String(req.query.search).trim()}%` : null;
  const status = req.query.status && req.query.status !== 'all' ? req.query.status : null;

  let query = `
    SELECT p.*,
      (SELECT COUNT(*) FROM rentals r WHERE r.property_id = p.id AND r.status = 'active') AS active_rentals_count,
      (SELECT COUNT(*) FROM rental_requests rr WHERE rr.property_id = p.id AND rr.status = 'pending') AS pending_requests_count,
      (SELECT u.name FROM rentals r JOIN users u ON u.id = r.tenant_id WHERE r.property_id = p.id AND r.status = 'active' LIMIT 1) AS tenant_name
    FROM properties p
    WHERE p.owner_id = ?
  `;
  const params = [req.user.id];

  if (status) {
    query += ' AND p.status = ?';
    params.push(status);
  }
  if (search) {
    query += ' AND (p.name LIKE ? OR p.address LIKE ? OR p.city LIKE ? OR p.description LIKE ?)';
    params.push(search, search, search, search);
  }

  query += ' ORDER BY p.created_at DESC';

  const rows = db.prepare(query).all(...params);
  const properties = rows.map((r) => ({
    id: r.id,
    name: r.name,
    address: r.address || r.location || '',
    city: r.city || '',
    property_type: r.property_type,
    description: r.description || '',
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    monthly_rent: r.monthly_rent || r.rent || 0,
    status: r.status,
    active_rentals_count: r.active_rentals_count,
    pending_requests_count: r.pending_requests_count,
    tenant_name: r.tenant_name || null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  res.json({ properties });
}

/**
 * GET /api/owner/properties/:id
 * Retrieve a single property owned by this owner with active rental details.
 */
export function getProperty(req, res) {
  const property = db.prepare(
    `SELECT p.*,
      (SELECT COUNT(*) FROM rental_requests rr WHERE rr.property_id = p.id AND rr.status = 'pending') AS pending_requests_count
     FROM properties p
     WHERE p.id = ? AND p.owner_id = ?`
  ).get(req.params.id, req.user.id);

  if (!property) {
    return res.status(404).json({ error: 'Property not found.' });
  }

  // Active rental details if rented
  const activeRental = db.prepare(
    `SELECT r.*, u.name AS tenant_name, u.email AS tenant_email, u.phone AS tenant_phone
     FROM rentals r
     JOIN users u ON u.id = r.tenant_id
     WHERE r.property_id = ? AND r.status = 'active'
     ORDER BY r.created_at DESC LIMIT 1`
  ).get(property.id);

  res.json({
    property: {
      id: property.id,
      name: property.name,
      address: property.address || property.location || '',
      city: property.city || '',
      property_type: property.property_type,
      description: property.description || '',
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      monthly_rent: property.monthly_rent || property.rent || 0,
      status: property.status,
      pending_requests_count: property.pending_requests_count,
      activeRental: activeRental || null,
      created_at: property.created_at,
      updated_at: property.updated_at,
    },
  });
}

/**
 * POST /api/owner/properties
 * Add a new individual property (no units, no pictures).
 * Auto-creates a default unit so tenant-side workflows work seamlessly.
 */
export function createProperty(req, res) {
  const {
    name,
    address,
    city,
    property_type = 'apartment',
    description = '',
    bedrooms = 0,
    bathrooms = 0,
    monthly_rent,
    status = 'available',
  } = req.body || {};

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Property name is required.', field: 'name' });
  }
  if (!address || !String(address).trim()) {
    return res.status(400).json({ error: 'Property address is required.', field: 'address' });
  }

  const rentVal = Number(monthly_rent);
  if (isNaN(rentVal) || rentVal <= 0) {
    return res.status(400).json({ error: 'Monthly rent must be a positive number in PKR.', field: 'monthly_rent' });
  }

  const normalizedStatus = String(status).toLowerCase().trim();
  if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
    return res.status(400).json({
      error: `Invalid status. Allowed statuses are: ${ALLOWED_STATUSES.join(', ')}.`,
      field: 'status',
    });
  }

  const normalizedType = String(property_type).toLowerCase().trim();
  const validPropType = ALLOWED_TYPES.includes(normalizedType) ? normalizedType : 'apartment';

  const propId = crypto.randomUUID();
  const unitId = crypto.randomUUID();
  const cleanName = String(name).trim();
  const cleanAddress = String(address).trim();
  const cleanCity = city ? String(city).trim() : '';
  const cleanDesc = description ? String(description).trim() : '';
  const numBedrooms = Math.max(0, parseInt(bedrooms, 10) || 0);
  const numBathrooms = Math.max(0, parseInt(bathrooms, 10) || 0);

  const createTx = db.transaction(() => {
    // 1. Insert property
    db.prepare(`
      INSERT INTO properties (
        id, owner_id, name, location, address, city, property_type,
        description, bedrooms, bathrooms, rent, monthly_rent, amenities, status
      ) VALUES (
        @id, @owner_id, @name, @location, @address, @city, @property_type,
        @description, @bedrooms, @bathrooms, @rent, @monthly_rent, '[]', @status
      )
    `).run({
      id: propId,
      owner_id: req.user.id,
      name: cleanName,
      location: cleanAddress,
      address: cleanAddress,
      city: cleanCity,
      property_type: validPropType,
      description: cleanDesc,
      bedrooms: numBedrooms,
      bathrooms: numBathrooms,
      rent: rentVal,
      monthly_rent: rentVal,
      status: normalizedStatus,
    });

    // 2. Insert default unit for tenant compatibility
    db.prepare(`
      INSERT INTO units (
        id, property_id, unit_number, bedrooms, bathrooms, rent, status
      ) VALUES (
        @id, @property_id, 'Main', @bedrooms, @bathrooms, @rent, @status
      )
    `).run({
      id: unitId,
      property_id: propId,
      bedrooms: numBedrooms,
      bathrooms: numBathrooms,
      rent: rentVal,
      status: normalizedStatus === 'available' ? 'available' : 'occupied',
    });
  });

  createTx();

  const created = db.prepare('SELECT * FROM properties WHERE id = ?').get(propId);
  res.status(201).json({
    message: 'Property added successfully.',
    property: {
      ...created,
      monthly_rent: created.monthly_rent || created.rent,
    },
  });
}

/**
 * PUT /api/owner/properties/:id
 * Edit existing property details.
 */
export function updateProperty(req, res) {
  const existing = db.prepare(
    'SELECT * FROM properties WHERE id = ? AND owner_id = ?'
  ).get(req.params.id, req.user.id);

  if (!existing) {
    return res.status(404).json({ error: 'Property not found.' });
  }

  const {
    name,
    address,
    city,
    property_type,
    description,
    bedrooms,
    bathrooms,
    monthly_rent,
    status,
  } = req.body || {};

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Property name is required.', field: 'name' });
  }
  if (!address || !String(address).trim()) {
    return res.status(400).json({ error: 'Property address is required.', field: 'address' });
  }

  const rentVal = Number(monthly_rent);
  if (isNaN(rentVal) || rentVal <= 0) {
    return res.status(400).json({ error: 'Monthly rent must be a positive number in PKR.', field: 'monthly_rent' });
  }

  let nextStatus = existing.status;
  if (status) {
    const normalizedStatus = String(status).toLowerCase().trim();
    if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({
        error: `Invalid status. Allowed statuses are: ${ALLOWED_STATUSES.join(', ')}.`,
        field: 'status',
      });
    }
    nextStatus = normalizedStatus;
  }

  // Check active rental conflict if trying to set to available
  if (nextStatus === 'available') {
    const activeRental = db.prepare(
      "SELECT id FROM rentals WHERE property_id = ? AND status = 'active'"
    ).get(existing.id);
    if (activeRental) {
      return res.status(409).json({
        error: 'Cannot set status to Available because this property currently has an active rental.',
      });
    }
  }

  const cleanName = String(name).trim();
  const cleanAddress = String(address).trim();
  const cleanCity = city !== undefined ? String(city).trim() : existing.city;
  const cleanDesc = description !== undefined ? String(description).trim() : existing.description;
  const cleanType = property_type && ALLOWED_TYPES.includes(String(property_type).toLowerCase())
    ? String(property_type).toLowerCase()
    : existing.property_type;
  const numBedrooms = bedrooms !== undefined ? Math.max(0, parseInt(bedrooms, 10) || 0) : existing.bedrooms;
  const numBathrooms = bathrooms !== undefined ? Math.max(0, parseInt(bathrooms, 10) || 0) : existing.bathrooms;

  const updateTx = db.transaction(() => {
    db.prepare(`
      UPDATE properties SET
        name = @name,
        location = @address,
        address = @address,
        city = @city,
        property_type = @property_type,
        description = @description,
        bedrooms = @bedrooms,
        bathrooms = @bathrooms,
        rent = @monthly_rent,
        monthly_rent = @monthly_rent,
        status = @status,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE id = @id AND owner_id = @owner_id
    `).run({
      id: existing.id,
      owner_id: req.user.id,
      name: cleanName,
      address: cleanAddress,
      city: cleanCity,
      property_type: cleanType,
      description: cleanDesc,
      bedrooms: numBedrooms,
      bathrooms: numBathrooms,
      monthly_rent: rentVal,
      status: nextStatus,
    });

    // Sync default unit
    db.prepare(`
      UPDATE units SET
        bedrooms = @bedrooms,
        bathrooms = @bathrooms,
        rent = @rent,
        status = @unit_status,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE property_id = @property_id AND (unit_number = 'Main' OR unit_number = '1')
    `).run({
      property_id: existing.id,
      bedrooms: numBedrooms,
      bathrooms: numBathrooms,
      rent: rentVal,
      unit_status: nextStatus === 'available' ? 'available' : 'occupied',
    });
  });

  updateTx();

  const updated = db.prepare('SELECT * FROM properties WHERE id = ?').get(existing.id);
  res.json({
    message: 'Property updated successfully.',
    property: {
      ...updated,
      monthly_rent: updated.monthly_rent || updated.rent,
    },
  });
}

/**
 * PATCH /api/owner/properties/:id/status
 * Change status among Available, Occupied, Inactive.
 */
export function updatePropertyStatus(req, res) {
  const existing = db.prepare(
    'SELECT * FROM properties WHERE id = ? AND owner_id = ?'
  ).get(req.params.id, req.user.id);

  if (!existing) {
    return res.status(404).json({ error: 'Property not found.' });
  }

  const { status } = req.body || {};
  const normalizedStatus = String(status || '').toLowerCase().trim();
  if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
    return res.status(400).json({
      error: `Invalid status. Allowed statuses are: ${ALLOWED_STATUSES.join(', ')}.`,
      field: 'status',
    });
  }

  if (normalizedStatus === 'available') {
    const activeRental = db.prepare(
      "SELECT id FROM rentals WHERE property_id = ? AND status = 'active'"
    ).get(existing.id);
    if (activeRental) {
      return res.status(409).json({
        error: 'Cannot set status to Available while an active rental agreement exists for this property.',
      });
    }
  }

  db.prepare(`
    UPDATE properties SET
      status = ?,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = ? AND owner_id = ?
  `).run(normalizedStatus, existing.id, req.user.id);

  // Sync unit status
  db.prepare(`
    UPDATE units SET
      status = ?,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE property_id = ?
  `).run(normalizedStatus === 'available' ? 'available' : 'occupied', existing.id);

  res.json({
    message: `Property status updated to ${normalizedStatus}.`,
    status: normalizedStatus,
  });
}

/**
 * DELETE /api/owner/properties/:id
 * Delete property, blocked if active rental exists.
 */
export function deleteProperty(req, res) {
  const existing = db.prepare(
    'SELECT * FROM properties WHERE id = ? AND owner_id = ?'
  ).get(req.params.id, req.user.id);

  if (!existing) {
    return res.status(404).json({ error: 'Property not found.' });
  }

  // Prevent deletion if active rental exists
  const activeRental = db.prepare(
    "SELECT id FROM rentals WHERE property_id = ? AND status = 'active'"
  ).get(existing.id);

  if (activeRental) {
    return res.status(409).json({
      error: 'Cannot delete property: An active rental agreement exists for this property. Please terminate the rental before deleting.',
    });
  }

  const deleteTx = db.transaction(() => {
    // Delete associated units, requests, payments if any
    db.prepare('DELETE FROM units WHERE property_id = ?').run(existing.id);
    db.prepare('DELETE FROM rental_requests WHERE property_id = ?').run(existing.id);
    db.prepare('DELETE FROM properties WHERE id = ? AND owner_id = ?').run(existing.id, req.user.id);
  });

  deleteTx();

  res.json({ message: 'Property deleted successfully.' });
}
