import express from 'express';
import { db } from '../db/database.js';
import { generateRentReceiptPdf } from '../services/pdfService.js';
import { createPaymentSession, verifyPaymentStatus } from '../services/paymentService.js';
import { sendRentDueNotification, sendPaymentReceiptNotification } from '../services/notificationService.js';
import { generateExcelReport, generateCsvReport } from '../services/exportService.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

/**
 * GET /api/business/receipt/:transactionId/pdf
 * Generates and downloads a branded PDF receipt for a transaction in PKR.
 */
router.get('/receipt/:transactionId/pdf', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const row = db
      .prepare(
        `SELECT t.*, 
                u.name AS tenant_name, u.email AS tenant_email,
                p.name AS property_name, 
                un.unit_number,
                COALESCE(o.name, 'Rehainsh Landlord') AS owner_name
         FROM transactions t
         JOIN users u ON u.id = t.tenant_id
         LEFT JOIN properties p ON p.id = t.property_id
         LEFT JOIN rentals r ON r.id = t.rental_id
         LEFT JOIN units un ON un.id = r.unit_id
         LEFT JOIN users o ON o.id = COALESCE(t.owner_id, p.owner_id, r.owner_id)
         WHERE t.id = ?`
      )
      .get(transactionId);

    if (!row) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    const pdfBuffer = await generateRentReceiptPdf({
      receiptNumber: `REC-${row.id.slice(0, 8).toUpperCase()}`,
      tenantName: row.tenant_name,
      ownerName: row.owner_name,
      propertyName: row.property_name || 'Rehainsh Managed Property',
      unitNumber: row.unit_number || 'Main',
      rentMonth: row.rent_month || 'Current Month',
      amount: row.amount,
      paymentDate: row.payment_date || row.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      status: row.status || 'PAID',
      reference: row.reference || row.id,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="receipt-${row.rent_month || 'pkr'}-${row.id.slice(0, 6)}.pdf"`
    );
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('[businessRoutes] PDF Receipt generation error:', err);
    return res.status(500).json({ error: 'Failed to generate PDF receipt.' });
  }
});

/**
 * POST /api/business/checkout
 * Initiates rent payment checkout session (Stripe or Local PKR gateway).
 */
router.post('/checkout', async (req, res) => {
  try {
    const { rentalId, tenantId, tenantEmail, amountPkr, rentMonth, successUrl, cancelUrl } = req.body;

    if (!amountPkr || !rentMonth) {
      return res.status(400).json({ error: 'Amount in PKR and rent month are required.' });
    }

    const session = await createPaymentSession({
      rentalId,
      tenantId,
      tenantEmail,
      amountPkr,
      rentMonth,
      successUrl,
      cancelUrl,
    });

    return res.json({ success: true, session });
  } catch (err) {
    console.error('[businessRoutes] Checkout creation error:', err);
    return res.status(500).json({ error: 'Failed to initiate checkout session.' });
  }
});

/**
 * POST /api/business/verify-payment
 */
router.post('/verify-payment', async (req, res) => {
  try {
    const { transactionId } = req.body;
    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required.' });
    }
    const result = await verifyPaymentStatus(transactionId);
    return res.json({ success: true, result });
  } catch (err) {
    console.error('[businessRoutes] Payment verification error:', err);
    return res.status(500).json({ error: 'Payment verification failed.' });
  }
});

/**
 * POST /api/business/notify-rent-due
 * Sends automated rent due reminder to tenant.
 */
router.post('/notify-rent-due', async (req, res) => {
  try {
    const { toEmail, tenantName, propertyName, unitNumber, amountPkr, rentMonth, dueDate } = req.body;

    if (!toEmail || !amountPkr) {
      return res.status(400).json({ error: 'Recipient email and amount are required.' });
    }

    const result = await sendRentDueNotification({
      toEmail,
      tenantName: tenantName || 'Tenant',
      propertyName: propertyName || 'Rental Property',
      unitNumber: unitNumber || '1',
      amountPkr,
      rentMonth: rentMonth || 'Current',
      dueDate: dueDate || '5th of the month',
    });

    return res.json({ success: true, result });
  } catch (err) {
    console.error('[businessRoutes] Rent due notification error:', err);
    return res.status(500).json({ error: 'Failed to dispatch notification.' });
  }
});

/**
 * GET /api/business/export/transactions
 * Exports transactions ledger in Excel (.xlsx) or CSV format.
 */
router.get('/export/transactions', async (req, res) => {
  try {
    const format = (req.query.format || 'xlsx').toLowerCase();
    const rows = db
      .prepare(
        `SELECT t.id AS "Transaction ID",
                u.name AS "Tenant Name",
                u.email AS "Tenant Email",
                COALESCE(p.name, 'Platform Property') AS "Property",
                t.rent_month AS "Rent Month",
                t.amount AS "Amount (PKR)",
                t.status AS "Status",
                t.payment_date AS "Payment Date",
                t.reference AS "Reference",
                t.created_at AS "Created At"
         FROM transactions t
         JOIN users u ON u.id = t.tenant_id
         LEFT JOIN properties p ON p.id = t.property_id
         ORDER BY t.created_at DESC`
      )
      .all();

    if (format === 'csv') {
      const csv = generateCsvReport(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="transactions-ledger.csv"');
      return res.send(csv);
    }

    const xlsxBuffer = generateExcelReport(rows, 'Transactions PKR');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="transactions-ledger.xlsx"');
    return res.send(xlsxBuffer);
  } catch (err) {
    console.error('[businessRoutes] Export transactions error:', err);
    return res.status(500).json({ error: 'Failed to generate export file.' });
  }
});

/**
 * POST /api/business/upload
 * Upload media or document (photo/PDF) for property listings or maintenance tickets.
 */
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded or invalid file format.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    return res.json({
      success: true,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
      },
    });
  } catch (err) {
    console.error('[businessRoutes] Upload error:', err);
    return res.status(500).json({ error: 'File upload failed.' });
  }
});

export default router;
