import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { ROLES } from './roles.js';

const SALT_ROUNDS = 10;

const findByEmailStmt = db.prepare('SELECT * FROM users WHERE email = ?');
const findByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');
const emailExistsStmt = db.prepare('SELECT 1 FROM users WHERE email = ?');
const insertStmt = db.prepare(
  'INSERT INTO users (id, name, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?)'
);
<<<<<<< HEAD
const updateStmt = db.prepare(
  'UPDATE users SET name = ?, email = ?, role = ?, status = ? WHERE id = ?'
=======
const updateProfileWithPhoneStmt = db.prepare(
  'UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?'
>>>>>>> 89a2e32bf6f31a866729cdbd13dfda64daff2406
);
const updateStatusStmt = db.prepare(
  'UPDATE users SET status = ? WHERE id = ?'
);
const listStmt = db.prepare(`
  SELECT * FROM users 
  WHERE (name LIKE ? OR email LIKE ? OR ? = '')
    AND (? = '' OR role = ?)
    AND (? = '' OR status = ?)
  ORDER BY created_at DESC
  LIMIT ? OFFSET ?
`);
const countStmt = db.prepare(`
  SELECT COUNT(*) as count FROM users 
  WHERE (name LIKE ? OR email LIKE ? OR ? = '')
    AND (? = '' OR role = ?)
    AND (? = '' OR status = ?)
`);

export function toPublicUser(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role, status: row.status || 'active', createdAt: row.created_at };
}

export const userModel = {
  findByEmail: (email) => findByEmailStmt.get(email.trim().toLowerCase()),
  findById: (id) => findByIdStmt.get(id),
  emailExists: (email) => Boolean(emailExistsStmt.get(email.trim().toLowerCase())),

  /**
   * @returns {{ ok: true, user: object } | { ok: false, error: string }}
   */
  create({ name, email, password, role, status = 'active' }) {
    const normalized = email.trim().toLowerCase();
    if (!Object.values(ROLES).includes(role)) {
      return { ok: false, error: 'Invalid role selected.' };
    }
    if (this.emailExists(normalized)) {
      return { ok: false, error: 'An account with this email already exists. Please sign in instead.' };
    }
    const id = crypto.randomUUID();
    const hash = bcrypt.hashSync(password, SALT_ROUNDS);
    insertStmt.run(id, name.trim(), normalized, hash, role, status);
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
<<<<<<< HEAD
   * @returns {{ ok: true, user: object } | { ok: false, error: string }}
   */
  update(id, { name, email, role, status }) {
    const row = findByIdStmt.get(id);
    if (!row) {
      return { ok: false, error: 'User not found.' };
=======
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
>>>>>>> 89a2e32bf6f31a866729cdbd13dfda64daff2406
    }
    
    if (role && !Object.values(ROLES).includes(role)) {
      return { ok: false, error: 'Invalid role selected.' };
    }
<<<<<<< HEAD
    
    if (status && !['active', 'inactive', 'deactivated'].includes(status)) {
      return { ok: false, error: 'Invalid status selected.' };
    }

    const normalizedEmail = email ? email.trim().toLowerCase() : row.email;
    if (email && normalizedEmail !== row.email && this.emailExists(normalizedEmail)) {
      return { ok: false, error: 'An account with this email already exists.' };
    }

    updateStmt.run(
      name || row.name,
      normalizedEmail,
      role || row.role,
      status !== undefined ? status : row.status,
      id
    );
    
    return { ok: true, user: toPublicUser(findByIdStmt.get(id)) };
=======

    if (phone !== undefined) {
      updateProfileWithPhoneStmt.run(trimmedName, normalized, phone || null, id);
      // Tenant controller expects the public user object directly.
      return toPublicUser(this.findById(id));
    }

    updateProfileStmt.run(trimmedName, normalized, id);
    return { ok: true, user: toPublicUser(this.findById(id)) };
>>>>>>> 89a2e32bf6f31a866729cdbd13dfda64daff2406
  },

  /**
   * @returns {{ ok: true, user: object } | { ok: false, error: string }}
   */
  updateStatus(id, status) {
    const row = findByIdStmt.get(id);
    if (!row) {
      return { ok: false, error: 'User not found.' };
    }
    
    if (!['active', 'inactive', 'deactivated'].includes(status)) {
      return { ok: false, error: 'Invalid status selected.' };
    }
<<<<<<< HEAD

    updateStatusStmt.run(status, id);
    return { ok: true, user: toPublicUser(findByIdStmt.get(id)) };
  },

  /**
   * @returns {{ users: array, total: number }}
   */
  list({ search = '', role = '', status = '', page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const searchPattern = search ? `%${search}%` : '';
    
    const users = listStmt.all(
      searchPattern, searchPattern, search,
      role, role,
      status, status,
      limit, offset
    );
    
    const { count } = countStmt.get(
      searchPattern, searchPattern, search,
      role, role,
      status, status
    );
    
    return {
      users: users.map(toPublicUser),
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
=======
    if (bcrypt.compareSync(newPassword, row.password)) {
      return { ok: false, error: 'New password must be different from the current one.', field: 'newPassword' };
    }
    updatePasswordStmt.run(bcrypt.hashSync(newPassword, SALT_ROUNDS), id);
    return { ok: true };
>>>>>>> 89a2e32bf6f31a866729cdbd13dfda64daff2406
  },
};
