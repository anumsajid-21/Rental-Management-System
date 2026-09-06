import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import TenantArea from './pages/TenantArea';
import OwnerArea from './pages/OwnerArea';
import OwnerHome from './pages/owner/OwnerHome';
import RentPage from './pages/owner/RentPage';
import TransactionsPage from './pages/owner/TransactionsPage';
import MaintenancePage from './pages/owner/MaintenancePage';
import ReportsPage from './pages/owner/ReportsPage';
import ImportCsvPage from './pages/owner/ImportCsvPage';
import OwnerPropertiesPage from './pages/owner/OwnerPropertiesPage';
import RentalRequestsPage from './pages/owner/RentalRequestsPage';
import ProfilePage from './pages/owner/ProfilePage';
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
          >
            <Route index element={<OwnerHome />} />
            <Route path="properties" element={<OwnerPropertiesPage />} />
            <Route path="rental-requests" element={<RentalRequestsPage />} />
            <Route path="rent" element={<RentPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="maintenance" element={<MaintenancePage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="import" element={<ImportCsvPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

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
