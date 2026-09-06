import { rentalModel } from '../models/rentalModel.js';
import { transactionModel } from '../models/transactionModel.js';
import { maintenanceModel } from '../models/maintenanceModel.js';

/** Due date for a rent month ('YYYY-MM'), clamped to the month's length. */
function dueDateForMonth(rentMonth, dayOfMonth) {
  const [year, month] = rentMonth.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(Number(dayOfMonth) || 1, lastDay);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Everything the tenant dashboard needs in one tenant-scoped payload:
 * active rental, next payment, totals and recent activity.
 */
export function summary(req, res) {
  const tenantId = req.user.id;
  const activeRental = rentalModel.findActiveByTenant(tenantId);
  const recentTransactions = transactionModel.listRecentByTenant(tenantId, 5);
  const recentMaintenance = maintenanceModel.listRecentByTenant(tenantId, 5);

  let nextPayment = null;
  if (activeRental) {
    const startDay = activeRental.startDate.slice(8, 10);
    const unpaid = transactionModel.listUnpaidByTenant(tenantId);
    if (unpaid.length > 0) {
      const earliest = unpaid[0];
      nextPayment = {
        status: earliest.status,
        rentMonth: earliest.rentMonth,
        dueDate: dueDateForMonth(earliest.rentMonth, startDay),
      };
    } else {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      nextPayment = {
        status: 'paid',
        rentMonth: currentMonth,
        dueDate: dueDateForMonth(currentMonth, startDay),
      };
    }
  }

  res.json({
    tenant: { id: req.user.id, name: req.user.name, email: req.user.email },
    activeRental,
    nextPayment,
    totalPaid: transactionModel.sumPaidByTenant(tenantId),
    openMaintenance: maintenanceModel.countOpenByTenant(tenantId),
    recentTransactions,
    recentMaintenance,
  });
}
