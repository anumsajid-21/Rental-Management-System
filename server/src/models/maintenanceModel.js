<<<<<<< HEAD
=======
import crypto from 'node:crypto';
>>>>>>> 89a2e32bf6f31a866729cdbd13dfda64daff2406
import { db } from '../db/database.js';

const listStmt = db.prepare(`
  SELECT 
    mr.*,
    t.name as tenant_name,
    t.email as tenant_email,
    o.name as owner_name,
    o.email as owner_email,
    p.name as property_name,
    u.unit_number
  FROM maintenance_requests mr
  JOIN users t ON mr.tenant_id = t.id
  JOIN properties p ON mr.property_id = p.id
  JOIN users o ON p.owner_id = o.id
  JOIN units u ON mr.unit_id = u.id
  WHERE (? = '' OR mr.status = ?)
    AND (? = '' OR mr.priority = ?)
    AND (? = '' OR mr.property_id = ?)
    AND (? = '' OR mr.tenant_id = ?)
    AND (? = '' OR p.owner_id = ?)
    AND (? = '' OR mr.created_at >= ?)
    AND (? = '' OR mr.created_at <= ?)
  ORDER BY mr.created_at DESC
  LIMIT ? OFFSET ?
`);
const countStmt = db.prepare(`
  SELECT COUNT(*) as count
  FROM maintenance_requests mr
  JOIN properties p ON mr.property_id = p.id
  WHERE (? = '' OR mr.status = ?)
    AND (? = '' OR mr.priority = ?)
    AND (? = '' OR mr.property_id = ?)
    AND (? = '' OR mr.tenant_id = ?)
    AND (? = '' OR p.owner_id = ?)
    AND (? = '' OR mr.created_at >= ?)
    AND (? = '' OR mr.created_at <= ?)
`);
const recentStmt = db.prepare(`
  SELECT 
    mr.*,
    t.name as tenant_name,
    p.name as property_name
  FROM maintenance_requests mr
  JOIN users t ON mr.tenant_id = t.id
  JOIN properties p ON mr.property_id = p.id
  ORDER BY mr.created_at DESC
  LIMIT 10
`);
const countByStatusStmt = db.prepare(`
  SELECT status, COUNT(*) as count
  FROM maintenance_requests
  GROUP BY status
`);
const countByPriorityStmt = db.prepare(`
  SELECT priority, COUNT(*) as count
  FROM maintenance_requests
  GROUP BY priority
`);

<<<<<<< HEAD
export function toPublicMaintenanceRequest(row) {
=======
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
>>>>>>> 89a2e32bf6f31a866729cdbd13dfda64daff2406
  return {
    id: row.id,
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    tenantEmail: row.tenant_email,
    ownerId: row.owner_name,
    ownerEmail: row.owner_email,
    propertyId: row.property_id,
    propertyName: row.property_name,
    unitId: row.unit_id,
    unitNumber: row.unit_number,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const maintenanceModel = {
<<<<<<< HEAD
  list: ({ 
    status = '', 
    priority = '', 
    propertyId = '', 
    tenantId = '', 
    ownerId = '',
    startDate = '', 
    endDate = '',
    page = 1, 
    limit = 20 
  }) => {
    const offset = (page - 1) * limit;
    
    const requests = listStmt.all(
      status, status,
      priority, priority,
      propertyId, propertyId,
      tenantId, tenantId,
      ownerId, ownerId,
      startDate, startDate,
      endDate, endDate,
      limit, offset
=======
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
>>>>>>> 89a2e32bf6f31a866729cdbd13dfda64daff2406
    );
    
    const { count } = countStmt.get(
      status, status,
      priority, priority,
      propertyId, propertyId,
      tenantId, tenantId,
      ownerId, ownerId,
      startDate, startDate,
      endDate, endDate
    );
    
    return {
      requests: requests.map(toPublicMaintenanceRequest),
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  },

  getRecent: () => {
    return recentStmt.all().map(toPublicMaintenanceRequest);
  },

  getCountsByStatus: () => {
    return countByStatusStmt.all();
  },

<<<<<<< HEAD
  getCountsByPriority: () => {
    return countByPriorityStmt.all();
=======
  /** Open = submitted or in_progress (not yet resolved/rejected). */
  countOpenByTenant(tenantId) {
    const row = db
      .prepare(
        `SELECT COUNT(*) AS c FROM maintenance_requests WHERE tenant_id = ? AND status IN ('submitted', 'in_progress')`
      )
      .get(tenantId);
    return row.c;
>>>>>>> 89a2e32bf6f31a866729cdbd13dfda64daff2406
  },
};
