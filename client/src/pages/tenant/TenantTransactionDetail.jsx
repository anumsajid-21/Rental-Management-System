import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { formatCurrency, formatDateLong, formatRentMonth } from '../../lib/format';
import StatusBadge from '../../components/StatusBadge';
import LoadingBlock from '../../components/LoadingBlock';
import ErrorState from '../../components/ErrorState';

/** Full details of one of the tenant's own transactions. */
export default function TenantTransactionDetail() {
  const { transactionId } = useParams();
  const [state, setState] = useState({ loading: true, error: '', data: null });

  const load = useCallback(async () => {
    setState({ loading: true, error: '', data: null });
    const res = await apiFetch(`/transactions/${transactionId}`);
    if (!res.ok) {
      setState({ loading: false, error: res.error, data: null });
      return;
    }
    setState({ loading: false, error: '', data: res.data });
  }, [transactionId]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.loading) return <LoadingBlock label="Loading transaction…" />;
  if (state.error) {
    return (
      <div>
        <Link to="/tenant/transactions" className="back-link">
          ← Back to Transactions
        </Link>
        <ErrorState message={state.error} onRetry={load} />
      </div>
    );
  }

  const t = state.data?.transaction;
  if (!t) return <ErrorState message="Transaction not found." />;

  return (
    <div>
      <Link to="/tenant/transactions" className="back-link">
        ← Back to Transactions
      </Link>

      <div className="tenant-page-head">
        <h1>{formatRentMonth(t.rentMonth)} Rent</h1>
        <p>
          {t.propertyName} · Unit {t.unitNumber}
        </p>
      </div>

      <section className="tenant-card">
        <header className="card-head">
          <h2>Transaction Details</h2>
          <StatusBadge status={t.status} />
        </header>
        <div className="detail-grid">
          <div className="detail-item">
            <p className="detail-label">Transaction ID</p>
            <p className="detail-value mono">{t.id}</p>
          </div>
          <div className="detail-item">
            <p className="detail-label">Tenant ID</p>
            <p className="detail-value mono">{t.tenantId}</p>
          </div>
          <div className="detail-item">
            <p className="detail-label">Rental ID</p>
            <p className="detail-value mono">{t.rentalId}</p>
          </div>
          <div className="detail-item">
            <p className="detail-label">Property</p>
            <p className="detail-value">{t.propertyName}</p>
          </div>
          <div className="detail-item">
            <p className="detail-label">Unit</p>
            <p className="detail-value">{t.unitNumber}</p>
          </div>
          <div className="detail-item">
            <p className="detail-label">Rent Month</p>
            <p className="detail-value">{formatRentMonth(t.rentMonth)}</p>
          </div>
          <div className="detail-item">
            <p className="detail-label">Amount</p>
            <p className="detail-value">{formatCurrency(t.amount)}</p>
          </div>
          <div className="detail-item">
            <p className="detail-label">Payment Date</p>
            <p className="detail-value">{t.paymentDate ? formatDateLong(t.paymentDate) : 'Not paid yet'}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
