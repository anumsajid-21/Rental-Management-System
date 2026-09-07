import { maintenanceModel } from '../models/maintenanceModel.js';
import { db } from '../db/database.js';

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

/**
 * POST /api/owner/maintenance/:id/approve
 * Approve maintenance request. Moves status from 'submitted' to 'in_progress'.
 */
export function approveMaintenance(req, res) {
  const request = maintenanceModel.findByIdAndOwner(req.params.id, req.user.id);
  if (!request) return res.status(404).json({ error: 'Maintenance request not found.' });

  const nextStatus = req.body?.status === 'resolved' ? 'resolved' : 'in_progress';
  db.prepare(`
    UPDATE maintenance_requests SET
      status = ?,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = ? AND property_id IN (SELECT id FROM properties WHERE owner_id = ?)
  `).run(nextStatus, request.id, req.user.id);

  const updated = maintenanceModel.findByIdAndOwner(request.id, req.user.id);
  res.json({ message: 'Maintenance request approved.', request: updated });
}

/**
 * POST /api/owner/maintenance/:id/reject
 * Reject maintenance request.
 */
export function rejectMaintenance(req, res) {
  const request = maintenanceModel.findByIdAndOwner(req.params.id, req.user.id);
  if (!request) return res.status(404).json({ error: 'Maintenance request not found.' });

  db.prepare(`
    UPDATE maintenance_requests SET
      status = 'rejected',
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = ? AND property_id IN (SELECT id FROM properties WHERE owner_id = ?)
  `).run(request.id, req.user.id);

  const updated = maintenanceModel.findByIdAndOwner(request.id, req.user.id);
  res.json({ message: 'Maintenance request rejected.', request: updated });
}

/**
 * POST /api/owner/maintenance/:id/transfer
 * Record / transfer maintenance money to the renter.
 * Updates transfer_status to 'transferred'.
 */
export function transferMaintenanceMoney(req, res) {
  const request = maintenanceModel.findByIdAndOwner(req.params.id, req.user.id);
  if (!request) return res.status(404).json({ error: 'Maintenance request not found.' });

  const transferAmount = Number(req.body?.amount ?? request.amount);
  if (isNaN(transferAmount) || transferAmount <= 0) {
    return res.status(400).json({ error: 'Transfer amount must be a positive number in PKR.' });
  }

  db.prepare(`
    UPDATE maintenance_requests SET
      transfer_status = 'transferred',
      transferred_amount = ?,
      transferred_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = ? AND property_id IN (SELECT id FROM properties WHERE owner_id = ?)
  `).run(transferAmount, request.id, req.user.id);

  const updated = maintenanceModel.findByIdAndOwner(request.id, req.user.id);
  res.json({
    message: `Successfully recorded maintenance money transfer of PKR ${transferAmount.toLocaleString()} to renter.`,
    request: updated,
  });
}
