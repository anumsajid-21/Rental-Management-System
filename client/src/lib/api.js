/**
 * Thin authenticated API client for the Tenant Portal endpoints.
 * Reads the JWT from the shared session (AuthContext) in localStorage and
 * normalizes server responses to `{ ok, status, data }` or
 * `{ ok: false, status, error, field }` so pages can render meaningful
 * error messages and retry.
 */
const SESSION_KEY = 'rms_session';
const BASE = '/api/tenant';

function readToken() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))?.token || null;
  } catch {
    return null;
  }
}

export async function apiFetch(path, { method = 'GET', body } = {}) {
  const token = readToken();
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    return {
      ok: false,
      status: 0,
      error: 'Cannot reach the server. Please check your connection and try again.',
    };
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: data.error || 'Something went wrong. Please try again.',
      field: data.field,
    };
  }
  return { ok: true, status: res.status, data };
}
