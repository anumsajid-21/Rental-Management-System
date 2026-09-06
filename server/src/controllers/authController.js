import { signToken } from '../middleware/auth.js';
import { toPublicUser } from '../models/userModel.js';
import { PUBLIC_SIGNUP_ROLES } from '../models/roles.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function register(req, res) {
  const { name, email, password, role } = req.body || {};

  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required.', field: 'name' });
  if (!email || !EMAIL_RE.test(String(email).trim())) return res.status(400).json({ error: 'A valid email is required.', field: 'email' });
  if (!password || String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.', field: 'password' });
  if (!role || !PUBLIC_SIGNUP_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Role is required.', field: 'role' });
  }

  const result = req.app.get('userModel').create({ name, email, password, role });
  if (!result.ok) return res.status(409).json({ error: result.error, field: 'email' });

  res.status(201).json({ user: result.user, token: signToken(result.user) });
}

export function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const result = req.app.get('userModel').authenticate({ email, password });
  if (!result.ok) return res.status(401).json({ error: result.error });

  res.json({ user: result.user, token: signToken(result.user) });
}

export function me(req, res) {
  res.json({ user: toPublicUser(req.user) });
}
