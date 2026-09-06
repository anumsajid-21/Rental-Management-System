import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import TenantArea from './pages/TenantArea';
import OwnerArea from './pages/OwnerArea';
import AdminArea from './pages/AdminArea';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminProperties from './pages/admin/AdminProperties';
import AdminRentalRequests from './pages/admin/AdminRentalRequests';
import AdminRentals from './pages/admin/AdminRentals';
import AdminTransactions from './pages/admin/AdminTransactions';
import AdminMaintenance from './pages/admin/AdminMaintenance';
import AdminReports from './pages/admin/AdminReports';
import AdminProfile from './pages/admin/AdminProfile';
import { ROLES } from './lib/roles';

/**
 * Route map. Role protection is declarative: pass `roles={[...]}`.
 * Adding the future admin portal is a single guarded route below.
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          <Route
            path="/tenant"
            element={
              <ProtectedRoute roles={[ROLES.TENANT]}>
                <TenantArea />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner"
            element={
              <ProtectedRoute roles={[ROLES.PROPERTY_OWNER]}>
                <OwnerArea />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={[ROLES.ADMIN]}>
                <AdminArea />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="properties" element={<AdminProperties />} />
            <Route path="rental-requests" element={<AdminRentalRequests />} />
            <Route path="rentals" element={<AdminRentals />} />
            <Route path="transactions" element={<AdminTransactions />} />
            <Route path="maintenance" element={<AdminMaintenance />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="profile" element={<AdminProfile />} />
          </Route>

          <Route path="*" element={<Navigate to="/signin" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
