import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/format';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import LoadingBlock from '../../components/LoadingBlock';
import ErrorState from '../../components/ErrorState';

/**
 * My Rental: the tenant's active rental (read-only) plus the status of
 * their rental requests. Pending requests can be cancelled.
 */
export default function TenantRental() {
  const location = useLocation();
  const [flash, setFlash] = useState(location.state?.flash || '');
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [cancellingId, setCancellingId] = useState(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (location.state?.flash) window.history.replaceState({}, document.title);
  }, [location.state]);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    const [rentalRes, requestsRes] = await Promise.all([
      apiFetch('/rentals/active'),
      apiFetch('/rental-requests'),
    ]);
    if (!rentalRes.ok) {
      setState({ loading: false, error: rentalRes.error, data: null });
      return;
    }
    if (!requestsRes.ok) {
      setState({ loading: false, error: requestsRes.error, data: null });
      return;
    }
    setState({
      loading: false,
      error: '',
      data: { rental: rentalRes.data.rental, requests: requestsRes.data.rentalRequests },
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cancelRequest = async (request) => {
    if (
      !window.confirm(`Cancel your rental request for "${request.propertyName}" — Unit ${request.unitNumber}?`)
    ) {
      return;
    }
    setCancellingId(request.id);
    setActionError('');
    const res = await apiFetch(`/rental-requests/${request.id}/cancel`, { method: 'POST' });
    setCancellingId(null);
    if (!res.ok) {
      setActionError(res.error);
      return;
    }
    setFlash('Rental request cancelled.');
    load();
  };

  if (state.loading) return <LoadingBlock label="Loading your rental…" />;
  if (state.error) return <ErrorState message={state.error} onRetry={load} />;

  const { rental, requests } = state.data;

  return (
    <div>
      <div className="tenant-page-head">
        <h1>My Rental</h1>
        <p>Your active rental and the status of your rental requests.</p>
      </div>

      {flash && (
        <div className="alert alert-success" role="status">
          {flash}
        </div>
      )}
      {actionError && (
        <div className="alert alert-error" role="alert">
          {actionError}
        </div>
      )}

      {rental ? (
        <section className="tenant-card">
          <header className="card-head">
            <h2>Active Rental</h2>
            <StatusBadge status={rental.status} />
          </header>
          <div className="detail-grid">
            <div className="detail-item">
              <p className="detail-label">Property</p>
              <p className="detail-value">{rental.propertyName}</p>
            </div>
            <div className="detail-item">
              <p className="detail-label">Unit</p>
              <p className="detail-value">{rental.unitNumber}</p>
            </div>
            <div className="detail-item">
              <p className="detail-label">Owner</p>
              <p className="detail-value">{rental.ownerName}</p>
            </div>
            <div className="detail-item">
              <p className="detail-label">Monthly Rent</p>
              <p className="detail-value">{formatCurrency(rental.monthlyRent)}</p>
            </div>
            <div className="detail-item">
              <p className="detail-label">Start Date</p>
              <p className="detail-value">{formatDate(rental.startDate)}</p>
            </div>
            <div className="detail-item">
              <p className="detail-label">End Date</p>
              <p className="detail-value">{rental.endDate ? formatDate(rental.endDate) : 'Ongoing'}</p>
            </div>
          </div>
        </section>
      ) : (
        <EmptyState
          icon="home"
          title="You don't have an active rental yet."
          message="Browse available properties to find your next home."
          action={
            <Link to="/tenant/properties" className="btn btn-primary">
              Browse Properties
            </Link>
          }
        />
      )}

      <section className="tenant-card dashboard-section">
        <header className="card-head">
          <h2>Rental Requests</h2>
        </header>
        {requests.length === 0 ? (
          <p className="muted-note">
            You haven't requested any property yet. Open a property, pick an available unit and
            submit a rental request.
          </p>
        ) : (
          <div className="list-rows">
            {requests.map((r) => (
              <div key={r.id} className="list-row">
                <div className="list-row-main">
                  <strong>
                    {r.propertyName} — Unit {r.unitNumber}
                  </strong>
                  <span>
                    Requested {formatDate(r.createdAt)} · Move-in {formatDate(r.moveInDate)} ·{' '}
                    {formatCurrency(r.monthlyRent)}/mo
                  </span>
                </div>
                <div className="list-row-side">
                  <StatusBadge status={r.status} />
                  {r.status === 'pending' && (
                    <button
                      type="button"
                      className="btn btn-ghost-danger btn-sm"
                      onClick={() => cancelRequest(r)}
                      disabled={cancellingId === r.id}
                    >
                      {cancellingId === r.id ? 'Cancelling…' : 'Cancel Request'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

