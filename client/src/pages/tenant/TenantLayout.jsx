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

const NAV_SECTIONS = [
  {
    title: 'OVERVIEW',
    items: [{ to: '/tenant', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    title: 'PORTFOLIO',
    items: [
      { to: '/tenant/properties', label: 'Properties', icon: Building2 },
      { to: '/tenant/rental', label: 'My Rental', icon: KeyRound },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      { to: '/tenant/transactions', label: 'Transactions', icon: CreditCard },
      { to: '/tenant/maintenance', label: 'Maintenance', icon: Wrench },
    ],
  },
  {
    title: 'INSIGHTS & LEGAL',
    items: [{ to: '/tenant/legal', label: 'Legal Assistant', icon: Scale }],
  },
  {
    title: 'ACCOUNT',
    items: [{ to: '/tenant/profile', label: 'Profile & Security', icon: User }],
  },
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
        links={NAV_SECTIONS}
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

