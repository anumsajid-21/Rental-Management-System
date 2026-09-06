import { db } from '../db/database.js';

const rentStmt = db.prepare(
  `SELECT
     COALESCE(SUM(rp.amount), 0) AS totalRent,
     COALESCE(SUM(CASE WHEN rp.status = 'paid' THEN rp.amount END), 0) AS paidRent,
     COALESCE(SUM(CASE WHEN rp.status = 'pending' AND rp.due_date >= date('now') THEN rp.amount END), 0) AS pendingRent,
     COALESCE(SUM(CASE WHEN rp.status = 'overdue' OR (rp.status = 'pending' AND rp.due_date < date('now')) THEN rp.amount END), 0) AS overdueRent
   FROM rent_payments rp JOIN properties p ON p.id = rp.property_id
   WHERE p.owner_id = ?`
);

const propertyStmt = db.prepare(
  `SELECT COUNT(*) AS total,
     COUNT(CASE WHEN status = 'available' THEN 1 END) AS available,
     COUNT(CASE WHEN status = 'occupied' THEN 1 END) AS occupied,
     COUNT(CASE WHEN status = 'maintenance' THEN 1 END) AS maintenance,
     COUNT(CASE WHEN status = 'inactive' THEN 1 END) AS inactive
   FROM properties WHERE owner_id = ?`
);

const maintenanceStmt = db.prepare(
  `SELECT COUNT(*) AS total,
     COUNT(CASE WHEN m.status = 'submitted' THEN 1 END) AS submitted,
     COUNT(CASE WHEN m.status = 'in_progress' THEN 1 END) AS inProgress,
     COUNT(CASE WHEN m.status = 'resolved' THEN 1 END) AS resolved
   FROM maintenance_requests m JOIN properties p ON p.id = m.property_id
   WHERE p.owner_id = ?`
);

const tenantStmt = db.prepare(
  `SELECT
     COUNT(DISTINCT r.tenant_id) AS totalTenants,
     COUNT(DISTINCT CASE WHEN r.status = 'active' THEN r.tenant_id END) AS activeTenants,
     (SELECT COUNT(*) FROM rentals r2 JOIN properties p2 ON p2.id = r2.property_id
      WHERE p2.owner_id = ? AND r2.status = 'pending') AS pendingRequests
   FROM rentals r JOIN properties p ON p.id = r.property_id
   WHERE p.owner_id = ?`
);

/* ---- Chart data (all owner-scoped, computed from real DB rows) ---- */

// Monthly revenue (collected rent + transactions) for the last 6 months.
const revenueTrendStmt = db.prepare(
  `WITH months AS (
     SELECT strftime('%Y-%m', date('now', '-5 months')) AS m
     UNION ALL SELECT strftime('%Y-%m', date('now', '-4 months'))
     UNION ALL SELECT strftime('%Y-%m', date('now', '-3 months'))
     UNION ALL SELECT strftime('%Y-%m', date('now', '-2 months'))
     UNION ALL SELECT strftime('%Y-%m', date('now', '-1 months'))
     UNION ALL SELECT strftime('%Y-%m', date('now'))
   )
   SELECT months.m AS month,
     COALESCE((SELECT SUM(rp.amount) FROM rent_payments rp
               JOIN properties p ON p.id = rp.property_id
               WHERE p.owner_id = ? AND rp.status = 'paid' AND rp.rent_month = months.m), 0) AS collected,
     COALESCE((SELECT SUM(rp.amount) FROM rent_payments rp
               JOIN properties p ON p.id = rp.property_id
               WHERE p.owner_id = ? AND rp.status IN ('pending','overdue') AND rp.rent_month = months.m), 0) AS outstanding
   FROM months ORDER BY months.m`
);

// Property status distribution (for the donut chart).
const propertyStatusStmt = db.prepare(
  `SELECT status, COUNT(*) AS count FROM properties WHERE owner_id = ? GROUP BY status`
);

// Property type distribution (secondary donut/bars).
const propertyTypeStmt = db.prepare(
  `SELECT property_type AS type, COUNT(*) AS count FROM properties WHERE owner_id = ? GROUP BY property_type ORDER BY count DESC`
);

// Maintenance by status and by priority.
const maintenanceStatusStmt = db.prepare(
  `SELECT m.status, COUNT(*) AS count
   FROM maintenance_requests m JOIN properties p ON p.id = m.property_id
   WHERE p.owner_id = ? GROUP BY m.status`
);
const maintenancePriorityStmt = db.prepare(
  `SELECT m.priority, COUNT(*) AS count
   FROM maintenance_requests m JOIN properties p ON p.id = m.property_id
   WHERE p.owner_id = ? GROUP BY m.priority`
);

// Rental statistics: rentals by status + expected monthly income from active rentals.
const rentalStatsStmt = db.prepare(
  `SELECT
     COUNT(*) AS total,
     COUNT(CASE WHEN r.status = 'pending' THEN 1 END) AS pending,
     COUNT(CASE WHEN r.status = 'active' THEN 1 END) AS active,
     COUNT(CASE WHEN r.status = 'ended' THEN 1 END) AS ended,
     COALESCE(SUM(CASE WHEN r.status = 'active' THEN r.monthly_rent END), 0) AS monthlyIncome
   FROM rentals r JOIN properties p ON p.id = r.property_id
   WHERE p.owner_id = ?`
);

export const reportModel = {
  summary(ownerId) {
    return {
      revenue: rentStmt.get(ownerId),
      properties: propertyStmt.get(ownerId),
      maintenance: maintenanceStmt.get(ownerId),
      tenants: tenantStmt.get(ownerId, ownerId),
    };
  },

  /** Extra datasets used by the Reports page charts. */
  charts(ownerId) {
    return {
      revenueTrend: revenueTrendStmt.all(ownerId, ownerId),
      propertyStatus: propertyStatusStmt.all(ownerId),
      propertyTypes: propertyTypeStmt.all(ownerId),
      maintenanceByStatus: maintenanceStatusStmt.all(ownerId),
      maintenanceByPriority: maintenancePriorityStmt.all(ownerId),
      rentals: rentalStatsStmt.get(ownerId),
    };
  },
};
