import { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import TextField from '../components/TextField';
import { useAuth } from '../context/AuthContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignIn() {
  const { signIn, homeForRole, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [info] = useState(location.state?.info || '');

  useEffect(() => {
    // Clear the location state so refresh/info doesn't reappear.
    window.history.replaceState({}, document.title);
  }, []);

  // Already signed in? Go straight to the role's home area.
  if (isAuthenticated) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  const setField = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const errs = {};
    if (!form.email.trim()) errs.email = 'Please enter your email address.';
    else if (!EMAIL_RE.test(form.email.trim())) errs.email = 'Please enter a valid email address.';
    if (!form.password) errs.password = 'Please enter your password.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const result = await signIn(form);
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      const from = location.state?.from;
      navigate(from && from !== '/signin' ? from : homeForRole(result.user.role), { replace: true });
    } catch {
      setServerError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue to your rental workspace."
    >
      {info && <div className="alert alert-info" role="status">{info}</div>}
      {serverError && <div className="alert alert-error" role="alert">{serverError}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <TextField label="Email Address" name="email" type="email" placeholder="you@example.com"
          value={form.email} onChange={setField('email')} error={errors.email} autoComplete="email" />
        <TextField label="Password" name="password" type="password" placeholder="Your password"
          value={form.password} onChange={setField('password')} error={errors.password} autoComplete="current-password" />

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <p className="auth-switch">
        New here? <Link to="/signup">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
