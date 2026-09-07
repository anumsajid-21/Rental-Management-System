/**
 * API client for authentication.
 * Talks to the Express + SQLite backend (`/server`). All calls are async so
 * the calling code (AuthContext) doesn't care about the transport.
 */
const BASE = '/api/auth';

async function request(path, body) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: 'Cannot reach the server. Please make sure the API is running.' };
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data.error || 'Request failed.', field: data.field };
  return { ok: true, user: data.user, token: data.token };
}

/**
 * Register a new user.
 * @returns {{ ok: true, user: object, token: string } | { ok: false, error: string }}
 */
export function registerUser(payload) {
  return request('/register', payload);
}

/**
 * Authenticate a user by email + password.
 * @returns {{ ok: true, user: object, token: string } | { ok: false, error: string }}
 */
export function authenticateUser(payload) {
  return request('/login', payload);
}

/** Validate a stored token against the server (used on page refresh). */
export async function fetchCurrentUser(token) {
  try {
    const res = await fetch(`${BASE}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}
