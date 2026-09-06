import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import TenantLayout from './pages/tenant/TenantLayout';
import TenantDashboard from './pages/tenant/TenantDashboard';
import TenantProperties from './pages/tenant/TenantProperties';
import TenantPropertyDetail from './pages/tenant/TenantPropertyDetail';
import TenantRental from './pages/tenant/TenantRental';
import TenantTransactions from './pages/tenant/TenantTransactions';
import TenantTransactionDetail from './pages/tenant/TenantTransactionDetail';
import TenantMaintenance from './pages/tenant/TenantMaintenance';
import TenantMaintenanceNew from './pages/tenant/TenantMaintenanceNew';
import TenantMaintenanceDetail from './pages/tenant/TenantMaintenanceDetail';
import TenantProfile from './pages/tenant/TenantProfile';
import OwnerArea from './pages/OwnerArea';
import { ROLES } from './lib/roles';

/**
 * Route map. Role protection is declarative: pass `roles={[...]}`.
 * The whole Tenant Portal lives under /tenant and is tenant-only.
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Tenant Portal — authenticated 'tenant' role only. */}
          <Route
            path="/tenant"
            element={
              <ProtectedRoute roles={[ROLES.TENANT]}>
                <TenantLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<TenantDashboard />} />
            <Route path="properties" element={<TenantProperties />} />
            <Route path="properties/:propertyId" element={<TenantPropertyDetail />} />
            <Route path="rental" element={<TenantRental />} />
            <Route path="transactions" element={<TenantTransactions />} />
            <Route path="transactions/:transactionId" element={<TenantTransactionDetail />} />
            <Route path="maintenance" element={<TenantMaintenance />} />
            <Route path="maintenance/new" element={<TenantMaintenanceNew />} />
            <Route path="maintenance/:requestId" element={<TenantMaintenanceDetail />} />
            <Route path="profile" element={<TenantProfile />} />
          </Route>

          <Route
            path="/owner"
            element={
              <ProtectedRoute roles={[ROLES.PROPERTY_OWNER]}>
                <OwnerArea />
              </ProtectedRoute>
            }
          />

          {/* Future admin portal — foundation only, not built this phase.
          <Route path="/admin" element={
            <ProtectedRoute roles={[ROLES.ADMIN]}><AdminArea /></ProtectedRoute>
          } /> */}

          <Route path="*" element={<Navigate to="/signin" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
