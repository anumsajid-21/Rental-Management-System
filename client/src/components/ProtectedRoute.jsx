import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route guard.
 * - `authRequired` (default true): redirects unauthenticated users to /signin.
 * - `roles`: optional list of allowed roles; authenticated users with a
 *   different role are redirected to their own home route.
 * - `allowRoles` false disables the check (e.g. future public pages).
 */
export default function ProtectedRoute({ children, roles, authRequired = true }) {
  const { user, isAuthenticated, homeForRole } = useAuth();
  const location = useLocation();

  if (!authRequired) return children;

  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location.pathname }} replace />;
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  return children;
}
