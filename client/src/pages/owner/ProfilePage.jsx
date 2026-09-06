import { useEffect, useState } from 'react';
import { useOwnerApi } from '../../lib/ownerApi';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Loading, ErrorState, Alert, dateFmt } from '../../components/ownerUi';

const roleLabel = (r) => String(r || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function TextField({ label, type = 'text', value, onChange, disabled, placeholder }) {
  return (
    <label className="form-field">
      <span className="form-label">{label}</span>
      <input
        className="form-input"
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export default function ProfilePage() {
  const api = useOwnerApi();
  const { user, updateUser } = useAuth();

  const [profile, setProfile] = useState({ name: '', email: '' });
  const [loadErr, setLoadErr] = useState('');
  const [loading, setLoading] = useState(true);

  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const load = async () => {
    setLoading(true);
    const result = await api.get('/profile');
    setLoading(false);
    if (!result.ok) { setLoadErr(result.error); return; }
    setProfile({ name: result.user.name, email: result.user.email });
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg(''); setProfileErr('');
    setSavingProfile(true);
    const result = await api.patch('/profile', profile);
    setSavingProfile(false);
    if (!result.ok) { setProfileErr(result.error); return; }
    setProfileMsg('Your profile has been updated.');
    if (updateUser) updateUser(result.user); // refresh the sidebar name live
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwMsg(''); setPwErr('');
    if (pw.newPassword !== pw.confirmPassword) {
      setPwErr('New password and confirmation do not match.');
      return;
    }
    setSavingPw(true);
    const result = await api.post('/profile/password', {
      currentPassword: pw.currentPassword,
      newPassword: pw.newPassword,
    });
    setSavingPw(false);
    if (!result.ok) { setPwErr(result.error); return; }
    setPwMsg('Password changed successfully.');
    setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  if (loading) return <div className="page"><PageHeader title="Profile & Security" /><Loading label="Loading your profile…" /></div>;
  if (loadErr) return <div className="page"><PageHeader title="Profile & Security" /><ErrorState message={loadErr} onRetry={load} /></div>;

  return (
    <div className="page">
      <PageHeader title="Profile & Security" subtitle="Manage your account details and password." />

      <section className="card">
        <h2 className="card-title">Profile</h2>
        <Alert kind="success" onClose={() => setProfileMsg('')}>{profileMsg}</Alert>
        <Alert kind="error" onClose={() => setProfileErr('')}>{profileErr}</Alert>
        <form className="profile-form" onSubmit={saveProfile}>
          <div className="form-row">
            <TextField label="Full name" value={profile.name} onChange={(v) => setProfile((p) => ({ ...p, name: v }))} />
            <TextField label="Email address" type="email" value={profile.email} onChange={(v) => setProfile((p) => ({ ...p, email: v }))} />
          </div>
          <div className="profile-meta">
            <span>Role: <strong>{roleLabel(user?.role)}</strong></span>
            <span>Member since: <strong>{dateFmt(user?.createdAt)}</strong></span>
          </div>
          <button className="btn btn-primary" disabled={savingProfile}>
            {savingProfile ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2 className="card-title">Security — change password</h2>
        <p className="card-hint">
          For your security, enter your current password to set a new one. Passwords are stored
          hashed (bcrypt) — they can never be viewed, only replaced.
        </p>
        <Alert kind="success" onClose={() => setPwMsg('')}>{pwMsg}</Alert>
        <Alert kind="error" onClose={() => setPwErr('')}>{pwErr}</Alert>
        <form className="profile-form" onSubmit={savePassword}>
          <TextField label="Current password" type="password" value={pw.currentPassword}
            onChange={(v) => setPw((p) => ({ ...p, currentPassword: v }))} />
          <div className="form-row">
            <TextField label="New password (min 8 characters)" type="password" value={pw.newPassword}
              onChange={(v) => setPw((p) => ({ ...p, newPassword: v }))} />
            <TextField label="Confirm new password" type="password" value={pw.confirmPassword}
              onChange={(v) => setPw((p) => ({ ...p, confirmPassword: v }))} />
          </div>
          <button className="btn btn-primary" disabled={savingPw}>
            {savingPw ? 'Updating…' : 'Change password'}
          </button>
        </form>
      </section>
    </div>
  );
}
