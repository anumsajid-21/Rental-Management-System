import { propertyModel } from '../models/propertyModel.js';

/** Parses a CSV string into rows of fields (supports quoted fields with commas). */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.length > 1 || row[0] !== '') rows.push(row);
  return rows;
}

const norm = (h) => h.toLowerCase().replace(/[^a-z]/g, '');
const HEADER_MAP = {
  propertyname: 'name', name: 'name',
  address: 'address',
  city: 'city',
  propertytype: 'propertyType', type: 'propertyType',
  description: 'description',
  bedrooms: 'bedrooms', beds: 'bedrooms',
  bathrooms: 'bathrooms', baths: 'bathrooms',
  monthlyrent: 'monthlyRent', rent: 'monthlyRent',
  status: 'status',
};

function validateRow(row, rowNum, ownerId, seen) {
  const errors = [];
  const name = String(row.name || '').trim();
  const address = String(row.address || '').trim();

  if (!name) errors.push('Property name is required.');
  if (!address) errors.push('Address is required.');
  if (name && address && propertyModel.isDuplicateForOwner(ownerId, name, address)) {
    errors.push('A property with the same name and address already exists.');
  }
  const key = `${name.toLowerCase()}|${address.toLowerCase()}`;
  if (name && address) {
    if (seen.has(key)) errors.push('Duplicate row within this file.');
    else seen.add(key);
  }

  const type = String(row.propertyType || 'apartment').trim().toLowerCase();
  if (type && !propertyModel.PROPERTY_TYPES.includes(type)) {
    errors.push(`Invalid property type '${type}' (allowed: ${propertyModel.PROPERTY_TYPES.join(', ')}).`);
  }

  let monthlyRent = 0;
  const rentRaw = String(row.monthlyRent ?? '').trim();
  if (rentRaw) {
    monthlyRent = Number(rentRaw);
    if (!Number.isFinite(monthlyRent) || monthlyRent < 0) {
      errors.push(`Monthly rent '${rentRaw}' must be a positive number.`);
      monthlyRent = 0;
    }
  } else {
    errors.push('Monthly rent is required.');
  }

  let bedrooms = Number(String(row.bedrooms ?? '0').trim() || 0);
  let bathrooms = Number(String(row.bathrooms ?? '0').trim() || 0);
  if (!Number.isFinite(bedrooms) || bedrooms < 0) { errors.push(`Bedrooms '${row.bedrooms}' must be a number ≥ 0.`); bedrooms = 0; }
  if (!Number.isFinite(bathrooms) || bathrooms < 0) { errors.push(`Bathrooms '${row.bathrooms}' must be a number ≥ 0.`); bathrooms = 0; }

  const status = String(row.status || 'available').trim().toLowerCase();
  if (!propertyModel.PROPERTY_STATUSES.includes(status)) {
    errors.push(`Invalid status '${status}' (allowed: ${propertyModel.PROPERTY_STATUSES.join(', ')}).`);
  }

  return {
    rowNum,
    data: {
      name, address,
      city: String(row.city || '').trim(),
      propertyType: type || 'apartment',
      description: String(row.description || '').trim(),
      bedrooms, bathrooms, monthlyRent, status,
    },
    errors,
  };
}

/** Step 1: upload CSV → parse + validate, return a preview (nothing saved). */
export function importPreview(req, res) {
  const csv = req.body?.csv;
  if (!csv || !String(csv).trim()) {
    return res.status(400).json({ error: 'Please provide CSV content to import.' });
  }

  const rows = parseCsv(String(csv).replace(/^\uFEFF/, ''));
  if (rows.length < 2) {
    return res.status(400).json({ error: 'CSV must contain a header row and at least one data row.' });
  }

  const headers = rows[0].map(norm);
  const mapped = rows.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((h, i) => {
      const field = HEADER_MAP[h];
      if (field) obj[field] = cells[i];
    });
    return obj;
  });

  const seen = new Set();
  const validated = mapped.map((row, i) => validateRow(row, i + 2, req.user.id, seen));
  const valid = validated.filter((v) => v.errors.length === 0);
  const invalid = validated.filter((v) => v.errors.length > 0);

  res.json({
    preview: {
      totalRows: validated.length,
      validRows: valid.length,
      errorRows: invalid.length,
      valid,
      invalid,
    },
  });
}

/** Step 2: confirm → insert only the previously validated rows, owned by this user. */
export function importConfirm(req, res) {
  const rows = req.body?.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'No valid rows to import.' });
  }

  // Re-validate server-side — the client payload is never trusted.
  const seen = new Set();
  const imported = [];
  const rejected = [];
  for (let i = 0; i < rows.length; i += 1) {
    const check = validateRow(rows[i], i + 1, req.user.id, seen);
    if (check.errors.length > 0) { rejected.push(check); continue; }
    const property = propertyModel.createForOwner({ ...check.data, ownerId: req.user.id });
    imported.push(property);
  }

  res.status(201).json({
    message: `Imported ${imported.length} propert${imported.length === 1 ? 'y' : 'ies'}${rejected.length ? `, ${rejected.length} row(s) rejected.` : '.'}`,
    importedCount: imported.length,
    rejectedCount: rejected.length,
  });
}
