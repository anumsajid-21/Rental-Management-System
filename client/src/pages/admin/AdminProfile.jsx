import { useAuth } from '../../context/AuthContext';

export default function AdminProfile() {
  const { user, logout } = useAuth();

  return (
    <div className="admin-content">
      <div className="admin-header">
        <div className="admin-header-title">
          <h1>Admin Profile</h1>
          <p>Manage your admin account settings</p>
        </div>
      </div>

      <div className="admin-card" style={{ maxWidth: '600px' }}>
        <div className="admin-card-label">Account Information</div>
        
        <div style={{ marginTop: '24px' }}>
          <div className="field">
            <label className="field-label-text">Name</label>
            <div style={{ fontSize: '1rem', color: 'var(--text)' }}>
              {user?.name}
            </div>
          </div>

          <div className="field">
            <label className="field-label-text">Email</label>
            <div style={{ fontSize: '1rem', color: 'var(--text)' }}>
              {user?.email}
            </div>
          </div>

          <div className="field">
            <label className="field-label-text">Role</label>
            <div>
              <span className="status-badge">{user?.role}</span>
            </div>
          </div>

          <div className="field">
            <label className="field-label-text">Status</label>
            <div>
              <span className={`status-badge ${user?.status || 'active'}`}>
                {user?.status || 'active'}
              </span>
            </div>
          </div>

          <div className="field">
            <label className="field-label-text">Member Since</label>
            <div style={{ fontSize: '1rem', color: 'var(--text)' }}>
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          <button
            className="admin-action-btn admin-action-btn-danger"
            onClick={logout}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
