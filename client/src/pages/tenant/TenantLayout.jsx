import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import BrandLogo from '../../components/BrandLogo';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/tenant', label: 'Dashboard', end: true },
  { to: '/tenant/properties', label: 'Properties' },
  { to: '/tenant/rental', label: 'My Rental' },
  { to: '/tenant/transactions', label: 'Transactions' },
  { to: '/tenant/maintenance', label: 'Maintenance' },
  { to: '/tenant/profile', label: 'Profile' },
];

/**
 * Tenant portal shell: vertical sidebar on the left with the shared brand,
 * role-protected navigation and the user block with logout pinned to the
 * bottom. All tenant routes render inside <Outlet />.
 */
export default function TenantLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // clears the session (localStorage) immediately
    navigate('/signin', { replace: true, state: { info: 'You have been signed out.' } });
  };

  return (
    <div className="tenant-page">
      <aside className="tenant-sidebar">
        <div className="tenant-brand">
          <BrandLogo size="sm" portal="tenant" subtitle="Tenant Portal" />
        </div>

        <nav className="tenant-nav" aria-label="Tenant navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `tenant-nav-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="tenant-sidebar-user">
          <span className="tenant-user-name">{user?.name}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </aside>

      <main className="tenant-main">
        <Outlet />
      </main>
    </div>
  );
}
