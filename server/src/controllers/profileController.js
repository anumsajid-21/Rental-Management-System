import { toPublicUser } from '../models/userModel.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9][0-9\s-]{6,17}$/;

export function show(req, res) {
  res.json({ user: toPublicUser(req.user) });
}

/**
 * Edit only appropriate personal information (name, email, phone).
 * Role, user id, rentals, transactions and maintenance records are not
 * accepted from the client at all — extra fields are ignored.
 */
export function update(req, res) {
  const { name, email, phone } = req.body || {};

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Name is required.', field: 'name' });
  }
  if (String(name).trim().length > 80) {
    return res.status(400).json({ error: 'Name must be at most 80 characters.', field: 'name' });
  }
  if (!email || !EMAIL_RE.test(String(email).trim())) {
    return res.status(400).json({ error: 'Please provide a valid email address.', field: 'email' });
  }
  const phoneTrimmed = phone != null ? String(phone).trim() : '';
  if (phoneTrimmed && !PHONE_RE.test(phoneTrimmed)) {
    return res.status(400).json({
      error: 'Please provide a valid phone number (7–18 digits, may start with +).',
      field: 'phone',
    });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  if (
    normalizedEmail !== String(req.user.email).toLowerCase() &&
    req.app.get('userModel').emailExists(normalizedEmail)
  ) {
    return res
      .status(409)
      .json({ error: 'An account with this email already exists.', field: 'email' });
  }

  const user = req.app.get('userModel').updateProfile(req.user.id, {
    name: String(name).trim(),
    email: normalizedEmail,
    phone: phoneTrimmed,
  });

  res.json({ user, message: 'Profile updated successfully.' });
}

export function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};
  const result = req.app.get('userModel').changePassword(req.user.id, {
    currentPassword,
    newPassword,
  });
  if (!result.ok) return res.status(400).json({ error: result.error, field: result.field });
  res.json({ message: 'Password changed successfully.' });
}
