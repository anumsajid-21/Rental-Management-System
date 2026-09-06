import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { ROLES, PUBLIC_SIGNUP_ROLES } from './roles.js';

const SALT_ROUNDS = 10;

const findByEmailStmt = db.prepare('SELECT * FROM users WHERE email = ?');
const findByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');
const emailExistsStmt = db.prepare('SELECT 1 FROM users WHERE email = ?');
const emailExistsExceptStmt = db.prepare('SELECT 1 FROM users WHERE email = ? AND id != ?');
const insertStmt = db.prepare(
  'INSERT INTO users (id, name, email, password, role, phone, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
);
const updateProfileWithPhoneStmt = db.prepare(
  'UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?'
);
const updateProfileStmt = db.prepare(
  'UPDATE users SET name = ?, email = ? WHERE id = ?'
);
const updatePasswordStmt = db.prepare(
  'UPDATE users SET password = ? WHERE id = ?'
);
const updateAdminStmt = db.prepare(
  'UPDATE users SET name = ?, email = ?, role = ?, status = ? WHERE id = ?'
);
const updateStatusStmt = db.prepare(
  'UPDATE users SET status = ? WHERE id = ?'
);

export function toPublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone || '',
    status: row.status || 'active',
    createdAt: row.created_at,
  };
}

export const userModel = {
  findByEmail: (email) => findByEmailStmt.get(email.trim().toLowerCase()),
  findById: (id) => findByIdStmt.get(id),
  emailExists: (email) => Boolean(emailExistsStmt.get(email.trim().toLowerCase())),
  emailExistsExcept: (email, exceptId) =>
    Boolean(emailExistsExceptStmt.get(email.trim().toLowerCase(), exceptId)),

  /**
   * @returns {{ ok: true, user: object } | { ok: false, error: string }}
   */
  create({ name, email, password, role, phone, status = 'active', allowAdmin = false }) {
    const normalized = email.trim().toLowerCase();
    const allowed = allowAdmin ? Object.values(ROLES) : PUBLIC_SIGNUP_ROLES;
    if (!allowed.includes(role)) {
      return { ok: false, error: 'Invalid role selected.' };
    }
    if (this.emailExists(normalized)) {
      return { ok: false, error: 'An account with this email already exists. Please sign in instead.' };
    }
    const id = crypto.randomUUID();
    const hash = bcrypt.hashSync(password, SALT_ROUNDS);
    insertStmt.run(id, name.trim(), normalized, hash, role, phone || null, status || 'active');
    return { ok: true, user: toPublicUser(findByIdStmt.get(id)) };
  },

  /**
   * @returns {{ ok: true, user: object } | { ok: false, error: string }}
   */
  authenticate({ email, password }) {
    const row = this.findByEmail(email);
    if (!row || !bcrypt.compareSync(password, row.password)) {
      return { ok: false, error: 'Invalid email or password. Please try again.' };
    }
    if ((row.status || 'active') !== 'active') {
      return { ok: false, error: 'This account is inactive. Please contact an administrator.' };
    }
    return { ok: true, user: toPublicUser(row) };
  },

  /**
   * Update profile. Supports tenant (name/email/phone → returns user) and
   * owner (name/email with validation → returns { ok, user|error }).
   */
  updateProfile(id, { name, email, phone }) {
    const row = this.findById(id);
    if (!row) return { ok: false, error: 'Account not found.' };

    const trimmedName = String(name || '').trim();
    const normalized = String(email || '').trim().toLowerCase();
    if (!trimmedName) return { ok: false, error: 'Name is required.', field: 'name' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return { ok: false, error: 'A valid email is required.', field: 'email' };
    }
    const existing = this.findByEmail(normalized);
    if (existing && existing.id !== id) {
      return { ok: false, error: 'Another account already uses this email.', field: 'email' };
    }

    if (phone !== undefined) {
      updateProfileWithPhoneStmt.run(trimmedName, normalized, phone || null, id);
      return toPublicUser(this.findById(id));
    }

    updateProfileStmt.run(trimmedName, normalized, id);
    return { ok: true, user: toPublicUser(this.findById(id)) };
  },

  changePassword(id, { currentPassword, newPassword }) {
    const row = this.findById(id);
    if (!row) return { ok: false, error: 'Account not found.' };
    if (!currentPassword || !bcrypt.compareSync(currentPassword, row.password)) {
      return { ok: false, error: 'Your current password is incorrect.', field: 'currentPassword' };
    }
    if (!newPassword || String(newPassword).length < 8) {
      return { ok: false, error: 'New password must be at least 8 characters.', field: 'newPassword' };
    }
    if (bcrypt.compareSync(newPassword, row.password)) {
      return { ok: false, error: 'New password must be different from the current one.', field: 'newPassword' };
    }
    updatePasswordStmt.run(bcrypt.hashSync(newPassword, SALT_ROUNDS), id);
    return { ok: true };
  },

  /** Admin paginated user list. */
  list({ search = '', role = '', status = '', page = 1, limit = 20 } = {}) {
    const clauses = [];
    const params = [];
    if (search) {
      clauses.push('(name LIKE ? OR email LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like);
    }
    if (role) {
      clauses.push('role = ?');
      params.push(role);
    }
    if (status) {
      clauses.push("COALESCE(status, 'active') = ?");
      params.push(status);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const total = db.prepare(`SELECT COUNT(*) AS count FROM users ${where}`).get(...params).count;
    const offset = (page - 1) * limit;
    const users = db
      .prepare(`SELECT * FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset)
      .map(toPublicUser);
    return { users, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
  },

  update(id, { name, email, role, status }) {
    const row = this.findById(id);
    if (!row) return { ok: false, error: 'User not found.' };
    const trimmedName = String(name ?? row.name).trim();
    const normalized = String(email ?? row.email).trim().toLowerCase();
    const nextRole = role || row.role;
    const nextStatus = status || row.status || 'active';
    if (!Object.values(ROLES).includes(nextRole)) {
      return { ok: false, error: 'Invalid role.' };
    }
    if (!['active', 'inactive', 'deactivated'].includes(nextStatus)) {
      return { ok: false, error: 'Invalid status.' };
    }
    const existing = this.findByEmail(normalized);
    if (existing && existing.id !== id) {
      return { ok: false, error: 'Another account already uses this email.' };
    }
    updateAdminStmt.run(trimmedName, normalized, nextRole, nextStatus, id);
    return { ok: true, user: toPublicUser(this.findById(id)) };
  },

  updateStatus(id, status) {
    const row = this.findById(id);
    if (!row) return { ok: false, error: 'User not found.' };
    if (!['active', 'inactive', 'deactivated'].includes(status)) {
      return { ok: false, error: 'Invalid status.' };
    }
    updateStatusStmt.run(status, id);
    return { ok: true, user: toPublicUser(this.findById(id)) };
  },
};
