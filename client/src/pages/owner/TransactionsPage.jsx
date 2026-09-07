import { useCallback, useEffect, useState } from 'react';
import { FileSpreadsheet, Download } from 'lucide-react';
import { useOwnerApi } from '../../lib/ownerApi';
import { PageHeader, Badge, Alert, Loading, EmptyState, Modal, money, dateFmt } from '../../components/ownerUi';

export default function TransactionsPage() {
  const api = useOwnerApi();
  const [transactions, setTransactions] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);

  const load = useCallback(async (f) => {
    const fl = f || { search, status, type };
    setError('');
    const qs = new URLSearchParams();
    if (fl.search) qs.set('search', fl.search);
    if (fl.status !== 'all') qs.set('status', fl.status);
    if (fl.type !== 'all') qs.set('type', fl.type);
    const result = await api.get(`/transactions${qs.toString() ? `?${qs}` : ''}`);
    if (!result.ok) { setError(result.error); return; }
    setTransactions(result.transactions);
  }, [api, search, status, type]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openDetail = async (t) => {
    const result = await api.get(`/transactions/${t.id}`);
    if (!result.ok) { setError(result.error); return; }
    setDetail(result.transaction);
  };

  return (
    <div className="page">
      <PageHeader title="Transactions" subtitle="Payment history across your properties." />
      <Alert kind="error" onClose={() => setError('')}>{error}</Alert>

      <div className="card">
        <div className="toolbar">
          <input className="toolbar-input" placeholder="Search transaction, tenant or property…" value={search}
            onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
          <select className="toolbar-select" value={status}
            onChange={(e) => { setStatus(e.target.value); load({ search, status: e.target.value, type }); }}>
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <select className="toolbar-select" value={type}
            onChange={(e) => { setType(e.target.value); load({ search, status, type: e.target.value }); }}>
            <option value="all">All types</option>
            <option value="rent_payment">Rent payment</option>
            <option value="refund">Refund</option>
          </select>
          <button className="btn btn-ghost" onClick={() => load()}>Search</button>
          <a
            href="/api/business/export/transactions"
            className="btn btn-ghost"
            download
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <FileSpreadsheet size={16} /> Export Excel
          </a>
        </div>

        {transactions === null ? <Loading label="Loading transactions…" /> : transactions.length === 0 ? (
          <EmptyState title="No transactions yet" hint="Record a rent payment on the Rent page and it will appear here." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Transaction ID</th><th>Date</th><th>Tenant</th><th>Property</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="mono">{t.id.slice(0, 8)}…</td>
                    <td>{dateFmt(t.created_at)}</td>
                    <td>{t.tenant_name}</td>
                    <td>{t.property_name}</td>
                    <td>{money(t.amount)}</td>
                    <td><Badge value={t.status} /></td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => openDetail(t)}>Details</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={Boolean(detail)} title="Transaction details" onClose={() => setDetail(null)}
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
            {detail && (
              <a
                href={`/api/business/receipt/${detail.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={16} /> PDF Receipt
              </a>
            )}
            <button className="btn btn-primary" onClick={() => setDetail(null)}>Close</button>
          </div>
        }>
        {detail && (
          <div className="detail-grid">
            <div className="detail-full"><span>Transaction ID</span><strong className="mono">{detail.id}</strong></div>
            <div><span>Date</span><strong>{new Date(detail.created_at).toLocaleString()}</strong></div>
            <div><span>Type</span><strong>{detail.type.replace('_', ' ')}</strong></div>
            <div><span>Tenant</span><strong>{detail.tenant_name}</strong></div>
            <div><span>Property</span><strong>{detail.property_name}</strong></div>
            {detail.rent_month && <div><span>Rent Month</span><strong>{detail.rent_month}</strong></div>}
            <div><span>Amount</span><strong>{money(detail.amount)}</strong></div>
            <div><span>Status</span><Badge value={detail.status} /></div>
            {detail.reference && <div className="detail-full"><span>Reference</span><strong>{detail.reference}</strong></div>}
          </div>
        )}
      </Modal>
    </div>
  );
}
