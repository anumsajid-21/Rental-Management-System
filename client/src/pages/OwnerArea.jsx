import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* Inline SVG icons (stroke follows currentColor so CSS states apply). */
const icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  buildings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M15 9h3a1 1 0 0 1 1 1v11" />
      <path d="M8 8h2M8 12h2M8 16h2" />
    </svg>
  ),
  request: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12h6M12 9v6" /><circle cx="12" cy="12" r="9" />
    </svg>
  ),
  money: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" />
    </svg>
  ),
  exchange: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 7h11l-3-3M17 17H6l3 3" />
    </svg>
  ),
  wrench: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a4.5 4.5 0 0 0-6 6L3 18l3 3 5.7-5.7a4.5 4.5 0 0 0 6-6L14 13l-3-3 3.7-3.7z" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="M7 15v3M12 10v8M17 6v12" />
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  ),
};

const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [{ to: '/owner', label: 'Dashboard', icon: 'dashboard', end: true, owner: 2 }],
  },
  {
    title: 'Portfolio',
    items: [
      { to: '/owner/properties', label: 'Properties', icon: 'buildings', owner: 2 },
      { to: '/owner/rental-requests', label: 'Rental Requests', icon: 'request', owner: 2 },
    ],
  },
  {
    title: 'Management',
    items: [
      { to: '/owner/rent', label: 'Rent', icon: 'money', owner: 3 },
      { to: '/owner/transactions', label: 'Transactions', icon: 'exchange', owner: 3 },
      { to: '/owner/maintenance', label: 'Maintenance', icon: 'wrench', owner: 3 },
    ],
  },
  {
    title: 'Insights',
    items: [
      { to: '/owner/reports', label: 'Reports', icon: 'chart', owner: 3 },
      { to: '/owner/import', label: 'Import CSV', icon: 'upload', owner: 3 },
    ],
  },
  {
    title: 'Account',
    items: [{ to: '/owner/profile', label: 'Profile & Security', icon: 'user', owner: 3 }],
  },
];

/** Owner area layout: sidebar navigation + header + nested pages. */
export default function OwnerArea() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/signin', { replace: true });
  };

  const initials = (user?.name || '?')
    .split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

  return (
    <div className="area-page area-with-sidebar">
      <aside className="sidebar">
        <div className="sidebar-brand-wrap">
          <div className="sidebar-brand" dir="rtl" lang="ur">╪▒█ü╪º╪ª╪┤</div>
          <div className="sidebar-brand-sub">Owner Portal</div>
        </div>

        <nav className="sidebar-nav">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="sidebar-section">
              <div className="sidebar-section-title">{section.title}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                  title={item.label}
                >
                  <span className="sidebar-link-icon">{icons[item.icon]}</span>
                  <span className="sidebar-link-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-avatar">{initials}</span>
            <span className="sidebar-user-info">
              <span className="area-user-name">{user.name}</span>
              <span className="sidebar-user-role">Property Owner</span>
            </span>
          </div>
          <button className="btn btn-ghost sidebar-logout" onClick={handleLogout}>
            <span className="sidebar-link-icon">{icons.logout}</span> Log Out
          </button>
        </div>
      </aside>

      <main className="owner-main">
        <Outlet />
      </main>
    </div>
  );
}


