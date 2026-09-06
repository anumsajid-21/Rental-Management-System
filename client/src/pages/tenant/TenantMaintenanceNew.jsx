import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { MAINTENANCE_CATEGORIES, MAINTENANCE_PRIORITIES } from '../../lib/constants';
import TextField from '../../components/TextField';
import SelectField from '../../components/SelectField';
import TextAreaField from '../../components/TextAreaField';
import EmptyState from '../../components/EmptyState';
import LoadingBlock from '../../components/LoadingBlock';
import ErrorState from '../../components/ErrorState';

const EMAIL_RE = null; // (not used here — kept for symmetry with other forms)

/** Form to report a maintenance issue for the tenant's active rental. */
export default function TenantMaintenanceNew() {
  const navigate = useNavigate();
  const [rentalState, setRentalState] = useState({ loading: true, error: '', hasActiveRental: false });
  const [form, setForm] = useState({ category: '', priority: 'medium', title: '', description: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadRental = useCallback(async () => {
    setRentalState({ loading: true, error: '', hasActiveRental: false });
    const res = await apiFetch('/rentals/active');
    if (!res.ok) {
      setRentalState({ loading: false, error: res.error, hasActiveRental: false });
      return;
    }
    setRentalState({ loading: false, error: '', hasActiveRental: Boolean(res.data.rental) });
  }, []);

  useEffect(() => {
    loadRental();
  }, [loadRental]);

  const setField = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
    setServerError('');
  };

  const validate = () => {
    const errs = {};
    if (!form.category) errs.category = 'Please select a category.';
    if (form.title.trim().length < 5 || form.title.trim().length > 120) {
      errs.title = 'Title must be between 5 and 120 characters.';
    }
    if (form.description.trim().length < 10) {
      errs.description = 'Please describe the issue (at least 10 characters).';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    const res = await apiFetch('/maintenance', { method: 'POST', body: form });
    setSubmitting(false);
    if (!res.ok) {
      setServerError(res.error);
      if (res.field) setErrors((prev) => ({ ...prev, [res.field]: res.error }));
      if (res.status === 409) loadRental();
      return;
    }
    navigate(`/tenant/maintenance/${res.data.request.id}`, {
      state: { flash: 'Maintenance request submitted successfully.' },
    });
  };

  if (rentalState.loading) return <LoadingBlock />;
  if (rentalState.error) return <ErrorState message={rentalState.error} onRetry={loadRental} />;

  if (!rentalState.hasActiveRental) {
    return (
      <div>
        <Link to="/tenant/maintenance" className="back-link">
          ← Back to Maintenance
        </Link>
        <EmptyState
          icon="wrench"
          title="You need an active rental to report maintenance issues."
          message="Once your rental request is approved by a property owner, you can report problems here."
          action={
            <Link to="/tenant/properties" className="btn btn-primary">
              Browse Properties
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <Link to="/tenant/maintenance" className="back-link">
        ← Back to Maintenance
      </Link>

      <div className="tenant-page-head">
        <h1>New Maintenance Request</h1>
        <p>
          The request will be linked to your active rental. The property owner will update the
          status as they work on it.
        </p>
      </div>

      <form className="tenant-card form-card" onSubmit={handleSubmit} noValidate>
        {serverError && (
          <div className="alert alert-error" role="alert">
            {serverError}
          </div>
        )}

        <div className="form-row">
          <SelectField
            label="Category"
            name="category"
            value={form.category}
            onChange={setField('category')}
            options={MAINTENANCE_CATEGORIES}
            placeholder="Select a category"
            error={errors.category}
          />
          <SelectField
            label="Priority"
            name="priority"
            value={form.priority}
            onChange={setField('priority')}
            options={MAINTENANCE_PRIORITIES}
            error={errors.priority}
          />
        </div>

        <TextField
          label="Title"
          name="title"
          placeholder="Short summary, e.g. Kitchen tap is leaking"
          value={form.title}
          onChange={setField('title')}
          error={errors.title}
          maxLength={120}
        />

        <TextAreaField
          label="Description"
          name="description"
          placeholder="Describe the problem, where it is and when it started…"
          value={form.description}
          onChange={setField('description')}
          error={errors.description}
          maxLength={2000}
        />

        <div className="form-actions">
          <Link to="/tenant/maintenance" className="btn btn-ghost">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
