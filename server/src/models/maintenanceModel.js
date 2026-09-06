import crypto from 'node:crypto';
import { db } from '../db/database.js';

const SELECT_BASE = `
  SELECT m.*, p.name AS property_name, un.unit_number
  FROM maintenance_requests m
  JOIN properties p ON p.id = m.property_id
  JOIN units un ON un.id = m.unit_id
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
};
