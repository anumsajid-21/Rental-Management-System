import { maintenanceModel } from '../models/maintenanceModel.js';
import { rentalModel } from '../models/rentalModel.js';
import { MAINTENANCE_CATEGORIES, MAINTENANCE_PRIORITIES } from '../models/constants.js';

/**
 * Tenant reports an issue for their ACTIVE rental. Property/unit come from
 * the rental on the server side; status always starts at 'submitted'.
 */
export function create(req, res) {
  const activeRental = rentalModel.findActiveByTenant(req.user.id);
  if (!activeRental) {
    return res
      .status(409)
      .json({ error: 'You need an active rental before you can report a maintenance issue.' });
  }

  const { category, title, description, priority } = req.body || {};

  if (!category || !MAINTENANCE_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Please select a valid category.', field: 'category' });
  }
  const trimmedTitle = String(title || '').trim();
  if (trimmedTitle.length < 5 || trimmedTitle.length > 120) {
    return res
      .status(400)
      .json({ error: 'Title must be between 5 and 120 characters.', field: 'title' });
  }
  const trimmedDescription = String(description || '').trim();
  if (trimmedDescription.length < 10) {
    return res
      .status(400)
      .json({ error: 'Please describe the issue (at least 10 characters).', field: 'description' });
  }
  if (trimmedDescription.length > 2000) {
    return res
      .status(400)
      .json({ error: 'Description must be at most 2000 characters.', field: 'description' });
  }
  const chosenPriority = priority || 'medium';
  if (!MAINTENANCE_PRIORITIES.includes(chosenPriority)) {
    return res.status(400).json({ error: 'Please select a valid priority.', field: 'priority' });
  }

  const request = maintenanceModel.create({
    tenantId: req.user.id,
    propertyId: activeRental.propertyId,
    unitId: activeRental.unitId,
    category,
    title: trimmedTitle,
    description: trimmedDescription,
    priority: chosenPriority,
  });

  res.status(201).json({ request, message: 'Maintenance request submitted successfully.' });
}

/** Tenant's own maintenance requests. */
export function list(req, res) {
  res.json({ requests: maintenanceModel.listByTenant(req.user.id) });
}

export function detail(req, res) {
  const request = maintenanceModel.findByIdForTenant(req.params.id, req.user.id);
  if (!request) {
    return res.status(404).json({ error: 'Maintenance request not found.' });
  }
  res.json({ request });
}
