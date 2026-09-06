import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import BrandLogo from '../components/BrandLogo';
import '../styles/admin.css';

export default function AdminArea() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-layout">
      {/* Mobile top bar toggle button */}
      <div className="admin-mobile-bar" style={{ display: 'none' }}>
        <button
          className="admin-mobile-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
        >
          ☰ Menu
        </button>
        <BrandLogo size="sm" portal="admin" showWordmark className="admin-mobile-brand" />
      </div>

      {mobileOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 99 }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <AdminSidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
