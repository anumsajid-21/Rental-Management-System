import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { adminApi } from '../../lib/adminStore';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  // Form state for edit modal
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    role: '',
    status: ''
  });
  const [editError, setEditError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await adminApi.users({
        search,
        role: roleFilter,
        status: statusFilter,
        page,
        limit: 20
      });
      setUsers(result.users);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    });
    setEditError('');
    setShowEditModal(true);
  };

  const handleStatusChange = (user, status) => {
    setSelectedUser(user);
    setNewStatus(status);
    setShowStatusModal(true);
  };

  const confirmStatusChange = async () => {
    try {
      setSubmitting(true);
      setError('');
      const res = await adminApi.updateUserStatus(selectedUser.id, newStatus);
      setSuccess(res.message || 'Status updated successfully');
      setShowStatusModal(false);
      loadUsers();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update user status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUserSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setEditError('');
      const res = await adminApi.updateUser(selectedUser.id, editFormData);
      setSuccess(res.message || 'User updated successfully');
      setShowEditModal(false);
      loadUsers();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setEditError(err.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-content">
      <div className="admin-header">
        <div className="admin-header-title">
          <h1>User Management</h1>
          <p>Manage all user accounts and permissions</p>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}
      {success && <div className="alert alert-info" style={{ marginBottom: '16px', background: '#d1fae5', color: '#065f46', borderColor: '#a7f3d0' }}>{success}</div>}

      <div className="admin-table-container">
        <div className="admin-table-header">
          <div className="admin-table-title">Users Directory</div>
          <div className="admin-table-controls">
            <form onSubmit={handleSearch} className="admin-search">
              <span className="admin-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search by name, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>
            <select
              className="admin-filter-select"
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Roles</option>
              <option value="tenant">Tenant</option>
              <option value="property_owner">Property Owner</option>
              <option value="admin">Admin</option>
            </select>
            <select
              className="admin-filter-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}>
              <Users size={36} strokeWidth={1.75} />
            </div>
            <div className="admin-empty-state-title">No matching users found</div>
            <div className="admin-empty-state-description">
              Try adjusting your search criteria or role filters
            </div>
          </div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td>
                      <span className="status-badge" style={{ textTransform: 'capitalize' }}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${u.status}`}>
                        {u.status}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="admin-action-btn admin-action-btn-secondary"
                          onClick={() => handleEditUser(u)}
                        >
                          Edit
                        </button>
                        {u.status === 'active' && (
                          <button
                            className="admin-action-btn admin-action-btn-danger"
                            onClick={() => handleStatusChange(u, 'deactivated')}
                          >
                            Deactivate
                          </button>
                        )}
                        {u.status === 'deactivated' && (
                          <button
                            className="admin-action-btn admin-action-btn-primary"
                            onClick={() => handleStatusChange(u, 'active')}
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
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

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal">
            <form onSubmit={handleUpdateUserSubmit}>
              <div className="modal-header">
                <h3>Edit User Details</h3>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {editError && <div className="alert alert-error">{editError}</div>}
                
                <div className="field">
                  <label className="field-label-text">Full Name</label>
                  <input
                    type="text"
                    required
                    style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid var(--border)' }}
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label className="field-label-text">Email Address</label>
                  <input
                    type="email"
                    required
                    style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid var(--border)' }}
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label className="field-label-text">Role</label>
                  <select
                    style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid var(--border)' }}
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  >
                    <option value="tenant">Tenant</option>
                    <option value="property_owner">Property Owner</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="field">
                  <label className="field-label-text">Status</label>
                  <select
                    style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1.5px solid var(--border)' }}
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="deactivated">Deactivated</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowEditModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Deactivate / Reactivate Modal */}
      {showStatusModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Confirm Status Change</h3>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to set <strong>{selectedUser.name}</strong>'s status to{' '}
                <span className={`status-badge ${newStatus}`}>{newStatus}</span>?
              </p>
              {newStatus === 'deactivated' && (
                <p className="text-muted" style={{ marginTop: '12px' }}>
                  This account will be deactivated, preventing future sign-in while safely preserving all historical rental and transaction records.
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                onClick={() => setShowStatusModal(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className={`btn ${newStatus === 'deactivated' ? 'admin-action-btn-danger' : 'btn-primary'}`}
                onClick={confirmStatusChange}
                disabled={submitting}
              >
                {submitting ? 'Updating...' : `Confirm ${newStatus === 'deactivated' ? 'Deactivation' : 'Reactivation'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
