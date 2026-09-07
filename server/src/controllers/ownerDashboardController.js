import { db } from '../db/database.js';

/**
 * GET /api/owner/dashboard
 * Return owner dashboard metrics and recent rental requests.
 * Strictly scoped to the logged-in owner.
 */
export function getDashboard(req, res) {
  const ownerId = req.user.id;

  const propCounts = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available,
      SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) AS occupied,
      SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactive
    FROM properties
    WHERE owner_id = ?
  `).get(ownerId);

  const pendingRequestsCount = db.prepare(`
    SELECT COUNT(*) AS count
    FROM rental_requests rr
    JOIN properties p ON p.id = rr.property_id
    WHERE p.owner_id = ? AND rr.status = 'pending'
  `).get(ownerId)?.count || 0;

  const recentRequests = db.prepare(`
    SELECT
      rr.id,
      rr.status,
      rr.monthly_rent,
      rr.move_in_date,
      rr.created_at,
      p.id AS property_id,
      p.name AS property_name,
      p.address AS property_address,
      p.city AS property_city,
      t.name AS tenant_name,
      t.email AS tenant_email
    FROM rental_requests rr
    JOIN properties p ON p.id = rr.property_id
    JOIN users t ON t.id = rr.tenant_id
    WHERE p.owner_id = ?
    ORDER BY rr.created_at DESC
    LIMIT 5
  `).all(ownerId);

  res.json({
    ownerName: req.user.name,
    stats: {
      totalProperties: propCounts.total || 0,
      availableProperties: propCounts.available || 0,
      occupiedProperties: propCounts.occupied || 0,
      inactiveProperties: propCounts.inactive || 0,
      pendingRequests: pendingRequestsCount,
    },
    recentRequests,
  });
}
