import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  X,
  RefreshCw,
} from 'lucide-react';

/**
 * Universal PKR currency formatter
 * Example: formatPKR(45000) => "Rs. 45,000"
 */
export function formatPKR(amount) {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return 'Rs. 0';
  return `Rs. ${Number(amount).toLocaleString('en-PK')}`;
}

/**
 * Universal date formatter
 */
export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return d.toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(dateString);
  }
}

/**
 * Standard Page Header for all dashboards & pages
 */
export function PageHeader({ title, subtitle, badge, action, children }) {
  return (
    <div className="ui-page-header">
      <div className="ui-page-header-main">
        <div className="ui-page-header-title-row">
          <h1 className="ui-page-title">{title}</h1>
          {badge && <span className="ui-page-badge">{badge}</span>}
        </div>
        {subtitle && <p className="ui-page-subtitle">{subtitle}</p>}
      </div>
      {(action || children) && (
        <div className="ui-page-header-actions">
          {action}
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Metric/Stat Card with Lucide icon and color accents
 */
export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = 'emerald',
  onClick,
}) {
  return (
    <div
      className={`ui-stat-card ui-stat-card-${color} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
    >
      <div className="ui-stat-card-header">
        <span className="ui-stat-label">{label}</span>
        {Icon && (
          <div className="ui-stat-icon-wrap">
            <Icon size={20} strokeWidth={2.2} />
          </div>
        )}
      </div>
      <div className="ui-stat-value">{value}</div>
      {sub && <div className="ui-stat-sub">{sub}</div>}
    </div>
  );
}

/**
 * Responsive Stat Grid
 */
export function StatGrid({ children, cols = 4 }) {
  return <div className={`ui-stat-grid ui-stat-grid-${cols}`}>{children}</div>;
}

/**
 * Universal Status Badge
 * variants: 'emerald' | 'amber' | 'rose' | 'sky' | 'muted'
 */
export function Badge({
  variant = 'muted',
  children,
  dot = true,
  icon: Icon,
  size = 'md',
  className = '',
}) {
  // Normalize common status strings to palette variant
  let finalVariant = variant;
  const lower = String(children || '').toLowerCase();
  if (variant === 'auto') {
    if (/active|approved|paid|verified|completed|available|occupied/.test(lower)) {
      finalVariant = 'emerald';
    } else if (/pending|in_progress|review|hold/.test(lower)) {
      finalVariant = 'amber';
    } else if (/rejected|cancelled|failed|overdue|danger|unpaid/.test(lower)) {
      finalVariant = 'rose';
    } else if (/tenant|owner|admin|info/.test(lower)) {
      finalVariant = 'sky';
    } else {
      finalVariant = 'muted';
    }
  }

  return (
    <span
      className={`ui-badge ui-badge-${finalVariant} ui-badge-${size} ${className}`.trim()}
    >
      {dot && <span className="ui-badge-dot" />}
      {Icon && <Icon size={12} className="ui-badge-icon" />}
      <span>{children}</span>
    </span>
  );
}

/**
 * Accessible Modal Component
 */
export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = '540px',
}) {
  if (!isOpen) return null;

  return (
    <div className="ui-modal-backdrop" onClick={onClose}>
      <div
        className="ui-modal-card"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="ui-modal-header">
          <div>
            <h3 className="ui-modal-title">{title}</h3>
            {subtitle && <p className="ui-modal-subtitle">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="ui-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>
        <div className="ui-modal-body">{children}</div>
        {footer && <div className="ui-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

/**
 * Standard Alert banner
 */
export function Alert({
  type = 'info',
  title,
  children,
  onClose,
  className = '',
}) {
  const iconMap = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    error: AlertCircle,
  };
  const Icon = iconMap[type] || Info;

  return (
    <div className={`ui-alert ui-alert-${type} ${className}`.trim()} role="alert">
      <div className="ui-alert-icon">
        <Icon size={18} />
      </div>
      <div className="ui-alert-content">
        {title && <h4 className="ui-alert-title">{title}</h4>}
        <div className="ui-alert-body">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          className="ui-alert-close"
          onClick={onClose}
          aria-label="Dismiss alert"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

/**
 * Empty State for empty tables or lists
 */
export function EmptyState({
  icon: Icon,
  title = 'No records found',
  message = 'There is currently no information to display here.',
  actionText,
  onAction,
}) {
  return (
    <div className="ui-empty-state">
      {Icon && (
        <div className="ui-empty-icon">
          <Icon size={36} strokeWidth={1.75} />
        </div>
      )}
      <h3 className="ui-empty-title">{title}</h3>
      <p className="ui-empty-message">{message}</p>
      {actionText && onAction && (
        <button type="button" className="btn btn-primary btn-sm" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  );
}

/**
 * Smooth animated Loading Spinner
 */
export function LoadingSpinner({ text = 'Loading data...' }) {
  return (
    <div className="ui-loading-box">
      <RefreshCw size={26} className="ui-spinner-icon" />
      <span>{text}</span>
    </div>
  );
}

/**
 * Error state card with retry
 */
export function ErrorState({ error, onRetry }) {
  const message =
    typeof error === 'string'
      ? error
      : error?.message || 'An unexpected error occurred.';

  return (
    <div className="ui-error-card">
      <AlertCircle size={32} className="ui-error-icon" />
      <div className="ui-error-text">
        <h4>Unable to load content</h4>
        <p>{message}</p>
      </div>
      {onRetry && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
          <RefreshCw size={14} /> Try Again
        </button>
      )}
    </div>
  );
}

/**
 * Standard Card Container
 */
export function UiCard({
  title,
  subtitle,
  action,
  children,
  className = '',
  noPadding = false,
}) {
  return (
    <div className={`ui-card ${className}`.trim()}>
      {(title || action) && (
        <div className="ui-card-header">
          <div>
            {title && <h3 className="ui-card-title">{title}</h3>}
            {subtitle && <p className="ui-card-subtitle">{subtitle}</p>}
          </div>
          {action && <div className="ui-card-action">{action}</div>}
        </div>
      )}
      <div className={`ui-card-body ${noPadding ? 'no-padding' : ''}`}>
        {children}
      </div>
    </div>
  );
}
