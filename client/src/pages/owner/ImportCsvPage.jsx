import { useEffect, useState } from 'react';
import { useOwnerApi } from '../../lib/ownerApi';
import { PageHeader, Alert, Loading, EmptyState } from '../../components/ownerUi';

const SAMPLE = `Property Name,Address,City,Property Type,Description,Bedrooms,Bathrooms,Monthly Rent,Status
Green View Apartment,12-B Gulberg III,Lahore,apartment,Spacious 2-bed near MM Alam Road,2,2,45000,available
Sunny Villa,Block D DHA Phase 6,Karachi,house,Family house with garden,4,3,120000,available`;

/** Draft persistence — keep the uploaded CSV + validated preview across page reloads. */
const DRAFT_KEY = 'rms_import_draft';
function loadDraft() {
  try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY)) || null; }
  catch { return null; }
}
function saveDraft(draft) {
  if (draft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  else sessionStorage.removeItem(DRAFT_KEY);
}

export default function ImportCsvPage() {
  const api = useOwnerApi();
  const draft = loadDraft();
  const [csv, setCsv] = useState(draft?.csv || '');
  const [preview, setPreview] = useState(draft?.preview || null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(draft?.notice || '');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Keep the draft in sync so a reload restores the uploaded file + preview.
  useEffect(() => {
    saveDraft(csv.trim() || preview ? { csv, preview, notice } : null);
  }, [csv, preview, notice]); // eslint-disable-line react-hooks/exhaustive-deps


  const readFile = (file) => {
    setError(''); setNotice(''); setPreview(null);
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result || ''));
    reader.onerror = () => setError('Could not read the selected file.');
    reader.readAsText(file);
  };

  const runPreview = async () => {
    setError(''); setNotice(''); setPreview(null);
    if (!csv.trim()) { setError('Choose a CSV file or paste CSV content first.'); return; }
    setBusy(true);
    const result = await api.post('/import/preview', { csv });
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    setPreview(result.preview);
  };

  const runConfirm = async () => {
    if (!preview) return;
    setBusy(true);
    const result = await api.post('/import/confirm', { rows: preview.valid.map((v) => v.data) });
    setBusy(false);
    setConfirming(false);
    if (!result.ok) { setError(result.error); return; }
    setNotice(result.message);
    setPreview(null);
    setCsv('');
  };

  return (
    <div className="page">
      <PageHeader title="Import Properties (CSV)" subtitle="Bulk-upload properties. They will appear in your Properties list after a successful import." />

      <Alert kind="error" onClose={() => setError('')}>{error}</Alert>
      <Alert kind="info" onClose={() => setNotice('')}>{notice}</Alert>

      <div className="card">
        <h2 className="card-title">1. Upload CSV</h2>
        <p className="card-hint">
          Required columns: <code>Property Name, Address, Monthly Rent</code>. Optional: <code>City, Property Type,
          Description, Bedrooms, Bathrooms, Status</code>. Nothing is imported until you review the preview and confirm.
        </p>
        <div className="import-controls">
          <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
          <button className="btn btn-ghost" onClick={() => { setCsv(SAMPLE); setPreview(null); }}>Load sample CSV</button>
        </div>
        <textarea
          className="csv-textarea"
          rows={6}
          placeholder='Property Name,Address,City,…'
          value={csv}
          onChange={(e) => { setCsv(e.target.value); setPreview(null); }}
        />
        <button className="btn btn-primary" onClick={runPreview} disabled={busy}>
          {busy ? 'Validating…' : 'Validate & preview'}
        </button>
      </div>

      {busy && !preview && <Loading label="Validating rows…" />}

      {preview && (
        <div className="card">
          <h2 className="card-title">2. Preview</h2>
          <div className="stat-grid">
            <div className="stat-card"><span className="stat-label">Total rows</span><strong className="stat-value">{preview.totalRows}</strong></div>
            <div className="stat-card stat-success"><span className="stat-label">Valid rows</span><strong className="stat-value">{preview.validRows}</strong></div>
            <div className="stat-card stat-danger"><span className="stat-label">Error rows</span><strong className="stat-value">{preview.errorRows}</strong></div>
          </div>

          {preview.valid.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>#</th><th>Name</th><th>Address</th><th>City</th><th>Type</th><th>Beds</th><th>Baths</th><th>Rent</th><th>Status</th></tr></thead>
                <tbody>
                  {preview.valid.map((v) => (
                    <tr key={v.rowNum}>
                      <td>{v.rowNum}</td><td>{v.data.name}</td><td>{v.data.address}</td><td>{v.data.city || '—'}</td>
                      <td>{v.data.propertyType}</td><td>{v.data.bedrooms}</td><td>{v.data.bathrooms}</td>
                      <td>{v.data.monthlyRent}</td><td>{v.data.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview.invalid.length > 0 && (
            <div className="import-errors">
              <h3>Rows that will be skipped</h3>
              {preview.invalid.map((v) => (
                <div key={v.rowNum} className="import-error-row">
                  <strong>Row {v.rowNum}</strong>
                  <ul>{v.errors.map((e2) => <li key={e2}>{e2}</li>)}</ul>
                </div>
              ))}
            </div>
          )}

          {preview.validRows > 0 ? (
            <>
              <button className="btn btn-primary" onClick={() => setConfirming(true)} disabled={busy}>
                Import {preview.validRows} row(s)
              </button>
              <p className="card-hint">Only valid rows are imported. Invalid rows are never written to the database.</p>
            </>
          ) : (
            <EmptyState title="Nothing to import" hint="All rows contain errors — fix them in the CSV and validate again." />
          )}
        </div>
      )}

      {confirming && (
        <div className="modal-backdrop">
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal-header"><h3>Confirm import</h3><button className="modal-close" onClick={() => setConfirming(false)}>×</button></div>
            <div className="modal-body">
              <p>Import <strong>{preview.validRows}</strong> propert{preview.validRows === 1 ? 'y' : 'ies'} into your account? Invalid rows ({preview.errorRows}) will be skipped.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setConfirming(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={runConfirm} disabled={busy}>{busy ? 'Importing…' : 'Yes, import'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
