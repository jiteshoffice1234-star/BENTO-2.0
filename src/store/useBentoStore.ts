import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  AppSettings,
  AssistantHistoryEntry,
  BentoAttachment,
  BentoDatabaseSnapshot,
  BillSubscription,
  CalendarEvent,
  CareerProfile,
  CourseItem,
  DashboardCardConfig,
  DebtRecord,
  FinanceAccount,
  FinanceBudget,
  FinanceCategory,
  FinanceTransaction,
  Goal,
  Habit,
  HabitLogStatus,
  HealthLog,
  InvestmentHolding,
  JobApplication,
  JournalEntry,
  MemoryItem,
  NavSection,
  QuickNote,
  Routine,
  SavingsGoal,
  SkillItem,
  StudySession,
  Task,
  VaultEntry,
  WishlistItem,
} from '../types/bento';
import { clearLocalDB, loadSnapshotFromLocalDB, normalizeSnapshot, saveSnapshotToLocalDB } from '../db/storage';
import { createEmptySnapshot, DEFAULT_CAREER_PROFILE, DEFAULT_DASHBOARD_CARDS, DEFAULT_FINANCE_CATEGORIES, DEFAULT_SETTINGS } from '../utils/defaults';
import { todayISO } from '../utils/finance';
import { computeHabitStats } from '../utils/habits';
import { mergeSnapshotsDeduplicatingById } from '../services/backup';

const nowIso = () => new Date().toISOString();

function advanceBillingDate(dateStr: string, freq: BillSubscription['frequency']): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return todayISO();
  if (freq === 'weekly') d.setDate(d.getDate() + 7);
  else if (freq === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (freq === 'quarterly') d.setMonth(d.getMonth() + 3);
  else if (freq === 'yearly') d.setFullYear(d.getFullYear() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface BentoState extends BentoDatabaseSnapshot {
  hydrated: boolean;
  activeSection: NavSection;
  isLocked: boolean;
  dismissedNotificationIds: string[];
  snoozedNotifications: Record<string, string>;

  // Lifecycle & navigation
  hydrate: () => Promise<void>;
  setActiveSection: (section: NavSection) => void;
  setLocked: (locked: boolean) => void;
  getSnapshot: () => BentoDatabaseSnapshot;

  // Settings & Dashboard
  updateSettings: (updates: Partial<AppSettings>) => void;
  updateDashboardCards: (cards: DashboardCardConfig[]) => void;
  resetDashboardLayout: () => void;

  // Money — Accounts
  addAccount: (data: Omit<FinanceAccount, 'id' | 'createdAt' | 'updatedAt'>) => FinanceAccount;
  updateAccount: (id: string, updates: Partial<FinanceAccount>) => void;
  deleteAccount: (id: string) => void;

  // Money — Categories
  addCategory: (data: Omit<FinanceCategory, 'id' | 'isDefault'>) => FinanceCategory;
  deleteCategory: (id: string) => void;

  // Money — Transactions
  addTransaction: (data: Omit<FinanceTransaction, 'id' | 'createdAt' | 'updatedAt'>) => FinanceTransaction;
  updateTransaction: (id: string, updates: Partial<FinanceTransaction>) => void;
  deleteTransaction: (id: string) => void;
  duplicateTransaction: (id: string) => void;
  bulkCategorizeTransactions: (ids: string[], category: string) => void;

  // Money — Budgets
  addBudget: (data: Omit<FinanceBudget, 'id' | 'createdAt' | 'updatedAt'>) => FinanceBudget;
  updateBudget: (id: string, updates: Partial<FinanceBudget>) => void;
  deleteBudget: (id: string) => void;

  // Money — Savings
  addSavingsGoal: (data: Omit<SavingsGoal, 'id' | 'history' | 'createdAt' | 'updatedAt'>) => SavingsGoal;
  contributeSavings: (id: string, amountMinor: number, note?: string) => void;
  deleteSavingsGoal: (id: string) => void;

  // Money — Investments
  addInvestment: (data: Omit<InvestmentHolding, 'id' | 'createdAt' | 'updatedAt'>) => InvestmentHolding;
  updateInvestment: (id: string, updates: Partial<InvestmentHolding>) => void;
  deleteInvestment: (id: string) => void;

  // Money — Debts
  addDebt: (data: Omit<DebtRecord, 'id' | 'payments' | 'createdAt' | 'updatedAt'>) => DebtRecord;
  recordDebtPayment: (id: string, amountMinor: number, note?: string) => void;
  deleteDebt: (id: string) => void;

  // Money — Bills & Subscriptions
  addBill: (data: Omit<BillSubscription, 'id' | 'paidDates' | 'createdAt' | 'updatedAt'>) => BillSubscription;
  markBillPaid: (id: string, logTransaction?: boolean) => void;
  deleteBill: (id: string) => void;

  // Daily — Tasks
  addTask: (data: Partial<Task> & { title: string }) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  toggleTaskComplete: (id: string) => void;
  deleteTask: (id: string) => void;

  // Daily — Events
  addEvent: (data: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => CalendarEvent;
  deleteEvent: (id: string) => void;

  // Daily — Routines
  addRoutine: (data: Omit<Routine, 'id' | 'completionLogs' | 'createdAt' | 'updatedAt'>) => Routine;
  toggleRoutineStep: (routineId: string, date: string, stepId: string) => void;
  deleteRoutine: (id: string) => void;

  // Daily — Notes
  addNote: (data: Omit<QuickNote, 'id' | 'createdAt' | 'updatedAt'>) => QuickNote;
  updateNote: (id: string, updates: Partial<QuickNote>) => void;
  deleteNote: (id: string) => void;

  // Habits
  addHabit: (data: Omit<Habit, 'id' | 'logs' | 'createdAt' | 'updatedAt'>) => Habit;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  logHabitForDate: (id: string, date: string, status: HabitLogStatus, count?: number) => void;
  deleteHabit: (id: string) => void;

  // Goals
  addGoal: (data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => Goal;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  toggleGoalMilestone: (goalId: string, milestoneId: string) => void;
  deleteGoal: (id: string) => void;

  // Career & Learning
  updateCareerProfile: (updates: Partial<CareerProfile>) => void;
  addSkill: (data: Omit<SkillItem, 'id' | 'createdAt' | 'updatedAt'>) => SkillItem;
  updateSkill: (id: string, updates: Partial<SkillItem>) => void;
  deleteSkill: (id: string) => void;
  addCourse: (data: Omit<CourseItem, 'id' | 'createdAt' | 'updatedAt'>) => CourseItem;
  updateCourse: (id: string, updates: Partial<CourseItem>) => void;
  deleteCourse: (id: string) => void;
  addStudySession: (data: Omit<StudySession, 'id' | 'createdAt'>) => StudySession;
  deleteStudySession: (id: string) => void;
  addJobApplication: (data: Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>) => JobApplication;
  updateJobApplication: (id: string, updates: Partial<JobApplication>) => void;
  deleteJobApplication: (id: string) => void;

  // Life
  addJournalEntry: (data: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>) => JournalEntry;
  deleteJournalEntry: (id: string) => void;
  addMemory: (data: Omit<MemoryItem, 'id' | 'createdAt' | 'updatedAt'>) => MemoryItem;
  deleteMemory: (id: string) => void;
  addWishlistItem: (data: Omit<WishlistItem, 'id' | 'createdAt' | 'updatedAt'>) => WishlistItem;
  updateWishlistItem: (id: string, updates: Partial<WishlistItem>) => void;
  deleteWishlistItem: (id: string) => void;
  addHealthLog: (data: Omit<HealthLog, 'id' | 'createdAt' | 'updatedAt'>) => HealthLog;
  deleteHealthLog: (id: string) => void;
  addVaultEntry: (data: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>) => VaultEntry;
  deleteVaultEntry: (id: string) => void;

  // Attachments, Notifications & Assistant
  addAttachment: (data: Omit<BentoAttachment, 'id' | 'createdAt'>) => BentoAttachment;
  dismissNotification: (id: string) => void;
  snoozeNotification: (id: string, untilIso: string) => void;
  addAssistantHistory: (entry: Omit<AssistantHistoryEntry, 'id' | 'timestamp'>) => void;

  // Backup / Restore / Reset
  restoreFromSnapshot: (incoming: BentoDatabaseSnapshot, mode: 'replace' | 'merge') => void;
  resetAllData: () => Promise<void>;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist(get: () => BentoState) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void saveSnapshotToLocalDB(get().getSnapshot());
  }, 120);
}

const initialEmpty = createEmptySnapshot();

export const useBentoStore = create<BentoState>((set, get) => ({
  ...initialEmpty,
  hydrated: false,
  activeSection: 'home',
  isLocked: false,
  dismissedNotificationIds: [],
  snoozedNotifications: {},

  hydrate: async () => {
    const snap = await loadSnapshotFromLocalDB();
    set({
      ...snap,
      hydrated: true,
      isLocked: Boolean(snap.settings.appLockEnabled && snap.settings.appLockPinHash),
    });
  },

  setActiveSection: (section) => set({ activeSection: section }),
  setLocked: (locked) => set({ isLocked: locked }),

  getSnapshot: () => {
    const s = get();
    return {
      schemaVersion: 3,
      exportedAt: nowIso(),
      settings: s.settings,
      accounts: s.accounts,
      categories: s.categories,
      transactions: s.transactions,
      budgets: s.budgets,
      savingsGoals: s.savingsGoals,
      investments: s.investments,
      debts: s.debts,
      bills: s.bills,
      tasks: s.tasks,
      events: s.events,
      routines: s.routines,
      notes: s.notes,
      habits: s.habits,
      goals: s.goals,
      careerProfile: s.careerProfile,
      skills: s.skills,
      courses: s.courses,
      studySessions: s.studySessions,
      jobApplications: s.jobApplications,
      journalEntries: s.journalEntries,
      memories: s.memories,
      wishlist: s.wishlist,
      healthLogs: s.healthLogs,
      vaultEntries: s.vaultEntries,
      attachments: s.attachments,
      notifications: s.notifications,
      assistantHistory: s.assistantHistory,
    };
  },

  updateSettings: (updates) => {
    set((s) => ({ settings: { ...s.settings, ...updates } }));
    schedulePersist(get);
  },

  updateDashboardCards: (cards) => {
    set((s) => ({ settings: { ...s.settings, dashboardCards: cards } }));
    schedulePersist(get);
  },

  resetDashboardLayout: () => {
    set((s) => ({
      settings: {
        ...s.settings,
        dashboardLayout: 'bento',
        dashboardCards: DEFAULT_DASHBOARD_CARDS.map((c) => ({ ...c })),
      },
    }));
    schedulePersist(get);
  },

  // ── Accounts ──────────────────────────────────────────────────────
  addAccount: (data) => {
    const account: FinanceAccount = {
      ...data,
      id: uuidv4(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    set((s) => ({ accounts: [...s.accounts, account] }));
    schedulePersist(get);
    return account;
  },
  updateAccount: (id, updates) => {
    set((s) => ({
      accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...updates, updatedAt: nowIso() } : a)),
    }));
    schedulePersist(get);
  },
  deleteAccount: (id) => {
    set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) }));
    schedulePersist(get);
  },

  // ── Categories ────────────────────────────────────────────────────
  addCategory: (data) => {
    const cat: FinanceCategory = { ...data, id: uuidv4(), isDefault: false };
    set((s) => ({ categories: [...s.categories, cat] }));
    schedulePersist(get);
    return cat;
  },
  deleteCategory: (id) => {
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id || c.isDefault) }));
    schedulePersist(get);
  },

  // ── Transactions ──────────────────────────────────────────────────
  addTransaction: (data) => {
    const tx: FinanceTransaction = {
      ...data,
      id: uuidv4(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      deletedAt: null,
    };
    set((s) => ({ transactions: [tx, ...s.transactions] }));
    schedulePersist(get);
    return tx;
  },
  updateTransaction: (id, updates) => {
    set((s) => ({
      transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: nowIso() } : t)),
    }));
    schedulePersist(get);
  },
  deleteTransaction: (id) => {
    set((s) => ({
      transactions: s.transactions.map((t) => (t.id === id ? { ...t, deletedAt: nowIso(), updatedAt: nowIso() } : t)),
    }));
    schedulePersist(get);
  },
  duplicateTransaction: (id) => {
    const existing = get().transactions.find((t) => t.id === id);
    if (!existing) return;
    get().addTransaction({
      ...existing,
      date: todayISO(),
      description: `${existing.description} (Copy)`.trim(),
    });
  },
  bulkCategorizeTransactions: (ids, category) => {
    const idSet = new Set(ids);
    set((s) => ({
      transactions: s.transactions.map((t) => (idSet.has(t.id) ? { ...t, category, updatedAt: nowIso() } : t)),
    }));
    schedulePersist(get);
  },

  // ── Budgets ───────────────────────────────────────────────────────
  addBudget: (data) => {
    const b: FinanceBudget = { ...data, id: uuidv4(), createdAt: nowIso(), updatedAt: nowIso() };
    set((s) => ({ budgets: [...s.budgets, b] }));
    schedulePersist(get);
    return b;
  },
  updateBudget: (id, updates) => {
    set((s) => ({
      budgets: s.budgets.map((b) => (b.id === id ? { ...b, ...updates, updatedAt: nowIso() } : b)),
    }));
    schedulePersist(get);
  },
  deleteBudget: (id) => {
    set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) }));
    schedulePersist(get);
  },

  // ── Savings ───────────────────────────────────────────────────────
  addSavingsGoal: (data) => {
    const sg: SavingsGoal = { ...data, id: uuidv4(), history: [], createdAt: nowIso(), updatedAt: nowIso() };
    set((s) => ({ savingsGoals: [...s.savingsGoals, sg] }));
    schedulePersist(get);
    return sg;
  },
  contributeSavings: (id, amountMinor, note = 'Contribution') => {
    set((s) => ({
      savingsGoals: s.savingsGoals.map((g) =>
        g.id === id
          ? {
              ...g,
              currentMinor: Math.max(0, g.currentMinor + amountMinor),
              history: [{ id: uuidv4(), date: todayISO(), amountMinor, note }, ...g.history],
              updatedAt: nowIso(),
            }
          : g
      ),
    }));
    schedulePersist(get);
  },
  deleteSavingsGoal: (id) => {
    set((s) => ({ savingsGoals: s.savingsGoals.filter((g) => g.id !== id) }));
    schedulePersist(get);
  },

  // ── Investments ───────────────────────────────────────────────────
  addInvestment: (data) => {
    const inv: InvestmentHolding = { ...data, id: uuidv4(), createdAt: nowIso(), updatedAt: nowIso() };
    set((s) => ({ investments: [...s.investments, inv] }));
    schedulePersist(get);
    return inv;
  },
  updateInvestment: (id, updates) => {
    set((s) => ({
      investments: s.investments.map((i) => (i.id === id ? { ...i, ...updates, updatedAt: nowIso() } : i)),
    }));
    schedulePersist(get);
  },
  deleteInvestment: (id) => {
    set((s) => ({ investments: s.investments.filter((i) => i.id !== id) }));
    schedulePersist(get);
  },

  // ── Debts ─────────────────────────────────────────────────────────
  addDebt: (data) => {
    const debt: DebtRecord = { ...data, id: uuidv4(), payments: [], createdAt: nowIso(), updatedAt: nowIso() };
    set((s) => ({ debts: [...s.debts, debt] }));
    schedulePersist(get);
    return debt;
  },
  recordDebtPayment: (id, amountMinor, note = 'Repayment') => {
    set((s) => ({
      debts: s.debts.map((d) =>
        d.id === id
          ? {
              ...d,
              remainingMinor: Math.max(0, d.remainingMinor - amountMinor),
              payments: [{ id: uuidv4(), date: todayISO(), amountMinor, note }, ...d.payments],
              updatedAt: nowIso(),
            }
          : d
      ),
    }));
    schedulePersist(get);
  },
  deleteDebt: (id) => {
    set((s) => ({ debts: s.debts.filter((d) => d.id !== id) }));
    schedulePersist(get);
  },

  // ── Bills & Subscriptions ─────────────────────────────────────────
  addBill: (data) => {
    const bill: BillSubscription = { ...data, id: uuidv4(), paidDates: [], createdAt: nowIso(), updatedAt: nowIso() };
    set((s) => ({ bills: [...s.bills, bill] }));
    schedulePersist(get);
    return bill;
  },
  markBillPaid: (id, logTransaction = true) => {
    const bill = get().bills.find((b) => b.id === id);
    if (!bill) return;
    if (logTransaction && get().accounts.length > 0) {
      get().addTransaction({
        type: 'expense',
        amountMinor: bill.amountMinor,
        category: bill.category || 'Subscriptions',
        subcategory: bill.kind === 'subscription' ? 'Subscription' : 'Bill',
        accountId: bill.accountId || get().accounts[0].id,
        toAccountId: null,
        date: todayISO(),
        time: '12:00',
        merchant: bill.name,
        description: `${bill.name} (${bill.kind})`,
        tags: [bill.kind],
        notes: bill.notes,
        recurring: true,
        recurrence: bill.frequency === 'quarterly' ? 'monthly' : bill.frequency,
      });
    }
    set((s) => ({
      bills: s.bills.map((b) =>
        b.id === id
          ? {
              ...b,
              paidDates: [...b.paidDates, todayISO()],
              nextDueDate: advanceBillingDate(b.nextDueDate, b.frequency),
              updatedAt: nowIso(),
            }
          : b
      ),
    }));
    schedulePersist(get);
  },
  deleteBill: (id) => {
    set((s) => ({ bills: s.bills.filter((b) => b.id !== id) }));
    schedulePersist(get);
  },

  // ── Tasks ─────────────────────────────────────────────────────────
  addTask: (data) => {
    const task: Task = {
      id: uuidv4(),
      title: data.title,
      description: data.description || '',
      priority: data.priority || 'none',
      status: data.status || 'inbox',
      startDate: data.startDate ?? null,
      dueDate: data.dueDate ?? null,
      dueTime: data.dueTime ?? null,
      category: data.category || 'Personal',
      tags: data.tags || [],
      reminderAt: data.reminderAt ?? null,
      recurrence: data.recurrence || 'none',
      goalId: data.goalId ?? null,
      notes: data.notes || '',
      subtasks: data.subtasks || [],
      completedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      deletedAt: null,
    };
    set((s) => ({ tasks: [task, ...s.tasks] }));
    schedulePersist(get);
    return task;
  },
  updateTask: (id, updates) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: nowIso() } : t)),
    }));
    schedulePersist(get);
  },
  toggleTaskComplete: (id) => {
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id !== id) return t;
        const nextDone = t.status !== 'completed';
        return {
          ...t,
          status: nextDone ? 'completed' : 'in_progress',
          completedAt: nextDone ? nowIso() : null,
          updatedAt: nowIso(),
        };
      }),
    }));
    schedulePersist(get);
  },
  deleteTask: (id) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, deletedAt: nowIso(), updatedAt: nowIso() } : t)),
    }));
    schedulePersist(get);
  },

  // ── Events ────────────────────────────────────────────────────────
  addEvent: (data) => {
    const ev: CalendarEvent = { ...data, id: uuidv4(), createdAt: nowIso(), updatedAt: nowIso() };
    set((s) => ({ events: [...s.events, ev] }));
    schedulePersist(get);
    return ev;
  },
  deleteEvent: (id) => {
    set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
    schedulePersist(get);
  },

  // ── Routines ──────────────────────────────────────────────────────
  addRoutine: (data) => {
    const r: Routine = { ...data, id: uuidv4(), completionLogs: {}, createdAt: nowIso(), updatedAt: nowIso() };
    set((s) => ({ routines: [...s.routines, r] }));
    schedulePersist(get);
    return r;
  },
  toggleRoutineStep: (routineId, date, stepId) => {
    set((s) => ({
      routines: s.routines.map((r) => {
        if (r.id !== routineId) return r;
        const done = r.completionLogs[date] ?? [];
        const next = done.includes(stepId) ? done.filter((x) => x !== stepId) : [...done, stepId];
        return {
          ...r,
          completionLogs: { ...r.completionLogs, [date]: next },
          updatedAt: nowIso(),
        };
      }),
    }));
    schedulePersist(get);
  },
  deleteRoutine: (id) => {
    set((s) => ({ routines: s.routines.filter((r) => r.id !== id) }));
    schedulePersist(get);
  },

  // ── Notes ─────────────────────────────────────────────────────────
  addNote: (data) => {
    const note: QuickNote = { ...data, id: uuidv4(), createdAt: nowIso(), updatedAt: nowIso() };
    set((s) => ({ notes: [note, ...s.notes] }));
    schedulePersist(get);
    return note;
  },
  updateNote: (id, updates) => {
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, ...updates, updatedAt: nowIso() } : n)),
    }));
    schedulePersist(get);
  },
  deleteNote: (id) => {
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
    schedulePersist(get);
  },

  // ── Habits ────────────────────────────────────────────────────────
  addHabit: (data) => {
    const h: Habit = { ...data, id: uuidv4(), logs: {}, createdAt: nowIso(), updatedAt: nowIso() };
    set((s) => ({ habits: [...s.habits, h] }));
    schedulePersist(get);
    return h;
  },
  updateHabit: (id, updates) => {
    set((s) => ({
      habits: s.habits.map((h) => (h.id === id ? { ...h, ...updates, updatedAt: nowIso() } : h)),
    }));
    schedulePersist(get);
  },
  logHabitForDate: (id, date, status, count) => {
    set((s) => ({
      habits: s.habits.map((h) => {
        if (h.id !== id) return h;
        const existing = h.logs[date];
        const nextCount = count ?? (status === 'completed' ? h.targetCount : existing?.count ?? 0);
        const updatedHabit: Habit = {
          ...h,
          logs: {
            ...h.logs,
            [date]: { status, count: nextCount },
          },
          updatedAt: nowIso(),
        };
        computeHabitStats(updatedHabit);
        return updatedHabit;
      }),
    }));
    schedulePersist(get);
  },
  deleteHabit: (id) => {
    set((s) => ({ habits: s.habits.filter((h) => h.id !== id) }));
    schedulePersist(get);
  },

  // ── Goals ─────────────────────────────────────────────────────────
  addGoal: (data) => {
    const g: Goal = { ...data, id: uuidv4(), createdAt: nowIso(), updatedAt: nowIso() };
    set((s) => ({ goals: [...s.goals, g] }));
    schedulePersist(get);
    return g;
  },
  updateGoal: (id, updates) => {
    set((s) => ({
      goals: s.goals.map((g) => (g.id === id ? { ...g, ...updates, updatedAt: nowIso() } : g)),
    }));
    schedulePersist(get);
  },
  toggleGoalMilestone: (goalId, milestoneId) => {
    set((s) => ({
      goals: s.goals.map((g) => {
        if (g.id !== goalId) return g;
        const milestones = g.milestones.map((m) =>
          m.id === milestoneId ? { ...m, completed: !m.completed } : m
        );
        const doneCount = milestones.filter((m) => m.completed).length;
        const nextValue =
          g.kind === 'completion' && milestones.length > 0
            ? Math.round((doneCount / milestones.length) * g.targetValue)
            : g.currentValue;
        return { ...g, milestones, currentValue: nextValue, updatedAt: nowIso() };
      }),
    }));
    schedulePersist(get);
  },
  deleteGoal: (id) => {
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
    schedulePersist(get);
  },

  // ── Career & Learning ─────────────────────────────────────────────
  updateCareerProfile: (updates) => {
    set((s) => ({ careerProfile: { ...s.careerProfile, ...updates } }));
    schedulePersist(get);
  },
  addSkill: (data) => {
    const sk: SkillItem = { ...data, id: uuidv4(), createdAt: nowIso(), updatedAt: nowIso() };
    set((s) => ({ skills: [...s.skills, sk] }));
    schedulePersist(get);
    return sk;
  },
  updateSkill: (id, updates) => {
    set((s) => ({
      skills: s.skills.map((sk) => (sk.id === id ? { ...sk, ...updates, updatedAt: nowIso() } : sk)),
    }));
    schedulePersist(get);
  },
  deleteSkill: (id) => {
    set((s) => ({ skills: s.skills.filter((sk) => sk.id !== id) }));
    schedulePersist(get);
  },
  addCourse: (data) => {
    const c: CourseItem = { ...data, id: uuidv4(), createdAt: nowIso(), updatedAt: nowIso() };
    set((s) => ({ courses: [...s.courses, c] }));
    schedulePersist(get);
    return c;
  },
  updateCourse: (id, updates) => {
    set((s) => ({
      courses: s.courses.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: nowIso() } : c)),
    }));
    schedulePersist(get);
  },
  deleteCourse: (id) => {
    set((s) => ({ courses: s.courses.filter((c) => c.id !== id) }));
    schedulePersist(get);
  },
  addStudySession: (data) => {
    const ss: StudySession = { ...data, id: uuidv4(), createdAt: nowIso() };
    set((s) => ({ studySessions: [ss, ...s.studySessions] }));
    schedulePersist(get);
    return ss;
  },
  deleteStudySession: (id) => {
    set((s) => ({ studySessions: s.studySessions.filter((ss) => ss.id !== id) }));
    schedulePersist(get);
  },
  addJobApplication: (data) => {
    const job: JobApplication = { ...data, id: uuidv4(), createdAt: nowIso(), updatedAt: nowIso() };
    set((s) => ({ jobApplications: [job, ...s.jobApplications] }));
    schedulePersist(get);
    return job;
  },
  updateJobApplication: (id, updates) => {
    set((s) => ({
      jobApplications: s.jobApplications.map((j) => (j.id === id ? { ...j, ...updates, updatedAt: nowIso() } : j)),
    }));
    schedulePersist(get);
  },
  deleteJobApplication: (id) => {
    set((s) => ({ jobApplications: s.jobApplications.filter((j) => j.id !== id) }));
    schedulePersist(get);
  },

  // ── Life ──────────────────────────────────────────────────────────
  addJournalEntry: (data) => {
    const entry: JournalEntry = { ...data, id: uuidv4(), createdAt: nowIso(), updatedAt: nowIso() };
    set((s) => ({ journalEntries: [entry, ...s.journalEntries] }));
    schedulePersist(get);
    return entry;
  },
  deleteJournalEntry: (id) => {
    set((s) => ({ journalEntries: s.journalEntries.filter((j) => j.id !== id) }));
    schedulePersist(get);
  },
  addMemory: (data) => {
    const m: MemoryItem = { ...data, id: uuidv4(), createdAt: nowIso(), updatedAt: nowIso() };
    set((s) => ({ memories: [m, ...s.memories] }));
    schedulePersist(get);
    return m;
  },
  deleteMemory: (id) => {
    set((s) => ({ memories: s.memories.filter((m) => m.id !== id) }));
    schedulePersist(get);
  },
  addWishlistItem: (data) => {
    const w: WishlistItem = { ...data, id: uuidv4(), createdAt: nowIso(), updatedAt: nowIso() };
    set((s) => ({ wishlist: [...s.wishlist, w] }));
    schedulePersist(get);
    return w;
  },
  updateWishlistItem: (id, updates) => {
    set((s) => ({
      wishlist: s.wishlist.map((w) => (w.id === id ? { ...w, ...updates, updatedAt: nowIso() } : w)),
    }));
    schedulePersist(get);
  },
  deleteWishlistItem: (id) => {
    set((s) => ({ wishlist: s.wishlist.filter((w) => w.id !== id) }));
    schedulePersist(get);
  },
  addHealthLog: (data) => {
    const h: HealthLog = { ...data, id: uuidv4(), createdAt: nowIso(), updatedAt: nowIso() };
    set((s) => ({ healthLogs: [h, ...s.healthLogs] }));
    schedulePersist(get);
    return h;
  },
  deleteHealthLog: (id) => {
    set((s) => ({ healthLogs: s.healthLogs.filter((h) => h.id !== id) }));
    schedulePersist(get);
  },
  addVaultEntry: (data) => {
    const v: VaultEntry = { ...data, id: uuidv4(), createdAt: nowIso(), updatedAt: nowIso() };
    set((s) => ({ vaultEntries: [...s.vaultEntries, v] }));
    schedulePersist(get);
    return v;
  },
  deleteVaultEntry: (id) => {
    set((s) => ({ vaultEntries: s.vaultEntries.filter((v) => v.id !== id) }));
    schedulePersist(get);
  },

  // ── Attachments, Notifications & Assistant ────────────────────────
  addAttachment: (data) => {
    const att: BentoAttachment = { ...data, id: uuidv4(), createdAt: nowIso() };
    set((s) => ({ attachments: [...s.attachments, att] }));
    schedulePersist(get);
    return att;
  },
  dismissNotification: (id) => {
    set((s) => ({ dismissedNotificationIds: [...s.dismissedNotificationIds, id] }));
  },
  snoozeNotification: (id, untilIso) => {
    set((s) => ({ snoozedNotifications: { ...s.snoozedNotifications, [id]: untilIso } }));
  },
  addAssistantHistory: (entry) => {
    const item: AssistantHistoryEntry = { ...entry, id: uuidv4(), timestamp: nowIso() };
    set((s) => ({ assistantHistory: [item, ...s.assistantHistory].slice(0, 100) }));
    schedulePersist(get);
  },

  // ── Restore & Reset ───────────────────────────────────────────────
  restoreFromSnapshot: (incoming, mode) => {
    const normalized = normalizeSnapshot(incoming);
    if (mode === 'merge') {
      const merged = mergeSnapshotsDeduplicatingById(get().getSnapshot(), normalized);
      set({ ...merged });
    } else {
      set({
        ...normalized,
        settings: { ...DEFAULT_SETTINGS, ...normalized.settings, onboardingCompleted: true },
        categories: normalized.categories.length > 0 ? normalized.categories : [...DEFAULT_FINANCE_CATEGORIES],
        careerProfile: normalized.careerProfile ?? { ...DEFAULT_CAREER_PROFILE },
      });
    }
    schedulePersist(get);
  },

  resetAllData: async () => {
    await clearLocalDB();
    const fresh = createEmptySnapshot();
    set({ ...fresh, isLocked: false, dismissedNotificationIds: [], snoozedNotifications: {} });
  },
}));
