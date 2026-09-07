import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, User, X } from 'lucide-react';
import BrandLogo from '../BrandLogo';

/**
 * Universal Sidebar used across Tenant, Owner, and Admin portals.
 * Ensures 100% visual consistency while retaining role-specific links and branding.
 *
 * @param {'tenant'|'owner'|'admin'} portal
 * @param {string} portalTitle
 * @param {Array<{to: string, label: string, icon: any, end?: boolean}>} links
 * @param {object} user
 * @param {() => void} onLogout
 * @param {boolean} mobileOpen
 * @param {() => void} onCloseMobile
 */
export default function AppSidebar({
  portal = 'tenant',
  portalTitle = 'Portal',
  links = [],
  user = {},
  onLogout,
  mobileOpen = false,
  onCloseMobile = () => {},
}) {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  const displayName = user?.name || user?.email || 'User';
  const displayRole = (user?.role || portal).toUpperCase();
  const initial = displayName.charAt(0).toUpperCase();

  // Support either categorized sections ({ title, items: [...] }) or flat links list
  const sections =
    Array.isArray(links) && links.length > 0 && links[0]?.items
      ? links
      : [{ title: '', items: links || [] }];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="app-sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar ${mobileOpen ? 'app-sidebar-open' : ''}`}>
        {/* Sidebar Brand Header */}
        <div className="app-sidebar-header">
          <div className="app-sidebar-brand">
            <BrandLogo
              size="sm"
              portal={portal}
              subtitle={portalTitle}
              className="sidebar-brand-lockup"
            />
          </div>
          {mobileOpen && (
            <button
              type="button"
              className="app-sidebar-mobile-close"
              onClick={onCloseMobile}
              aria-label="Close sidebar"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Sidebar Nav Items */}
        <nav className="app-sidebar-nav">
          {sections.map((section, sIdx) => (
            <div key={section.title || sIdx} className="app-sidebar-section">
              {section.title && (
                <div className="app-sidebar-nav-section-title">{section.title}</div>
              )}
              {section.items.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      `app-sidebar-link ${isActive ? 'active' : ''}`
                    }
                    onClick={onCloseMobile}
                  >
                    {Icon && <Icon size={18} className="app-sidebar-link-icon" strokeWidth={2} />}
                    <span className="app-sidebar-link-label">{link.label}</span>
                    {link.badge && (
                      <span className="app-sidebar-link-badge">{link.badge}</span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar User Footer */}
        <div className="app-sidebar-footer">
          <div className="app-sidebar-user">
            <div className="app-sidebar-avatar" title={displayName}>
              {initial || <User size={16} />}
            </div>
            <div className="app-sidebar-user-details">
              <span className="app-sidebar-user-name" title={displayName}>
                {displayName}
              </span>
              <span className={`app-sidebar-role-badge role-${portal}`}>
                {displayRole}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="app-sidebar-logout-btn"
            onClick={handleLogout}
            title="Sign out of your account"
            aria-label="Sign out"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
    </>
  );
}
