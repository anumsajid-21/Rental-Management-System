import { useState, useEffect } from 'react';
import { Wrench } from 'lucide-react';
import { adminApi } from '../../lib/adminStore';

export default function AdminMaintenance() {
  const [requests, setRequests] = useState([]);
  const [statusCounts, setStatusCounts] = useState([]);
  const [priorityCounts, setPriorityCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  useEffect(() => {
    loadRequests();
  }, [page, statusFilter, priorityFilter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await adminApi.maintenance({
        status: statusFilter,
        priority: priorityFilter,
        page,
        limit: 20
      });
      setRequests(result.requests || result.maintenance || []);
      setTotalPages(result.totalPages || 1);
      if (result.statusCounts) {
        setStatusCounts(result.statusCounts);
      }
      if (result.priorityCounts) {
        setPriorityCounts(result.priorityCounts);
      }
    } catch (err) {
      setError(err.message || 'Failed to load maintenance requests');
    } finally {
      setLoading(false);
    }
  };

  const getStatusCount = (status) => {
    const found = statusCounts?.find(s => s.status === status);
    return found?.count || 0;
  };

  const totalCount = statusCounts.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="admin-content">
      <div className="admin-header">
        <div className="admin-header-title">
          <h1>Maintenance Oversight</h1>
          <p>Monitor repair issues, tenant requests, and resolution progress across all properties</p>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Summary KPI Cards */}
      <div className="admin-cards">
        <div className="admin-card">
          <div className="admin-card-label">Total Issues Logged</div>
          <div className="admin-card-value">{totalCount}</div>
          <div className="admin-card-trend">System-wide requests</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-label">Submitted (New)</div>
          <div className="admin-card-value">{getStatusCount('submitted')}</div>
          <div className="admin-card-trend">Awaiting owner response</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-label">In Progress</div>
          <div className="admin-card-value">{getStatusCount('in_progress')}</div>
          <div className="admin-card-trend">Active repair service</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-label">Resolved</div>
          <div className="admin-card-value">{getStatusCount('resolved')}</div>
          <div className="admin-card-trend positive">Completed repairs</div>
        </div>
      </div>

      <div className="admin-table-container">
        <div className="admin-table-header">
          <div className="admin-table-title">Maintenance Requests Log</div>
          <div className="admin-table-controls">
            <select
              className="admin-filter-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              className="admin-filter-select"
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
            Loading maintenance requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}>
              <Wrench size={36} strokeWidth={1.75} />
            </div>
            <div className="admin-empty-state-title">No maintenance requests found</div>
            <div className="admin-empty-state-description">
              Try adjusting your status or priority filters
            </div>
          </div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Issue & Description</th>
                  <th>Tenant</th>
                  <th>Property</th>
                  <th>Unit</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Reported Date</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div><strong>{m.title}</strong></div>
                      {m.description && (
                        <small className="text-muted" style={{ display: 'block', maxWidth: '280px' }}>
                          {m.description}
                        </small>
                      )}
                    </td>
                    <td>
                      <div><strong>{m.tenantName}</strong></div>
                      <small className="text-muted">{m.tenantEmail}</small>
                    </td>
                    <td>{m.propertyName}</td>
                    <td>Unit #{m.unitNumber}</td>
                    <td>
                      <span className={`status-badge ${m.priority}`}>
                        {m.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${m.status}`}>
                        {m.status}
                      </span>
                    </td>
                    <td>{new Date(m.createdAt).toLocaleDateString()}</td>
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
