import { BentoDatabaseSnapshot, BentoNotification } from '../types/bento';
import { formatMoney, toLocalISODate } from '../utils/finance';

export function deriveActiveReminders(db: BentoDatabaseSnapshot, refDate = new Date()): BentoNotification[] {
  const today = toLocalISODate(refDate);
  const fiveDays = new Date(refDate);
  fiveDays.setDate(fiveDays.getDate() + 5);
  const aheadIso = toLocalISODate(fiveDays);
  const out: BentoNotification[] = [];

  for (const task of db.tasks) {
    if (task.deletedAt || task.status === 'completed' || task.status === 'cancelled') continue;
    if (task.dueDate && task.dueDate <= today) {
      out.push({
        id: `notif-task-${task.id}`,
        title: task.dueDate < today ? `Overdue task: ${task.title}` : `Task due today: ${task.title}`,
        body: task.dueTime ? `Scheduled at ${task.dueTime}` : `Priority: ${task.priority}`,
        category: 'task',
        dueDate: task.dueDate,
        read: false,
        dismissed: false,
        route: 'daily',
        createdAt: task.createdAt,
      });
    }
  }

  for (const bill of db.bills) {
    if (!bill.active) continue;
    if (bill.nextDueDate <= aheadIso) {
      out.push({
        id: `notif-bill-${bill.id}`,
        title: `${bill.kind === 'subscription' ? 'Subscription renewal' : 'Bill due'}: ${bill.name}`,
        body: `${formatMoney(bill.amountMinor, db.settings.currency)} due on ${bill.nextDueDate}`,
        category: 'bill',
        dueDate: bill.nextDueDate,
        read: false,
        dismissed: false,
        route: 'money',
        createdAt: bill.createdAt,
      });
    }
  }

  for (const debt of db.debts) {
    if (debt.remainingMinor > 0 && debt.dueDate && debt.dueDate <= aheadIso) {
      out.push({
        id: `notif-debt-${debt.id}`,
        title: `Debt / EMI reminder: ${debt.title}`,
        body: `Remaining: ${formatMoney(debt.remainingMinor, db.settings.currency)} · Due ${debt.dueDate}`,
        category: 'debt',
        dueDate: debt.dueDate,
        read: false,
        dismissed: false,
        route: 'money',
        createdAt: debt.createdAt,
      });
    }
  }

  for (const goal of db.goals) {
    if (goal.status === 'active' && goal.deadline && goal.deadline <= aheadIso) {
      out.push({
        id: `notif-goal-${goal.id}`,
        title: `Goal deadline approaching: ${goal.title}`,
        body: `Target date: ${goal.deadline}`,
        category: 'goal',
        dueDate: goal.deadline,
        read: false,
        dismissed: false,
        route: 'goals',
        createdAt: goal.createdAt,
      });
    }
  }

  return out;
}

export function isWithinQuietHours(settings: BentoDatabaseSnapshot['settings'], now = new Date()): boolean {
  if (!settings.quietHoursEnabled) return false;
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const start = settings.quietHoursStart;
  const end = settings.quietHoursEnd;
  if (start <= end) {
    return hhmm >= start && hhmm <= end;
  }
  return hhmm >= start || hhmm <= end;
}
