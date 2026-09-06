import { rentModel } from '../models/rentModel.js';
import { propertyModel } from '../models/propertyModel.js';

export function rentOverview(req, res) {
  res.json({ overview: rentModel.overview(req.user.id) });
}

export function listRentRecords(req, res) {
  const records = rentModel.list(req.user.id, {
    search: req.query.search,
    status: req.query.status,
    propertyId: req.query.propertyId,
  });
  res.json({ records });
}

export function rentRecordDetail(req, res) {
  const record = rentModel.findByIdAndOwner(req.params.id, req.user.id);
  if (!record) return res.status(404).json({ error: 'Rent record not found.' });
  res.json({ record });
}

export function generateRentRecords(req, res) {
  const result = rentModel.generateCurrentMonth(req.user.id);
  res.status(201).json({
    message: `Created ${result.created} rent record(s) for ${result.rentMonth}.`,
    ...result,
  });
}

export function recordPayment(req, res) {
  const { method, notes } = req.body || {};
  const result = rentModel.recordPayment({ id: req.params.id, ownerId: req.user.id, method, notes });
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ message: 'Payment recorded successfully.', rent: result.rent, transactionId: result.transactionId });
}

export function rentFilterOptions(_req, res) {
  const properties = propertyModel.listByOwner(_req.user.id).map((p) => ({ id: p.id, name: p.name }));
  res.json({ properties });
}
