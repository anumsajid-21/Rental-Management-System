import { statusLabel } from '../lib/constants';

const TONES = {
  // green — positive/available
  paid: 'green',
  approved: 'green',
  active: 'green',
  available: 'green',
  resolved: 'green',
  // amber — waiting/warning
  pending: 'amber',
  occupied: 'amber',
  reserved: 'amber',
  // blue — in progress
  submitted: 'blue',
  in_progress: 'blue',
  // red — needs attention
  rejected: 'red',
  overdue: 'red',
  // gray — neutral/finished
  cancelled: 'gray',
  ended: 'gray',
  unavailable: 'gray',
};

/** Colored status pill used across the tenant portal. */
export default function StatusBadge({ status }) {
  const tone = TONES[status] || 'gray';
  return <span className={`badge badge-${tone}`}>{statusLabel(status)}</span>;
}
