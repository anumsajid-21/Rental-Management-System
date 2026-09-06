import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/adminStore';

export default function AdminProperties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadProperties();
  }, [page, cityFilter, statusFilter, typeFilter]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await adminApi.properties({
        search,
        city: cityFilter,
        status: statusFilter,
        propertyType: typeFilter,
        page,
        limit: 20
      });
      setProperties(result.properties);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err.message || 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadProperties();
  };

  const handleViewDetails = async (id) => {
    try {
      setDetailLoading(true);
      setShowDetailModal(true);
      const res = await adminApi.propertyById(id);
      setSelectedProperty(res.property);
    } catch (err) {
      setError(err.message || 'Failed to load property details');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="admin-content">
      <div className="admin-header">
        <div className="admin-header-title">
          <h1>Property Oversight</h1>
          <p>Monitor all properties across the platform</p>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

      <div className="admin-table-container">
        <div className="admin-table-header">
          <div className="admin-table-title">Properties Directory</div>
          <div className="admin-table-controls">
            <form onSubmit={handleSearch} className="admin-search">
              <span className="admin-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search properties or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>
            <select
              className="admin-filter-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
            <select
              className="admin-filter-select"
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Types</option>
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="commercial">Commercial</option>
              <option value="studio">Studio</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
            Loading properties...
          </div>
        ) : properties.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-state-icon">🏠</div>
            <div className="admin-empty-state-title">No matching properties found</div>
            <div className="admin-empty-state-description">
              Try adjusting your search criteria or type filters
            </div>
          </div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Property Name</th>
                  <th>Owner</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((property) => (
                  <tr key={property.id}>
                    <td><strong>{property.name}</strong></td>
                    <td>
                      <div>{property.ownerName}</div>
                      <small className="text-muted">{property.ownerEmail}</small>
                    </td>
                    <td>{property.address}</td>
                    <td>{property.city}</td>
                    <td style={{ textTransform: 'capitalize' }}>{property.propertyType}</td>
                    <td>
                      <span className={`status-badge ${property.status}`}>
                        {property.status}
                      </span>
                    </td>
                    <td>{new Date(property.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="admin-action-btn admin-action-btn-secondary"
                        onClick={() => handleViewDetails(property.id)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="admin-pagination">
              <div className="admin-pagination-info">
                Page {page} of {totalPages}
              </div>
              <div className="admin-pagination-controls">
                <button
                  className="admin-pagination-btn"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ←
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      className={`admin-pagination-btn ${page === pageNum ? 'active' : ''}`}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  className="admin-pagination-btn"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Read-only Property Details Modal */}
      {showDetailModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Property Oversight Details</h3>
            </div>
            <div className="modal-body">
              {detailLoading || !selectedProperty ? (
                <div className="admin-loading">
                  <div className="admin-spinner" />
                  Loading details...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--bg-accent)', padding: '16px', borderRadius: '12px' }}>
                    <div>
                      <small className="text-muted" style={{ display: 'block' }}>Property Name</small>
                      <strong>{selectedProperty.name}</strong>
                    </div>
                    <div>
                      <small className="text-muted" style={{ display: 'block' }}>Status</small>
                      <span className={`status-badge ${selectedProperty.status}`}>{selectedProperty.status}</span>
                    </div>
                    <div>
                      <small className="text-muted" style={{ display: 'block' }}>Property Type</small>
                      <span style={{ textTransform: 'capitalize' }}>{selectedProperty.propertyType}</span>
                    </div>
                    <div>
                      <small className="text-muted" style={{ display: 'block' }}>Location</small>
                      <span>{selectedProperty.address}, {selectedProperty.city}</span>
                    </div>
                  </div>

                  <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '12px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem' }}>Owner Information</h4>
                    <p style={{ margin: '0 0 4px 0' }}><strong>{selectedProperty.ownerName}</strong></p>
                    <p style={{ margin: 0 }} className="text-muted">{selectedProperty.ownerEmail}</p>
                  </div>

                  <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '12px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem' }}>Unit Inventory Audit</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
                      <div style={{ background: '#f3f4f6', padding: '10px', borderRadius: '8px' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{selectedProperty.totalUnits || 0}</div>
                        <small className="text-muted">Total Units</small>
                      </div>
                      <div style={{ background: '#d1fae5', padding: '10px', borderRadius: '8px' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#065f46' }}>{selectedProperty.availableUnits || 0}</div>
                        <small style={{ color: '#065f46' }}>Available</small>
                      </div>
                      <div style={{ background: '#e0f2fe', padding: '10px', borderRadius: '8px' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0369a1' }}>{selectedProperty.occupiedUnits || 0}</div>
                        <small style={{ color: '#0369a1' }}>Occupied</small>
                      </div>
                      <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '8px' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#92400e' }}>{selectedProperty.maintenanceUnits || 0}</div>
                        <small style={{ color: '#92400e' }}>Maintenance</small>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-primary"
                onClick={() => { setShowDetailModal(false); setSelectedProperty(null); }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
