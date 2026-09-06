import crypto from 'node:crypto';
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
          p.name AS property_name, COALESCE(p.address, p.location) AS property_address
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
  rejected: [],
};

const SELECT_BASE = `
  SELECT m.*, p.name AS property_name, un.unit_number
  FROM maintenance_requests m
  JOIN properties p ON p.id = m.property_id
  LEFT JOIN units un ON un.id = m.unit_id
`;

function mapRequest(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    propertyId: row.property_id,
    unitId: row.unit_id,
    category: row.category,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    ownerResponse: row.owner_response || null,
    propertyName: row.property_name,
    unitNumber: row.unit_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const insertStmt = db.prepare(`
  INSERT INTO maintenance_requests (id, tenant_id, property_id, unit_id, category, title, description, priority)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

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

  /** Status starts at 'submitted'; only the owner workflow may change it later. */
  create({ tenantId, propertyId, unitId, category, title, description, priority }) {
    const id = crypto.randomUUID();
    insertStmt.run(id, tenantId, propertyId, unitId, category, title, description, priority);
    return mapRequest(db.prepare(`${SELECT_BASE} WHERE m.id = ?`).get(id));
  },

  findByIdForTenant(id, tenantId) {
    return mapRequest(
      db.prepare(`${SELECT_BASE} WHERE m.id = ? AND m.tenant_id = ?`).get(id, tenantId)
    );
  },

  listByTenant(tenantId) {
    return db
      .prepare(`${SELECT_BASE} WHERE m.tenant_id = ? ORDER BY m.created_at DESC`)
      .all(tenantId)
      .map(mapRequest);
  },

  listRecentByTenant(tenantId, limit = 5) {
    return db
      .prepare(`${SELECT_BASE} WHERE m.tenant_id = ? ORDER BY m.created_at DESC LIMIT ?`)
      .all(tenantId, limit)
      .map(mapRequest);
  },

  /** Open = submitted or in_progress (not yet resolved/rejected). */
  countOpenByTenant(tenantId) {
    const row = db
      .prepare(
        `SELECT COUNT(*) AS c FROM maintenance_requests WHERE tenant_id = ? AND status IN ('submitted', 'in_progress')`
      )
      .get(tenantId);
    return row.c;
  },

  listForAdmin({
    status = '',
    priority = '',
    propertyId = '',
    tenantId = '',
    ownerId = '',
    startDate = '',
    endDate = '',
    page = 1,
    limit = 20,
  } = {}) {
    const clauses = [];
    const params = [];
    if (status) {
      clauses.push('m.status = ?');
      params.push(status);
    }
    if (priority) {
      clauses.push('m.priority = ?');
      params.push(priority);
    }
    if (propertyId) {
      clauses.push('m.property_id = ?');
      params.push(propertyId);
    }
    if (tenantId) {
      clauses.push('m.tenant_id = ?');
      params.push(tenantId);
    }
    if (ownerId) {
      clauses.push('p.owner_id = ?');
      params.push(ownerId);
    }
    if (startDate) {
      clauses.push('date(m.created_at) >= date(?)');
      params.push(startDate);
    }
    if (endDate) {
      clauses.push('date(m.created_at) <= date(?)');
      params.push(endDate);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const from = `
      FROM maintenance_requests m
      JOIN properties p ON p.id = m.property_id
      LEFT JOIN units un ON un.id = m.unit_id
      JOIN users u ON u.id = m.tenant_id
    `;
    const total = db.prepare(`SELECT COUNT(*) AS count ${from} ${where}`).get(...params).count;
    const offset = (page - 1) * limit;
    const requests = db
      .prepare(
        `SELECT m.*, p.name AS property_name, un.unit_number, u.name AS tenant_name, p.owner_id
         ${from} ${where} ORDER BY m.created_at DESC LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset)
      .map((row) => ({
        ...mapRequest(row),
        tenantName: row.tenant_name,
        ownerId: row.owner_id,
      }));
    return { requests, maintenance: requests, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  },

  getRecent(limit = 5) {
    return db
      .prepare(`${SELECT_BASE} ORDER BY m.created_at DESC LIMIT ?`)
      .all(limit)
      .map(mapRequest);
  },

  getCountsByStatus() {
    return db
      .prepare('SELECT status, COUNT(*) AS count FROM maintenance_requests GROUP BY status')
      .all();
  },

  getCountsByPriority() {
    return db
      .prepare('SELECT priority, COUNT(*) AS count FROM maintenance_requests GROUP BY priority')
      .all();
  },
};
