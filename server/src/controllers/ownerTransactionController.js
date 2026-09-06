import { transactionModel } from '../models/transactionModel.js';

export function listTransactions(req, res) {
  const transactions = transactionModel.list(req.user.id, {
    search: req.query.search,
    status: req.query.status,
    type: req.query.type,
  });
  res.json({ transactions });
}

export function transactionDetail(req, res) {
  const transaction = transactionModel.findByIdAndOwner(req.params.id, req.user.id);
  if (!transaction) return res.status(404).json({ error: 'Transaction not found.' });
  res.json({ transaction });
}
