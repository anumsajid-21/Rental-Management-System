/**
 * API client for the owner (Person 3) modules: rent, transactions,
 * maintenance, reports and CSV import. All requests include the bearer
 * token and return a uniform { ok, ...payload | error } shape.
 */
import { useAuth } from '../context/AuthContext';

const BASE = '/api/owner';

export function useOwnerApi() {
  const { token } = useAuth();

  async function request(path, { method = 'GET', body } = {}) {
    if (!token) return { ok: false, error: 'Not signed in.' };
    let res;
    try {
      res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      return { ok: false, error: 'Cannot reach the server. Please make sure the API is running.' };
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || 'Request failed.' };
    return { ok: true, ...data };
  }

  return {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body }),
    patch: (path, body) => request(path, { method: 'PATCH', body }),
  };
}
