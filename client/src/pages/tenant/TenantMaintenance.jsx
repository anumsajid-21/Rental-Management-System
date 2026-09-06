import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { statusLabel } from '../../lib/constants';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import LoadingBlock from '../../components/LoadingBlock';
import ErrorState from '../../components/ErrorState';

function PriorityBadge({ priority }) {
  const tone = priority === 'high' ? 'red' : priority === 'medium' ? 'amber' : 'gray';
  return <span className={`badge badge-${tone}`}>{statusLabel(priority)}</span>;
}

/** Tenant's maintenance requests for their active rental. */
export default function TenantMaintenance() {
  const [state, setState] = useState({ loading: true, error: '', data: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    const [maintenanceRes, rentalRes] = await Promise.all([
      apiFetch('/maintenance'),
      apiFetch('/rentals/active'),
    ]);
    if (!maintenanceRes.ok) {
      setState({ loading: false, error: maintenanceRes.error, data: null });
      return;
    }
    if (!rentalRes.ok) {
      setState({ loading: false, error: rentalRes.error, data: null });
      return;
    }
    setState({
      loading: false,
      error: '',
      data: { requests: maintenanceRes.data.requests, hasActiveRental: Boolean(rentalRes.data.rental) },
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.loading) return <LoadingBlock label="Loading maintenance requests…" />;
  if (state.error) return <ErrorState message={state.error} onRetry={load} />;

  const { requests, hasActiveRental } = state.data;

  return (
    <div>
      <div className="tenant-page-head tenant-page-head-row">
        <div>
          <h1>Maintenance Requests</h1>
          <p>Report problems with your rental and track their progress.</p>
        </div>
        {hasActiveRental && (
          <Link to="/tenant/maintenance/new" className="btn btn-primary">
            New Request
          </Link>
        )}
      </div>

      {!hasActiveRental && (
        <div className="alert alert-info" role="status">
          You need an active rental before you can report maintenance issues.{' '}
          <Link to="/tenant/properties">Browse available properties</Link> to get started.
        </div>
      )}

      {requests.length === 0 ? (
        <EmptyState
          icon="wrench"
          title="No maintenance requests."
          message={
            hasActiveRental
              ? 'Report a problem with your rental and the property owner will take a look.'
              : 'Once you have an active rental, you can report issues here.'
          }
          action={
            hasActiveRental ? (
              <Link to="/tenant/maintenance/new" className="btn btn-primary">
                New Request
              </Link>
            ) : null
          }
        />
      ) : (
        <section className="tenant-card">
          <div className="list-rows">
            {requests.map((m) => (
              <Link key={m.id} to={`/tenant/maintenance/${m.id}`} className="list-row">
                <div className="list-row-main">
                  <strong>{m.title}</strong>
                  <span>
                    {m.category} · Unit {m.unitNumber} · Created {formatDate(m.createdAt)} · Updated{' '}
                    {formatDate(m.updatedAt)}
                  </span>
                </div>
                <div className="list-row-side">
                  <PriorityBadge priority={m.priority} />
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
