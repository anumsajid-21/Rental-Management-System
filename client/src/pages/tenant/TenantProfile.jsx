import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { statusLabel } from '../../lib/constants';
import { useAuth } from '../../context/AuthContext';
import TextField from '../../components/TextField';
import LoadingBlock from '../../components/LoadingBlock';
import ErrorState from '../../components/ErrorState';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9][0-9\s-]{6,17}$/;

/**
 * Tenant profile: edit name, email and phone. Role, user ID and rental/
 * payment/maintenance records are displayed read-only and can never be
 * changed from here.
 */
export default function TenantProfile() {
  const { updateUser } = useAuth();
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setState({ loading: true, error: '', data: null });
    const res = await apiFetch('/profile');
    if (!res.ok) {
      setState({ loading: false, error: res.error, data: null });
      return;
    }
    const user = res.data.user;
    setForm({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
    setState({ loading: false, error: '', data: user });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
    setServerError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccess('');
    const errs = {};
    if (!form.name.trim()) errs.name = 'Please enter your name.';
    if (!form.email.trim()) errs.email = 'Please enter your email address.';
    else if (!EMAIL_RE.test(form.email.trim())) errs.email = 'Please enter a valid email address.';
    if (form.phone.trim() && !PHONE_RE.test(form.phone.trim())) {
      errs.phone = 'Please enter a valid phone number (7–18 digits, may start with +).';
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    const res = await apiFetch('/profile', { method: 'PATCH', body: form });
    setSaving(false);
    if (!res.ok) {
      setServerError(res.error);
      if (res.field) setErrors((prev) => ({ ...prev, [res.field]: res.error }));
      return;
    }
    updateUser(res.data.user); // refresh the shared session user
    setSuccess('Profile updated successfully.');
    setState((s) => ({ ...s, data: res.data.user }));
  };

  if (state.loading) return <LoadingBlock label="Loading your profile…" />;
  if (state.error) return <ErrorState message={state.error} onRetry={load} />;

  const user = state.data;

  return (
    <div>
      <div className="tenant-page-head">
        <h1>Profile</h1>
        <p>View and edit your personal information.</p>
      </div>

      {success && (
        <div className="alert alert-success" role="status">
          {success}
        </div>
      )}

      <form className="tenant-card form-card" onSubmit={handleSubmit} noValidate>
        {serverError && (
          <div className="alert alert-error" role="alert">
            {serverError}
          </div>
        )}

        <TextField
          label="Full Name"
          name="name"
          placeholder="Your name"
          value={form.name}
          onChange={setField('name')}
          error={errors.name}
          autoComplete="name"
        />
        <TextField
          label="Email Address"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={setField('email')}
          error={errors.email}
          autoComplete="email"
        />
        <TextField
          label="Phone Number"
          name="phone"
          type="tel"
          placeholder="+92 300 0000000"
          value={form.phone}
          onChange={setField('phone')}
          error={errors.phone}
          autoComplete="tel"
        />

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>

      <section className="tenant-card">
        <header className="card-head">
          <h2>Account</h2>
        </header>
        <div className="detail-grid">
          <div className="detail-item">
            <p className="detail-label">User ID</p>
            <p className="detail-value mono">{user.id}</p>
          </div>
          <div className="detail-item">
            <p className="detail-label">Role</p>
            <p className="detail-value">{statusLabel(user.role)}</p>
          </div>
          <div className="detail-item">
            <p className="detail-label">Member Since</p>
            <p className="detail-value">{formatDate(user.createdAt)}</p>
          </div>
        </div>
        <p className="muted-note small">
          Your role, user ID, rental assignment, transactions and maintenance statuses are managed
          by the system and cannot be changed here.
        </p>
      </section>
    </div>
  );
}
