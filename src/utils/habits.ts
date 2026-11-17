import { Habit } from '../types/bento';
import { toLocalISODate } from './finance';

export function isHabitScheduledOnDate(habit: Habit, date: Date): boolean {
  const iso = toLocalISODate(date);
  if (iso < habit.startDate) return false;
  if (habit.endDate && iso > habit.endDate) return false;

  const day = date.getDay(); // 0=Sun..6=Sat
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'weekdays') return day >= 1 && day <= 5;
  if (habit.frequency === 'weekends') return day === 0 || day === 6;
  return habit.scheduledDays.includes(day);
}

/**
 * Calculates current streak, best streak, and consistency percentage.
 * Rules honored:
 * - Planned rest days and explicit 'skipped' days NEVER break or punish a streak.
 * - Unscheduled days (e.g., weekends for a weekday habit) are skipped neutrally.
 */
export function computeHabitStats(habit: Habit, refDate = new Date(), lookbackDays = 30): {
  currentStreak: number;
  bestStreak: number;
  completionRatePct: number;
  weeklyCompletionPct: number;
  completedLast30: number;
  scheduledLast30: number;
} {
  const today = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const todayIso = toLocalISODate(today);

  // Compute current streak backwards from today (if today isn't logged yet, don't break yesterday's active streak!)
  let currentStreak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = toLocalISODate(d);
    if (iso < habit.startDate) break;

    const scheduled = isHabitScheduledOnDate(habit, d);
    const entry = habit.logs[iso];

    if (entry?.status === 'completed' || (entry && entry.count >= habit.targetCount)) {
      currentStreak++;
      continue;
    }

    if (entry?.status === 'rest' || entry?.status === 'skipped' || !scheduled) {
      // Rest days, skipped days, and unscheduled days preserve the streak without penalty
      continue;
    }

    // If today has not been logged yet, allow streak from yesterday to stay intact
    if (i === 0 && !entry) {
      continue;
    }

    break;
  }

  // Compute best streak across full history from startDate -> today
  let bestStreak = currentStreak;
  let running = 0;
  const start = new Date(`${habit.startDate}T12:00:00`);
  if (!Number.isNaN(start.getTime())) {
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    while (toLocalISODate(cursor) <= todayIso) {
      const iso = toLocalISODate(cursor);
      const entry = habit.logs[iso];
      const scheduled = isHabitScheduledOnDate(habit, cursor);
      if (entry?.status === 'completed' || (entry && entry.count >= habit.targetCount)) {
        running++;
        if (running > bestStreak) bestStreak = running;
      } else if (entry?.status === 'rest' || entry?.status === 'skipped' || !scheduled) {
        // preserve running
      } else {
        running = 0;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  // Lookback consistency (excluding rest & skipped days from denominator)
  const calcWindow = (days: number) => {
    let scheduled = 0;
    let completed = 0;
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = toLocalISODate(d);
      if (iso < habit.startDate) continue;
      if (!isHabitScheduledOnDate(habit, d)) continue;
      const entry = habit.logs[iso];
      if (entry?.status === 'rest' || entry?.status === 'skipped') continue;
      scheduled++;
      if (entry?.status === 'completed' || (entry && entry.count >= habit.targetCount)) {
        completed++;
      }
    }
    return { scheduled, completed, pct: scheduled > 0 ? Math.round((completed / scheduled) * 100) : 100 };
  };

  const monthWin = calcWindow(lookbackDays);
  const weekWin = calcWindow(7);

  return {
    currentStreak,
    bestStreak,
    completionRatePct: monthWin.pct,
    weeklyCompletionPct: weekWin.pct,
    completedLast30: monthWin.completed,
    scheduledLast30: monthWin.scheduled,
  };
}
