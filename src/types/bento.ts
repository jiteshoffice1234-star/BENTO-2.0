export type ThemeMode = 'dark' | 'light' | 'system';
export type TimeFormat = '12h' | '24h';
export type StartOfWeek = 'monday' | 'sunday';
export type AccentChoice = 'emerald' | 'violet' | 'champagne' | 'sky' | 'rose';

export type NavSection = 'home' | 'money' | 'daily' | 'goals' | 'life' | 'improvements' | 'more';

export type AccountType = 'savings' | 'current' | 'cash' | 'wallet' | 'credit_card' | 'custom';
export type TransactionType = 'income' | 'expense' | 'transfer' | 'refund' | 'adjustment';
export type BudgetPeriod = 'monthly' | 'weekly' | 'custom';
export type InvestmentAssetType = 'stocks' | 'mutual_funds' | 'fixed_deposit' | 'gold' | 'other';
export type DebtKind = 'loan' | 'emi' | 'credit_card' | 'borrowed' | 'lent';

export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'inbox' | 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
export type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export type HabitKind = 'positive' | 'negative' | 'quantitative' | 'time' | 'checklist';
export type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom';
export type HabitLogStatus = 'completed' | 'partial' | 'skipped' | 'rest';

export type GoalCategory = 'financial' | 'career' | 'education' | 'health' | 'personal' | 'lifestyle' | 'custom';
export type GoalKind = 'numeric' | 'financial' | 'completion' | 'habit' | 'custom';
export type GoalStatus = 'active' | 'completed' | 'archived';

export type JobApplicationStatus =
  | 'interested'
  | 'applied'
  | 'assessment'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'withdrawn';

export type JournalMood = 'great' | 'good' | 'neutral' | 'low' | 'stressed';

export interface DashboardCardConfig {
  id: 'daily' | 'financial' | 'goals' | 'habits' | 'career' | 'insights' | 'score';
  label: string;
  visible: boolean;
  size: 'compact' | 'wide';
  order: number;
}

export interface BentoScoreWeights {
  financial: number;
  productivity: number;
  habits: number;
  goals: number;
  career: number;
  wellbeing: number;
}

export interface AppSettings {
  userName: string;
  currency: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat: TimeFormat;
  startOfWeek: StartOfWeek;
  language: string;
  theme: ThemeMode;
  accent: AccentChoice;
  onboardingCompleted: boolean;
  notificationsEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  appLockEnabled: boolean;
  appLockPinHash: string;
  bentoScoreEnabled: boolean;
  bentoScoreWeights: BentoScoreWeights;
  dashboardLayout: 'bento' | 'compact' | 'focus';
  dashboardCards: DashboardCardConfig[];
  aiLayer2LocalEnabled: boolean;
  aiLayer3ExternalEnabled: boolean;
  aiProvider: 'none' | 'openai_compatible';
  aiEndpoint: string;
  aiModel: string;
  aiApiKey: string;
}

export interface FinanceAccount {
  id: string;
  name: string;
  institution: string;
  type: AccountType;
  openingBalanceMinor: number;
  currency: string;
  color: string;
  notes: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceCategory {
  id: string;
  name: string;
  kind: 'expense' | 'income';
  icon: string;
  color: string;
  subcategories: string[];
  isDefault: boolean;
}

export interface FinanceTransaction {
  id: string;
  type: TransactionType;
  amountMinor: number;
  category: string;
  subcategory: string;
  accountId: string;
  toAccountId?: string | null;
  date: string;
  time: string;
  merchant: string;
  description: string;
  tags: string[];
  notes: string;
  recurring: boolean;
  recurrence: RecurrencePattern;
  attachmentId?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface FinanceBudget {
  id: string;
  name: string;
  category: string; // category name or 'ALL'
  limitMinor: number;
  period: BudgetPeriod;
  startDate?: string | null;
  endDate?: string | null;
  warningThresholdPct: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  accountId?: string | null;
  targetMinor: number;
  currentMinor: number;
  monthlyContributionMinor: number;
  targetDate?: string | null;
  isEmergencyFund: boolean;
  notes: string;
  history: { id: string; date: string; amountMinor: number; note: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentHolding {
  id: string;
  name: string;
  assetType: InvestmentAssetType;
  investedMinor: number;
  currentValuationMinor: number;
  valuationUpdatedAt: string;
  purchaseDate: string;
  quantity?: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface DebtPayment {
  id: string;
  date: string;
  amountMinor: number;
  note: string;
}

export interface DebtRecord {
  id: string;
  title: string;
  kind: DebtKind;
  counterparty: string;
  principalMinor: number;
  remainingMinor: number;
  emiMinor?: number | null;
  dueDate?: string | null;
  interestRatePct?: number | null;
  payments: DebtPayment[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillSubscription {
  id: string;
  name: string;
  kind: 'bill' | 'subscription';
  amountMinor: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  nextDueDate: string;
  accountId?: string | null;
  category: string;
  paidDates: string[];
  reminderDaysBefore: number;
  notes: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  startDate: string | null;
  dueDate: string | null;
  dueTime: string | null;
  category: string;
  tags: string[];
  reminderAt: string | null;
  recurrence: RecurrencePattern;
  goalId: string | null;
  notes: string;
  subtasks: Subtask[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  kind: 'event' | 'deadline' | 'reminder';
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
  color: string;
  notes: string;
  taskId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineStep {
  id: string;
  title: string;
  durationMinutes: number;
  order: number;
}

export interface Routine {
  id: string;
  name: string;
  kind: 'morning' | 'evening' | 'work' | 'study' | 'custom';
  description: string;
  steps: RoutineStep[];
  scheduledTime: string | null;
  daysOfWeek: number[]; // 0=Sun..6=Sat
  completionLogs: Record<string, string[]>; // date -> completed stepIds
  color: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuickNote {
  id: string;
  title: string;
  content: string;
  category: string;
  pinned: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface HabitLogEntry {
  status: HabitLogStatus;
  count: number;
  note?: string;
}

export interface Habit {
  id: string;
  name: string;
  description: string;
  kind: HabitKind;
  frequency: HabitFrequency;
  scheduledDays: number[]; // 0..6
  targetCount: number;
  unit: string;
  reminderTime: string | null;
  startDate: string;
  endDate: string | null;
  category: string;
  color: string;
  logs: Record<string, HabitLogEntry>; // YYYY-MM-DD -> entry
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  targetDate: string | null;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: GoalCategory;
  kind: GoalKind;
  targetValue: number;
  currentValue: number;
  unit: string;
  startDate: string;
  deadline: string | null;
  priority: TaskPriority;
  status: GoalStatus;
  milestones: Milestone[];
  linkedHabitIds: string[];
  linkedSavingsId?: string | null;
  notes: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string | null;
  current: boolean;
  highlights: string;
}

export interface CareerProfile {
  headline: string;
  targetRole: string;
  summary: string;
  experiences: WorkExperience[];
  certifications: string[];
}

export interface SkillItem {
  id: string;
  name: string;
  category: string;
  proficiencyPct: number;
  targetPct: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseItem {
  id: string;
  title: string;
  provider: string;
  subject: string;
  totalLessons: number;
  completedLessons: number;
  status: 'planned' | 'active' | 'completed';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
  id: string;
  subject: string;
  courseId?: string | null;
  skillId?: string | null;
  goalId?: string | null;
  durationMinutes: number;
  date: string;
  notes: string;
  createdAt: string;
}

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  status: JobApplicationStatus;
  salaryExpectation: string;
  location: string;
  appliedDate: string;
  followUpDate: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood?: JournalMood | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MemoryItem {
  id: string;
  title: string;
  date: string;
  kind: 'achievement' | 'trip' | 'milestone' | 'event';
  description: string;
  location: string;
  attachmentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WishlistItem {
  id: string;
  name: string;
  priceMinor: number;
  priority: TaskPriority;
  category: string;
  purchaseLink: string;
  targetDate: string | null;
  purchased: boolean;
  linkedSavingsId?: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface HealthLog {
  id: string;
  date: string;
  sleepHours?: number | null;
  exerciseMinutes?: number | null;
  waterLiters?: number | null;
  weightKg?: number | null;
  steps?: number | null;
  customMetricName?: string;
  customMetricValue?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface VaultEntry {
  id: string;
  title: string;
  category: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface BentoAttachment {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
  linkedModule: string;
  linkedId: string;
  createdAt: string;
}

export interface BentoNotification {
  id: string;
  title: string;
  body: string;
  category: 'task' | 'habit' | 'bill' | 'debt' | 'goal' | 'system';
  dueDate: string;
  read: boolean;
  dismissed: boolean;
  snoozedUntil?: string | null;
  route: NavSection;
  createdAt: string;
}

export interface AssistantHistoryEntry {
  id: string;
  prompt: string;
  intent: string;
  module: string;
  summary: string;
  confirmed: boolean;
  timestamp: string;
}

export interface BentoDatabaseSnapshot {
  schemaVersion: number;
  exportedAt: string;
  settings: AppSettings;
  accounts: FinanceAccount[];
  categories: FinanceCategory[];
  transactions: FinanceTransaction[];
  budgets: FinanceBudget[];
  savingsGoals: SavingsGoal[];
  investments: InvestmentHolding[];
  debts: DebtRecord[];
  bills: BillSubscription[];
  tasks: Task[];
  events: CalendarEvent[];
  routines: Routine[];
  notes: QuickNote[];
  habits: Habit[];
  goals: Goal[];
  careerProfile: CareerProfile;
  skills: SkillItem[];
  courses: CourseItem[];
  studySessions: StudySession[];
  jobApplications: JobApplication[];
  journalEntries: JournalEntry[];
  memories: MemoryItem[];
  wishlist: WishlistItem[];
  healthLogs: HealthLog[];
  vaultEntries: VaultEntry[];
  attachments: BentoAttachment[];
  notifications: BentoNotification[];
  assistantHistory: AssistantHistoryEntry[];
}
