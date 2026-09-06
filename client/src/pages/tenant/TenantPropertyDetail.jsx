import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { formatCurrency, todayISO } from '../../lib/format';
import StatusBadge from '../../components/StatusBadge';
import LoadingBlock from '../../components/LoadingBlock';
import ErrorState from '../../components/ErrorState';

const PIN_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

/**
 * Property details + the Rent Property flow: pick an available unit,
 * choose a move-in date and submit a rental request. The owner reviews it —
 * this does NOT make the tenant an active renter.
 */
export default function TenantPropertyDetail() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [moveInDate, setMoveInDate] = useState(todayISO());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setState({ loading: true, error: '', data: null });
    setSelectedUnitId(null);
    setFormError('');
    const res = await apiFetch(`/properties/${propertyId}`);
    if (!res.ok) {
      setState({ loading: false, error: res.error, data: null });
      return;
    }
    setState({ loading: false, error: '', data: res.data });
  }, [propertyId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRent = async () => {
    if (!selectedUnitId) return;
    setFormError('');
    setSubmitting(true);
    const res = await apiFetch('/rental-requests', {
      method: 'POST',
      body: { unitId: selectedUnitId, moveInDate },
    });
    setSubmitting(false);
    if (!res.ok) {
      setFormError(res.error);
      // Availability may have changed — refresh the unit list.
      if (res.status === 409 || res.status === 404) load();
      return;
    }
    navigate('/tenant/rental', {
      state: { flash: 'Rental request submitted successfully. The property owner will review it.' },
    });
  };

  if (state.loading) return <LoadingBlock label="Loading property…" />;
  if (state.error) return <ErrorState message={state.error} onRetry={load} />;

  const property = state.data?.property;
  const units = state.data?.units || [];
  const availableUnits = units.filter((u) => u.status === 'available');
  const selectedUnit = units.find((u) => u.id === selectedUnitId) || null;
  if (!property) return <ErrorState message="Property not found." />;

  return (
    <div>
      <Link to="/tenant/properties" className="back-link">
        ← Back to Properties
      </Link>

      <section className="tenant-card property-detail-card">
        {property.imageUrl && (
          <img className="property-detail-img" src={property.imageUrl} alt={property.name} />
        )}
        <div className="property-detail-body">
          <div className="property-title-row">
            <h1>{property.name}</h1>
            <StatusBadge status={property.status} />
          </div>
          <p className="property-location">
            {PIN_ICON} {property.location}
          </p>
          <div className="detail-grid">
            <div className="detail-item">
              <p className="detail-label">Property Type</p>
              <p className="detail-value">{property.propertyType}</p>
            </div>
            <div className="detail-item">
              <p className="detail-label">Bedrooms</p>
              <p className="detail-value">{property.bedrooms}</p>
            </div>
            <div className="detail-item">
              <p className="detail-label">Bathrooms</p>
              <p className="detail-value">{property.bathrooms}</p>
            </div>
            <div className="detail-item">
              <p className="detail-label">Starting Rent</p>
              <p className="detail-value">{formatCurrency(property.rent)}/mo</p>
            </div>
            <div className="detail-item">
              <p className="detail-label">Available Units</p>
              <p className="detail-value">
                {property.availableUnits} of {property.totalUnits}
              </p>
            </div>
          </div>
          {property.description && (
            <div className="detail-item detail-desc">
              <p className="detail-label">Description</p>
              <p>{property.description}</p>
            </div>
          )}
          {property.amenities.length > 0 && (
            <div className="detail-item">
              <p className="detail-label">Amenities</p>
              <div className="chip-row">
                {property.amenities.map((a) => (
                  <span key={a} className="chip">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="tenant-card">
        <header className="card-head">
          <h2>Units</h2>
        </header>
        {units.length === 0 ? (
          <p className="muted-note">No units have been listed for this property yet.</p>
        ) : (
          <div className="unit-list">
            {units.map((u) => {
              const disabled = u.status !== 'available';
              return (
                <label
                  key={u.id}
                  className={`unit-row${selectedUnitId === u.id ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
                >
                  <input
                    type="radio"
                    name="unit"
                    className="sr-only"
                    value={u.id}
                    disabled={disabled}
                    checked={selectedUnitId === u.id}
                    onChange={() => {
                      setSelectedUnitId(u.id);
                      setFormError('');
                    }}
                  />
                  <span className="unit-radio" aria-hidden="true" />
                  <span className="unit-number">Unit {u.unitNumber}</span>
                  <span className="unit-specs">
                    {u.bedrooms} Beds · {u.bathrooms} Baths
                  </span>
                  <span className="unit-rent">{formatCurrency(u.rent)}/mo</span>
                  <StatusBadge status={u.status} />
                </label>
              );
            })}
          </div>
        )}
      </section>

      <section className="tenant-card rent-box">
        <h2>Rent This Property</h2>
        <p className="muted-note">
          Select an available unit above, choose your move-in date and submit a rental request.
          Submitting a request does not confirm your rental — the property owner will review and
          accept or reject it.
        </p>
        {formError && (
          <div className="alert alert-error" role="alert">
            {formError}
          </div>
        )}
        {availableUnits.length === 0 ? (
          <p className="muted-note strong">
            All units of this property are currently rented. Please check back later.
          </p>
        ) : (
          <div className="rent-box-controls">
            <div className="field rent-date">
              <label htmlFor="move-in">Move-in Date</label>
              <input
                id="move-in"
                type="date"
                min={todayISO()}
                value={moveInDate}
                onChange={(e) => {
                  setMoveInDate(e.target.value);
                  setFormError('');
                }}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRent}
              disabled={!selectedUnit || !moveInDate || submitting}
            >
              {submitting
                ? 'Submitting…'
                : selectedUnit
                  ? `Rent Property — Unit ${selectedUnit.unitNumber} (${formatCurrency(selectedUnit.rent)}/mo)`
                  : 'Rent Property'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

