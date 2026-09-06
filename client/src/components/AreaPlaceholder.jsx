import { useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { useAuth } from '../context/AuthContext';

/** Simple placeholder area header with logout — no dashboard content yet. */
export default function AreaPlaceholder({ title, user }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/signin', { replace: true });
  };

  return (
    <div className="area-page">
      <header className="area-header">
        <BrandLogo size="sm" className="area-brand" />
        <div className="area-user">
          <span className="area-user-name">{user.name}</span>
          <button className="btn btn-ghost" onClick={handleLogout}>Log Out</button>
        </div>
      </header>
      <main className="area-main">
        <div className="area-welcome-card">
          <h1>{title}</h1>
          <p>Authentication successful.</p>
          <p className="area-muted">
            You are signed in as <strong>{user.email}</strong> ({user.role.replace('_', ' ')}).
            This area will be built in a future phase.
          </p>
        </div>
      </main>
    </div>
  );
}
