import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  CreditCard,
  Receipt,
  Wrench,
  BarChart3,
  FileSpreadsheet,
  Scale,
  User,
  Menu,
} from 'lucide-react';
import AppSidebar from '../components/layout/AppSidebar';
import { useAuth } from '../context/AuthContext';

const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [{ to: '/owner', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    title: 'Portfolio',
    items: [
      { to: '/owner/properties', label: 'Properties', icon: Building2 },
      { to: '/owner/rental-requests', label: 'Rental Requests', icon: ClipboardList },
    ],
  },
  {
    title: 'Management',
    items: [
      { to: '/owner/rent', label: 'Rent & Leases', icon: CreditCard },
      { to: '/owner/transactions', label: 'Transactions', icon: Receipt },
      { to: '/owner/maintenance', label: 'Maintenance', icon: Wrench },
    ],
  },
  {
    title: 'Insights & Legal',
    items: [
      { to: '/owner/reports', label: 'Analytics Reports', icon: BarChart3 },
      { to: '/owner/import', label: 'Import CSV', icon: FileSpreadsheet },
      { to: '/owner/legal', label: 'Legal AI Assistant', icon: Scale },
    ],
  },
  {
    title: 'Account',
    items: [{ to: '/owner/profile', label: 'Profile & Security', icon: User }],
  },
];

/** Owner area layout: sidebar navigation + header + nested pages. */
export default function OwnerArea() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/signin', { replace: true });
  };

  return (
    <div className="app-shell">
      <AppSidebar
        portal="owner"
        portalTitle="Owner Portal"
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
          <span className="app-mobile-title">Owner Portal</span>
        </header>

        <main className="app-content owner-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}



