import { maintenanceModel } from '../models/maintenanceModel.js';

export function listMaintenance(req, res) {
  const requests = maintenanceModel.list(req.user.id, {
    status: req.query.status,
    search: req.query.search,
  });
  res.json({ requests, transitions: maintenanceModel.TRANSITIONS });
}

export function maintenanceDetail(req, res) {
  const request = maintenanceModel.findByIdAndOwner(req.params.id, req.user.id);
  if (!request) return res.status(404).json({ error: 'Maintenance request not found.' });
  res.json({ request, transitions: maintenanceModel.TRANSITIONS });
}

export function updateMaintenanceStatus(req, res) {
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: 'A status value is required.' });
  const result = maintenanceModel.updateStatus(req.params.id, req.user.id, status);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ message: 'Status updated.', request: result.request });
}
