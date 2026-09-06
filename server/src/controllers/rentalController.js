import { rentalModel } from '../models/rentalModel.js';

/** The signed-in tenant's active rental (read-only). */
export function active(req, res) {
  res.json({ rental: rentalModel.findActiveByTenant(req.user.id) });
}

/** Full rental history (active + ended) for the signed-in tenant. */
export function list(req, res) {
  res.json({ rentals: rentalModel.listByTenant(req.user.id) });
}
