import { useState, useId } from 'react';

/** Text input with label, error message and optional visibility toggle. */
export default function TextField({
  label,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  autoComplete,
  name,
}) {
  const id = useId();
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className={`field ${error ? 'field-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="field-input-wrap">
        <input
          id={id}
          name={name}
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
        />
        {isPassword && (
          <button
            type="button"
            className="toggle-password"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
            title={show ? 'Hide password' : 'Show password'}
          >
            {show ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M6.61 6.61A13.5 13.5 0 0 0 2 12s3 8 10 8a9.74 9.74 0 0 0 5.39-1.61" />
                <line x1="2" y1="2" x2="22" y2="22" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
      {error && <p className="field-message">{error}</p>}
    </div>
  );
}
