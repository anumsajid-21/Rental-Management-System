import { useEffect, useState } from 'react';
import { useOwnerApi } from '../../lib/ownerApi';
import { PageHeader, Loading, Alert } from '../../components/ownerUi';

/** Owner dashboard. Offers one-click demo data when the account is empty. */
export default function OwnerHome() {
  const api = useOwnerApi();
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const result = await api.get('/reports');
    setLoading(false);
    if (!result.ok) { setError(result.error); return; }
    setHasData(result.report.properties.total > 0);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDemo = async (force) => {
    setBusy(true); setError(''); setNotice('');
    const result = await api.post('/demo-data', force ? { force: true } : {});
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    setNotice(result.message);
    setHasData(true);
  };

  return (
    <div className="page">
      <PageHeader title="Dashboard" subtitle="Overview of your properties, rent and requests." />
      <Alert kind="error" onClose={() => setError('')}>{error}</Alert>
      <Alert kind="success" onClose={() => setNotice('')}>{notice}</Alert>

      {loading && <Loading label="Checking your portfolio…" />}

      {!loading && !hasData && (
        <div className="card demo-card">
          <h2 className="card-title">Your account is empty</h2>
          <p className="card-hint">
            Load realistic sample data (properties, tenants, rentals, 6 months of rent
            payments, transactions and maintenance requests) to explore every module.
            This is mock data for development/testing — you can keep working with real
            data afterwards.
          </p>
          <button className="btn btn-primary" onClick={() => loadDemo(false)} disabled={busy}>
            {busy ? 'Loading demo data…' : 'Load demo data'}
          </button>
        </div>
      )}

      {!loading && hasData && (
        <div className="state-block">
          <div className="state-icon">📊</div>
          <h3>Owner Dashboard</h3>
          <p>Use the sidebar to manage Properties, Rent, Transactions, Maintenance, Reports and CSV imports.</p>
        </div>
      )}
    </div>
  );
}

