/** Centered loading indicator with optional label. */
export default function LoadingBlock({ label = 'Loading…' }) {
  return (
    <div className="loading-block" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  );
}
