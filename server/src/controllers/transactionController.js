import { transactionModel } from '../models/transactionModel.js';

/** Tenant's own rent payment history with optional filters. */
export function list(req, res) {
  const { status, fromMonth, toMonth } = req.query;
  const transactions = transactionModel.listByTenant(req.user.id, { status, fromMonth, toMonth });
  res.json({ transactions });
}

export function detail(req, res) {
  const transaction = transactionModel.findByIdForTenant(req.params.id, req.user.id);
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found.' });
  }
  res.json({ transaction });
}
