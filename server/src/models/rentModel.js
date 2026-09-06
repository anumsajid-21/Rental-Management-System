import crypto from 'node:crypto';
import { db } from '../db/database.js';

const overviewStmt = db.prepare(
  `SELECT
     COALESCE(SUM(rp.amount), 0) AS totalExpected,
     COALESCE(SUM(CASE WHEN rp.status = 'paid' THEN rp.amount END), 0) AS collected,
     COALESCE(SUM(CASE WHEN rp.status = 'pending' AND rp.due_date >= ? THEN rp.amount END), 0) AS pending,
     COALESCE(SUM(CASE WHEN rp.status = 'overdue' OR (rp.status = 'pending' AND rp.due_date < ?) THEN rp.amount END), 0) AS overdue,
     COUNT(CASE WHEN rp.status = 'paid' THEN 1 END) AS paidCount,
     COUNT(CASE WHEN rp.status = 'overdue' OR (rp.status = 'pending' AND rp.due_date < ?) THEN 1 END) AS overdueCount
   FROM rent_payments rp
   JOIN properties p ON p.id = rp.property_id
   WHERE p.owner_id = ?`
);

const listFilteredStmt = db.prepare(
  `SELECT rp.*, u.name AS tenant_name, p.name AS property_name
   FROM rent_payments rp
   JOIN users u ON u.id = rp.tenant_id
   JOIN properties p ON p.id = rp.property_id
   WHERE p.owner_id = @ownerId
     AND (@search IS NULL OR u.name LIKE '%' || @search || '%' OR p.name LIKE '%' || @search || '%')
     AND (@status IS NULL OR rp.status = @status)
     AND (@propertyId IS NULL OR rp.property_id = @propertyId)
   ORDER BY rp.due_date DESC`
);

const findOwnedStmt = db.prepare(
  `SELECT rp.*, u.name AS tenant_name, p.name AS property_name, r.monthly_rent AS rental_monthly_rent, r.start_date AS rental_start
   FROM rent_payments rp
   JOIN rentals r ON r.id = rp.rental_id
   JOIN users u ON u.id = rp.tenant_id
   JOIN properties p ON p.id = rp.property_id
   WHERE rp.id = ? AND p.owner_id = ?`
);

const activeRentalsStmt = db.prepare(
  `SELECT r.id, r.property_id, r.tenant_id, r.monthly_rent, r.start_date,
          p.name AS property_name, u.name AS tenant_name
   FROM rentals r
   JOIN properties p ON p.id = r.property_id
   JOIN users u ON u.id = r.tenant_id
   WHERE p.owner_id = ? AND r.status = 'active'`
);

const monthExistsStmt = db.prepare(
  'SELECT 1 FROM rent_payments WHERE rental_id = ? AND rent_month = ?'
);

const insertPaymentStmt = db.prepare(
  `INSERT INTO rent_payments (id, rental_id, property_id, tenant_id, rent_month, amount, due_date, status)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);

const markPaidStmt = db.prepare(
  `UPDATE rent_payments
   SET status = 'paid', payment_date = ?, method = ?, notes = ?
   WHERE id = ? AND status != 'paid'
     AND property_id IN (SELECT id FROM properties WHERE owner_id = ?)`
);

const insertTransactionStmt = db.prepare(
  `INSERT INTO transactions (id, owner_id, tenant_id, property_id, rent_payment_id, type, amount, status, reference)
   VALUES (?, ?, ?, ?, ?, 'rent_payment', ?, 'completed', ?)`
);

const today = () => new Date().toISOString().slice(0, 10);

export const rentModel = {
  overview(ownerId) {
    const t = today();
    const row = overviewStmt.get(t, t, t, ownerId);
    return {
      totalExpected: row.totalExpected,
      collected: row.collected,
      pending: row.pending,
      overdue: row.overdue,
      paidCount: row.paidCount,
      overdueCount: row.overdueCount,
    };
  },

  list(ownerId, { search, status, propertyId } = {}) {
    const s = search && String(search).trim() ? String(search).trim() : null;
    const st = status && status !== 'all' ? status : null;
    const pid = propertyId && propertyId !== 'all' ? propertyId : null;
    return listFilteredStmt.all({ ownerId, search: s, status: st, propertyId: pid });
  },

  /** Authorisation-safe single record (only if it belongs to this owner). */
  findByIdAndOwner(id, ownerId) {
    return findOwnedStmt.get(id, ownerId) || null;
  },

  /**
   * Creates pending rent records for the current month for every active
   * rental of this owner. Idempotent (one record per rental per month).
   */
  generateCurrentMonth(ownerId) {
    const now = new Date();
    const rentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dueDate = `${rentMonth}-05`;
    let created = 0;
    const createAll = db.transaction(() => {
      for (const rental of activeRentalsStmt.all(ownerId)) {
        if (monthExistsStmt.get(rental.id, rentMonth)) continue;
        insertPaymentStmt.run(
          crypto.randomUUID(), rental.id, rental.property_id, rental.tenant_id,
          rentMonth, rental.monthly_rent, dueDate, 'pending'
        );
        created += 1;
      }
    });
    createAll();
    return { rentMonth, created };
  },

  /**
   * Records a payment for a rent record: marks it paid and inserts the
   * matching transaction in one atomic operation.
   */
  recordPayment({ id, ownerId, method, notes }) {
    const existing = findOwnedStmt.get(id, ownerId);
    if (!existing) return { ok: false, error: 'Rent record not found.' };
    if (existing.status === 'paid') {
      return { ok: false, error: 'This rent has already been paid.' };
    }
    let transactionId;
    const run = db.transaction(() => {
      markPaidStmt.run(today(), method || 'cash', notes || null, id, ownerId);
      transactionId = crypto.randomUUID();
      insertTransactionStmt.run(
        transactionId, ownerId, existing.tenant_id, existing.property_id,
        id, existing.amount, method || 'cash'
      );
    });
    run();
    return { ok: true, rent: findOwnedStmt.get(id, ownerId), transactionId };
  },
};
