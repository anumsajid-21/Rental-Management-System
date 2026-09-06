import { useCallback, useEffect, useState } from 'react';
import { useOwnerApi } from '../../lib/ownerApi';
import { PageHeader, Badge, Alert, Loading, EmptyState, Modal, dateFmt } from '../../components/ownerUi';

const NEXT_STATUS = { submitted: ['in_progress'], in_progress: ['resolved'], resolved: [] };
const STATUS_LABELS = { submitted: 'Mark in progress', in_progress: 'Mark resolved', resolved: '' };

export default function MaintenancePage() {
  const api = useOwnerApi();
  const [requests, setRequests] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [detail, setDetail] = useState(null);
  const [confirmStatus, setConfirmStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (f) => {
    const fl = f || { search, status };
    setError('');
    const qs = new URLSearchParams();
    if (fl.search) qs.set('search', fl.search);
    if (fl.status !== 'all') qs.set('status', fl.status);
    const result = await api.get(`/maintenance${qs.toString() ? `?${qs}` : ''}`);
    if (!result.ok) { setError(result.error); return; }
    setRequests(result.requests);
  }, [api, search, status]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyStatus = async () => {
    if (!confirmStatus) return;
    setBusy(true);
    const result = await api.patch(`/maintenance/${confirmStatus.id}/status`, { status: confirmStatus.next });
    setBusy(false);
    setConfirmStatus(null);
    if (!result.ok) { setError(result.error); return; }
    setNotice('Maintenance request status updated.');
    setDetail((d) => (d && d.id === result.request.id ? result.request : d));
    load();
  };

  return (
    <div className="page">
      <PageHeader title="Maintenance Requests" subtitle="Requests submitted by tenants for your properties." />
      <Alert kind="error" onClose={() => setError('')}>{error}</Alert>
      <Alert kind="info" onClose={() => setNotice('')}>{notice}</Alert>

      <div className="card">
        <div className="toolbar">
          <input className="toolbar-input" placeholder="Search tenant, property or issue…" value={search}
            onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
          <select className="toolbar-select" value={status}
            onChange={(e) => { setStatus(e.target.value); load({ search, status: e.target.value }); }}>
            <option value="all">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <button className="btn btn-ghost" onClick={() => load()}>Search</button>
        </div>

        {requests === null ? <Loading label="Loading maintenance requests…" /> : requests.length === 0 ? (
          <EmptyState title="No maintenance requests" hint="When tenants submit requests for your properties, they will appear here." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Issue</th><th>Tenant</th><th>Property</th><th>Priority</th><th>Created</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {requests.map((m) => (
                  <tr key={m.id}>
                    <td>{m.title}</td>
                    <td>{m.tenant_name}</td>
                    <td>{m.property_name}</td>
                    <td><span className={`badge badge-${m.priority === 'high' ? 'danger' : m.priority === 'low' ? 'muted' : 'warning'}`}>{m.priority}</span></td>
                    <td>{dateFmt(m.created_at)}</td>
                    <td><Badge value={m.status} /></td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={async () => {
                        const result = await api.get(`/maintenance/${m.id}`);
                        if (!result.ok) { setError(result.error); return; }
                        setDetail(result.request);
                      }}>Open</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={Boolean(detail)} title="Maintenance request" onClose={() => setDetail(null)}
        footer={
          detail && (NEXT_STATUS[detail.status] || []).length > 0 && (
            <button className="btn btn-primary" disabled={busy}
              onClick={() => setConfirmStatus({ id: detail.id, next: NEXT_STATUS[detail.status][0], title: STATUS_LABELS[detail.status] })}>
              {STATUS_LABELS[detail.status]}
            </button>
          )
        }>
        {detail && (
          <div className="detail-grid">
            <div className="detail-full"><span>Issue</span><strong>{detail.title}</strong></div>
            <div className="detail-full"><span>Description</span><p className="detail-desc">{detail.description}</p></div>
            <div><span>Tenant</span><strong>{detail.tenant_name}</strong></div>
            <div><span>Property</span><strong>{detail.property_name}</strong></div>
            <div><span>Address</span><strong>{detail.property_address}</strong></div>
            <div><span>Priority</span><span className={`badge badge-${detail.priority === 'high' ? 'danger' : detail.priority === 'low' ? 'muted' : 'warning'}`}>{detail.priority}</span></div>
            <div><span>Created</span><strong>{new Date(detail.created_at).toLocaleString()}</strong></div>
            <div><span>Status</span><Badge value={detail.status} /></div>
            <div><span>Last updated</span><strong>{new Date(detail.updated_at).toLocaleString()}</strong></div>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(confirmStatus)} title="Confirm status change" onClose={() => setConfirmStatus(null)}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setConfirmStatus(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={applyStatus} disabled={busy}>
              {busy ? 'Updating…' : 'Yes, update status'}
            </button>
          </>
        }>
        <p>Change this request's status to <strong>{confirmStatus?.next?.replace('_', ' ')}</strong>? The tenant will see the updated status in their portal.</p>
      </Modal>
    </div>
  );
}
