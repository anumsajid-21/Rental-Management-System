/** Formatting helpers shared across the tenant portal (PKR currency, dates). */

export function formatCurrency(amount) {
  const n = Number(amount) || 0;
  return `PKR ${n.toLocaleString('en-PK')}`;
}

function toDate(value) {
  if (!value) return null;
  // Date-only strings parse as UTC — normalize to a local calendar date.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "01 Sep 2026" */
export function formatDate(value) {
  const d = toDate(value);
  return d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

/** "05 September 2026" */
export function formatDateLong(value) {
  const d = toDate(value);
  return d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
}

/** "05 Sep 2026, 14:30" */
export function formatDateTime(value) {
  const d = toDate(value);
  if (!d) return '—';
  return `${formatDate(d)}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

/** "2026-09" → "September 2026" */
export function formatRentMonth(ym) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return '—';
  const [year, month] = ym.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Today's local date as YYYY-MM-DD (for date input defaults/min). */
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
