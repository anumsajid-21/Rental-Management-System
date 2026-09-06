import { useId } from 'react';

/** Textarea styled consistently with TextField. */
export default function TextAreaField({
  label,
  value,
  onChange,
  error,
  placeholder,
  name,
  rows = 5,
  maxLength,
}) {
  const id = useId();

  return (
    <div className={`field ${error ? 'field-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
      />
      {error && <p className="field-message">{error}</p>}
    </div>
  );
}
