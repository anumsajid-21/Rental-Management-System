import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useOwnerApi } from '../../lib/ownerApi';
import { PageHeader, Badge, Alert, Loading, EmptyState, ErrorState, Modal, money, dateFmt } from '../../components/ownerUi';

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House / Villa' },
  { value: 'studio', label: 'Studio' },
  { value: 'shop', label: 'Shop / Retail' },
  { value: 'office', label: 'Office' },
];

const PROPERTY_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'inactive', label: 'Inactive' },
];

const INITIAL_FORM = {
  name: '',
  address: '',
  city: '',
  property_type: 'apartment',
  description: '',
  bedrooms: 1,
  bathrooms: 1,
  monthly_rent: '',
  status: 'available',
};

export default function OwnerPropertiesPage() {
  const api = useOwnerApi();
  const location = useLocation();

  const [properties, setProperties] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProperty, setEditProperty] = useState(null);
  const [detailProperty, setDetailProperty] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form state
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState('');

  const loadProperties = useCallback(async (filters) => {
    const f = filters || { search, status: statusFilter };
    setLoading(true);
    setError('');
    const qs = new URLSearchParams();
    if (f.search) qs.set('search', f.search);
    if (f.status && f.status !== 'all') qs.set('status', f.status);

    const result = await api.get(`/properties${qs.toString() ? `?${qs}` : ''}`);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setProperties(result.properties);
  }, [api, search, statusFilter]);

  useEffect(() => {
    loadProperties();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Open add modal if ?action=add is in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'add') {
      setFormData(INITIAL_FORM);
      setFormError('');
      setShowAddModal(true);
    }
  }, [location.search]);

  const handleOpenAdd = () => {
    setFormData(INITIAL_FORM);
    setFormError('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (prop) => {
    setEditProperty(prop);
    setFormData({
      name: prop.name || '',
      address: prop.address || '',
      city: prop.city || '',
      property_type: prop.property_type || 'apartment',
      description: prop.description || '',
      bedrooms: prop.bedrooms || 0,
      bathrooms: prop.bathrooms || 0,
      monthly_rent: prop.monthly_rent || '',
      status: prop.status || 'available',
    });
    setFormError('');
  };

  const handleOpenDetail = async (prop) => {
    setLoading(true);
    const result = await api.get(`/properties/${prop.id}`);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDetailProperty(result.property);
  };

  const handleSaveAdd = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { setFormError('Property name is required.'); return; }
    if (!formData.address.trim()) { setFormError('Address is required.'); return; }
    if (!formData.monthly_rent || Number(formData.monthly_rent) <= 0) {
      setFormError('Please enter a valid monthly rent in PKR.');
      return;
    }

    setBusy(true);
    setFormError('');
    const result = await api.post('/properties', formData);
    setBusy(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    setNotice('Property added successfully to your portfolio.');
    setShowAddModal(false);
    loadProperties();
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { setFormError('Property name is required.'); return; }
    if (!formData.address.trim()) { setFormError('Address is required.'); return; }
    if (!formData.monthly_rent || Number(formData.monthly_rent) <= 0) {
      setFormError('Please enter a valid monthly rent in PKR.');
      return;
    }

    setBusy(true);
    setFormError('');
    const result = await api.put(`/properties/${editProperty.id}`, formData);
    setBusy(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    setNotice('Property updated successfully.');
    setEditProperty(null);
    loadProperties();
  };

  const handleQuickStatusChange = async (prop, newStatus) => {
    if (prop.status === newStatus) return;
    setBusy(true);
    setError('');
    const result = await api.patch(`/properties/${prop.id}/status`, { status: newStatus });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice(`Status updated to ${newStatus}.`);
    loadProperties();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    setError('');
    const result = await api.delete(`/properties/${deleteTarget.id}`);
    setBusy(false);
    const targetName = deleteTarget.name;
    setDeleteTarget(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice(`Property "${targetName}" deleted successfully.`);
    loadProperties();
  };

  return (
    <div className="page">
      <PageHeader
        title="Properties"
        subtitle="Manage your individual properties, update rental pricing and monitor occupancy."
        actions={
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            + Add Property
          </button>
        }
      />

      <Alert kind="error" onClose={() => setError('')}>{error}</Alert>
      <Alert kind="success" onClose={() => setNotice('')}>{notice}</Alert>

      <div className="card">
        {/* Search & Status Filter Toolbar */}
        <div className="toolbar">
          <input
            className="toolbar-input"
            placeholder="Search by property name, address, or city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadProperties({ search, status: statusFilter })}
          />
          <select
            className="toolbar-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              loadProperties({ search, status: e.target.value });
            }}
          >
            <option value="all">All statuses</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            className="btn btn-ghost"
            onClick={() => loadProperties({ search, status: statusFilter })}
          >
            Search
          </button>
          {(search || statusFilter !== 'all') && (
            <button
              className="btn btn-ghost"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                loadProperties({ search: '', status: 'all' });
              }}
            >
              Reset
            </button>
          )}
        </div>

        {/* Content list */}
        {loading && <Loading label="Loading your properties…" />}

        {!loading && properties && properties.length === 0 && (
          <EmptyState
            title="No properties found"
            hint={
              search || statusFilter !== 'all'
                ? 'No properties match your filter criteria.'
                : 'You have not added any properties yet. Click "+ Add Property" to list your first house or apartment.'
            }
          >
            <button className="btn btn-primary btn-sm" onClick={handleOpenAdd} style={{ marginTop: '12px' }}>
              + Add Property
            </button>
          </EmptyState>
        )}

        {!loading && properties && properties.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Location</th>
                  <th>Type</th>
                  <th>Rooms</th>
                  <th>Monthly Rent</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((prop) => (
                  <tr key={prop.id}>
                    <td>
                      <strong style={{ fontSize: '0.98rem' }}>{prop.name}</strong>
                      {prop.tenant_name && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-dark)', marginTop: '2px' }}>
                          Tenant: {prop.tenant_name}
                        </div>
                      )}
                      {prop.pending_requests_count > 0 && (
                        <div style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 600 }}>
                          {prop.pending_requests_count} pending rental request{prop.pending_requests_count > 1 ? 's' : ''}
                        </div>
                      )}
                    </td>
                    <td>
                      <div>{prop.address}</div>
                      {prop.city && <small style={{ color: 'var(--text-muted)' }}>{prop.city}</small>}
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{prop.property_type}</td>
                    <td>{prop.bedrooms} Bed, {prop.bathrooms} Bath</td>
                    <td><strong>{money(prop.monthly_rent)}</strong></td>
                    <td>
                      <select
                        className="toolbar-select"
                        style={{
                          fontSize: '0.82rem',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          borderColor:
                            prop.status === 'available'
                              ? 'var(--accent)'
                              : prop.status === 'occupied'
                              ? '#0284c7'
                              : 'var(--border)',
                          backgroundColor:
                            prop.status === 'available'
                              ? 'var(--accent-soft)'
                              : prop.status === 'occupied'
                              ? '#e0f2fe'
                              : 'var(--bg-accent)',
                          fontWeight: 600,
                        }}
                        value={prop.status}
                        onChange={(e) => handleQuickStatusChange(prop, e.target.value)}
                        disabled={busy}
                        title="Change property status"
                      >
                        <option value="available">Available</option>
                        <option value="occupied">Occupied</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleOpenDetail(prop)}
                          title="View Details"
                        >
                          View
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleOpenEdit(prop)}
                          title="Edit Property"
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: '#dc2626' }}
                          onClick={() => setDeleteTarget(prop)}
                          title="Delete Property"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD PROPERTY MODAL */}
      <Modal
        open={showAddModal}
        title="Add New Property"
        onClose={() => setShowAddModal(false)}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowAddModal(false)} disabled={busy}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveAdd} disabled={busy}>
              {busy ? 'Adding Property…' : 'Add Property'}
            </button>
          </>
        }
      >
        <Alert kind="error" onClose={() => setFormError('')}>{formError}</Alert>
        <form onSubmit={handleSaveAdd}>
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
            <label className="form-field">
              <span className="form-label">Property Name *</span>
              <input
                className="form-input"
                placeholder="e.g. Sunny Heights Villa"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </label>
            <label className="form-field">
              <span className="form-label">Property Type</span>
              <select
                className="form-input"
                value={formData.property_type}
                onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
            <label className="form-field">
              <span className="form-label">Address *</span>
              <input
                className="form-input"
                placeholder="Street address, block, area"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </label>
            <label className="form-field">
              <span className="form-label">City</span>
              <input
                className="form-input"
                placeholder="e.g. Lahore, Karachi"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </label>
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '14px' }}>
            <label className="form-field">
              <span className="form-label">Bedrooms</span>
              <input
                type="number"
                min="0"
                className="form-input"
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
              />
            </label>
            <label className="form-field">
              <span className="form-label">Bathrooms</span>
              <input
                type="number"
                min="0"
                className="form-input"
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
              />
            </label>
            <label className="form-field">
              <span className="form-label">Monthly Rent (PKR) *</span>
              <input
                type="number"
                min="1"
                step="500"
                className="form-input"
                placeholder="Rent amount in PKR"
                value={formData.monthly_rent}
                onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
                required
              />
            </label>
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
            <label className="form-field">
              <span className="form-label">Initial Status</span>
              <select
                className="form-input"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                {PROPERTY_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="form-field">
            <span className="form-label">Description</span>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Features, furnishings, utilities included, or nearby landmarks…"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </label>
        </form>
      </Modal>

      {/* EDIT PROPERTY MODAL */}
      <Modal
        open={Boolean(editProperty)}
        title={`Edit Property: ${editProperty?.name || ''}`}
        onClose={() => setEditProperty(null)}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setEditProperty(null)} disabled={busy}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveEdit} disabled={busy}>
              {busy ? 'Saving…' : 'Save Changes'}
            </button>
          </>
        }
      >
        <Alert kind="error" onClose={() => setFormError('')}>{formError}</Alert>
        <form onSubmit={handleSaveEdit}>
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
            <label className="form-field">
              <span className="form-label">Property Name *</span>
              <input
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </label>
            <label className="form-field">
              <span className="form-label">Property Type</span>
              <select
                className="form-input"
                value={formData.property_type}
                onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
            <label className="form-field">
              <span className="form-label">Address *</span>
              <input
                className="form-input"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </label>
            <label className="form-field">
              <span className="form-label">City</span>
              <input
                className="form-input"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </label>
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '14px' }}>
            <label className="form-field">
              <span className="form-label">Bedrooms</span>
              <input
                type="number"
                min="0"
                className="form-input"
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
              />
            </label>
            <label className="form-field">
              <span className="form-label">Bathrooms</span>
              <input
                type="number"
                min="0"
                className="form-input"
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
              />
            </label>
            <label className="form-field">
              <span className="form-label">Monthly Rent (PKR) *</span>
              <input
                type="number"
                min="1"
                step="500"
                className="form-input"
                value={formData.monthly_rent}
                onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
                required
              />
            </label>
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
            <label className="form-field">
              <span className="form-label">Status</span>
              <select
                className="form-input"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                {PROPERTY_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="form-field">
            <span className="form-label">Description</span>
            <textarea
              className="form-input"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </label>
        </form>
      </Modal>

      {/* VIEW PROPERTY DETAILS MODAL */}
      <Modal
        open={Boolean(detailProperty)}
        title="Property Details"
        onClose={() => setDetailProperty(null)}
        footer={
          <button className="btn btn-primary" onClick={() => setDetailProperty(null)}>
            Close
          </button>
        }
      >
        {detailProperty && (
          <div className="detail-grid">
            <div className="detail-full">
              <span>Property Name</span>
              <strong style={{ fontSize: '1.2rem' }}>{detailProperty.name}</strong>
            </div>

            <div><span>Type</span><strong style={{ textTransform: 'capitalize' }}>{detailProperty.property_type}</strong></div>
            <div><span>Status</span><Badge value={detailProperty.status} /></div>

            <div className="detail-full"><span>Address</span><strong>{detailProperty.address}</strong></div>
            {detailProperty.city && <div><span>City</span><strong>{detailProperty.city}</strong></div>}

            <div><span>Bedrooms</span><strong>{detailProperty.bedrooms} Bed</strong></div>
            <div><span>Bathrooms</span><strong>{detailProperty.bathrooms} Bath</strong></div>
            <div><span>Monthly Rent</span><strong style={{ color: 'var(--accent-dark)', fontSize: '1.1rem' }}>{money(detailProperty.monthly_rent)}</strong></div>

            {detailProperty.description && (
              <div className="detail-full">
                <span>Description</span>
                <p className="detail-desc">{detailProperty.description}</p>
              </div>
            )}

            {detailProperty.activeRental ? (
              <div className="detail-full" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '12px' }}>
                <span style={{ color: '#166534', fontWeight: 700 }}>Active Rental Information</span>
                <div style={{ marginTop: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.9rem' }}>
                  <div>Tenant: <strong>{detailProperty.activeRental.tenant_name}</strong></div>
                  <div>Email: <strong>{detailProperty.activeRental.tenant_email}</strong></div>
                  {detailProperty.activeRental.tenant_phone && <div>Phone: <strong>{detailProperty.activeRental.tenant_phone}</strong></div>}
                  <div>Start Date: <strong>{dateFmt(detailProperty.activeRental.start_date)}</strong></div>
                </div>
              </div>
            ) : (
              <div className="detail-full" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No active tenant currently renting this property.
              </div>
            )}

            <div><span>Date Added</span><strong>{dateFmt(detailProperty.created_at)}</strong></div>
            <div><span>Last Updated</span><strong>{dateFmt(detailProperty.updated_at)}</strong></div>
          </div>
        )}
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        open={Boolean(deleteTarget)}
        title="Confirm Property Deletion"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)} disabled={busy}>
              Cancel
            </button>
            <button
              className="btn btn-danger"
              style={{ backgroundColor: '#dc2626', color: '#fff' }}
              onClick={handleDelete}
              disabled={busy}
            >
              {busy ? 'Deleting…' : 'Yes, Delete Property'}
            </button>
          </>
        }
      >
        <p>
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
        </p>
        <p className="card-hint" style={{ color: '#dc2626' }}>
          Note: If this property has an active rental agreement, deletion will be blocked to preserve the tenant contract.
        </p>
      </Modal>
    </div>
  );
}
