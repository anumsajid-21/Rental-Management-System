import BrandLogo from './BrandLogo';

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
          <BrandLogo size="lg" stacked as="h1" />
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
