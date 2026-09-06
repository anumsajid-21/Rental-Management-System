import { db } from '../db/database.js';

const totalUsersStmt = db.prepare('SELECT COUNT(*) as count FROM users');
const totalTenantsStmt = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'tenant'");
const totalOwnersStmt = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'property_owner'");
const totalActiveUsersStmt = db.prepare("SELECT COUNT(*) as count FROM users WHERE COALESCE(status, 'active') = 'active'");
const totalPropertiesStmt = db.prepare('SELECT COUNT(*) as count FROM properties');
const totalUnitsStmt = db.prepare('SELECT COUNT(*) as count FROM units');
const totalActiveRentalsStmt = db.prepare("SELECT COUNT(*) as count FROM rentals WHERE status = 'active'");
const totalRentalRequestsStmt = db.prepare('SELECT COUNT(*) as count FROM rental_requests');

const revenueByStatusStmt = db.prepare(`
  SELECT
    status,
    COALESCE(SUM(amount), 0) as total,
    COUNT(*) as count
  FROM transactions
  GROUP BY status
`);

const monthlyRevenueStmt = db.prepare(`
  SELECT
    rent_month AS payment_month,
    COALESCE(SUM(amount), 0) as total,
    COUNT(*) as count
  FROM transactions
  WHERE status = 'paid' AND rent_month IS NOT NULL
  GROUP BY rent_month
  ORDER BY rent_month DESC
  LIMIT 6
`);

export const adminDashboardModel = {
  getDashboardStats: () => ({
    totalUsers: totalUsersStmt.get().count,
    totalTenants: totalTenantsStmt.get().count,
    totalOwners: totalOwnersStmt.get().count,
    totalActiveUsers: totalActiveUsersStmt.get().count,
    totalProperties: totalPropertiesStmt.get().count,
    totalUnits: totalUnitsStmt.get().count,
    totalActiveRentals: totalActiveRentalsStmt.get().count,
    totalRentalRequests: totalRentalRequestsStmt.get().count,
  }),

  getRevenueByStatus: () => revenueByStatusStmt.all(),

  getMonthlyRevenue: () => monthlyRevenueStmt.all(),
};
