/** Option lists + label helpers for the tenant portal forms and filters. */

export const MAINTENANCE_CATEGORIES = [
  'Plumbing',
  'Electrical',
  'Air Conditioning',
  'Appliance',
  'Structural',
  'Cleaning',
  'Security',
  'Other',
];

export const MAINTENANCE_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export const TRANSACTION_STATUS_OPTIONS = [
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
];

export const AVAILABILITY_OPTIONS = [
  { value: '', label: 'All properties' },
  { value: 'available', label: 'Available only' },
];

/** 'in_progress' → 'In Progress' */
export function statusLabel(status) {
  if (!status) return '';
  return String(status)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
