import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  getDashboard,
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  getProperties,
  getPropertyById,
  getRentalRequests,
  getRentals,
  getTransactions,
  getMaintenance,
  getReportsSummary,
  exportReports
} from '../controllers/adminController.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(requireAuth, requireRole('admin'));

// Dashboard
router.get('/dashboard', getDashboard);

// User Management
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id', updateUser);
router.patch('/users/:id/status', updateUserStatus);

// Property Oversight
router.get('/properties', getProperties);
router.get('/properties/:id', getPropertyById);

// Rental Requests
router.get('/rental-requests', getRentalRequests);

// Rentals
router.get('/rentals', getRentals);

// Transactions
router.get('/transactions', getTransactions);

// Maintenance
router.get('/maintenance', getMaintenance);

// Reports
router.get('/reports/summary', getReportsSummary);
router.get('/reports/export', exportReports);

export default router;
