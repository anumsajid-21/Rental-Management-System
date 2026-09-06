import { NavLink } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { useAuth } from '../context/AuthContext';

const menuItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/admin/users', label: 'Users', icon: '👥' },
  { path: '/admin/properties', label: 'Properties', icon: '🏠' },
  { path: '/admin/rental-requests', label: 'Rental Requests', icon: '📋' },
  { path: '/admin/rentals', label: 'Rentals', icon: '🔑' },
  { path: '/admin/transactions', label: 'Transactions', icon: '💳' },
  { path: '/admin/maintenance', label: 'Maintenance', icon: '🔧' },
  { path: '/admin/reports', label: 'Reports', icon: '📈' },
  { path: '/admin/profile', label: 'Profile', icon: '👤' },
];

export default function AdminSidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();

  return (
    <aside className={`admin-sidebar ${isOpen ? 'admin-sidebar-open' : ''}`}>
      <div className="admin-sidebar-header">
        <div className="admin-brand">
          <BrandLogo size="sm" portal="admin" subtitle="Admin Portal" />
        </div>
        <div className="admin-user-info">
          <span className="admin-user-name">{user?.name}</span>
          <span className="admin-user-role">System Admin</span>
        </div>
      </div>

      <nav className="admin-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) => 
              `admin-nav-item ${isActive ? 'admin-nav-item-active' : ''}`
            }
          >
            <span className="admin-nav-icon">{item.icon}</span>
            <span className="admin-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <button onClick={logout} className="admin-logout-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
