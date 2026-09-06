import { useCallback, useEffect, useState } from 'react';
import { useOwnerApi } from '../../lib/ownerApi';
import {
  PageHeader, StatCard, Badge, Alert, Loading, EmptyState, Modal, money, dateFmt,
} from '../../components/ownerUi';

const STATUS_OPTIONS = ['all', 'pending', 'paid', 'overdue'];

export default function RentPage() {
  const api = useOwnerApi();
  const [overview, setOverview] = useState(null);
  const [records, setRecords] = useState(null);
  const [properties, setProperties] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [propertyId, setPropertyId] = useState('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [paying, setPaying] = useState(null);
  const [payForm, setPayForm] = useState({ method: 'cash', notes: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (filters) => {
    const f = filters || { search, status, propertyId };
    setError('');
    const qs = new URLSearchParams();
    if (f.search) qs.set('search', f.search);
    if (f.status && f.status !== 'all') qs.set('status', f.status);
    if (f.propertyId && f.propertyId !== 'all') qs.set('propertyId', f.propertyId);
    const [o, r, p] = await Promise.all([
      api.get('/rent/overview'),
      api.get(`/rent/records${qs.toString() ? `?${qs}` : ''}`),
      api.get('/rent/filter-options'),
    ]);
    if (!o.ok || !r.ok || !p.ok) {
      setError(o.error || r.error || p.error || 'Failed to load rent data.');
      return;
    }
    setOverview(o.overview);
    setRecords(r.records);
    setProperties(p.properties);
  }, [api, search, status, propertyId]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilters = () => load();

  const generate = async () => {
    setBusy(true);
    const result = await api.post('/rent/generate');
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    setNotice(result.message);
    load();
  };

  const openPay = (record) => {
    setPaying(record);
    setPayForm({ method: 'cash', notes: '' });
  };

  const confirmPay = async () => {
    if (!paying) return;
    setBusy(true);
    const result = await api.post(`/rent/records/${paying.id}/payment`, payForm);
    setBusy(false);
    if (!result.ok) { setError(result.error); setPaying(null); return; }
    setPaying(null);
    setNotice(`Payment of ${money(paying.amount)} recorded for ${paying.tenant_name}.`);
    load();
  };

  return (
    <div className="page">
      <PageHeader
        title="Rent Management"
        subtitle="Expected, collected, pending and overdue rent for your properties."
        actions={
          <button className="btn btn-primary" onClick={generate} disabled={busy}
            title="Create pending rent records for this month for every active rental">
            Generate this month's rent
          </button>
        }
      />

      <Alert kind="error" onClose={() => setError('')}>{error}</Alert>
      <Alert kind="info" onClose={() => setNotice('')}>{notice}</Alert>

      {overview ? (
        <div className="stat-grid">
          <StatCard label="Total Expected Rent" value={money(overview.totalExpected)} tone="info" hint={`${records?.length ?? 0} rent record(s)`} />
          <StatCard label="Collected Rent" value={money(overview.collected)} tone="success" hint={`${overview.paidCount} paid`} />
          <StatCard label="Pending Rent" value={money(overview.pending)} tone="warning" />
          <StatCard label="Overdue Rent" value={money(overview.overdue)} tone="danger" hint={`${overview.overdueCount} overdue record(s)`} />
        </div>
      ) : <Loading label="Loading rent overview…" />}

      <div className="card">
        <div className="toolbar">
          <input className="toolbar-input" placeholder="Search tenant or property…" value={search}
            onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyFilters()} />
          <select className="toolbar-select" value={status}
            onChange={(e) => { setStatus(e.target.value); load({ search, status: e.target.value, propertyId }); }}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s.replace('_', ' ')}</option>)}
          </select>
          <select className="toolbar-select" value={propertyId}
            onChange={(e) => { setPropertyId(e.target.value); load({ search, status, propertyId: e.target.value }); }}>
            <option value="all">All properties</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="btn btn-ghost" onClick={applyFilters}>Search</button>
        </div>

        {records === null ? <Loading label="Loading rent records…" /> : records.length === 0 ? (
          <EmptyState title="No rent records yet"
            hint="Accept a rental request (Rental Requests page), then click “Generate this month's rent”." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tenant</th><th>Property</th><th>Rent Month</th><th>Due Date</th>
                  <th>Amount</th><th>Payment Date</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>{r.tenant_name}</td>
                    <td>{r.property_name}</td>
                    <td>{r.rent_month}</td>
                    <td>{dateFmt(r.due_date)}</td>
                    <td>{money(r.amount)}</td>
                    <td>{dateFmt(r.payment_date)}</td>
                    <td><Badge value={r.status} /></td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openPay(r)}>
                        {r.status === 'paid' ? 'View' : 'Record payment'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={Boolean(paying)}
        title={paying?.status === 'paid' ? 'Payment details' : 'Record payment'}
        onClose={() => setPaying(null)}
        footer={
          paying?.status !== 'paid' && (
            <>
              <button className="btn btn-ghost" onClick={() => setPaying(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmPay} disabled={busy}>
                {busy ? 'Saving…' : 'Confirm payment'}
              </button>
            </>
          )
        }
      >
        {paying && (
          <div className="detail-grid">
            <div><span>Tenant</span><strong>{paying.tenant_name}</strong></div>
            <div><span>Property</span><strong>{paying.property_name}</strong></div>
            <div><span>Rent Month</span><strong>{paying.rent_month}</strong></div>
            <div><span>Amount</span><strong>{money(paying.amount)}</strong></div>
            <div><span>Due Date</span><strong>{dateFmt(paying.due_date)}</strong></div>
            <div><span>Status</span><Badge value={paying.status} /></div>
            {paying.status === 'paid' ? (
              <>
                <div><span>Payment Date</span><strong>{dateFmt(paying.payment_date)}</strong></div>
                <div><span>Method</span><strong>{paying.method || '—'}</strong></div>
                {paying.notes && <div className="detail-full"><span>Notes</span><strong>{paying.notes}</strong></div>}
              </>
            ) : (
              <>
                <div>
                  <span>Method</span>
                  <select className="toolbar-select" value={payForm.method}
                    onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))}>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                <div className="detail-full">
                  <span>Notes (optional)</span>
                  <input className="toolbar-input" value={payForm.notes} placeholder="e.g. receipt #123"
                    onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
