import { toPublicUser } from '../models/userModel.js';

/** GET /api/owner/profile */
export function getProfile(req, res) {
  res.json({ user: toPublicUser(req.user) });
}

/** PATCH /api/owner/profile — update name/email. */
export function updateProfile(req, res) {
  const { name, email } = req.body || {};
  const result = req.app.get('userModel').updateProfile(req.user.id, { name, email });
  if (!result.ok) return res.status(400).json({ error: result.error, field: result.field });
  res.json({ user: result.user, message: 'Profile updated.' });
}

/** POST /api/owner/profile/password — change password (bcrypt-verified). */
export function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};
  const result = req.app.get('userModel').changePassword(req.user.id, {
    currentPassword, newPassword,
  });
  if (!result.ok) return res.status(400).json({ error: result.error, field: result.field });
  res.json({ message: 'Password changed successfully.' });
}
