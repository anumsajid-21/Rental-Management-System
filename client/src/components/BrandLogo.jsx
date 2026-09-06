import { useId } from 'react';

/**
 * Shared Rehainsh (رہائش) brand mark + optional wordmark.
 * Used on auth screens and all portal sidebars for consistent identity.
 */
export function LogoMark({ size = 28, className = '', title }) {
  const uid = useId().replace(/:/g, '');
  const bgId = `rl-bg-${uid}`;
  const roofId = `rl-roof-${uid}`;
  const titleId = title ? `rl-title-${uid}` : undefined;

  return (
    <svg
      className={`logo-mark ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-labelledby={titleId}
    >
      {title ? <title id={titleId}>{title}</title> : null}
      <defs>
        <linearGradient id={bgId} x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6fa589" />
          <stop offset="100%" stopColor="#4c745f" />
        </linearGradient>
        <linearGradient id={roofId} x1="16" y1="14" x2="48" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eaf3ee" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${bgId})`} />
      <path
        d="M16 8c10-6 28-4 36 8 2 3-1 5-4 4-8-3-18-5-28-1-4 2-7-1-4-11z"
        fill="#ffffff"
        opacity="0.12"
      />
      <path
        d="M18 30.5 32 18l14 12.5V48a3 3 0 0 1-3 3H21a3 3 0 0 1-3-3V30.5z"
        fill={`url(#${roofId})`}
      />
      <path
        d="M16.5 31.2 32 17.2l15.5 14"
        fill="none"
        stroke="#3d6350"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.35"
      />
      <path d="M27 51V39.5c0-2.8 2.2-5 5-5s5 2.2 5 5V51" fill="#4c745f" />
      <path d="M29.2 51V39.8c0-1.6 1.2-2.9 2.8-2.9s2.8 1.3 2.8 2.9V51" fill="#d8e8de" />
      <rect x="22" y="34" width="5.5" height="5.5" rx="1.2" fill="#4c745f" opacity="0.85" />
      <rect x="36.5" y="34" width="5.5" height="5.5" rx="1.2" fill="#4c745f" opacity="0.85" />
    </svg>
  );
}

/**
 * @param {'sm'|'md'|'lg'} size
 * @param {boolean} showWordmark — Urdu brand name next to the mark
 * @param {boolean} stacked — wordmark below the mark (auth hero)
 * @param {string} subtitle — optional portal label beside the brand
 * @param {'owner'|'tenant'|'admin'} portal — tint for the portal label
 * @param {'h1'|'div'} as — semantic wrapper for the wordmark
 */
function formatPortalSubtitle(subtitle) {
  if (!subtitle) return null;
  const trimmed = String(subtitle).trim();
  if (/^\(.*\)$/.test(trimmed)) return trimmed;
  return `(${trimmed})`;
}

export default function BrandLogo({
  size = 'md',
  showWordmark = true,
  stacked = false,
  subtitle,
  portal,
  as = 'div',
  className = '',
}) {
  const markSizes = { sm: 32, md: 36, lg: 52 };
  const markSize = markSizes[size] || markSizes.md;
  const WordTag = as === 'h1' ? 'h1' : 'span';
  const portalLabel = formatPortalSubtitle(subtitle);
  const portalClass = portal ? ` brand-lockup-${portal}` : '';

  return (
    <div
      className={`brand-lockup brand-lockup-${size}${stacked ? ' brand-lockup-stacked' : ' brand-lockup-inline'}${portalClass} ${className}`.trim()}
    >
      <span className="brand-lockup-mark" aria-hidden={!showWordmark}>
        <LogoMark size={markSize} title={showWordmark ? undefined : 'رہائش'} />
      </span>
      {showWordmark && (
        <div className="brand-lockup-text">
          <WordTag className="brand-lockup-name" dir="rtl" lang="ur">
            رہائش
          </WordTag>
          {portalLabel ? <span className="brand-lockup-sub">{portalLabel}</span> : null}
        </div>
      )}
    </div>
  );
}
