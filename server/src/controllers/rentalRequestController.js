import { propertyModel } from '../models/propertyModel.js';
import { rentalRequestModel } from '../models/rentalRequestModel.js';
import { rentalModel } from '../models/rentalModel.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Tenant requests a unit. A request is NOT a rental: the property owner
 * still has to review and accept/reject it in a later phase.
 */
export function create(req, res) {
  const { unitId, moveInDate } = req.body || {};

  if (!unitId) {
    return res.status(400).json({ error: 'Please select a unit to rent.', field: 'unitId' });
  }
  if (!moveInDate || !DATE_RE.test(String(moveInDate))) {
    return res.status(400).json({ error: 'Please choose a valid move-in date.', field: 'moveInDate' });
  }
  if (String(moveInDate) < todayStr()) {
    return res.status(400).json({ error: 'Move-in date cannot be in the past.', field: 'moveInDate' });
  }

  const unit = propertyModel.findUnitById(unitId);
  if (!unit) {
    return res.status(404).json({ error: 'The selected unit does not exist.' });
  }
  const property = propertyModel.findById(unit.propertyId);
  if (!property) {
    return res.status(404).json({ error: 'The selected property does not exist.' });
  }
  if (property.status !== 'available') {
    return res.status(409).json({ error: 'This property is no longer available for rent.' });
  }
  if (unit.status !== 'available') {
    return res.status(409).json({ error: 'This unit has already been rented. Please choose another unit.' });
  }
  if (rentalModel.hasActiveRentalForUnit(req.user.id, unit.id)) {
    return res.status(409).json({ error: 'You are already renting this unit.' });
  }
  if (rentalRequestModel.hasPendingForUnit(req.user.id, unit.id)) {
    return res.status(409).json({ error: 'You already have a pending request for this unit.' });
  }

  const rentalRequest = rentalRequestModel.create({
    tenantId: req.user.id,
    propertyId: property.id,
    unitId: unit.id,
    monthlyRent: unit.rent, // server-authoritative — client cannot set the price
    moveInDate,
  });

  res.status(201).json({ rentalRequest, message: 'Rental request submitted successfully.' });
}

/** All rental requests belonging to the signed-in tenant. */
export function list(req, res) {
  res.json({ rentalRequests: rentalRequestModel.listByTenant(req.user.id) });
}

export function detail(req, res) {
  const rentalRequest = rentalRequestModel.findByIdForTenant(req.params.id, req.user.id);
  if (!rentalRequest) {
    return res.status(404).json({ error: 'Rental request not found.' });
  }
  res.json({ rentalRequest });
}

/** A tenant may cancel their own request while it is still pending. */
export function cancel(req, res) {
  const rentalRequest = rentalRequestModel.findByIdForTenant(req.params.id, req.user.id);
  if (!rentalRequest) {
    return res.status(404).json({ error: 'Rental request not found.' });
  }
  if (rentalRequest.status !== 'pending') {
    return res.status(409).json({ error: 'Only pending requests can be cancelled.' });
  }
  rentalRequestModel.cancel(rentalRequest.id);
  res.json({
    rentalRequest: rentalRequestModel.findById(rentalRequest.id),
    message: 'Rental request cancelled.',
  });
}
