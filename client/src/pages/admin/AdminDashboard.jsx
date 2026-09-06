import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/adminStore';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const dashboardData = await adminApi.dashboard();
      setData(dashboardData);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner" />
        Loading system dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-content">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusCount = (byStatus, status) => {
    const found = byStatus?.find(s => s.status === status);
    return found?.count || 0;
  };

  const totalUnits = data?.stats?.totalUnits || 0;
  const activeRentals = data?.stats?.totalActiveRentals || 0;
  const occupancyRate = totalUnits > 0 ? ((activeRentals / totalUnits) * 100).toFixed(0) : 0;

  const totalTransactions = data?.transactions?.byStatus?.reduce((sum, t) => sum + t.count, 0) || 0;
  const paidTransactions = getStatusCount(data?.transactions?.byStatus, 'paid');
  const collectionRate = totalTransactions > 0 ? ((paidTransactions / totalTransactions) * 100).toFixed(0) : 0;

  return (
    <div className="admin-content">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-title">
          <h1>Admin Command Dashboard</h1>
          <p>Welcome back. Real-time platform health, occupancy, and financial summary.</p>
        </div>
      </div>

      {/* Easy Understanding Banner */}
      <div style={{
        background: 'var(--card)',
        border: '1.5px solid var(--border)',
        borderRadius: '16px',
        padding: '20px 24px',
        marginBottom: '28px',
        boxShadow: '0 2px 8px rgba(60, 70, 60, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <span style={{ fontSize: '1.2rem' }}>👋</span>
          <strong style={{ color: 'var(--text)', fontSize: '1rem' }}>Platform Snapshot & Quick Navigation</strong>
        </div>
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          Monitor your core operations below. Use the left sidebar to manage <strong>Users</strong>, review <strong>Properties</strong>, audit <strong>Transactions</strong>, and download compliance reports from <strong>Reports</strong>.
        </p>
      </div>

      {/* Primary KPI Cards */}
      <div className="admin-cards">
        <div className="admin-card">
          <div className="admin-card-label">Total Users</div>
          <div className="admin-card-value">{data?.stats?.totalUsers || 0}</div>
          <div className="admin-card-trend">
            {data?.stats?.totalTenants || 0} tenants • {data?.stats?.totalOwners || 0} owners
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-label">Properties & Units</div>
          <div className="admin-card-value">{data?.stats?.totalProperties || 0}</div>
          <div className="admin-card-trend">
            {totalUnits} total registered units
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-label">Active Rentals</div>
          <div className="admin-card-value">{activeRentals}</div>
          <div className="admin-card-trend positive">Leases currently active</div>
        </div>

        <div className="admin-card">
          <div className="admin-card-label">Total Audited Revenue</div>
          <div className="admin-card-value">
            {formatCurrency(data?.transactions?.totalRevenue || 0)}
          </div>
          <div className="admin-card-trend positive">From paid transactions</div>
        </div>
      </div>

      {/* Visual Health Gauge Bars (Used only where needed) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="admin-card-label" style={{ margin: 0 }}>Unit Occupancy Rate</span>
            <strong style={{ color: 'var(--accent-dark)' }}>{occupancyRate}%</strong>
          </div>
          <div style={{ background: '#e5e7eb', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ width: `${occupancyRate}%`, background: 'var(--accent)', height: '100%', borderRadius: '6px' }} />
          </div>
          <small className="text-muted" style={{ marginTop: '8px', fontSize: '0.8rem' }}>
            {activeRentals} of {totalUnits} units currently occupied
          </small>
        </div>

        <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="admin-card-label" style={{ margin: 0 }}>Payment Collection Health</span>
            <strong style={{ color: '#065f46' }}>{collectionRate}%</strong>
          </div>
          <div style={{ background: '#e5e7eb', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ width: `${collectionRate}%`, background: '#10b981', height: '100%', borderRadius: '6px' }} />
          </div>
          <small className="text-muted" style={{ marginTop: '8px', fontSize: '0.8rem' }}>
            {paidTransactions} of {totalTransactions} transactions successfully collected
          </small>
        </div>

        <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="admin-card-label" style={{ margin: 0 }}>Pending Action Items</span>
            <strong style={{ color: '#92400e' }}>
              {getStatusCount(data?.rentalRequests?.byStatus, 'pending') + getStatusCount(data?.maintenance?.byStatus, 'submitted')} Items
            </strong>
          </div>
          <small className="text-muted" style={{ fontSize: '0.85rem' }}>
            📋 {getStatusCount(data?.rentalRequests?.byStatus, 'pending')} rental requests pending review<br />
            🔧 {getStatusCount(data?.maintenance?.byStatus, 'submitted')} maintenance requests submitted
          </small>
        </div>
      </div>

      {/* Recent Activity Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        {data?.recentTransactions?.length > 0 && (
          <div className="admin-table-container">
            <div className="admin-table-header">
              <div className="admin-table-title">Recent Transactions</div>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Property</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTransactions.slice(0, 5).map((t) => (
                  <tr key={t.id}>
                    <td><strong>{t.tenantName}</strong></td>
                    <td>{t.propertyName}</td>
                    <td>{formatCurrency(t.amount)}</td>
                    <td>
                      <span className={`status-badge ${t.status}`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data?.recentMaintenance?.length > 0 && (
          <div className="admin-table-container">
            <div className="admin-table-header">
              <div className="admin-table-title">Recent Maintenance Activity</div>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Property</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentMaintenance.slice(0, 5).map((m) => (
                  <tr key={m.id}>
                    <td><strong>{m.title}</strong></td>
                    <td>{m.propertyName}</td>
                    <td>
                      <span className={`status-badge ${m.priority}`}>{m.priority}</span>
                    </td>
                    <td>
                      <span className={`status-badge ${m.status}`}>{m.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
