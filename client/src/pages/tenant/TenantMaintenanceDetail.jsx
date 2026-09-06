import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { statusLabel } from '../../lib/constants';
import StatusBadge from '../../components/StatusBadge';
import LoadingBlock from '../../components/LoadingBlock';
import ErrorState from '../../components/ErrorState';

function PriorityBadge({ priority }) {
  const tone = priority === 'high' ? 'red' : priority === 'medium' ? 'amber' : 'gray';
  return <span className={`badge badge-${tone}`}>{statusLabel(priority)}</span>;
}

/** Full details of one of the tenant's own maintenance requests. */
export default function TenantMaintenanceDetail() {
  const { requestId } = useParams();
  const location = useLocation();
  const [flash, setFlash] = useState(location.state?.flash || '');
  const [state, setState] = useState({ loading: true, error: '', data: null });

  useEffect(() => {
    if (location.state?.flash) window.history.replaceState({}, document.title);
  }, [location.state]);

  const load = useCallback(async () => {
    setState({ loading: true, error: '', data: null });
    const res = await apiFetch(`/maintenance/${requestId}`);
    if (!res.ok) {
      setState({ loading: false, error: res.error, data: null });
      return;
    }
    setState({ loading: false, error: '', data: res.data });
  }, [requestId]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.loading) return <LoadingBlock label="Loading request…" />;
  if (state.error) {
    return (
      <div>
        <Link to="/tenant/maintenance" className="back-link">
          ← Back to Maintenance
        </Link>
        <ErrorState message={state.error} onRetry={load} />
      </div>
    );
  }

  const m = state.data?.request;
  if (!m) return <ErrorState message="Maintenance request not found." />;

  return (
    <div>
      <Link to="/tenant/maintenance" className="back-link">
        ← Back to Maintenance
      </Link>

      <div className="tenant-page-head">
        <h1>{m.title}</h1>
        <p>
          {m.propertyName} · Unit {m.unitNumber}
        </p>
      </div>

      {flash && (
        <div className="alert alert-success" role="status">
          {flash}
        </div>
      )}

      <section className="tenant-card">
        <header className="card-head">
          <h2>Request Details</h2>
          <div className="card-head-badges">
            <PriorityBadge priority={m.priority} />
            <StatusBadge status={m.status} />
          </div>
        </header>

        <div className="detail-grid">
          <div className="detail-item">
            <p className="detail-label">Request ID</p>
            <p className="detail-value mono">{m.id}</p>
          </div>
          <div className="detail-item">
            <p className="detail-label">Category</p>
            <p className="detail-value">{m.category}</p>
          </div>
          <div className="detail-item">
            <p className="detail-label">Priority</p>
            <p className="detail-value">{statusLabel(m.priority)}</p>
          </div>
          <div className="detail-item">
            <p className="detail-label">Property</p>
            <p className="detail-value">{m.propertyName}</p>
          </div>
          <div className="detail-item">
            <p className="detail-label">Unit</p>
            <p className="detail-value">{m.unitNumber}</p>
          </div>
          <div className="detail-item">
            <p className="detail-label">Status</p>
            <p className="detail-value">
              <StatusBadge status={m.status} />
            </p>
          </div>
          <div className="detail-item">
            <p className="detail-label">Created</p>
            <p className="detail-value">{formatDateTime(m.createdAt)}</p>
          </div>
          <div className="detail-item">
            <p className="detail-label">Last Updated</p>
            <p className="detail-value">{formatDateTime(m.updatedAt)}</p>
          </div>
        </div>

        <div className="detail-item detail-desc">
          <p className="detail-label">Description</p>
          <p>{m.description}</p>
        </div>
      </section>

      <section className="tenant-card">
        <header className="card-head">
          <h2>Response from the Property Owner</h2>
        </header>
        {m.ownerResponse ? (
          <blockquote className="owner-response">{m.ownerResponse}</blockquote>
        ) : (
          <p className="owner-response-none">No response has been provided yet.</p>
        )}
        <p className="muted-note small">
          The property owner will update the status as they work on your request — you cannot
          change it manually.
        </p>
      </section>
    </div>
  );
}
