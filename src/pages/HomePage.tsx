import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { useBentoStore } from '../store/useBentoStore';
import {
  calculateFinancialSummary,
  computeAllAccountBalances,
  evaluateBudgets,
  filterTransactionsByDateRange,
  formatMoney,
  getMonthBounds,
  getWeekBounds,
  todayISO,
} from '../utils/finance';
import { computeHabitStats } from '../utils/habits';
import { computeBentoScore, generateExplainableInsights } from '../services/intelligence';
import { DashboardCardConfig } from '../types/bento';

interface HomePageProps {
  onOpenQuickAdd: () => void;
  onOpenAssistant: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenQuickAdd, onOpenAssistant }) => {
  const store = useBentoStore();
  const [customizing, setCustomizing] = useState(false);

  const now = new Date();
  const today = todayISO();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const formattedDay = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const snap = store.getSnapshot();
  const currency = store.settings.currency;

  const monthBounds = getMonthBounds(now.getFullYear(), now.getMonth());
  const weekBounds = getWeekBounds(now, store.settings.startOfWeek);
  const monthTxs = filterTransactionsByDateRange(store.transactions, monthBounds.start, monthBounds.end);
  const finSummary = calculateFinancialSummary(monthTxs);
  const balances = computeAllAccountBalances(store.accounts, store.transactions);
  const totalBalanceMinor = store.accounts
    .filter((a) => a.active)
    .reduce((sum, a) => sum + (balances[a.id] ?? 0), 0);
  const budgets = evaluateBudgets(store.budgets, store.transactions, now, store.settings.startOfWeek);
  const avgBudgetUsed =
    budgets.length > 0
      ? Math.round(budgets.reduce((s, b) => s + b.utilizationPct, 0) / budgets.length)
      : null;

  const activeTasks = store.tasks.filter((t) => !t.deletedAt && t.status !== 'cancelled');
  const completedTodayOrDone = activeTasks.filter((t) => t.status === 'completed');
  const pendingTasks = activeTasks.filter((t) => t.status !== 'completed');
  const todayEvents = store.events.filter((e) => e.startDate === today);

  const enabledHabits = store.habits.filter((h) => h.enabled);
  const completedHabitsToday = enabledHabits.filter(
    (h) => h.logs[today]?.status === 'completed' || (h.logs[today]?.count ?? 0) >= h.targetCount
  );

  const activeGoals = store.goals.filter((g) => g.status === 'active');

  const weekStudyMins = store.studySessions
    .filter((s) => s.date >= weekBounds.start && s.date <= weekBounds.end)
    .reduce((sum, s) => sum + s.durationMinutes, 0);
  const activeCourses = store.courses.filter((c) => c.status === 'active');
  const activeJobs = store.jobApplications.filter(
    (j) => !['rejected', 'withdrawn'].includes(j.status)
  );

  const insights = useMemo(() => generateExplainableInsights(snap, now), [store.transactions, store.tasks, store.habits, store.goals, store.budgets, store.bills]);
  const bentoScore = useMemo(() => computeBentoScore(snap, now), [store.transactions, store.tasks, store.habits, store.goals, store.studySessions, store.healthLogs, store.journalEntries, store.settings.bentoScoreEnabled, store.settings.bentoScoreWeights]);

  const sortedCards = [...store.settings.dashboardCards].sort((a, b) => a.order - b.order);

  const moveCard = (index: number, delta: -1 | 1) => {
    const next = [...sortedCards];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    store.updateDashboardCards(next.map((c, idx) => ({ ...c, order: idx })));
  };

  const toggleCardVisible = (id: DashboardCardConfig['id']) => {
    store.updateDashboardCards(
      sortedCards.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))
    );
  };

  const toggleCardSize = (id: DashboardCardConfig['id']) => {
    store.updateDashboardCards(
      sortedCards.map((c) =>
        c.id === id ? { ...c, size: c.size === 'wide' ? 'compact' : 'wide' } : c
      )
    );
  };

  const renderCardContent = (card: DashboardCardConfig) => {
    if (card.id === 'daily') {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Daily Overview</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {completedTodayOrDone.length} completed · {pendingTasks.length} pending · {todayEvents.length} scheduled today
              </p>
            </div>
            <button
              type="button"
              onClick={() => store.setActiveSection('daily')}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline whitespace-nowrap shrink-0"
            >
              <span>Open Daily</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {pendingTasks.length === 0 && todayEvents.length === 0 ? (
            <div className="py-4 text-xs text-[var(--text-muted)] flex items-center justify-between gap-3 border-t bento-divider">
              <span>No pending tasks or events scheduled right now.</span>
              <button
                type="button"
                onClick={onOpenQuickAdd}
                className="text-xs font-semibold text-accent hover:underline whitespace-nowrap"
              >
                Add task
              </button>
            </div>
          ) : (
            <div className="divide-y bento-divider border-t bento-divider">
              {pendingTasks.slice(0, 4).map((task) => (
                <div key={task.id} className="py-2.5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => store.toggleTaskComplete(task.id)}
                    className="flex items-center gap-2.5 text-left min-w-0 group"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[var(--text-muted)] group-hover:text-emerald-500 shrink-0" />
                    <span className="text-sm truncate">{task.title}</span>
                  </button>
                  <span className="text-xs font-mono-num text-[var(--text-muted)] whitespace-nowrap shrink-0">
                    {task.dueDate || 'Inbox'}
                  </span>
                </div>
              ))}
              {todayEvents.slice(0, 2).map((ev) => (
                <div key={ev.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium truncate">{ev.title}</span>
                  <span className="font-mono-num text-[var(--text-muted)] shrink-0">
                    {ev.startTime}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (card.id === 'financial') {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Financial Snapshot</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {store.accounts.length} account{store.accounts.length === 1 ? '' : 's'} · This month
                {avgBudgetUsed !== null ? ` · ${avgBudgetUsed}% avg budget used` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => store.setActiveSection('money')}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline whitespace-nowrap shrink-0"
            >
              <span>Open Money</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t bento-divider">
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Available Balance</p>
              <p className="text-lg sm:text-xl font-bold font-mono-num mt-0.5">
                {formatMoney(totalBalanceMinor, currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Income</p>
              <p className="text-lg sm:text-xl font-bold font-mono-num text-emerald-500 mt-0.5">
                {formatMoney(finSummary.incomeMinor, currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Expenses</p>
              <p className="text-lg sm:text-xl font-bold font-mono-num text-rose-400 mt-0.5">
                {formatMoney(finSummary.netExpenseMinor, currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Net Savings</p>
              <p className="text-lg sm:text-xl font-bold font-mono-num mt-0.5">
                {formatMoney(finSummary.savingsMinor, currency)}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (card.id === 'habits') {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold">Habits</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {completedHabitsToday.length}/{enabledHabits.length} done today
              </p>
            </div>
            <button
              type="button"
              onClick={() => store.setActiveSection('goals')}
              className="text-xs font-medium text-accent hover:underline whitespace-nowrap shrink-0"
            >
              All Habits
            </button>
          </div>

          {enabledHabits.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] pt-2 border-t bento-divider">
              Create daily or weekday habits to build flexible streaks.
            </p>
          ) : (
            <div className="divide-y bento-divider border-t bento-divider">
              {enabledHabits.slice(0, 4).map((habit) => {
                const stats = computeHabitStats(habit, now);
                const done = habit.logs[today]?.status === 'completed';
                return (
                  <div key={habit.id} className="py-2.5 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        store.logHabitForDate(habit.id, today, done ? 'skipped' : 'completed')
                      }
                      className="flex items-center gap-2.5 text-left min-w-0"
                    >
                      <span
                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                          done
                            ? 'bg-accent border-accent'
                            : 'border-[var(--border-strong)]'
                        }`}
                      >
                        {done && '✓'}
                      </span>
                      <span className="text-sm truncate">{habit.name}</span>
                    </button>
                    <span className="text-xs font-mono-num text-[var(--text-secondary)] shrink-0">
                      {stats.currentStreak}d · {stats.weeklyCompletionPct}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (card.id === 'goals') {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold">Goals</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {activeGoals.length} active goal{activeGoals.length === 1 ? '' : 's'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => store.setActiveSection('goals')}
              className="text-xs font-medium text-accent hover:underline whitespace-nowrap shrink-0"
            >
              Manage
            </button>
          </div>

          {activeGoals.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] pt-2 border-t bento-divider">
              Set financial, career, learning, or health goals with milestones.
            </p>
          ) : (
            <div className="space-y-3 pt-2 border-t bento-divider">
              {activeGoals.slice(0, 3).map((g) => {
                const pct =
                  g.targetValue > 0
                    ? Math.min(100, Math.round((g.currentValue / g.targetValue) * 100))
                    : 0;
                return (
                  <div key={g.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium truncate">{g.title}</span>
                      <span className="font-mono-num text-[var(--text-secondary)] shrink-0">
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-violet-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (card.id === 'career') {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold">Career & Learning</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                This week's growth activity
              </p>
            </div>
            <button
              type="button"
              onClick={() => store.setActiveSection('goals')}
              className="text-xs font-medium text-accent hover:underline whitespace-nowrap shrink-0"
            >
              Open
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t bento-divider">
            <div>
              <p className="text-[11px] text-[var(--text-secondary)]">Study Hours</p>
              <p className="text-base font-bold font-mono-num mt-0.5">
                {(weekStudyMins / 60).toFixed(1)}h
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--text-secondary)]">Active Courses</p>
              <p className="text-base font-bold font-mono-num mt-0.5">{activeCourses.length}</p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--text-secondary)]">Applications</p>
              <p className="text-base font-bold font-mono-num mt-0.5">{activeJobs.length}</p>
            </div>
          </div>
        </div>
      );
    }

    if (card.id === 'insights') {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold">BENTO Insights</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Derived strictly from local records
              </p>
            </div>
            <button
              type="button"
              onClick={() => store.setActiveSection('more')}
              className="text-xs font-medium text-accent hover:underline whitespace-nowrap shrink-0"
            >
              Reviews
            </button>
          </div>

          {insights.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] pt-2 border-t bento-divider">
              Add transactions, tasks, or habits to surface explainable personal insights.
            </p>
          ) : (
            <div className="divide-y bento-divider border-t bento-divider">
              {insights.slice(0, 3).map((ins) => (
                <button
                  key={ins.id}
                  type="button"
                  onClick={() => store.setActiveSection(ins.route)}
                  className="w-full py-2.5 text-left hover:bg-[var(--bg-hover)]/40 rounded-lg px-1 transition-colors"
                >
                  <p className="text-xs font-semibold">{ins.title}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{ins.detail}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Score card
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">BENTO Score</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Optional progress index across tracked areas only
            </p>
          </div>
          <button
            type="button"
            onClick={() => store.setActiveSection('more')}
            className="text-xs font-medium text-accent hover:underline whitespace-nowrap shrink-0"
          >
            Methodology
          </button>
        </div>

        {!bentoScore.enabled ? (
          <p className="text-xs text-[var(--text-muted)] pt-2 border-t bento-divider">
            BENTO Score is disabled. Re-enable anytime in More &gt; Settings.
          </p>
        ) : !bentoScore.hasData ? (
          <p className="text-xs text-[var(--text-muted)] pt-2 border-t bento-divider">
            Waiting for first tracked activity. Untracked dimensions are never penalized as zero.
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2 border-t bento-divider">
            <div className="shrink-0">
              <span className="text-3xl font-extrabold font-mono-num text-accent">
                {bentoScore.overallScore}
              </span>
              <span className="text-xs text-[var(--text-muted)] ml-1">/ 100</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 flex-1">
              {bentoScore.dimensions
                .filter((d) => d.tracked)
                .map((d) => (
                  <div key={d.key} className="text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--text-secondary)] truncate">{d.label}</span>
                      <span className="font-mono-num font-semibold">{d.score}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[var(--text-secondary)]">{formattedDay}</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-balance">
            {greeting}
            {store.settings.userName ? `, ${store.settings.userName}` : ''}
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Capture anything. Organize everything. Understand your life.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenAssistant}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] hover:bg-[var(--bg-hover)] text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Tell BENTO...</span>
          </button>
          <button
            type="button"
            onClick={() => setCustomizing((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              customizing
                ? 'bg-accent border-accent'
                : 'bg-[var(--bg-surface)] border-[var(--border-hairline)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{customizing ? 'Done Customizing' : 'Customize'}</span>
          </button>
          <button
            type="button"
            onClick={onOpenQuickAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Quick Add</span>
          </button>
        </div>
      </div>

      {/* Dashboard Customization Bar */}
      {customizing && (
        <div className="bento-surface rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold">Dashboard Layout & Cards</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Reorder cards, toggle visibility, or switch between wide and compact sizes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-elevated)]">
                {(['bento', 'compact', 'focus'] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => store.updateSettings({ dashboardLayout: preset })}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize ${
                      store.settings.dashboardLayout === preset
                        ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => store.resetDashboardLayout()}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border-hairline)] text-xs font-medium hover:bg-[var(--bg-hover)]"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <div className="divide-y bento-divider border-t bento-divider">
            {sortedCards.map((card, idx) => (
              <div key={card.id} className="py-2 flex items-center justify-between gap-3">
                <span className={`text-xs font-medium ${card.visible ? '' : 'text-[var(--text-muted)] line-through'}`}>
                  {card.label}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveCard(idx, -1)}
                    disabled={idx === 0}
                    aria-label="Move up"
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] disabled:opacity-30"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCard(idx, 1)}
                    disabled={idx === sortedCards.length - 1}
                    aria-label="Move down"
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] disabled:opacity-30"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCardSize(card.id)}
                    aria-label="Toggle size"
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                    title={card.size === 'wide' ? 'Switch to compact' : 'Switch to wide'}
                  >
                    {card.size === 'wide' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCardVisible(card.id)}
                    aria-label="Toggle visibility"
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)]"
                  >
                    {card.visible ? (
                      <Eye className="w-3.5 h-3.5 text-accent" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bento Grid */}
      <div
        className={`grid gap-4 ${
          store.settings.dashboardLayout === 'focus'
            ? 'grid-cols-1 max-w-3xl'
            : 'grid-cols-1 lg:grid-cols-12'
        }`}
      >
        {sortedCards
          .filter((c) => c.visible)
          .map((card) => {
            const colSpan =
              store.settings.dashboardLayout === 'focus'
                ? ''
                : store.settings.dashboardLayout === 'compact'
                ? 'lg:col-span-4'
                : card.size === 'wide'
                ? 'lg:col-span-6'
                : 'lg:col-span-4';

            return (
              <section key={card.id} className={`bento-surface rounded-2xl p-5 ${colSpan}`}>
                {renderCardContent(card)}
              </section>
            );
          })}
      </div>
    </div>
  );
};
