import { PUBLIC_SIGNUP_ROLES } from '../lib/roles';

/** Styled selectable role cards (single-select). */
export default function RoleSelect({ value, onChange, error }) {
  return (
    <div className={`field ${error ? 'field-error' : ''}`}>
      <span className="field-label-text">I am a…</span>
      <div className="role-grid" role="radiogroup" aria-label="Select your role">
        {PUBLIC_SIGNUP_ROLES.map((role) => (
          <button
            key={role.value}
            type="button"
            role="radio"
            aria-checked={value === role.value}
            className={`role-card ${value === role.value ? 'selected' : ''}`}
            onClick={() => onChange(role.value)}
          >
            <span className="role-icon" aria-hidden="true">
              {role.value === 'tenant' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 10.5 12 3l9 7.5" />
                  <path d="M5 9.5V21h14V9.5" />
                  <path d="M10 21v-6h4v6" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18" />
                  <path d="M5 21V7l7-4 7 4v14" />
                  <path d="M9 10h.01M15 10h.01M9 14h.01M15 14h.01" />
                </svg>
              )}
            </span>
            <span className="role-text">
              <strong>{role.label}</strong>
              <small>{role.description}</small>
            </span>
            <span className="role-check" aria-hidden="true">✓</span>
          </button>
        ))}
      </div>
      {error && <p className="field-message">{error}</p>}
    </div>
  );
}
