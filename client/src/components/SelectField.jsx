import { useId } from 'react';

/** Select input styled consistently with TextField. */
export default function SelectField({
  label,
  value,
  onChange,
  options = [],
  error,
  name,
  placeholder,
  disabled,
}) {
  const id = useId();

  return (
    <div className={`field ${error ? 'field-error' : ''}`}>
      {label && <label htmlFor={id}>{label}</label>}
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-invalid={Boolean(error)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => {
          const optValue = typeof opt === 'string' ? opt : opt.value;
          const optLabel = typeof opt === 'string' ? opt : opt.label;
          return (
            <option key={optValue} value={optValue}>
              {optLabel}
            </option>
          );
        })}
      </select>
      {error && <p className="field-message">{error}</p>}
    </div>
  );
}
