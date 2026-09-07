import crypto from 'node:crypto';
import { db } from '../db/database.js';

const SELECT_REQUESTS_BASE = `
  SELECT rr.*,
    p.name AS property_name,
    p.address AS property_address,
    p.city AS property_city,
    p.property_type AS property_type,
    p.status AS property_status,
    t.name AS tenant_name,
    t.email AS tenant_email,
    t.phone AS tenant_phone
  FROM rental_requests rr
  JOIN properties p ON p.id = rr.property_id
  JOIN users t ON t.id = rr.tenant_id
`;

/**
 * GET /api/owner/rental-requests
 * List all rental requests for properties owned by this owner.
 */
export function listRentalRequests(req, res) {
  const status = req.query.status && req.query.status !== 'all' ? req.query.status : null;
  const search = req.query.search ? `%${String(req.query.search).trim()}%` : null;

  let query = `${SELECT_REQUESTS_BASE} WHERE p.owner_id = ?`;
  const params = [req.user.id];

  if (status) {
    // Map 'accepted' to 'approved' for DB compatibility
    const dbStatus = status === 'accepted' ? 'approved' : status;
    query += ' AND rr.status = ?';
    params.push(dbStatus);
  }

  if (search) {
    query += ' AND (t.name LIKE ? OR t.email LIKE ? OR p.name LIKE ? OR p.address LIKE ?)';
    params.push(search, search, search, search);
  }

  query += ' ORDER BY rr.created_at DESC';

  const rows = db.prepare(query).all(...params);
  const requests = rows.map((r) => ({
    id: r.id,
    tenant_id: r.tenant_id,
    tenant_name: r.tenant_name,
    tenant_email: r.tenant_email,
    tenant_phone: r.tenant_phone || '',
    property_id: r.property_id,
    property_name: r.property_name,
    property_address: r.property_address || '',
    property_city: r.property_city || '',
    property_type: r.property_type,
    property_status: r.property_status,
    unit_id: r.unit_id,
    monthly_rent: r.monthly_rent,
    move_in_date: r.move_in_date,
    status: r.status, // 'pending', 'approved', 'rejected', 'cancelled'
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  res.json({ requests });
}

/**
 * GET /api/owner/rental-requests/:id
 * Retrieve a specific rental request for owner's property.
 */
export function getRentalRequest(req, res) {
  const row = db.prepare(
    `${SELECT_REQUESTS_BASE} WHERE rr.id = ? AND p.owner_id = ?`
  ).get(req.params.id, req.user.id);

  if (!row) {
    return res.status(404).json({ error: 'Rental request not found.' });
  }

  res.json({
    request: {
      id: row.id,
      tenant_id: row.tenant_id,
      tenant_name: row.tenant_name,
      tenant_email: row.tenant_email,
      tenant_phone: row.tenant_phone || '',
      property_id: row.property_id,
      property_name: row.property_name,
      property_address: row.property_address || '',
      property_city: row.property_city || '',
      property_type: row.property_type,
      property_status: row.property_status,
      unit_id: row.unit_id,
      monthly_rent: row.monthly_rent,
      move_in_date: row.move_in_date,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
  });
}

/**
 * POST /api/owner/rental-requests/:id/accept
 * Accept a rental request:
 * - Changes request status to 'approved' (displayed as Accepted)
 * - Creates an active rental record in existing rentals table
 * - Changes property status to 'occupied'
 * - Changes unit status to 'occupied'
 */
export function acceptRentalRequest(req, res) {
  const request = db.prepare(
    `${SELECT_REQUESTS_BASE} WHERE rr.id = ? AND p.owner_id = ?`
  ).get(req.params.id, req.user.id);

  if (!request) {
    return res.status(404).json({ error: 'Rental request not found.' });
  }

  if (request.status !== 'pending') {
    return res.status(400).json({
      error: `Cannot accept this request because it is already marked as ${request.status}.`,
    });
  }

  const rentalId = crypto.randomUUID();
  const startDate = request.move_in_date || new Date().toISOString().slice(0, 10);

  const acceptTx = db.transaction(() => {
    // 1. Update request status to approved
    db.prepare(`
      UPDATE rental_requests SET
        status = 'approved',
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE id = ?
    `).run(request.id);

    // 2. Create active rental record
    db.prepare(`
      INSERT INTO rentals (
        id, tenant_id, property_id, unit_id, owner_id,
        monthly_rent, start_date, status, created_at, updated_at
      ) VALUES (
        @id, @tenant_id, @property_id, @unit_id, @owner_id,
        @monthly_rent, @start_date, 'active',
        strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')
      )
    `).run({
      id: rentalId,
      tenant_id: request.tenant_id,
      property_id: request.property_id,
      unit_id: request.unit_id,
      owner_id: req.user.id,
      monthly_rent: request.monthly_rent,
      start_date: startDate,
    });

    // 3. Set property status to occupied
    db.prepare(`
      UPDATE properties SET
        status = 'occupied',
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE id = ?
    `).run(request.property_id);

    // 4. Set unit status to occupied
    if (request.unit_id) {
      db.prepare(`
        UPDATE units SET
          status = 'occupied',
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
        WHERE id = ?
      `).run(request.unit_id);
    }

    // 5. Automatically reject other pending requests for this property/unit
    db.prepare(`
      UPDATE rental_requests SET
        status = 'rejected',
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE property_id = ? AND id != ? AND status = 'pending'
    `).run(request.property_id, request.id);
  });

  acceptTx();

  const updatedRequest = db.prepare(
    `${SELECT_REQUESTS_BASE} WHERE rr.id = ?`
  ).get(request.id);

  res.json({
    message: 'Rental request accepted. The property is now marked as Occupied and a rental agreement is created.',
    request: updatedRequest,
    rentalId,
  });
}

/**
 * POST /api/owner/rental-requests/:id/reject
 * Reject a rental request:
 * - Changes request status to 'rejected'
 */
export function rejectRentalRequest(req, res) {
  const request = db.prepare(
    `${SELECT_REQUESTS_BASE} WHERE rr.id = ? AND p.owner_id = ?`
  ).get(req.params.id, req.user.id);

  if (!request) {
    return res.status(404).json({ error: 'Rental request not found.' });
  }

  if (request.status !== 'pending') {
    return res.status(400).json({
      error: `Cannot reject this request because it is already marked as ${request.status}.`,
    });
  }

  db.prepare(`
    UPDATE rental_requests SET
      status = 'rejected',
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = ?
  `).run(request.id);

  const updatedRequest = db.prepare(
    `${SELECT_REQUESTS_BASE} WHERE rr.id = ?`
  ).get(request.id);

  res.json({
    message: 'Rental request rejected.',
    request: updatedRequest,
  });
}
