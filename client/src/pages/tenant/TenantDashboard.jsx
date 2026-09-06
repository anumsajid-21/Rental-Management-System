import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { formatCurrency, formatDate, formatRentMonth } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import LoadingBlock from '../../components/LoadingBlock';
import ErrorState from '../../components/ErrorState';

/**
 * Tenant dashboard: active rental summary, key stats, and recent
 * transactions + maintenance requests. Falls back to a friendly empty
 * state with a browse action when there is no active rental.
 */
export default function TenantDashboard() {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, error: '', data: null });

  const load = useCallback(async () => {
    setState({ loading: true, error: '', data: null });
    const res = await apiFetch('/dashboard');
    if (!res.ok) {
      setState({ loading: false, error: res.error, data: null });
      return;
    }
    setState({ loading: false, error: '', data: res.data });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.loading) return <LoadingBlock label="Loading your dashboard…" />;
  if (state.error) return <ErrorState message={state.error} onRetry={load} />;

  const data = state.data || {};
  const { activeRental, nextPayment, totalPaid, openMaintenance, recentTransactions, recentMaintenance } = data;
  const firstName = (data.tenant?.name || user?.name || '').split(' ')[0];

  return (
    <div>
      <div className="tenant-page-head">
        <h1>Welcome back, {firstName}!</h1>
        <p>Here is a quick overview of your rental activity.</p>
      </div>

      {activeRental ? (
        <>
          <section className="tenant-card rental-highlight">
            <div className="rental-highlight-main">
              <p className="stat-label">Current Rental</p>
              <h2>{activeRental.propertyName}</h2>
              <p className="rental-highlight-sub">
                Unit {activeRental.unitNumber} · {activeRental.propertyLocation} · Owner:{' '}
                {activeRental.ownerName}
              </p>
            </div>
            <div className="rental-highlight-side">
              <StatusBadge status={activeRental.status} />
              <Link className="btn btn-primary btn-sm" to="/tenant/rental">
                View My Rental
              </Link>
            </div>
          </section>

          <section className="stat-grid">
            <div className="tenant-card stat-card">
              <p className="stat-label">Monthly Rent</p>
              <p className="stat-value">{formatCurrency(activeRental.monthlyRent)}</p>
              <p className="stat-sub">for Unit {activeRental.unitNumber}</p>
            </div>
            <div className="tenant-card stat-card">
              <p className="stat-label">Next Rent Due</p>
              <p className="stat-value">{nextPayment ? formatDate(nextPayment.dueDate) : '—'}</p>
              {nextPayment && (
                <p className="stat-sub">
                  <StatusBadge status={nextPayment.status} />
                </p>
              )}
            </div>
            <div className="tenant-card stat-card">
              <p className="stat-label">Total Paid</p>
              <p className="stat-value">{formatCurrency(totalPaid)}</p>
              <p className="stat-sub">all-time payments</p>
            </div>
            <div className="tenant-card stat-card">
              <p className="stat-label">Open Requests</p>
              <p className="stat-value">{openMaintenance}</p>
              <p className="stat-sub">maintenance being handled</p>
            </div>
          </section>
        </>
      ) : (
        <EmptyState
          icon="home"
          title="You don't have an active rental yet."
          message="Browse available properties to find your next home."
          action={
            <Link className="btn btn-primary" to="/tenant/properties">
              Browse Properties
            </Link>
          }
        />
      )}

      {recentTransactions && recentTransactions.length > 0 && (
        <section className="tenant-card dashboard-section">
          <header className="card-head">
            <h2>Recent Transactions</h2>
            <Link to="/tenant/transactions" className="card-link">
              View all
            </Link>
          </header>
          <div className="list-rows">
            {recentTransactions.map((t) => (
              <Link key={t.id} to={`/tenant/transactions/${t.id}`} className="list-row">
                <div className="list-row-main">
                  <strong>{formatRentMonth(t.rentMonth)} Rent</strong>
                  <span>
                    {t.propertyName} · Unit {t.unitNumber}
                  </span>
                </div>
                <div className="list-row-side">
                  <span className="list-amount">{formatCurrency(t.amount)}</span>
                  <StatusBadge status={t.status} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {recentMaintenance && recentMaintenance.length > 0 && (
        <section className="tenant-card dashboard-section">
          <header className="card-head">
            <h2>Recent Maintenance Requests</h2>
            <Link to="/tenant/maintenance" className="card-link">
              View all
            </Link>
          </header>
          <div className="list-rows">
            {recentMaintenance.map((m) => (
              <Link key={m.id} to={`/tenant/maintenance/${m.id}`} className="list-row">
                <div className="list-row-main">
                  <strong>{m.title}</strong>
                  <span>
                    {m.category} · Unit {m.unitNumber} · {formatDate(m.createdAt)}
                  </span>
                </div>
                <div className="list-row-side">
                  <StatusBadge status={m.status} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

