import { db } from '../db/database.js';

const listStmt = db.prepare(
  `SELECT m.*, u.name AS tenant_name, p.name AS property_name
   FROM maintenance_requests m
   JOIN users u ON u.id = m.tenant_id
   JOIN properties p ON p.id = m.property_id
   WHERE p.owner_id = ?
   ORDER BY m.created_at DESC`
);

const listFilteredStmt = db.prepare(
  `SELECT m.*, u.name AS tenant_name, p.name AS property_name
   FROM maintenance_requests m
   JOIN users u ON u.id = m.tenant_id
   JOIN properties p ON p.id = m.property_id
   WHERE p.owner_id = @ownerId
     AND (@status IS NULL OR m.status = @status)
     AND (@search IS NULL OR u.name LIKE '%' || @search || '%' OR p.name LIKE '%' || @search || '%' OR m.title LIKE '%' || @search || '%')
   ORDER BY m.created_at DESC`
);

const findOwnedStmt = db.prepare(
  `SELECT m.*, u.name AS tenant_name, u.email AS tenant_email,
          p.name AS property_name, p.address AS property_address
   FROM maintenance_requests m
   JOIN users u ON u.id = m.tenant_id
   JOIN properties p ON p.id = m.property_id
   WHERE m.id = ? AND p.owner_id = ?`
);

const updateStatusStmt = db.prepare(
  `UPDATE maintenance_requests SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
   WHERE id = ? AND status = ?
     AND property_id IN (SELECT id FROM properties WHERE owner_id = ?)`
);

/** Allowed forward-only transitions: submitted → in_progress → resolved. */
const TRANSITIONS = {
  submitted: ['in_progress'],
  in_progress: ['resolved'],
  resolved: [],
};

export const maintenanceModel = {
  TRANSITIONS,

  list: (ownerId, { status, search } = {}) => {
    const st = status && status !== 'all' ? status : null;
    const s = search && String(search).trim() ? String(search).trim() : null;
    return listFilteredStmt.all({ ownerId, status: st, search: s });
  },

  listAll: (ownerId) => listStmt.all(ownerId),

  /** Authorisation-safe: request only if its property belongs to this owner. */
  findByIdAndOwner: (id, ownerId) => findOwnedStmt.get(id, ownerId) || null,

  updateStatus(id, ownerId, nextStatus) {
    const current = findOwnedStmt.get(id, ownerId);
    if (!current) return { ok: false, error: 'Maintenance request not found.' };
    const allowed = TRANSITIONS[current.status] || [];
    if (!allowed.includes(nextStatus)) {
      return { ok: false, error: `Cannot change status from '${current.status}' to '${nextStatus}'.` };
    }
    const result = updateStatusStmt.run(nextStatus, id, current.status, ownerId);
    if (result.changes === 0) return { ok: false, error: 'Could not update the request. Please try again.' };
    return { ok: true, request: findOwnedStmt.get(id, ownerId) };
  },
};
