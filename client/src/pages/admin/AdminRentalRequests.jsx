import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/adminStore';

export default function AdminRentalRequests() {
  const [requests, setRequests] = useState([]);
  const [statusCounts, setStatusCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadRequests();
  }, [page, statusFilter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await adminApi.rentalRequests({
        status: statusFilter,
        page,
        limit: 20
      });
      setRequests(result.requests || result.rentalRequests || []);
      setTotalPages(result.totalPages || 1);
      if (result.statusCounts) {
        setStatusCounts(result.statusCounts);
      }
    } catch (err) {
      setError(err.message || 'Failed to load rental requests');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getCount = (status) => {
    const found = statusCounts?.find(s => s.status === status);
    return found?.count || 0;
  };

  const totalCount = statusCounts.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="admin-content">
      <div className="admin-header">
        <div className="admin-header-title">
          <h1>Rental Requests Monitoring</h1>
          <p>Audit and track tenant rental application statuses across all properties</p>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Summary KPI Cards */}
      <div className="admin-cards">
        <div className="admin-card">
          <div className="admin-card-label">Total Applications</div>
          <div className="admin-card-value">{totalCount}</div>
          <div className="admin-card-trend">Across all properties</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-label">Pending Review</div>
          <div className="admin-card-value">{getCount('pending')}</div>
          <div className="admin-card-trend">Awaiting owner action</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-label">Approved</div>
          <div className="admin-card-value">{getCount('approved')}</div>
          <div className="admin-card-trend positive">Converted to leases</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-label">Rejected</div>
          <div className="admin-card-value">{getCount('rejected')}</div>
          <div className="admin-card-trend">Declined requests</div>
        </div>
      </div>

      {/* Easy Instructions Banner */}
      <div style={{
        background: 'var(--card)',
        border: '1.5px solid var(--border)',
        borderRadius: '14px',
        padding: '16px 20px',
        marginBottom: '24px',
        fontSize: '0.88rem',
        color: 'var(--text-muted)'
      }}>
        💡 <strong>Audit Safeguard Note:</strong> Property Owners review and approve incoming tenant applications. Admins monitor application volume, audit response rates, and enforce platform security policies.
      </div>

      <div className="admin-table-container">
        <div className="admin-table-header">
          <div className="admin-table-title">Rental Requests Log</div>
          <div className="admin-table-controls">
            <select
              className="admin-filter-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
            Loading rental requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-state-icon">📋</div>
            <div className="admin-empty-state-title">No rental requests found</div>
            <div className="admin-empty-state-description">
              Try adjusting your status filter
            </div>
          </div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Property</th>
                  <th>Unit</th>
                  <th>Rent Amount</th>
                  <th>Status</th>
                  <th>Submitted Date</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <div><strong>{request.tenantName}</strong></div>
                      <small className="text-muted">{request.tenantEmail}</small>
                    </td>
                    <td>
                      <div><strong>{request.propertyName}</strong></div>
                      <small className="text-muted">{request.propertyCity}</small>
                    </td>
                    <td>Unit #{request.unitNumber}</td>
                    <td>{formatCurrency(request.rentAmount ?? request.monthlyRent ?? 0)}</td>
                    <td>
                      <span className={`status-badge ${request.status}`}>
                        {request.status}
                      </span>
                    </td>
                    <td>{request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="admin-pagination">
              <div className="admin-pagination-info">
                Page {page} of {totalPages}
              </div>
              <div className="admin-pagination-controls">
                <button
                  className="admin-pagination-btn"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ←
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      className={`admin-pagination-btn ${page === pageNum ? 'active' : ''}`}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  className="admin-pagination-btn"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
