/**
 * Shared UI building blocks for the owner area. Styling comes from
 * styles/owner.css and reuses the existing theme variables (base.css).
 */
import { useEffect } from 'react';

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, tone = 'default', hint }) {
  return (
    <div className={`stat-card stat-${tone}`}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {hint && <small className="stat-hint">{hint}</small>}
    </div>
  );
}

const BADGE_TONES = {
  paid: 'success', completed: 'success', resolved: 'success', active: 'success', available: 'success',
  pending: 'warning', submitted: 'warning', in_progress: 'info', maintenance: 'info',
  overdue: 'danger', failed: 'danger', inactive: 'muted', ended: 'muted',
};

export function Badge({ value }) {
  const label = String(value || '').replace(/_/g, ' ');
  const tone = BADGE_TONES[value] || 'muted';
  return <span className={`badge badge-${tone}`}>{label}</span>;
}

export function Alert({ kind = 'error', children, onClose }) {
  if (!children) return null;
  return (
    <div className={`alert alert-${kind} alert-dismissible`} role="alert">
      <span>{children}</span>
      {onClose && <button className="alert-close" onClick={onClose} aria-label="Dismiss">×</button>}
    </div>
  );
}

export function Loading({ label = 'Loading…' }) {
  return <div className="state-block state-loading"><span className="spinner" /> {label}</div>;
}

export function EmptyState({ title, hint, children }) {
  return (
    <div className="state-block">
      <div className="state-icon">📄</div>
      <h3>{title}</h3>
      {hint && <p>{hint}</p>}
      {children}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state-block state-error">
      <div className="state-icon">⚠️</div>
      <h3>Something went wrong</h3>
      <p>{message}</p>
      {onRetry && <button className="btn btn-ghost" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Modal({ open, title, onClose, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export const money = (n) =>
  Number(n || 0).toLocaleString(undefined, { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 });

export const dateFmt = (d) => (d ? new Date(d).toLocaleDateString() : '—');
