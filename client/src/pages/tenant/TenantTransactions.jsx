import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { formatCurrency, formatDateLong, formatRentMonth } from '../../lib/format';
import { TRANSACTION_STATUS_OPTIONS } from '../../lib/constants';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import LoadingBlock from '../../components/LoadingBlock';
import ErrorState from '../../components/ErrorState';
import SelectField from '../../components/SelectField';

const EMPTY_FILTERS = { status: '', fromMonth: '', toMonth: '' };

/** Tenant's rent payment history — own transactions only, with filters. */
export default function TenantTransactions() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [state, setState] = useState({ loading: true, error: '', data: null });

  const load = useCallback(async (activeFilters) => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    const params = new URLSearchParams();
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (String(value).trim() !== '') params.set(key, String(value).trim());
    });
    const qs = params.toString();
    const res = await apiFetch(`/transactions${qs ? `?${qs}` : ''}`);
    if (!res.ok) {
      setState({ loading: false, error: res.error, data: null });
      return;
    }
    setState({ loading: false, error: '', data: res.data });
  }, []);

  useEffect(() => {
    load(EMPTY_FILTERS);
  }, [load]);

  const setFilter = (field) => (e) => setFilters((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setApplied(filters);
    load(filters);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    load(EMPTY_FILTERS);
  };

  const transactions = state.data?.transactions || [];
  const hasActiveFilters = Object.values(applied).some((v) => String(v).trim() !== '');

  return (
    <div>
      <div className="tenant-page-head">
        <h1>Transactions</h1>
        <p>Your rent payment history.</p>
      </div>

      <form className="tenant-card filter-card" onSubmit={handleSubmit}>
        <div className="filter-grid filter-grid-3">
          <SelectField
            label="Status"
            name="status"
            value={filters.status}
            onChange={setFilter('status')}
            options={TRANSACTION_STATUS_OPTIONS}
            placeholder="All statuses"
          />
          <div className="field">
            <label htmlFor="tx-from">From Month</label>
            <input id="tx-from" type="month" value={filters.fromMonth} onChange={setFilter('fromMonth')} />
          </div>
          <div className="field">
            <label htmlFor="tx-to">To Month</label>
            <input id="tx-to" type="month" value={filters.toMonth} onChange={setFilter('toMonth')} />
          </div>
          <div className="filter-actions">
            <button type="submit" className="btn btn-primary btn-sm" disabled={state.loading}>
              Apply
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters} disabled={state.loading}>
              Clear
            </button>
          </div>
        </div>
      </form>

      {state.loading ? (
        <LoadingBlock label="Loading transactions…" />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={() => load(applied)} />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon="receipt"
          title={hasActiveFilters ? 'No transactions match your filters.' : 'No transactions yet.'}
          message={
            hasActiveFilters
              ? 'Try adjusting or clearing the filters above.'
              : 'Your rent payment history will appear here.'
          }
          action={
            hasActiveFilters ? (
              <button type="button" className="btn btn-ghost" onClick={clearFilters}>
                Clear Filters
              </button>
            ) : null
          }
        />
      ) : (
        <section className="tenant-card">
          <div className="list-rows">
            {transactions.map((t) => (
              <Link key={t.id} to={`/tenant/transactions/${t.id}`} className="list-row">
                <div className="list-row-main">
                  <strong>{formatRentMonth(t.rentMonth)} Rent</strong>
                  <span>
                    {t.propertyName} · Unit {t.unitNumber} ·{' '}
                    {t.status === 'paid'
                      ? `Paid on ${formatDateLong(t.paymentDate)}`
                      : t.status === 'overdue'
                        ? 'Payment overdue'
                        : 'Payment pending'}
                  </span>
                </div>
                <div className="list-row-side">
                  <span className="list-amount">{formatCurrency(t.amount)}</span>
                  <StatusBadge status={t.status} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
