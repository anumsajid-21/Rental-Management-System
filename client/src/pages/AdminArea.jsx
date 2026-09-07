import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import '../styles/admin.css';

export default function AdminArea() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell">
      <AdminSidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="app-main">
        <header className="app-mobile-bar">
          <button
            type="button"
            className="app-mobile-toggle"
            onClick={() => setMobileOpen(true)}
            aria-label="Toggle navigation menu"
          >
            <Menu size={22} />
          </button>
          <span className="app-mobile-title">Admin Portal</span>
        </header>

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

