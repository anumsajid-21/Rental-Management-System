/**
 * Shared visual shell for authentication pages: soft cream background,
 * blurred pastel shapes and a tinted card. Keeps SignIn and SignUp
 * visually consistent.
 */
export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="auth-page">
      <div className="auth-decor" aria-hidden="true">
        <span className="blob blob-1" />
        <span className="blob blob-2" />
        <span className="blob blob-3" />
        <span className="ring" />
      </div>

      <div className="auth-container">
        <aside className="auth-brand">
          <div className="brand-logo" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z" />
            </svg>
          </div>
          <h1 className="brand-name" dir="rtl" lang="ur">رہائش</h1>
          <p>
            A calm, simple home for your rentals. Manage properties and find
            the right tenants — all in one welcoming place.
          </p>
          <ul className="brand-points">
            <li>Easy property &amp; tenant management</li>
            <li>Clear, organized rental records</li>
            <li>Secure accounts from day one</li>
          </ul>
        </aside>

        <main className="auth-card">
          <header className="auth-card-header">
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
