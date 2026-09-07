import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as dashboard from '../controllers/ownerDashboardController.js';
import * as properties from '../controllers/ownerPropertyController.js';
import * as rentalRequests from '../controllers/ownerRentalRequestController.js';
import * as rent from '../controllers/ownerRentController.js';
import * as transactions from '../controllers/ownerTransactionController.js';
import * as maintenance from '../controllers/ownerMaintenanceController.js';
import * as reports from '../controllers/ownerReportController.js';
import * as csvImport from '../controllers/ownerImportController.js';
import * as profile from '../controllers/ownerProfileController.js';
import { loadDemoData } from '../controllers/ownerDemoController.js';

const router = Router();

// Every owner route requires authentication AND the property_owner role.
router.use(requireAuth, requireRole('property_owner'));

/* ---- Dashboard (Person 2) ---- */
router.get('/dashboard', dashboard.getDashboard);

/* ---- Properties (Person 2) ---- */
router.get('/properties', properties.listProperties);
router.get('/properties/:id', properties.getProperty);
router.post('/properties', properties.createProperty);
router.put('/properties/:id', properties.updateProperty);
router.patch('/properties/:id/status', properties.updatePropertyStatus);
router.delete('/properties/:id', properties.deleteProperty);

/* ---- Rental Requests (Person 2) ---- */
router.get('/rental-requests', rentalRequests.listRentalRequests);
router.get('/rental-requests/:id', rentalRequests.getRentalRequest);
router.post('/rental-requests/:id/accept', rentalRequests.acceptRentalRequest);
router.post('/rental-requests/:id/reject', rentalRequests.rejectRentalRequest);

/* ---- Rent management ---- */
router.get('/rent/overview', rent.rentOverview);
router.get('/rent/records', rent.listRentRecords);
router.get('/rent/records/:id', rent.rentRecordDetail);
router.post('/rent/generate', rent.generateRentRecords);
router.post('/rent/records/:id/payment', rent.recordPayment);
router.get('/rent/filter-options', rent.rentFilterOptions);

/* ---- Transactions ---- */
router.get('/transactions', transactions.listTransactions);
router.get('/transactions/:id', transactions.transactionDetail);

/* ---- Maintenance (owner side - Person 2 / Person 3) ---- */
router.get('/maintenance', maintenance.listMaintenance);
router.get('/maintenance/:id', maintenance.maintenanceDetail);
router.patch('/maintenance/:id/status', maintenance.updateMaintenanceStatus);
router.post('/maintenance/:id/approve', maintenance.approveMaintenance);
router.post('/maintenance/:id/reject', maintenance.rejectMaintenance);
router.post('/maintenance/:id/transfer', maintenance.transferMaintenanceMoney);

/* ---- Reports ---- */
router.get('/reports', reports.ownerReport);

/* ---- CSV property import ---- */
router.post('/import/preview', csvImport.importPreview);
router.post('/import/confirm', csvImport.importConfirm);

/* ---- Owner profile & security ---- */
router.get('/profile', profile.getProfile);
router.patch('/profile', profile.updateProfile);
router.post('/profile/password', profile.changePassword);

/* ---- Demo / mock data (development & testing) ---- */
router.post('/demo-data', loadDemoData);

export default router;
