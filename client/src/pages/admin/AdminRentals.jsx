import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/adminStore';

export default function AdminRentals() {
  const [rentals, setRentals] = useState([]);
  const [statusCounts, setStatusCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadRentals();
  }, [page, statusFilter]);

  const loadRentals = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await adminApi.rentals({
        status: statusFilter,
        page,
        limit: 20
      });
      setRentals(result.rentals);
      setTotalPages(result.totalPages);
      if (result.statusCounts) {
        setStatusCounts(result.statusCounts);
      }
    } catch (err) {
      setError(err.message || 'Failed to load rentals');
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
          <h1>Active & Historical Rental Monitoring</h1>
          <p>Complete oversight of active tenant leases and historical occupancy</p>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* KPI Cards */}
      <div className="admin-cards">
        <div className="admin-card">
          <div className="admin-card-label">Total Leases Recorded</div>
          <div className="admin-card-value">{totalCount}</div>
          <div className="admin-card-trend">Active and historical</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-label">Active Occupied</div>
          <div className="admin-card-value">{getCount('active')}</div>
          <div className="admin-card-trend positive">Currently active leases</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-label">Completed / Ended</div>
          <div className="admin-card-value">{getCount('ended')}</div>
          <div className="admin-card-trend">Ended normally</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-label">Cancelled</div>
          <div className="admin-card-value">{getCount('cancelled')}</div>
          <div className="admin-card-trend">Terminated early</div>
        </div>
      </div>

      <div className="admin-table-container">
        <div className="admin-table-header">
          <div className="admin-table-title">Rental Directory</div>
          <div className="admin-table-controls">
            <select
              className="admin-filter-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Lease Statuses</option>
              <option value="active">Active</option>
              <option value="ended">Ended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
            Loading rental records...
          </div>
        ) : rentals.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-state-icon">🔑</div>
            <div className="admin-empty-state-title">No rentals found</div>
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
                  <th>Monthly Rent</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rentals.map((rental) => (
                  <tr key={rental.id}>
                    <td>
                      <div><strong>{rental.tenantName}</strong></div>
                      <small className="text-muted">{rental.tenantEmail}</small>
                    </td>
                    <td>
                      <div><strong>{rental.propertyName}</strong></div>
                      <small className="text-muted">{rental.propertyCity}</small>
                    </td>
                    <td>Unit #{rental.unitNumber}</td>
                    <td>{formatCurrency(rental.rentAmount)}</td>
                    <td>{new Date(rental.startDate).toLocaleDateString()}</td>
                    <td>{rental.endDate ? new Date(rental.endDate).toLocaleDateString() : 'Ongoing'}</td>
                    <td>
                      <span className={`status-badge ${rental.status}`}>
                        {rental.status}
                      </span>
                    </td>
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
