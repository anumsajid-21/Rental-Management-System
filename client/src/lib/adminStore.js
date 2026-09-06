const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('rms_session');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${JSON.parse(token).token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const adminApi = {
  dashboard: () => request('/admin/dashboard'),
  
  users: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return request(`/admin/users?${queryString}`);
  },
  
  userById: (id) => request(`/admin/users/${id}`),
  
  updateUser: (id, data) => request(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  
  updateUserStatus: (id, status) => request(`/admin/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
  
  properties: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return request(`/admin/properties?${queryString}`);
  },
  
  propertyById: (id) => request(`/admin/properties/${id}`),
  
  rentalRequests: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return request(`/admin/rental-requests?${queryString}`);
  },
  
  rentals: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return request(`/admin/rentals?${queryString}`);
  },
  
  transactions: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return request(`/admin/transactions?${queryString}`);
  },
  
  maintenance: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return request(`/admin/maintenance?${queryString}`);
  },
  
  reportsSummary: () => request('/admin/reports/summary'),
  
  exportReports: async (type = 'summary', format = 'json') => {
    const token = localStorage.getItem('rms_session');
    const headers = {
      ...(token && { Authorization: `Bearer ${JSON.parse(token).token}` }),
    };

    const response = await fetch(`${API_BASE}/admin/reports/export?type=${type}&format=${format}`, {
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Export failed');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rental-system-${type}-${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
