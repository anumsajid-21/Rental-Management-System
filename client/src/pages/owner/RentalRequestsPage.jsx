import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useOwnerApi } from '../../lib/ownerApi';
import { PageHeader, Badge, Alert, Loading, EmptyState, Modal, money, dateFmt } from '../../components/ownerUi';

export default function RentalRequestsPage() {
  const api = useOwnerApi();
  const location = useLocation();

  const [requests, setRequests] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals & Details
  const [detailRequest, setDetailRequest] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'accept' | 'reject', request }

  const loadRequests = useCallback(async (filters) => {
    const f = filters || { search, status: statusFilter };
    setLoading(true);
    setError('');
    const qs = new URLSearchParams();
    if (f.search) qs.set('search', f.search);
    if (f.status && f.status !== 'all') qs.set('status', f.status);

    const result = await api.get(`/rental-requests${qs.toString() ? `?${qs}` : ''}`);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRequests(result.requests);
  }, [api, search, statusFilter]);

  useEffect(() => {
    loadRequests();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-open detail if ?open=<requestId> is in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const openId = params.get('open');
    if (openId && requests) {
      const match = requests.find((r) => r.id === openId);
      if (match) {
        setDetailRequest(match);
      }
    }
  }, [location.search, requests]);

  const handleOpenDetail = async (req) => {
    setLoading(true);
    const result = await api.get(`/rental-requests/${req.id}`);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDetailRequest(result.request);
  };

  const handleExecuteAction = async () => {
    if (!confirmAction) return;
    const { type, request } = confirmAction;
    setBusy(true);
    setError('');
    const endpoint = `/rental-requests/${request.id}/${type}`;
    const result = await api.post(endpoint, {});
    setBusy(false);
    setConfirmAction(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setNotice(result.message || `Rental request ${type === 'accept' ? 'accepted' : 'rejected'}.`);
    if (detailRequest && detailRequest.id === request.id) {
      setDetailRequest(result.request);
    }
    loadRequests();
  };

  return (
    <div className="page">
      <PageHeader
        title="Rental Requests"
        subtitle="Review applications submitted by prospective tenants for your properties."
      />

      <Alert kind="error" onClose={() => setError('')}>{error}</Alert>
      <Alert kind="success" onClose={() => setNotice('')}>{notice}</Alert>

      <div className="card">
        {/* Filter Toolbar */}
        <div className="toolbar">
          <input
            className="toolbar-input"
            placeholder="Search tenant name, email, property name, address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadRequests({ search, status: statusFilter })}
          />
          <select
            className="toolbar-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              loadRequests({ search, status: e.target.value });
            }}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            className="btn btn-ghost"
            onClick={() => loadRequests({ search, status: statusFilter })}
          >
            Search
          </button>
          {(search || statusFilter !== 'all') && (
            <button
              className="btn btn-ghost"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                loadRequests({ search: '', status: 'all' });
              }}
            >
              Reset
            </button>
          )}
        </div>

        {/* Content list */}
        {loading && <Loading label="Loading rental requests…" />}

        {!loading && requests && requests.length === 0 && (
          <EmptyState
            title="No rental requests found"
            hint={
              search || statusFilter !== 'all'
                ? 'No requests match your search criteria.'
                : 'You have no incoming rental applications at this moment.'
            }
          />
        )}

        {!loading && requests && requests.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Property</th>
                  <th>Monthly Rent</th>
                  <th>Move-in Date</th>
                  <th>Requested On</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.tenant_name}</strong>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{r.tenant_email}</div>
                      {r.tenant_phone && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.tenant_phone}</div>
                      )}
                    </td>
                    <td>
                      <strong>{r.property_name}</strong>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{r.property_address}</div>
                    </td>
                    <td><strong>{money(r.monthly_rent)}</strong></td>
                    <td>{dateFmt(r.move_in_date)}</td>
                    <td>{dateFmt(r.created_at)}</td>
                    <td>
                      <Badge value={r.status === 'approved' ? 'approved' : r.status} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleOpenDetail(r)}
                        >
                          Details
                        </button>
                        {r.status === 'pending' && (
                          <>
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ backgroundColor: '#15803d', borderColor: '#15803d' }}
                              onClick={() => setConfirmAction({ type: 'accept', request: r })}
                            >
                              Accept
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: '#dc2626' }}
                              onClick={() => setConfirmAction({ type: 'reject', request: r })}
                            >
                              Reject
                            </button>
                          </>
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

      {/* REQUEST DETAILS MODAL */}
      <Modal
        open={Boolean(detailRequest)}
        title="Rental Request Details"
        onClose={() => setDetailRequest(null)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <button className="btn btn-ghost" onClick={() => setDetailRequest(null)}>
              Close
            </button>
            {detailRequest?.status === 'pending' && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-ghost"
                  style={{ color: '#dc2626' }}
                  onClick={() => {
                    const req = detailRequest;
                    setDetailRequest(null);
                    setConfirmAction({ type: 'reject', request: req });
                  }}
                >
                  Reject Request
                </button>
                <button
                  className="btn btn-primary"
                  style={{ backgroundColor: '#15803d', borderColor: '#15803d' }}
                  onClick={() => {
                    const req = detailRequest;
                    setDetailRequest(null);
                    setConfirmAction({ type: 'accept', request: req });
                  }}
                >
                  Accept & Rent Out
                </button>
              </div>
            )}
          </div>
        }
      >
        {detailRequest && (
          <div className="detail-grid">
            <div className="detail-full">
              <span>Status</span>
              <Badge value={detailRequest.status === 'approved' ? 'approved' : detailRequest.status} />
            </div>

            <div className="detail-full" style={{ background: 'var(--bg-accent)', padding: '14px', borderRadius: '12px' }}>
              <span style={{ fontWeight: 700, color: 'var(--text)' }}>Tenant Information</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                <div><span>Name</span><strong>{detailRequest.tenant_name}</strong></div>
                <div><span>Email</span><strong>{detailRequest.tenant_email}</strong></div>
                <div><span>Phone</span><strong>{detailRequest.tenant_phone || 'Not provided'}</strong></div>
              </div>
            </div>

            <div className="detail-full" style={{ background: 'var(--bg-accent)', padding: '14px', borderRadius: '12px' }}>
              <span style={{ fontWeight: 700, color: 'var(--text)' }}>Requested Property</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                <div><span>Property</span><strong>{detailRequest.property_name}</strong></div>
                <div><span>Type</span><strong style={{ textTransform: 'capitalize' }}>{detailRequest.property_type}</strong></div>
                <div style={{ gridColumn: 'span 2' }}><span>Address</span><strong>{detailRequest.property_address}</strong></div>
              </div>
            </div>

            <div><span>Agreed Rent</span><strong style={{ color: 'var(--accent-dark)', fontSize: '1.1rem' }}>{money(detailRequest.monthly_rent)}</strong></div>
            <div><span>Proposed Move-in</span><strong>{dateFmt(detailRequest.move_in_date)}</strong></div>
            <div><span>Requested On</span><strong>{new Date(detailRequest.created_at).toLocaleString()}</strong></div>
            <div><span>Last Update</span><strong>{new Date(detailRequest.updated_at).toLocaleString()}</strong></div>
          </div>
        )}
      </Modal>

      {/* ACTION CONFIRMATION MODAL */}
      <Modal
        open={Boolean(confirmAction)}
        title={confirmAction?.type === 'accept' ? 'Accept Rental Request' : 'Reject Rental Request'}
        onClose={() => setConfirmAction(null)}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setConfirmAction(null)} disabled={busy}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              style={
                confirmAction?.type === 'accept'
                  ? { backgroundColor: '#15803d', borderColor: '#15803d' }
                  : { backgroundColor: '#dc2626', borderColor: '#dc2626' }
              }
              onClick={handleExecuteAction}
              disabled={busy}
            >
              {busy
                ? 'Processing…'
                : confirmAction?.type === 'accept'
                ? 'Yes, Accept & Rent Out'
                : 'Yes, Reject Request'}
            </button>
          </>
        }
      >
        {confirmAction?.type === 'accept' ? (
          <div>
            <p>
              Accept rental request from <strong>{confirmAction.request?.tenant_name}</strong> for{' '}
              <strong>{confirmAction.request?.property_name}</strong>?
            </p>
            <div className="card-hint" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '10px', color: '#166534', marginTop: '12px' }}>
              <strong>What happens next:</strong>
              <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                <li>This request will be marked as <strong>Accepted</strong>.</li>
                <li>A binding active rental record will be created in the system.</li>
                <li>The property status will immediately update to <strong>Occupied</strong>.</li>
              </ul>
            </div>
          </div>
        ) : (
          <div>
            <p>
              Are you sure you want to reject the rental application from{' '}
              <strong>{confirmAction?.request?.tenant_name}</strong> for{' '}
              <strong>{confirmAction?.request?.property_name}</strong>?
            </p>
            <p className="card-hint">The tenant will see that their application has been declined.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
