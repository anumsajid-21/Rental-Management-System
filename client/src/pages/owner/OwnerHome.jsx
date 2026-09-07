import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Inbox, Plus, Wrench, ClipboardList } from 'lucide-react';
import { useOwnerApi } from '../../lib/ownerApi';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, StatCard, Badge, Loading, ErrorState, Alert, EmptyState, money, dateFmt } from '../../components/ownerUi';

export default function OwnerHome() {
  const api = useOwnerApi();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    const result = await api.get('/dashboard');
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setData(result);
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ownerName = data?.ownerName || user?.name || 'Property Owner';
  const stats = data?.stats || {
    totalProperties: 0,
    availableProperties: 0,
    occupiedProperties: 0,
    pendingRequests: 0,
  };
  const recentRequests = data?.recentRequests || [];

  return (
    <div className="page">
      <PageHeader
        title={`Welcome, ${ownerName}`}
        subtitle="Manage your property portfolio, tenant requests, and maintenance from your overview."
        actions={
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link to="/owner/properties?action=add" className="btn btn-primary btn-sm">
              <Plus size={16} /> Add Property
            </Link>
            <Link to="/owner/properties" className="btn btn-ghost btn-sm">
              <Building2 size={16} /> View Properties
            </Link>
            <Link to="/owner/rental-requests" className="btn btn-ghost btn-sm">
              <Inbox size={16} /> View Requests
            </Link>
          </div>
        }
      />

      <Alert kind="error" onClose={() => setError('')}>{error}</Alert>

      {loading && <Loading label="Loading your dashboard overview…" />}

      {!loading && error && (
        <ErrorState message={error} onRetry={load} />
      )}

      {!loading && !error && (
        <>
          {/* Key Metric Stat Cards */}
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
            <StatCard
              label="Total Properties"
              value={stats.totalProperties}
              tone="default"
              hint="Properties in your portfolio"
            />
            <StatCard
              label="Available Properties"
              value={stats.availableProperties}
              tone="success"
              hint="Ready for new renters"
            />
            <StatCard
              label="Occupied Properties"
              value={stats.occupiedProperties}
              tone="info"
              hint="Currently generating rent"
            />
            <StatCard
              label="Pending Rental Requests"
              value={stats.pendingRequests}
              tone={stats.pendingRequests > 0 ? 'warning' : 'default'}
              hint="Awaiting your review"
            />
          </div>

          {/* Quick Actions Card */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <h2 className="card-title" style={{ marginBottom: '12px' }}>Quick Actions</h2>
            <p className="card-hint" style={{ marginBottom: '16px' }}>
              Common actions to manage your properties and respond to tenants.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/owner/properties?action=add')}
              >
                <Plus size={18} /> Add New Property
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => navigate('/owner/properties')}
              >
                <Building2 size={18} /> Manage Properties ({stats.totalProperties})
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => navigate('/owner/rental-requests')}
              >
                <Inbox size={18} /> Review Rental Requests ({stats.pendingRequests} pending)
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => navigate('/owner/maintenance')}
              >
                <Wrench size={18} /> Maintenance Requests
              </button>
            </div>
          </div>

          {/* Recent Rental Requests */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h2 className="card-title" style={{ marginBottom: 0 }}>Recent Rental Requests</h2>
                <p className="card-hint" style={{ margin: '4px 0 0' }}>Latest applications from tenants wanting to rent your properties.</p>
              </div>
              <Link to="/owner/rental-requests" className="btn btn-ghost btn-sm">
                View All Requests →
              </Link>
            </div>

            {recentRequests.length === 0 ? (
              <EmptyState
                title="No rental requests yet"
                hint="When tenants apply to rent your properties, their requests will appear here for review."
              >
                <Link to="/owner/properties" className="btn btn-ghost btn-sm" style={{ marginTop: '12px' }}>
                  Check Property Listings
                </Link>
              </EmptyState>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tenant</th>
                      <th>Property</th>
                      <th>Monthly Rent</th>
                      <th>Move-in Date</th>
                      <th>Submitted</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRequests.map((req) => (
                      <tr key={req.id}>
                        <td>
                          <strong>{req.tenant_name}</strong>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{req.tenant_email}</div>
                        </td>
                        <td>
                          <strong>{req.property_name}</strong>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{req.property_address}</div>
                        </td>
                        <td><strong>{money(req.monthly_rent)}</strong></td>
                        <td>{dateFmt(req.move_in_date)}</td>
                        <td>{dateFmt(req.created_at)}</td>
                        <td>
                          <Badge value={req.status === 'approved' ? 'approved' : req.status} />
                        </td>
                        <td>
                          <Link to={`/owner/rental-requests?open=${req.id}`} className="btn btn-ghost btn-sm">
                            Review
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
