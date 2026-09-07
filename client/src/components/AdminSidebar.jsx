import React from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  ClipboardList,
  KeyRound,
  CreditCard,
  Wrench,
  BarChart3,
  Scale,
  User,
} from 'lucide-react';
import AppSidebar from './layout/AppSidebar';
import { useAuth } from '../context/AuthContext';

const NAV_SECTIONS = [
  {
    title: 'Administration',
    items: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/users', label: 'Users & Roles', icon: Users },
      { to: '/admin/properties', label: 'Properties', icon: Building2 },
      { to: '/admin/rental-requests', label: 'Rental Requests', icon: ClipboardList },
      { to: '/admin/rentals', label: 'Rentals', icon: KeyRound },
    ],
  },
  {
    title: 'Finance & Operations',
    items: [
      { to: '/admin/transactions', label: 'Transactions', icon: CreditCard },
      { to: '/admin/maintenance', label: 'Maintenance', icon: Wrench },
      { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    title: 'System & Legal',
    items: [
      { to: '/admin/legal', label: 'Legal AI & Sources', icon: Scale },
      { to: '/admin/profile', label: 'Profile', icon: User },
    ],
  },
];

export default function AdminSidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();

  return (
    <AppSidebar
      portal="admin"
      portalTitle="Admin Portal"
      links={NAV_SECTIONS}
      user={user}
      onLogout={logout}
      mobileOpen={isOpen}
      onCloseMobile={onClose}
    />
  );
}

