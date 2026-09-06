import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ROLES } from '../models/roles.js';
import { summary } from '../controllers/dashboardController.js';
import { list as listProperties, detail as propertyDetail } from '../controllers/propertyController.js';
import {
  create as createRentalRequest,
  list as listRentalRequests,
  detail as rentalRequestDetail,
  cancel as cancelRentalRequest,
} from '../controllers/rentalRequestController.js';
import { active as activeRental, list as listRentals } from '../controllers/rentalController.js';
import { list as listTransactions, detail as transactionDetail } from '../controllers/transactionController.js';
import {
  create as createMaintenance,
  list as listMaintenance,
  detail as maintenanceDetail,
} from '../controllers/maintenanceController.js';
import { show as showProfile, update as updateProfile } from '../controllers/profileController.js';

/**
 * Tenant Portal API. Every route requires a valid JWT AND the 'tenant' role,
 * and every query is scoped to req.user.id — tenants can only ever touch
 * their own data.
 */
const router = Router();

router.use(requireAuth, requireRole(ROLES.TENANT));

router.get('/dashboard', summary);

// Properties (read-only for tenants)
router.get('/properties', listProperties);
router.get('/properties/:id', propertyDetail);

// Rentals
router.get('/rentals', listRentals);
router.get('/rentals/active', activeRental);

// Rental requests (owner reviews later — tenants cannot approve/reject)
router.get('/rental-requests', listRentalRequests);
router.post('/rental-requests', createRentalRequest);
router.get('/rental-requests/:id', rentalRequestDetail);
router.post('/rental-requests/:id/cancel', cancelRentalRequest);

// Transactions (read-only — created/updated by the owner/admin workflow)
router.get('/transactions', listTransactions);
router.get('/transactions/:id', transactionDetail);

// Maintenance requests
router.get('/maintenance', listMaintenance);
router.post('/maintenance', createMaintenance);
router.get('/maintenance/:id', maintenanceDetail);

// Profile
router.get('/profile', showProfile);
router.patch('/profile', updateProfile);

export default router;
