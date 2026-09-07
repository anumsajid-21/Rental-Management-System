import { useCallback, useEffect, useState } from 'react';
import { useOwnerApi } from '../../lib/ownerApi';
import { PageHeader, Badge, Alert, Loading, EmptyState, Modal, money, dateFmt } from '../../components/ownerUi';

export default function MaintenancePage() {
  const api = useOwnerApi();
  const [requests, setRequests] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);

  // Modals for actions
  const [confirmApprove, setConfirmApprove] = useState(null);
  const [confirmReject, setConfirmReject] = useState(null);
  const [transferModal, setTransferModal] = useState(null);
  const [transferAmount, setTransferAmount] = useState('');

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

  const handleApprove = async () => {
    if (!confirmApprove) return;
    setBusy(true);
    setError('');
    const result = await api.post(`/maintenance/${confirmApprove.id}/approve`, {});
    setBusy(false);
    setConfirmApprove(null);
    if (!result.ok) { setError(result.error); return; }
    setNotice('Maintenance request approved.');
    setDetail((d) => (d && d.id === result.request.id ? result.request : d));
    load();
  };

  const handleReject = async () => {
    if (!confirmReject) return;
    setBusy(true);
    setError('');
    const result = await api.post(`/maintenance/${confirmReject.id}/reject`, {});
    setBusy(false);
    setConfirmReject(null);
    if (!result.ok) { setError(result.error); return; }
    setNotice('Maintenance request rejected.');
    setDetail((d) => (d && d.id === result.request.id ? result.request : d));
    load();
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!transferModal) return;
    const amountVal = Number(transferAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      setError('Please enter a valid transfer amount in PKR.');
      return;
    }

    setBusy(true);
    setError('');
    const result = await api.post(`/maintenance/${transferModal.id}/transfer`, {
      amount: amountVal,
    });
    setBusy(false);
    setTransferModal(null);
    if (!result.ok) { setError(result.error); return; }
    setNotice(result.message || 'Money transfer recorded successfully.');
    setDetail((d) => (d && d.id === result.request.id ? result.request : d));
    load();
  };

  return (
    <div className="page">
      <PageHeader
        title="Maintenance Requests"
        subtitle="Review repair requests from tenants, approve/reject issues, and record maintenance money transfers."
      />
      <Alert kind="error" onClose={() => setError('')}>{error}</Alert>
      <Alert kind="success" onClose={() => setNotice('')}>{notice}</Alert>

      <div className="card">
        <div className="toolbar">
          <input
            className="toolbar-input"
            placeholder="Search tenant, property or issue…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
          <select
            className="toolbar-select"
            value={status}
            onChange={(e) => { setStatus(e.target.value); load({ search, status: e.target.value }); }}
          >
            <option value="all">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button className="btn btn-ghost" onClick={() => load()}>Search</button>
          {(search || status !== 'all') && (
            <button
              className="btn btn-ghost"
              onClick={() => {
                setSearch('');
                setStatus('all');
                load({ search: '', status: 'all' });
              }}
            >
              Reset
            </button>
          )}
        </div>

        {requests === null ? (
          <Loading label="Loading maintenance requests…" />
        ) : requests.length === 0 ? (
          <EmptyState
            title="No maintenance requests"
            hint="When tenants submit requests for your properties, they will appear here."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Tenant</th>
                  <th>Property</th>
                  <th>Priority</th>
                  <th>Requested Amount</th>
                  <th>Status</th>
                  <th>Money Transfer</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <strong>{m.title}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{dateFmt(m.created_at)}</div>
                    </td>
                    <td>{m.tenant_name}</td>
                    <td>{m.property_name}</td>
                    <td>
                      <span className={`badge badge-${m.priority === 'high' ? 'danger' : m.priority === 'low' ? 'muted' : 'warning'}`}>
                        {m.priority}
                      </span>
                    </td>
                    <td>
                      {m.amount && Number(m.amount) > 0 ? (
                        <strong>{money(m.amount)}</strong>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td><Badge value={m.status} /></td>
                    <td>
                      {m.transfer_status === 'transferred' ? (
                        <span className="badge badge-success" title={`Transferred: ${dateFmt(m.transferred_at)}`}>
                          Transferred ({money(m.transferred_amount || m.amount)})
                        </span>
                      ) : (
                        <span className="badge badge-muted">None</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={async () => {
                            const result = await api.get(`/maintenance/${m.id}`);
                            if (!result.ok) { setError(result.error); return; }
                            setDetail(result.request);
                          }}
                        >
                          View
                        </button>
                        {m.status === 'submitted' && (
                          <>
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ backgroundColor: '#15803d', borderColor: '#15803d' }}
                              onClick={() => setConfirmApprove(m)}
                              title="Approve Request"
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: '#dc2626' }}
                              onClick={() => setConfirmReject(m)}
                              title="Reject Request"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {(m.status === 'in_progress' || m.status === 'resolved') && m.transfer_status !== 'transferred' && (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                            onClick={() => {
                              setTransferModal(m);
                              setTransferAmount(String(m.amount || ''));
                            }}
                            title="Transfer maintenance funds to renter"
                          >
                            Transfer Money
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      <Modal
        open={Boolean(detail)}
        title="Maintenance Request Details"
        onClose={() => setDetail(null)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <button className="btn btn-ghost" onClick={() => setDetail(null)}>Close</button>
            <div style={{ display: 'flex', gap: '8px' }}>
              {detail && detail.status === 'submitted' && (
                <>
                  <button
                    className="btn btn-ghost"
                    style={{ color: '#dc2626' }}
                    onClick={() => {
                      const req = detail;
                      setDetail(null);
                      setConfirmReject(req);
                    }}
                  >
                    Reject
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ backgroundColor: '#15803d', borderColor: '#15803d' }}
                    onClick={() => {
                      const req = detail;
                      setDetail(null);
                      setConfirmApprove(req);
                    }}
                  >
                    Approve Request
                  </button>
                </>
              )}
              {detail && (detail.status === 'in_progress' || detail.status === 'resolved') && detail.transfer_status !== 'transferred' && (
                <button
                  className="btn btn-primary"
                  style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                  onClick={() => {
                    const req = detail;
                    setDetail(null);
                    setTransferModal(req);
                    setTransferAmount(String(req.amount || ''));
                  }}
                >
                  Transfer Money to Renter
                </button>
              )}
            </div>
          </div>
        }
      >
        {detail && (
          <div className="detail-grid">
            <div className="detail-full"><span>Issue</span><strong>{detail.title}</strong></div>
            <div className="detail-full"><span>Description</span><p className="detail-desc">{detail.description}</p></div>
            <div><span>Tenant</span><strong>{detail.tenant_name}</strong></div>
            <div><span>Property</span><strong>{detail.property_name}</strong></div>
            <div><span>Address</span><strong>{detail.property_address}</strong></div>
            <div><span>Priority</span><span className={`badge badge-${detail.priority === 'high' ? 'danger' : detail.priority === 'low' ? 'muted' : 'warning'}`}>{detail.priority}</span></div>
            <div><span>Status</span><Badge value={detail.status} /></div>
            <div>
              <span>Requested Amount</span>
              <strong>{detail.amount && Number(detail.amount) > 0 ? money(detail.amount) : 'Not specified'}</strong>
            </div>

            <div className="detail-full" style={{ background: 'var(--bg-accent)', padding: '12px', borderRadius: '10px' }}>
              <span style={{ fontWeight: 600 }}>Payment & Money Transfer Status:</span>
              <div style={{ marginTop: '6px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                {detail.transfer_status === 'transferred' ? (
                  <span className="badge badge-success">
                    Transferred {money(detail.transferred_amount || detail.amount)} on {dateFmt(detail.transferred_at)}
                  </span>
                ) : (
                  <span className="badge badge-muted">Not Transferred</span>
                )}
              </div>
            </div>

            <div><span>Created</span><strong>{new Date(detail.created_at).toLocaleString()}</strong></div>
            <div><span>Last updated</span><strong>{new Date(detail.updated_at).toLocaleString()}</strong></div>
          </div>
        )}
      </Modal>

      {/* APPROVE CONFIRMATION */}
      <Modal
        open={Boolean(confirmApprove)}
        title="Approve Maintenance Request"
        onClose={() => setConfirmApprove(null)}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setConfirmApprove(null)} disabled={busy}>Cancel</button>
            <button
              className="btn btn-primary"
              style={{ backgroundColor: '#15803d', borderColor: '#15803d' }}
              onClick={handleApprove}
              disabled={busy}
            >
              {busy ? 'Approving…' : 'Yes, Approve Request'}
            </button>
          </>
        }
      >
        <p>Approve repair request <strong>"{confirmApprove?.title}"</strong> submitted by <strong>{confirmApprove?.tenant_name}</strong>?</p>
        <p className="card-hint">The status will update to In Progress and the tenant will see the approval in their portal.</p>
      </Modal>

      {/* REJECT CONFIRMATION */}
      <Modal
        open={Boolean(confirmReject)}
        title="Reject Maintenance Request"
        onClose={() => setConfirmReject(null)}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setConfirmReject(null)} disabled={busy}>Cancel</button>
            <button
              className="btn btn-primary"
              style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
              onClick={handleReject}
              disabled={busy}
            >
              {busy ? 'Rejecting…' : 'Yes, Reject Request'}
            </button>
          </>
        }
      >
        <p>Reject repair request <strong>"{confirmReject?.title}"</strong>?</p>
        <p className="card-hint">The tenant will be informed that this maintenance request has been declined.</p>
      </Modal>

      {/* TRANSFER MONEY MODAL */}
      <Modal
        open={Boolean(transferModal)}
        title="Transfer Maintenance Money to Renter"
        onClose={() => setTransferModal(null)}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setTransferModal(null)} disabled={busy}>Cancel</button>
            <button
              className="btn btn-primary"
              style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
              onClick={handleTransfer}
              disabled={busy}
            >
              {busy ? 'Recording Transfer…' : 'Confirm & Record Transfer'}
            </button>
          </>
        }
      >
        {transferModal && (
          <form onSubmit={handleTransfer}>
            <p>
              Record maintenance reimbursement/allowance transfer to tenant <strong>{transferModal.tenant_name}</strong> for <strong>"{transferModal.title}"</strong>.
            </p>
            <label className="form-field" style={{ marginTop: '14px' }}>
              <span className="form-label">Transfer Amount (PKR) *</span>
              <input
                type="number"
                min="1"
                step="100"
                className="form-input"
                placeholder="Enter amount in PKR"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                required
                autoFocus
              />
            </label>
            <p className="card-hint" style={{ marginTop: '8px' }}>
              Once confirmed, this request's transfer status will be marked as <strong>Transferred</strong> with timestamp.
            </p>
          </form>
        )}
      </Modal>
    </div>
  );
}
