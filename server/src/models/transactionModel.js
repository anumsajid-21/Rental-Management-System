import { db } from '../db/database.js';

const listFilteredStmt = db.prepare(
  `SELECT t.*, u.name AS tenant_name, p.name AS property_name, rp.rent_month
   FROM transactions t
   JOIN users u ON u.id = t.tenant_id
   JOIN properties p ON p.id = t.property_id
   LEFT JOIN rent_payments rp ON rp.id = t.rent_payment_id
   WHERE t.owner_id = @ownerId
     AND (@search IS NULL OR u.name LIKE '%' || @search || '%' OR p.name LIKE '%' || @search || '%' OR t.id LIKE '%' || @search || '%')
     AND (@status IS NULL OR t.status = @status)
     AND (@type IS NULL OR t.type = @type)
   ORDER BY t.created_at DESC`
);

const findOwnedStmt = db.prepare(
  `SELECT t.*, u.name AS tenant_name, u.email AS tenant_email,
          p.name AS property_name, p.address AS property_address, rp.rent_month
   FROM transactions t
   JOIN users u ON u.id = t.tenant_id
   JOIN properties p ON p.id = t.property_id
   LEFT JOIN rent_payments rp ON rp.id = t.rent_payment_id
   WHERE t.id = ? AND t.owner_id = ?`
);

export const transactionModel = {
  list(ownerId, { search, status, type } = {}) {
    const s = search && String(search).trim() ? String(search).trim() : null;
    const st = status && status !== 'all' ? status : null;
    const ty = type && type !== 'all' ? type : null;
    return listFilteredStmt.all({ ownerId, search: s, status: st, type: ty });
  },

  /** Authorisation-safe: transaction only if it belongs to this owner. */
  findByIdAndOwner: (id, ownerId) => findOwnedStmt.get(id, ownerId) || null,
};
