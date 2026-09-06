/**
 * Lightweight SVG chart components for the owner Reports page.
 * Hand-rolled (no chart library) so they inherit the app theme exactly
 * and keep the client bundle dependency-free.
 */

const PALETTE = {
  success: '#5f8d76',
  info: '#3f6a7d',
  warning: '#c4943a',
  danger: '#b0563f',
  muted: '#9aa5a0',
  accent: '#5f8d76',
};

const STATUS_COLORS = {
  available: PALETTE.success,
  occupied: PALETTE.info,
  maintenance: PALETTE.warning,
  inactive: PALETTE.muted,
  submitted: PALETTE.warning,
  in_progress: PALETTE.info,
  resolved: PALETTE.success,
  low: PALETTE.success,
  medium: PALETTE.warning,
  high: PALETTE.danger,
};

export const chartColor = (key) => STATUS_COLORS[key] || PALETTE.muted;

/** Grouped area+line chart for two series (collected vs outstanding). */
export function TrendChart({ data, format = (n) => n }) {
  const W = 640, H = 240, P = { top: 16, right: 12, bottom: 28, left: 56 };
  const iw = W - P.left - P.right;
  const ih = H - P.top - P.bottom;
  if (!data || data.length === 0) {
    return <p className="chart-empty">No data to chart yet.</p>;
  }
  const max = Math.max(...data.map((d) => Math.max(d.collected, d.outstanding)), 1);
  const x = (i) => P.left + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v) => P.top + ih - (v / max) * ih;
  const line = (key) => data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d[key])}`).join(' ');
  const area = (key) => `${line(key)} L${x(data.length - 1)},${P.top + ih} L${x(0)},${P.top + ih} Z`;
  const ticks = [0, 0.5, 1].map((t) => Math.round(max * t));

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Revenue trend">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={P.left} x2={W - P.right} y1={y(t)} y2={y(t)} className="chart-grid" />
          <text x={P.left - 8} y={y(t) + 4} className="chart-tick" textAnchor="end">{format(t)}</text>
        </g>
      ))}
      <path d={area('outstanding')} fill="rgba(196, 148, 58, 0.12)" />
      <path d={area('collected')} fill="rgba(95, 141, 118, 0.15)" />
      <path d={line('outstanding')} fill="none" stroke={PALETTE.warning} strokeWidth="2.5" strokeLinecap="round" />
      <path d={line('collected')} fill="none" stroke={PALETTE.accent} strokeWidth="2.5" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={d.month}>
          <circle cx={x(i)} cy={y(d.collected)} r="4" fill={PALETTE.accent} />
          <circle cx={x(i)} cy={y(d.outstanding)} r="3.5" fill={PALETTE.warning} />
          <text x={x(i)} y={H - 8} className="chart-tick" textAnchor="middle">{d.month.slice(5)}/{d.month.slice(2, 4)}</text>
        </g>
      ))}
    </svg>
  );
}

/** Donut chart with legend. rows: [{ label, value, key }] */
export function DonutChart({ rows, format = (n) => n }) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  if (total === 0) return <p className="chart-empty">No data to chart yet.</p>;
  const R = 52, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 140 140" className="donut" role="img" aria-label="Distribution chart">
        {rows.map((r) => {
          const frac = r.value / total;
          const dash = frac * C;
          const el = (
            <circle
              key={r.key || r.label}
              cx="70" cy="70" r={R}
              fill="none"
              stroke={r.color || chartColor(r.key || r.label)}
              strokeWidth="18"
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
            />
          );
          offset += dash;
          return el;
        })}
        <text x="70" y="66" textAnchor="middle" className="donut-total">{format(total)}</text>
        <text x="70" y="82" textAnchor="middle" className="donut-sub">total</text>
      </svg>
      <ul className="chart-legend">
        {rows.map((r) => (
          <li key={r.key || r.label}>
            <span className="legend-dot" style={{ background: r.color || chartColor(r.key || r.label) }} />
            <span className="legend-label">{r.label}</span>
            <strong>{r.value}</strong>
            <small>{Math.round((r.value / total) * 100)}%</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal bar chart. rows: [{ label, value, key }] */
export function BarChart({ rows, format = (n) => n }) {
  if (!rows.length || rows.every((r) => r.value === 0)) {
    return <p className="chart-empty">No data to chart yet.</p>;
  }
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="vbars">
      {rows.map((r) => (
        <div key={r.key || r.label} className="vbar-row">
          <span className="vbar-label">{r.label}</span>
          <div className="vbar-track">
            <div
              className="vbar-fill"
              style={{ width: `${(r.value / max) * 100}%`, background: r.color || chartColor(r.key || r.label) }}
            />
          </div>
          <span className="vbar-value">{format(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** Small legend chips used under the trend chart. */
export function ChartLegend({ items }) {
  return (
    <div className="chart-legend-inline">
      {items.map((it) => (
        <span key={it.label} className="legend-item">
          <span className="legend-dot" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
