import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { formatCurrency } from '../../lib/format';
import { AVAILABILITY_OPTIONS } from '../../lib/constants';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import LoadingBlock from '../../components/LoadingBlock';
import ErrorState from '../../components/ErrorState';
import SelectField from '../../components/SelectField';

const EMPTY_FILTERS = { q: '', location: '', type: '', minRent: '', maxRent: '', availability: '' };

const PIN_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const HOUSE_ICON = (
  <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z" />
  </svg>
);

/** Read-only property browsing with simple search + filters. */
export default function TenantProperties() {
  const navigate = useNavigate();
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
    const res = await apiFetch(`/properties${qs ? `?${qs}` : ''}`);
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

  const properties = state.data?.properties || [];
  const types = state.data?.types || [];
  const hasActiveFilters = Object.values(applied).some((v) => String(v).trim() !== '');

  return (
    <div>
      <div className="tenant-page-head">
        <h1>Find a Property</h1>
        <p>Browse properties that are currently available for rent.</p>
      </div>

      <form className="tenant-card filter-card" onSubmit={handleSubmit}>
        <div className="filter-grid">
          <div className="field">
            <label htmlFor="prop-search">Search</label>
            <input id="prop-search" type="text" placeholder="Name or description…" value={filters.q} onChange={setFilter('q')} />
          </div>
          <div className="field">
            <label htmlFor="prop-location">Location</label>
            <input id="prop-location" type="text" placeholder="City or area…" value={filters.location} onChange={setFilter('location')} />
          </div>
          <SelectField
            label="Property Type"
            name="type"
            value={filters.type}
            onChange={setFilter('type')}
            options={types.map((t) => ({ value: t, label: t }))}
            placeholder="All types"
          />
          <div className="field">
            <label htmlFor="prop-min">Min Rent (PKR)</label>
            <input id="prop-min" type="number" min="0" placeholder="0" value={filters.minRent} onChange={setFilter('minRent')} />
          </div>
          <div className="field">
            <label htmlFor="prop-max">Max Rent (PKR)</label>
            <input id="prop-max" type="number" min="0" placeholder="Any" value={filters.maxRent} onChange={setFilter('maxRent')} />
          </div>
          <SelectField
            label="Availability"
            name="availability"
            value={filters.availability}
            onChange={setFilter('availability')}
            options={AVAILABILITY_OPTIONS}
          />
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
        <LoadingBlock label="Loading properties…" />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={() => load(applied)} />
      ) : properties.length === 0 ? (
        <EmptyState
          icon="search"
          title={hasActiveFilters ? 'No properties match your filters.' : 'No properties are currently available.'}
          message={
            hasActiveFilters
              ? 'Try adjusting or clearing the filters above.'
              : 'Please check back later — new listings will appear here.'
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
        <div className="property-grid">
          {properties.map((p) => (
            <article
              key={p.id}
              className="tenant-card property-card"
              onClick={() => navigate(`/tenant/properties/${p.id}`)}
            >
              <div className="property-media">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} loading="lazy" />
                ) : (
                  <div className="property-media-placeholder">{HOUSE_ICON}</div>
                )}
                <span className="property-type-chip">{p.propertyType}</span>
              </div>
              <div className="property-body">
                <div className="property-title-row">
                  <h3>{p.name}</h3>
                  <StatusBadge status={p.status} />
                </div>
                <p className="property-location">
                  {PIN_ICON} {p.location}
                </p>
                <p className="property-meta">
                  {p.bedrooms} Beds · {p.bathrooms} Baths
                </p>
                <div className="property-foot">
                  <span className="property-rent">
                    {formatCurrency(p.rent)}
                    <small>/mo</small>
                  </span>
                  <span className="property-units">
                    {p.availableUnits} of {p.totalUnits} units free
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

