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
const updateProfileStmt = db.prepare(
  'UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?'
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

  /** Updates editable profile fields only — role and id are never touched. */
  updateProfile(id, { name, email, phone }) {
    updateProfileStmt.run(name.trim(), email.trim().toLowerCase(), phone || null, id);
    return toPublicUser(findByIdStmt.get(id));
  },
};

