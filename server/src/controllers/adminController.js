import { userModel, toPublicUser } from '../models/userModel.js';
import { propertyModel } from '../models/propertyModel.js';
import { rentalRequestModel } from '../models/rentalRequestModel.js';
import { rentalModel } from '../models/rentalModel.js';
import { transactionModel } from '../models/transactionModel.js';
import { maintenanceModel } from '../models/maintenanceModel.js';
import { adminDashboardModel } from '../models/adminDashboardModel.js';

const VALID_ROLES = ['tenant', 'property_owner', 'admin'];
const VALID_STATUSES = ['active', 'inactive', 'deactivated'];

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export function getDashboard(req, res) {
  try {
    const stats = adminDashboardModel.getDashboardStats();
    const rentalRequestCounts = rentalRequestModel.getCountsByStatus();
    const rentalCounts = rentalModel.getCountsByStatus();
    const transactionCounts = transactionModel.getCountsByStatus();
    const maintenanceCounts = maintenanceModel.getCountsByStatus();
    const maintenancePriorityCounts = maintenanceModel.getCountsByPriority();
    const totalRevenue = transactionModel.getTotalRevenue();
    const revenueByStatus = adminDashboardModel.getRevenueByStatus();
    const monthlyRevenue = adminDashboardModel.getMonthlyRevenue();
    const recentTransactions = transactionModel.getRecent();
    const recentMaintenance = maintenanceModel.getRecent();

    res.json({
      stats,
      rentalRequests: {
        total: rentalRequestCounts.reduce((sum, r) => sum + r.count, 0),
        byStatus: rentalRequestCounts
      },
      rentals: {
        total: rentalCounts.reduce((sum, r) => sum + r.count, 0),
        byStatus: rentalCounts
      },
      transactions: {
        totalRevenue,
        byStatus: transactionCounts,
        revenueByStatus,
        monthlyRevenue,
      },
      maintenance: {
        total: maintenanceCounts.reduce((sum, r) => sum + r.count, 0),
        byStatus: maintenanceCounts,
        byPriority: maintenancePriorityCounts,
      },
      recentTransactions,
      recentMaintenance
    });
  } catch (error) {
    console.error('[admin] dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data.' });
  }
}

// ---------------------------------------------------------------------------
// User Management
// ---------------------------------------------------------------------------
export function getUsers(req, res) {
  try {
    const { search = '', role = '', status = '', page = 1, limit = 20 } = req.query;

    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));

    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Invalid role filter.' });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status filter.' });
    }

    const result = userModel.list({
      search: String(search).trim(),
      role,
      status,
      page: validatedPage,
      limit: validatedLimit
    });

    res.json(result);
  } catch (error) {
    console.error('[admin] users error:', error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
}

export function getUserById(req, res) {
  try {
    const { id } = req.params;
    const user = userModel.findById(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user: toPublicUser(user) });
  } catch (error) {
    console.error('[admin] user error:', error);
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
}

export function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, email, role, status } = req.body;

    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Allowed: tenant, property_owner, admin.' });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Allowed: active, inactive, deactivated.' });
    }

    // Prevent admins from demoting themselves
    if (id === req.user.id && role && role !== 'admin') {
      return res.status(403).json({ error: 'You cannot change your own role.' });
    }

    // Prevent admins from deactivating themselves via this route too
    if (id === req.user.id && status && status !== 'active') {
      return res.status(403).json({ error: 'You cannot deactivate your own account.' });
    }

    const result = userModel.update(id, { name, email, role, status });

    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ user: result.user, message: 'User updated successfully.' });
  } catch (error) {
    console.error('[admin] update user error:', error);
    res.status(500).json({ error: 'Failed to update user.' });
  }
}

export function updateUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Allowed: active, inactive, deactivated.' });
    }

    if (id === req.user.id) {
      return res.status(403).json({ error: 'You cannot change your own account status.' });
    }

    const result = userModel.updateStatus(id, status);

    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }

    const label = status === 'active' ? 'activated' : status;
    res.json({ user: result.user, message: `Account has been ${label} successfully.` });
  } catch (error) {
    console.error('[admin] update status error:', error);
    res.status(500).json({ error: 'Failed to update user status.' });
  }
}

// ---------------------------------------------------------------------------
// Property Oversight
// ---------------------------------------------------------------------------
export function getProperties(req, res) {
  try {
    const { search = '', city = '', status = '', propertyType = '', ownerId = '', page = 1, limit = 20 } = req.query;

    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));

    const result = propertyModel.list({
      search: String(search).trim(),
      city,
      status,
      propertyType,
      ownerId,
      page: validatedPage,
      limit: validatedLimit
    });

    res.json(result);
  } catch (error) {
    console.error('[admin] properties error:', error);
    res.status(500).json({ error: 'Failed to fetch properties.' });
  }
}

export function getPropertyById(req, res) {
  try {
    const { id } = req.params;
    const property = propertyModel.findById(id);

    if (!property) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    res.json({ property });
  } catch (error) {
    console.error('[admin] property error:', error);
    res.status(500).json({ error: 'Failed to fetch property.' });
  }
}

// ---------------------------------------------------------------------------
// Rental Requests
// ---------------------------------------------------------------------------
export function getRentalRequests(req, res) {
  try {
    const { status = '', page = 1, limit = 20 } = req.query;

    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));

    if (status && !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid rental request status filter.' });
    }

    const result = rentalRequestModel.list({
      status,
      page: validatedPage,
      limit: validatedLimit
    });

    const statusCounts = rentalRequestModel.getCountsByStatus();

    res.json({ ...result, statusCounts });
  } catch (error) {
    console.error('[admin] rental requests error:', error);
    res.status(500).json({ error: 'Failed to fetch rental requests.' });
  }
}

// ---------------------------------------------------------------------------
// Rentals
// ---------------------------------------------------------------------------
export function getRentals(req, res) {
  try {
    const { status = '', page = 1, limit = 20 } = req.query;

    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));

    if (status && !['active', 'ended', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid rental status filter.' });
    }

    const result = rentalModel.list({
      status,
      page: validatedPage,
      limit: validatedLimit
    });

    const statusCounts = rentalModel.getCountsByStatus();

    res.json({ ...result, statusCounts });
  } catch (error) {
    console.error('[admin] rentals error:', error);
    res.status(500).json({ error: 'Failed to fetch rentals.' });
  }
}

// ---------------------------------------------------------------------------
// Transactions & Revenue Auditing
// ---------------------------------------------------------------------------
export function getTransactions(req, res) {
  try {
    const {
      status = '',
      tenantId = '',
      ownerId = '',
      propertyId = '',
      startDate = '',
      endDate = '',
      page = 1,
      limit = 20
    } = req.query;

    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));

    if (status && !['pending', 'paid', 'overdue', 'failed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid transaction status filter.' });
    }

    const result = transactionModel.list({
      status,
      tenantId: String(tenantId).trim(),
      ownerId: String(ownerId).trim(),
      propertyId: String(propertyId).trim(),
      startDate: String(startDate).trim(),
      endDate: String(endDate).trim(),
      page: validatedPage,
      limit: validatedLimit
    });

    // Revenue totals
    const totalRevenue = transactionModel.getTotalRevenue();
    const statusCounts = transactionModel.getCountsByStatus();

    res.json({ ...result, totalRevenue, statusCounts });
  } catch (error) {
    console.error('[admin] transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions.' });
  }
}

// ---------------------------------------------------------------------------
// Maintenance Oversight
// ---------------------------------------------------------------------------
export function getMaintenance(req, res) {
  try {
    const {
      status = '',
      priority = '',
      propertyId = '',
      tenantId = '',
      ownerId = '',
      startDate = '',
      endDate = '',
      page = 1,
      limit = 20
    } = req.query;

    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));

    if (status && !['submitted', 'in_progress', 'resolved', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid maintenance status filter.' });
    }

    if (priority && !['low', 'medium', 'high', 'urgent'].includes(priority)) {
      return res.status(400).json({ error: 'Invalid maintenance priority filter.' });
    }

    const result = maintenanceModel.list({
      status,
      priority,
      propertyId: String(propertyId).trim(),
      tenantId: String(tenantId).trim(),
      ownerId: String(ownerId).trim(),
      startDate: String(startDate).trim(),
      endDate: String(endDate).trim(),
      page: validatedPage,
      limit: validatedLimit
    });

    const statusCounts = maintenanceModel.getCountsByStatus();
    const priorityCounts = maintenanceModel.getCountsByPriority();

    res.json({ ...result, statusCounts, priorityCounts });
  } catch (error) {
    console.error('[admin] maintenance error:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance requests.' });
  }
}

// ---------------------------------------------------------------------------
// Reports & Exportable Analytics
// ---------------------------------------------------------------------------
export function getReportsSummary(req, res) {
  try {
    const stats = adminDashboardModel.getDashboardStats();
    const rentalRequestCounts = rentalRequestModel.getCountsByStatus();
    const rentalCounts = rentalModel.getCountsByStatus();
    const transactionCounts = transactionModel.getCountsByStatus();
    const maintenanceCounts = maintenanceModel.getCountsByStatus();
    const maintenancePriorityCounts = maintenanceModel.getCountsByPriority();
    const totalRevenue = transactionModel.getTotalRevenue();
    const revenueByStatus = adminDashboardModel.getRevenueByStatus();
    const monthlyRevenue = adminDashboardModel.getMonthlyRevenue();

    res.json({
      users: {
        total: stats.totalUsers,
        tenants: stats.totalTenants,
        owners: stats.totalOwners,
        active: stats.totalActiveUsers
      },
      properties: {
        total: stats.totalProperties,
        units: stats.totalUnits
      },
      rentals: {
        total: rentalCounts.reduce((sum, r) => sum + r.count, 0),
        active: stats.totalActiveRentals,
        byStatus: rentalCounts
      },
      rentalRequests: {
        total: rentalRequestCounts.reduce((sum, r) => sum + r.count, 0),
        byStatus: rentalRequestCounts
      },
      transactions: {
        totalRevenue,
        byStatus: transactionCounts,
        revenueByStatus,
        monthlyRevenue,
      },
      maintenance: {
        total: maintenanceCounts.reduce((sum, r) => sum + r.count, 0),
        byStatus: maintenanceCounts,
        byPriority: maintenancePriorityCounts,
      }
    });
  } catch (error) {
    console.error('[admin] reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports data.' });
  }
}

export function exportReports(req, res) {
  try {
    const { type = 'summary', format = 'json' } = req.query;

    if (type === 'summary') {
      const stats = adminDashboardModel.getDashboardStats();
      const rentalRequestCounts = rentalRequestModel.getCountsByStatus();
      const rentalCounts = rentalModel.getCountsByStatus();
      const transactionCounts = transactionModel.getCountsByStatus();
      const maintenanceCounts = maintenanceModel.getCountsByStatus();
      const totalRevenue = transactionModel.getTotalRevenue();

      const summaryData = {
        users: {
          total: stats.totalUsers,
          tenants: stats.totalTenants,
          owners: stats.totalOwners,
          active: stats.totalActiveUsers
        },
        properties: {
          total: stats.totalProperties,
          units: stats.totalUnits
        },
        rentals: {
          total: rentalCounts.reduce((sum, r) => sum + r.count, 0),
          active: stats.totalActiveRentals,
          byStatus: rentalCounts
        },
        rentalRequests: {
          total: rentalRequestCounts.reduce((sum, r) => sum + r.count, 0),
          byStatus: rentalRequestCounts
        },
        transactions: {
          totalRevenue,
          byStatus: transactionCounts
        },
        maintenance: {
          total: maintenanceCounts.reduce((sum, r) => sum + r.count, 0),
          byStatus: maintenanceCounts
        },
        exportedAt: new Date().toISOString()
      };

      if (format === 'csv') {
        const csvRows = [
          'Section,Metric,Value',
          `Users,Total,${stats.totalUsers}`,
          `Users,Tenants,${stats.totalTenants}`,
          `Users,Property Owners,${stats.totalOwners}`,
          `Users,Active,${stats.totalActiveUsers}`,
          `Properties,Total,${stats.totalProperties}`,
          `Properties,Total Units,${stats.totalUnits}`,
          `Rentals,Total,${summaryData.rentals.total}`,
          `Rentals,Active,${stats.totalActiveRentals}`,
          ...rentalCounts.map(r => `Rentals,${r.status},${r.count}`),
          `Rental Requests,Total,${summaryData.rentalRequests.total}`,
          ...rentalRequestCounts.map(r => `Rental Requests,${r.status},${r.count}`),
          `Transactions,Total Revenue,${totalRevenue}`,
          ...transactionCounts.map(r => `Transactions,${r.status},${r.count}`),
          `Maintenance,Total,${summaryData.maintenance.total}`,
          ...maintenanceCounts.map(r => `Maintenance,${r.status},${r.count}`),
        ];

        const csv = csvRows.join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="rental-system-summary.csv"');
        return res.send(csv);
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="rental-system-summary.json"');
      return res.send(JSON.stringify(summaryData, null, 2));
    }

    if (type === 'transactions') {
      const transactions = transactionModel.list({ page: 1, limit: 10000 });
      if (format === 'csv') {
        const csvRows = [
          'ID,Tenant,Owner,Property,Unit,Amount,Payment Month,Payment Date,Status',
          ...transactions.transactions.map(t =>
            `"${t.id}","${t.tenantName}","${t.ownerName}","${t.propertyName}","${t.unitNumber}",${t.amount},"${t.paymentMonth}","${t.paymentDate || ''}","${t.status}"`
          )
        ];
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="transactions-export.csv"');
        return res.send(csvRows.join('\n'));
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="transactions-export.json"');
      return res.send(JSON.stringify(transactions, null, 2));
    }

    res.status(400).json({ error: 'Invalid export type. Supported: summary, transactions.' });
  } catch (error) {
    console.error('[admin] export error:', error);
    res.status(500).json({ error: 'Failed to export reports.' });
  }
}
