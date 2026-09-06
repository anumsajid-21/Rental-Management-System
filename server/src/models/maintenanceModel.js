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

export function toPublicMaintenanceRequest(row) {
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

  getCountsByPriority: () => {
    return countByPriorityStmt.all();
  },
};
