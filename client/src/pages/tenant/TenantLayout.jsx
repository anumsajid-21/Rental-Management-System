import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  KeyRound,
  CreditCard,
  Wrench,
  Scale,
  User,
  Menu,
} from 'lucide-react';
import AppSidebar from '../../components/layout/AppSidebar';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/tenant', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/tenant/properties', label: 'Properties', icon: Building2 },
  { to: '/tenant/rental', label: 'My Rental', icon: KeyRound },
  { to: '/tenant/transactions', label: 'Transactions', icon: CreditCard },
  { to: '/tenant/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/tenant/legal', label: 'Legal Assistant', icon: Scale },
  { to: '/tenant/profile', label: 'Profile', icon: User },
];

/**
 * Standardized Tenant portal shell using universal AppSidebar.
 */
export default function TenantLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/signin', { replace: true, state: { info: 'You have been signed out.' } });
  };

  return (
    <div className="app-shell">
      <AppSidebar
        portal="tenant"
        portalTitle="Tenant Portal"
        links={NAV_ITEMS}
        user={user}
        onLogout={handleLogout}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="app-main">
        <header className="app-mobile-bar">
          <button
            type="button"
            className="app-mobile-toggle"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu size={22} />
          </button>
          <span className="app-mobile-title">Tenant Portal</span>
        </header>

        <main className="app-content tenant-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

