import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import TextField from '../components/TextField';
import RoleSelect from '../components/RoleSelect';
import { useAuth } from '../context/AuthContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUp() {
  const { signUp, signIn, homeForRole } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setField = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
    setServerError('');
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Please enter your full name.';
    if (!form.email.trim()) errs.email = 'Please enter your email address.';
    else if (!EMAIL_RE.test(form.email.trim())) errs.email = 'Please enter a valid email address.';
    if (!form.password) errs.password = 'Please enter a password.';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (!form.confirmPassword) errs.confirmPassword = 'Please confirm your password.';
    else if (form.confirmPassword !== form.password) errs.confirmPassword = 'Passwords do not match.';
    if (!form.role) errs.role = 'Please select a role.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      // signUp persists the session (token + user) on success, so the
      // account is created AND signed in in one step.
      const result = await signUp({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      });
      if (!result.ok) {
        if (result.error.toLowerCase().includes('already exists')) {
          setErrors((prev) => ({ ...prev, email: result.error }));
        }
        setServerError(result.error);
        return;
      }
      navigate(homeForRole(result.user.role), { replace: true });
    } catch {
      setServerError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join us in a few quick steps — no credit card, no hassle."
    >
      {serverError && (
        <div className="alert alert-error" role="alert">{serverError}</div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <TextField label="Full Name" name="name" placeholder="e.g. Sarah Ahmed"
          value={form.name} onChange={setField('name')} error={errors.name} autoComplete="name" />
        <TextField label="Email Address" name="email" type="email" placeholder="you@example.com"
          value={form.email} onChange={setField('email')} error={errors.email} autoComplete="email" />
        <TextField label="Password" name="password" type="password" placeholder="At least 8 characters"
          value={form.password} onChange={setField('password')} error={errors.password} autoComplete="new-password" />
        <TextField label="Confirm Password" name="confirmPassword" type="password" placeholder="Re-enter your password"
          value={form.confirmPassword} onChange={setField('confirmPassword')} error={errors.confirmPassword} autoComplete="new-password" />
        <RoleSelect value={form.role} onChange={(v) => { setForm((f) => ({ ...f, role: v })); setErrors((e2) => ({ ...e2, role: undefined })); }} error={errors.role} />

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/signin">Sign In</Link>
      </p>
    </AuthLayout>
  );
}
