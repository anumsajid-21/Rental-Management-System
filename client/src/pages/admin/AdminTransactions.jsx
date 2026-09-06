import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/adminStore';

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [statusCounts, setStatusCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadTransactions();
  }, [page, statusFilter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await adminApi.transactions({
        status: statusFilter,
        page,
        limit: 20
      });
      setTransactions(result.transactions);
      setTotalPages(result.totalPages);
      if (result.totalRevenue !== undefined) {
        setTotalRevenue(result.totalRevenue);
      }
      if (result.statusCounts) {
        setStatusCounts(result.statusCounts);
      }
    } catch (err) {
      setError(err.message || 'Failed to load transactions');
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

  return (
    <div className="admin-content">
      <div className="admin-header">
        <div className="admin-header-title">
          <h1>Transaction & Revenue Auditing</h1>
          <p>Global financial ledger and verified payment status tracking</p>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Financial KPI Summary Cards */}
      <div className="admin-cards">
        <div className="admin-card">
          <div className="admin-card-label">Audited Paid Revenue</div>
          <div className="admin-card-value">{formatCurrency(totalRevenue)}</div>
          <div className="admin-card-trend positive">From paid transactions only</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-label">Paid Transactions</div>
          <div className="admin-card-value">{getCount('paid')}</div>
          <div className="admin-card-trend positive">Verified payment settled</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-label">Pending Payments</div>
          <div className="admin-card-value">{getCount('pending')}</div>
          <div className="admin-card-trend">Awaiting settlement</div>
        </div>
        <div className="admin-card">
          <div className="admin-card-label">Overdue / Failed</div>
          <div className="admin-card-value">{getCount('overdue') + getCount('failed')}</div>
          <div className="admin-card-trend negative">Requires attention</div>
        </div>
      </div>

      {/* Financial Rule Safeguard Note */}
      <div style={{
        background: 'var(--card)',
        border: '1.5px solid var(--border)',
        borderRadius: '14px',
        padding: '16px 20px',
        marginBottom: '24px',
        fontSize: '0.88rem',
        color: 'var(--text-muted)'
      }}>
        💳 <strong>Financial Rule Safeguard:</strong> Total platform revenue calculations strictly include transactions with status <code>paid</code>. Pending, overdue, and failed payments are isolated in accounting logs.
      </div>

      <div className="admin-table-container">
        <div className="admin-table-header">
          <div className="admin-table-title">Transaction Ledger</div>
          <div className="admin-table-controls">
            <select
              className="admin-filter-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Payment Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
            Loading transaction ledger...
          </div>
        ) : transactions.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-state-icon">💳</div>
            <div className="admin-empty-state-title">No transactions found</div>
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
                  <th>Property Owner</th>
                  <th>Property</th>
                  <th>Unit</th>
                  <th>Amount</th>
                  <th>Payment Month</th>
                  <th>Payment Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div><strong>{t.tenantName}</strong></div>
                      <small className="text-muted">{t.tenantEmail}</small>
                    </td>
                    <td>
                      <div>{t.ownerName}</div>
                      <small className="text-muted">{t.ownerEmail}</small>
                    </td>
                    <td>{t.propertyName}</td>
                    <td>Unit #{t.unitNumber}</td>
                    <td><strong>{formatCurrency(t.amount)}</strong></td>
                    <td>{t.paymentMonth}</td>
                    <td>
                      {t.paymentDate 
                        ? new Date(t.paymentDate).toLocaleDateString() 
                        : 'Pending settlement'}
                    </td>
                    <td>
                      <span className={`status-badge ${t.status}`}>
                        {t.status}
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
