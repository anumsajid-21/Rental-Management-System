import { db } from '../db/database.js';

// ---- Core aggregate counts ----
const totalUsersStmt = db.prepare('SELECT COUNT(*) as count FROM users');
const totalTenantsStmt = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'tenant'");
const totalOwnersStmt = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'property_owner'");
const totalActiveUsersStmt = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'active'");
const totalPropertiesStmt = db.prepare('SELECT COUNT(*) as count FROM properties');
const totalUnitsStmt = db.prepare('SELECT COUNT(*) as count FROM units');
const totalActiveRentalsStmt = db.prepare("SELECT COUNT(*) as count FROM rentals WHERE status = 'active'");
const totalRentalRequestsStmt = db.prepare('SELECT COUNT(*) as count FROM rental_requests');

// ---- Revenue breakdown by transaction status ----
const revenueByStatusStmt = db.prepare(`
  SELECT
    status,
    COALESCE(SUM(amount), 0) as total,
    COUNT(*) as count
  FROM transactions
  GROUP BY status
`);

// ---- Monthly revenue trend (last 6 months) ----
const monthlyRevenueStmt = db.prepare(`
  SELECT
    payment_month,
    COALESCE(SUM(amount), 0) as total,
    COUNT(*) as count
  FROM transactions
  WHERE status = 'paid'
  GROUP BY payment_month
  ORDER BY payment_month DESC
  LIMIT 6
`);

export const adminDashboardModel = {
  getDashboardStats: () => {
    const totalUsers = totalUsersStmt.get().count;
    const totalTenants = totalTenantsStmt.get().count;
    const totalOwners = totalOwnersStmt.get().count;
    const totalActiveUsers = totalActiveUsersStmt.get().count;
    const totalProperties = totalPropertiesStmt.get().count;
    const totalUnits = totalUnitsStmt.get().count;
    const totalActiveRentals = totalActiveRentalsStmt.get().count;
    const totalRentalRequests = totalRentalRequestsStmt.get().count;

    return {
      totalUsers,
      totalTenants,
      totalOwners,
      totalActiveUsers,
      totalProperties,
      totalUnits,
      totalActiveRentals,
      totalRentalRequests
    };
  },

  getRevenueByStatus: () => {
    return revenueByStatusStmt.all();
  },

  getMonthlyRevenue: () => {
    return monthlyRevenueStmt.all();
  },
};
