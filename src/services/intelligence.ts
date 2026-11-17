import { BentoDatabaseSnapshot, NavSection } from '../types/bento';
import {
  calculateFinancialSummary,
  computeAllAccountBalances,
  evaluateBudgets,
  filterTransactionsByDateRange,
  formatMoney,
  getCategoryExpenseBreakdown,
  getMonthBounds,
  getWeekBounds,
  toLocalISODate,
} from '../utils/finance';
import { computeHabitStats } from '../utils/habits';

export interface BentoInsight {
  id: string;
  title: string;
  detail: string;
  trace: string;
  tone: 'positive' | 'warning' | 'neutral';
  route: NavSection;
}

export interface PeriodReviewSummary {
  periodLabel: string;
  startDate: string;
  endDate: string;
  tasksCompleted: number;
  tasksCreated: number;
  habitConsistencyPct: number;
  incomeMinor: number;
  expenseMinor: number;
  savingsMinor: number;
  learningMinutes: number;
  activeGoalsCount: number;
  completedGoalsCount: number;
  highlights: string[];
  attentionAreas: string[];
}

export interface BentoScoreDimension {
  key: 'financial' | 'productivity' | 'habits' | 'goals' | 'career' | 'wellbeing';
  label: string;
  tracked: boolean;
  score: number | null;
  weight: number;
  effectiveWeightPct: number;
  rationale: string;
}

export interface BentoScoreResult {
  enabled: boolean;
  hasData: boolean;
  overallScore: number | null;
  dimensions: BentoScoreDimension[];
  methodologyNote: string;
}

export function generateExplainableInsights(db: BentoDatabaseSnapshot, refDate = new Date()): BentoInsight[] {
  const insights: BentoInsight[] = [];
  const currency = db.settings.currency;
  const today = toLocalISODate(refDate);

  const curMonth = getMonthBounds(refDate.getFullYear(), refDate.getMonth());
  const prevMonthDate = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1);
  const prevMonth = getMonthBounds(prevMonthDate.getFullYear(), prevMonthDate.getMonth());

  const curMonthTxs = filterTransactionsByDateRange(db.transactions, curMonth.start, curMonth.end);
  const prevMonthTxs = filterTransactionsByDateRange(db.transactions, prevMonth.start, prevMonth.end);

  const curSummary = calculateFinancialSummary(curMonthTxs);
  const prevSummary = calculateFinancialSummary(prevMonthTxs);

  // 1. Category spending comparison (only when both months have transactions)
  const curCats = getCategoryExpenseBreakdown(curMonthTxs);
  const prevCats = getCategoryExpenseBreakdown(prevMonthTxs);
  if (curCats.length > 0 && prevCats.length > 0) {
    for (const c of curCats.slice(0, 3)) {
      const prev = prevCats.find((p) => p.category === c.category);
      if (prev && prev.amountMinor > 0) {
        const diffPct = Math.round(((c.amountMinor - prev.amountMinor) / prev.amountMinor) * 100);
        if (Math.abs(diffPct) >= 10) {
          insights.push({
            id: `cat-delta-${c.category}`,
            title:
              diffPct > 0
                ? `${c.category} spending is ${diffPct}% higher than last month`
                : `${c.category} spending is ${Math.abs(diffPct)}% lower than last month`,
            detail: `${formatMoney(c.amountMinor, currency)} across ${c.count} expense${c.count === 1 ? '' : 's'} this month vs ${formatMoney(prev.amountMinor, currency)} last month.`,
            trace: `Computed from ${c.count} transactions in "${c.category}" (${curMonth.start} to ${curMonth.end}).`,
            tone: diffPct > 0 ? 'warning' : 'positive',
            route: 'money',
          });
          break;
        }
      }
    }
  }

  // 2. Savings delta
  if (curSummary.incomeMinor > 0 || prevSummary.incomeMinor > 0) {
    const savingsDiff = curSummary.savingsMinor - prevSummary.savingsMinor;
    if (prevSummary.incomeMinor > 0 && savingsDiff !== 0) {
      insights.push({
        id: 'savings-delta',
        title:
          savingsDiff > 0
            ? `Net monthly savings increased by ${formatMoney(savingsDiff, currency)}`
            : `Net monthly savings decreased by ${formatMoney(Math.abs(savingsDiff), currency)}`,
        detail: `This month: ${formatMoney(curSummary.savingsMinor, currency)} (${curSummary.savingsRatePct}% rate) vs ${formatMoney(prevSummary.savingsMinor, currency)} last month.`,
        trace: 'Income minus net expenses (transfers excluded per accounting rules).',
        tone: savingsDiff > 0 ? 'positive' : 'warning',
        route: 'money',
      });
    }
  }

  // 3. Budget alerts
  const budgetStatuses = evaluateBudgets(db.budgets, db.transactions, refDate, db.settings.startOfWeek);
  const flaggedBudget = budgetStatuses.find((b) => b.status === 'exceeded' || b.status === 'warning');
  if (flaggedBudget) {
    insights.push({
      id: `budget-${flaggedBudget.budget.id}`,
      title:
        flaggedBudget.status === 'exceeded'
          ? `${flaggedBudget.budget.name} budget exceeded (${flaggedBudget.utilizationPct}%)`
          : `${flaggedBudget.budget.name} budget at ${flaggedBudget.utilizationPct}%`,
      detail: `Spent ${formatMoney(flaggedBudget.spentMinor, currency)} of ${formatMoney(flaggedBudget.budget.limitMinor, currency)}.`,
      trace: `Budget period: ${flaggedBudget.budget.period}.`,
      tone: 'warning',
      route: 'money',
    });
  }

  // 4. Habit consistency this week
  const enabledHabits = db.habits.filter((h) => h.enabled);
  if (enabledHabits.length > 0) {
    const avgWeekly = Math.round(
      enabledHabits.reduce((sum, h) => sum + computeHabitStats(h, refDate).weeklyCompletionPct, 0) /
        enabledHabits.length
    );
    insights.push({
      id: 'habit-weekly',
      title: `You completed ${avgWeekly}% of scheduled habits this week`,
      detail: `Across ${enabledHabits.length} active habit${enabledHabits.length === 1 ? '' : 's'} (planned rest and skipped days excluded).`,
      trace: 'Averaged over active habit logs for the last 7 days.',
      tone: avgWeekly >= 75 ? 'positive' : avgWeekly >= 50 ? 'neutral' : 'warning',
      route: 'goals',
    });
  }

  // 5. Overdue tasks
  const overdueTasks = db.tasks.filter(
    (t) => !t.deletedAt && t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate && t.dueDate < today
  );
  if (overdueTasks.length > 0) {
    insights.push({
      id: 'overdue-tasks',
      title: `You have ${overdueTasks.length} overdue task${overdueTasks.length === 1 ? '' : 's'}`,
      detail: `Oldest due: "${overdueTasks.sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))[0].title}".`,
      trace: `Tasks with dueDate before ${today} not yet completed or cancelled.`,
      tone: 'warning',
      route: 'daily',
    });
  }

  // 6. Stale goals (> 5 days since last update)
  const fiveDaysAgo = new Date(refDate);
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  const fiveDaysIso = toLocalISODate(fiveDaysAgo);
  const staleGoal = db.goals.find((g) => g.status === 'active' && g.updatedAt.slice(0, 10) <= fiveDaysIso);
  if (staleGoal) {
    insights.push({
      id: `stale-goal-${staleGoal.id}`,
      title: `"${staleGoal.title}" has not been updated in over 5 days`,
      detail: `Current progress: ${staleGoal.currentValue}/${staleGoal.targetValue} ${staleGoal.unit || ''}.`,
      trace: `Last updated ${staleGoal.updatedAt.slice(0, 10)}.`,
      tone: 'neutral',
      route: 'goals',
    });
  }

  // 7. Upcoming bills within 5 days
  const fiveDaysAhead = new Date(refDate);
  fiveDaysAhead.setDate(fiveDaysAhead.getDate() + 5);
  const aheadIso = toLocalISODate(fiveDaysAhead);
  const dueSoonBills = db.bills.filter((b) => b.active && b.nextDueDate >= today && b.nextDueDate <= aheadIso);
  if (dueSoonBills.length > 0) {
    const totalDue = dueSoonBills.reduce((s, b) => s + b.amountMinor, 0);
    insights.push({
      id: 'bills-due-soon',
      title: `${dueSoonBills.length} bill${dueSoonBills.length === 1 ? '' : 's'} due within 5 days (${formatMoney(totalDue, currency)})`,
      detail: `Next up: ${dueSoonBills[0].name} on ${dueSoonBills[0].nextDueDate}.`,
      trace: 'Active bills & subscriptions with nextDueDate within 5 days.',
      tone: 'neutral',
      route: 'money',
    });
  }

  return insights;
}

export function generatePeriodReview(
  db: BentoDatabaseSnapshot,
  mode: 'week' | 'month',
  refDate = new Date()
): PeriodReviewSummary {
  const bounds =
    mode === 'week'
      ? getWeekBounds(refDate, db.settings.startOfWeek)
      : getMonthBounds(refDate.getFullYear(), refDate.getMonth());

  const txs = filterTransactionsByDateRange(db.transactions, bounds.start, bounds.end);
  const fin = calculateFinancialSummary(txs);

  const tasksCompleted = db.tasks.filter(
    (t) => !t.deletedAt && t.status === 'completed' && t.completedAt && t.completedAt.slice(0, 10) >= bounds.start && t.completedAt.slice(0, 10) <= bounds.end
  ).length;
  const tasksCreated = db.tasks.filter(
    (t) => !t.deletedAt && t.createdAt.slice(0, 10) >= bounds.start && t.createdAt.slice(0, 10) <= bounds.end
  ).length;

  const enabledHabits = db.habits.filter((h) => h.enabled);
  const habitConsistencyPct =
    enabledHabits.length > 0
      ? Math.round(
          enabledHabits.reduce(
            (s, h) => s + (mode === 'week' ? computeHabitStats(h, refDate).weeklyCompletionPct : computeHabitStats(h, refDate).completionRatePct),
            0
          ) / enabledHabits.length
        )
      : 0;

  const learningMinutes = db.studySessions
    .filter((s) => s.date >= bounds.start && s.date <= bounds.end)
    .reduce((sum, s) => sum + s.durationMinutes, 0);

  const activeGoalsCount = db.goals.filter((g) => g.status === 'active').length;
  const completedGoalsCount = db.goals.filter(
    (g) => g.status === 'completed' && g.updatedAt.slice(0, 10) >= bounds.start && g.updatedAt.slice(0, 10) <= bounds.end
  ).length;

  const highlights: string[] = [];
  const attentionAreas: string[] = [];
  const cur = db.settings.currency;

  if (tasksCompleted > 0) highlights.push(`Completed ${tasksCompleted} task${tasksCompleted === 1 ? '' : 's'}.`);
  if (fin.savingsMinor > 0) highlights.push(`Saved ${formatMoney(fin.savingsMinor, cur)} (${fin.savingsRatePct}% savings rate).`);
  if (learningMinutes > 0) highlights.push(`Logged ${(learningMinutes / 60).toFixed(1)} hrs of study.`);
  if (enabledHabits.length > 0 && habitConsistencyPct >= 70) {
    highlights.push(`Maintained ${habitConsistencyPct}% habit consistency.`);
  }

  const overdueCount = db.tasks.filter(
    (t) => !t.deletedAt && t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate && t.dueDate < toLocalISODate(refDate)
  ).length;
  if (overdueCount > 0) attentionAreas.push(`${overdueCount} overdue task${overdueCount === 1 ? '' : 's'} need rescheduling.`);
  if (fin.netExpenseMinor > fin.incomeMinor && fin.incomeMinor > 0) {
    attentionAreas.push(`Expenses exceeded income by ${formatMoney(fin.netExpenseMinor - fin.incomeMinor, cur)}.`);
  }
  if (enabledHabits.length > 0 && habitConsistencyPct < 50) {
    attentionAreas.push(`Habit consistency dipped to ${habitConsistencyPct}%. Consider adjusting frequency or rest days.`);
  }

  return {
    periodLabel: mode === 'week' ? 'Weekly Review' : 'Monthly Review',
    startDate: bounds.start,
    endDate: bounds.end,
    tasksCompleted,
    tasksCreated,
    habitConsistencyPct,
    incomeMinor: fin.incomeMinor,
    expenseMinor: fin.netExpenseMinor,
    savingsMinor: fin.savingsMinor,
    learningMinutes,
    activeGoalsCount,
    completedGoalsCount,
    highlights,
    attentionAreas,
  };
}

/**
 * Computes BENTO Score following strict fairness rules:
 * - Untracked areas are excluded (NEVER treated as 0).
 * - Rest days never penalize habit consistency.
 * - Financial health evaluates budget discipline & cashflow balance, never personal net worth.
 */
export function computeBentoScore(db: BentoDatabaseSnapshot, refDate = new Date()): BentoScoreResult {
  if (!db.settings.bentoScoreEnabled) {
    return {
      enabled: false,
      hasData: false,
      overallScore: null,
      dimensions: [],
      methodologyNote: 'BENTO Score is disabled in Settings.',
    };
  }

  const weights = db.settings.bentoScoreWeights;
  const monthBounds = getMonthBounds(refDate.getFullYear(), refDate.getMonth());
  const weekBounds = getWeekBounds(refDate, db.settings.startOfWeek);

  // 1. Financial Health (budget adherence + positive savings rate, NOT wealth!)
  const monthTxs = filterTransactionsByDateRange(db.transactions, monthBounds.start, monthBounds.end);
  const finTracked = monthTxs.length > 0 || db.budgets.length > 0;
  let finScore: number | null = null;
  let finRationale = 'No transactions or budgets logged this month.';
  if (finTracked) {
    const fin = calculateFinancialSummary(monthTxs);
    const budgets = evaluateBudgets(db.budgets, db.transactions, refDate, db.settings.startOfWeek);
    let score = 70;
    if (fin.incomeMinor > 0) {
      if (fin.savingsRatePct >= 20) score += 20;
      else if (fin.savingsRatePct >= 0) score += Math.round(fin.savingsRatePct);
      else score -= Math.min(35, Math.abs(Math.round(fin.savingsRatePct / 2)));
    }
    if (budgets.length > 0) {
      const withinBudget = budgets.filter((b) => b.status !== 'exceeded').length;
      const adherence = Math.round((withinBudget / budgets.length) * 100);
      score = Math.round((score + adherence) / 2);
      finRationale = `${withinBudget}/${budgets.length} budgets on track · ${fin.savingsRatePct}% savings rate`;
    } else {
      finRationale = fin.incomeMinor > 0 ? `${fin.savingsRatePct}% monthly savings rate` : `${monthTxs.length} transactions tracked`;
    }
    finScore = Math.max(10, Math.min(100, score));
  }

  // 2. Productivity
  const activeTasks = db.tasks.filter((t) => !t.deletedAt && t.status !== 'cancelled');
  const prodTracked = activeTasks.length > 0;
  let prodScore: number | null = null;
  let prodRationale = 'No tasks tracked yet.';
  if (prodTracked) {
    const completed = activeTasks.filter((t) => t.status === 'completed').length;
    const today = toLocalISODate(refDate);
    const overdue = activeTasks.filter((t) => t.status !== 'completed' && t.dueDate && t.dueDate < today).length;
    const base = Math.round((completed / activeTasks.length) * 85) + 15;
    prodScore = Math.max(15, Math.min(100, base - overdue * 5));
    prodRationale = `${completed}/${activeTasks.length} tasks completed · ${overdue} overdue`;
  }

  // 3. Habit Consistency
  const enabledHabits = db.habits.filter((h) => h.enabled);
  const hasAnyHabitLogs = enabledHabits.some((h) => Object.keys(h.logs).length > 0);
  const habitsTracked = enabledHabits.length > 0 && hasAnyHabitLogs;
  let habitsScore: number | null = null;
  let habitsRationale = 'No habit check-ins logged yet.';
  if (habitsTracked) {
    habitsScore = Math.round(
      enabledHabits.reduce((s, h) => s + computeHabitStats(h, refDate).weeklyCompletionPct, 0) / enabledHabits.length
    );
    habitsRationale = `${habitsScore}% weekly completion (rest & skipped days excluded)`;
  }

  // 4. Goals
  const activeOrDoneGoals = db.goals.filter((g) => g.status !== 'archived');
  const goalsTracked = activeOrDoneGoals.length > 0;
  let goalsScore: number | null = null;
  let goalsRationale = 'No active goals yet.';
  if (goalsTracked) {
    const avgPct = Math.round(
      activeOrDoneGoals.reduce((s, g) => {
        if (g.status === 'completed') return s + 100;
        const ratio = g.targetValue > 0 ? Math.min(100, Math.round((g.currentValue / g.targetValue) * 100)) : 0;
        return s + ratio;
      }, 0) / activeOrDoneGoals.length
    );
    goalsScore = Math.max(15, avgPct);
    goalsRationale = `${avgPct}% average progress across ${activeOrDoneGoals.length} goal${activeOrDoneGoals.length === 1 ? '' : 's'}`;
  }

  // 5. Career & Learning
  const weekStudyMins = db.studySessions
    .filter((s) => s.date >= weekBounds.start && s.date <= weekBounds.end)
    .reduce((sum, s) => sum + s.durationMinutes, 0);
  const careerTracked = db.courses.length > 0 || db.skills.length > 0 || db.studySessions.length > 0 || db.jobApplications.length > 0;
  let careerScore: number | null = null;
  let careerRationale = 'No career or learning activity tracked yet.';
  if (careerTracked) {
    const studyPts = Math.min(60, Math.round((weekStudyMins / 180) * 60));
    const skillAvg =
      db.skills.length > 0
        ? Math.round(db.skills.reduce((s, sk) => s + sk.proficiencyPct, 0) / db.skills.length)
        : 65;
    careerScore = Math.max(20, Math.min(100, Math.round(studyPts + skillAvg * 0.4)));
    careerRationale = `${(weekStudyMins / 60).toFixed(1)}h studied this week · ${db.skills.length} skill${db.skills.length === 1 ? '' : 's'} tracked`;
  }

  // 6. Wellbeing (Journal + Health logs in last 7 days)
  const recentHealth = db.healthLogs.filter((h) => h.date >= weekBounds.start && h.date <= weekBounds.end);
  const recentJournal = db.journalEntries.filter((j) => j.date >= weekBounds.start && j.date <= weekBounds.end);
  const wellbeingTracked = recentHealth.length > 0 || recentJournal.length > 0;
  let wellbeingScore: number | null = null;
  let wellbeingRationale = 'No health or journal logs this week.';
  if (wellbeingTracked) {
    const checkins = recentHealth.length + recentJournal.length;
    wellbeingScore = Math.min(100, 50 + checkins * 10);
    wellbeingRationale = `${recentHealth.length} health log${recentHealth.length === 1 ? '' : 's'} · ${recentJournal.length} journal entr${recentJournal.length === 1 ? 'y' : 'ies'} this week`;
  }

  const rawDims: Array<Omit<BentoScoreDimension, 'effectiveWeightPct'>> = [
    { key: 'financial', label: 'Financial Discipline', tracked: finTracked, score: finScore, weight: weights.financial, rationale: finRationale },
    { key: 'productivity', label: 'Daily Productivity', tracked: prodTracked, score: prodScore, weight: weights.productivity, rationale: prodRationale },
    { key: 'habits', label: 'Habit Consistency', tracked: habitsTracked, score: habitsScore, weight: weights.habits, rationale: habitsRationale },
    { key: 'goals', label: 'Goal Momentum', tracked: goalsTracked, score: goalsScore, weight: weights.goals, rationale: goalsRationale },
    { key: 'career', label: 'Career & Learning', tracked: careerTracked, score: careerScore, weight: weights.career, rationale: careerRationale },
    { key: 'wellbeing', label: 'Personal Wellbeing', tracked: wellbeingTracked, score: wellbeingScore, weight: weights.wellbeing, rationale: wellbeingRationale },
  ];

  const trackedWeightSum = rawDims
    .filter((d) => d.tracked && d.score !== null)
    .reduce((sum, d) => sum + d.weight, 0);

  const dimensions: BentoScoreDimension[] = rawDims.map((d) => ({
    ...d,
    effectiveWeightPct:
      d.tracked && d.score !== null && trackedWeightSum > 0
        ? Math.round((d.weight / trackedWeightSum) * 1000) / 10
        : 0,
  }));

  const hasData = trackedWeightSum > 0;
  const overallScore = hasData
    ? Math.round(
        dimensions.reduce(
          (sum, d) => (d.tracked && d.score !== null ? sum + d.score * (d.weight / trackedWeightSum) : sum),
          0
        )
      )
    : null;

  return {
    enabled: true,
    hasData,
    overallScore,
    dimensions,
    methodologyNote:
      'Untracked areas are excluded and weights re-normalized across active areas. Planned rest days never penalize habits, and financial health reflects budget discipline rather than net worth.',
  };
}

export function getAccountBalancesSnapshot(db: BentoDatabaseSnapshot) {
  return computeAllAccountBalances(db.accounts, db.transactions);
}
