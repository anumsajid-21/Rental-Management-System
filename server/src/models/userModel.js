import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { ROLES } from './roles.js';

const SALT_ROUNDS = 10;

const findByEmailStmt = db.prepare('SELECT * FROM users WHERE email = ?');
const findByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');
const emailExistsStmt = db.prepare('SELECT 1 FROM users WHERE email = ?');
const emailExistsExceptStmt = db.prepare('SELECT 1 FROM users WHERE email = ? AND id != ?');
const insertStmt = db.prepare(
  'INSERT INTO users (id, name, email, password, role, phone) VALUES (?, ?, ?, ?, ?, ?)'
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

export function toPublicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone || '',
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
  create({ name, email, password, role, phone }) {
    const normalized = email.trim().toLowerCase();
    if (!Object.values(ROLES).includes(role)) {
      return { ok: false, error: 'Invalid role selected.' };
    }
    if (this.emailExists(normalized)) {
      return { ok: false, error: 'An account with this email already exists. Please sign in instead.' };
    }
    const id = crypto.randomUUID();
    const hash = bcrypt.hashSync(password, SALT_ROUNDS);
    insertStmt.run(id, name.trim(), normalized, hash, role, phone || null);
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
      // Tenant controller expects the public user object directly.
      return toPublicUser(this.findById(id));
    }

    updateProfileStmt.run(trimmedName, normalized, id);
    return { ok: true, user: toPublicUser(this.findById(id)) };
  },

  /**
   * Change the password. Requires the current password to match.
   * @returns {{ ok: true } | { ok: false, error: string, field?: string }}
   */
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
};
