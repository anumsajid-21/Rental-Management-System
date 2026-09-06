import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import TenantArea from './pages/TenantArea';
import OwnerArea from './pages/OwnerArea';
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
