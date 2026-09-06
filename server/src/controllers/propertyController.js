import { propertyModel } from '../models/propertyModel.js';

/** Read-only listing for tenants — search, location, type, rent range, availability. */
export function list(req, res) {
  const { q, location, type, minRent, maxRent, availability } = req.query;
  const properties = propertyModel.list({
    q,
    location,
    type,
    minRent,
    maxRent,
    availableOnly: availability === 'available',
  });
  res.json({ properties, types: propertyModel.listTypes() });
}

/** Property details with its units (tenants can view, never modify). */
export function detail(req, res) {
  const property = propertyModel.findById(req.params.id);
  if (!property) {
    return res.status(404).json({ error: 'Property not found.' });
  }
  res.json({ property, units: propertyModel.listUnits(property.id) });
}
