import { AppSettings, BentoDatabaseSnapshot, CareerProfile, DashboardCardConfig, FinanceCategory } from '../types/bento';

export const DEFAULT_DASHBOARD_CARDS: DashboardCardConfig[] = [
  { id: 'daily', label: 'Daily Overview', visible: true, size: 'wide', order: 0 },
  { id: 'financial', label: 'Financial Snapshot', visible: true, size: 'wide', order: 1 },
  { id: 'habits', label: 'Habits & Streaks', visible: true, size: 'compact', order: 2 },
  { id: 'goals', label: 'Active Goals', visible: true, size: 'compact', order: 3 },
  { id: 'career', label: 'Career & Learning', visible: true, size: 'compact', order: 4 },
  { id: 'insights', label: 'BENTO Insights', visible: true, size: 'compact', order: 5 },
  { id: 'score', label: 'BENTO Score', visible: true, size: 'wide', order: 6 },
];

export const DEFAULT_SETTINGS: AppSettings = {
  userName: '',
  currency: 'INR',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12h',
  startOfWeek: 'monday',
  language: 'English',
  theme: 'dark',
  accent: 'emerald',
  onboardingCompleted: false,
  notificationsEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:30',
  quietHoursEnd: '07:00',
  appLockEnabled: false,
  appLockPinHash: '',
  bentoScoreEnabled: true,
  bentoScoreWeights: {
    financial: 25,
    productivity: 20,
    habits: 20,
    goals: 15,
    career: 10,
    wellbeing: 10,
  },
  dashboardLayout: 'bento',
  dashboardCards: DEFAULT_DASHBOARD_CARDS,
  aiLayer2LocalEnabled: false,
  aiLayer3ExternalEnabled: false,
  aiProvider: 'none',
  aiEndpoint: 'https://api.openai.com/v1/chat/completions',
  aiModel: 'gpt-4o-mini',
  aiApiKey: '',
};

export const DEFAULT_FINANCE_CATEGORIES: FinanceCategory[] = [
  { id: 'cat-food', name: 'Food', kind: 'expense', icon: 'utensils', color: '#10b981', subcategories: ['Dining Out', 'Groceries', 'Coffee'], isDefault: true },
  { id: 'cat-transport', name: 'Transport', kind: 'expense', icon: 'car', color: '#3b82f6', subcategories: ['Fuel', 'Transit', 'Cab'], isDefault: true },
  { id: 'cat-shopping', name: 'Shopping', kind: 'expense', icon: 'shopping-bag', color: '#8b5cf6', subcategories: ['Clothing', 'Electronics', 'Home'], isDefault: true },
  { id: 'cat-rent', name: 'Rent', kind: 'expense', icon: 'home', color: '#d4a053', subcategories: ['Apartment', 'Maintenance'], isDefault: true },
  { id: 'cat-utilities', name: 'Utilities', kind: 'expense', icon: 'zap', color: '#f59e0b', subcategories: ['Electricity', 'Internet', 'Mobile'], isDefault: true },
  { id: 'cat-entertainment', name: 'Entertainment', kind: 'expense', icon: 'film', color: '#ec4899', subcategories: ['Movies', 'Games', 'Events'], isDefault: true },
  { id: 'cat-healthcare', name: 'Healthcare', kind: 'expense', icon: 'heart-pulse', color: '#ef4444', subcategories: ['Doctor', 'Pharmacy', 'Fitness'], isDefault: true },
  { id: 'cat-education', name: 'Education', kind: 'expense', icon: 'graduation-cap', color: '#06b6d4', subcategories: ['Courses', 'Books', 'Exams'], isDefault: true },
  { id: 'cat-travel', name: 'Travel', kind: 'expense', icon: 'plane', color: '#14b8a6', subcategories: ['Flights', 'Hotels', 'Local'], isDefault: true },
  { id: 'cat-personal', name: 'Personal Care', kind: 'expense', icon: 'sparkles', color: '#a855f7', subcategories: ['Grooming', 'Wellness'], isDefault: true },
  { id: 'cat-subs', name: 'Subscriptions', kind: 'expense', icon: 'repeat', color: '#6366f1', subcategories: ['Software', 'Media', 'Cloud'], isDefault: true },
  { id: 'cat-other-exp', name: 'Other', kind: 'expense', icon: 'circle-dot', color: '#64748b', subcategories: ['Misc'], isDefault: true },

  { id: 'cat-salary', name: 'Salary', kind: 'income', icon: 'briefcase', color: '#10b981', subcategories: ['Monthly Pay', 'Bonus'], isDefault: true },
  { id: 'cat-freelance', name: 'Freelance', kind: 'income', icon: 'laptop', color: '#3b82f6', subcategories: ['Consulting', 'Projects'], isDefault: true },
  { id: 'cat-business', name: 'Business', kind: 'income', icon: 'building', color: '#d4a053', subcategories: ['Sales', 'Retainer'], isDefault: true },
  { id: 'cat-interest', name: 'Interest', kind: 'income', icon: 'percent', color: '#14b8a6', subcategories: ['Bank Interest', 'FD'], isDefault: true },
  { id: 'cat-inv-ret', name: 'Investment Returns', kind: 'income', icon: 'trending-up', color: '#8b5cf6', subcategories: ['Dividends', 'Realized Gains'], isDefault: true },
  { id: 'cat-gifts', name: 'Gifts', kind: 'income', icon: 'gift', color: '#ec4899', subcategories: ['Family', 'Rewards'], isDefault: true },
  { id: 'cat-other-inc', name: 'Other', kind: 'income', icon: 'plus-circle', color: '#64748b', subcategories: ['Misc'], isDefault: true },
];

export const DEFAULT_CAREER_PROFILE: CareerProfile = {
  headline: '',
  targetRole: '',
  summary: '',
  experiences: [],
  certifications: [],
};

export const BENTO_PALETTE = [
  '#10b981',
  '#8b5cf6',
  '#d4a053',
  '#3b82f6',
  '#f43f5e',
  '#14b8a6',
  '#f59e0b',
  '#ec4899',
  '#06b6d4',
  '#6366f1',
] as const;

export const CURRENCY_OPTIONS = [
  { code: 'INR', symbol: '₹', label: 'INR (₹) — Indian Rupee', locale: 'en-IN' },
  { code: 'USD', symbol: '$', label: 'USD ($) — US Dollar', locale: 'en-US' },
  { code: 'EUR', symbol: '€', label: 'EUR (€) — Euro', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', label: 'GBP (£) — British Pound', locale: 'en-GB' },
  { code: 'JPY', symbol: '¥', label: 'JPY (¥) — Japanese Yen', locale: 'ja-JP' },
] as const;

export function createEmptySnapshot(): BentoDatabaseSnapshot {
  return {
    schemaVersion: 3,
    exportedAt: new Date().toISOString(),
    settings: { ...DEFAULT_SETTINGS },
    accounts: [],
    categories: [...DEFAULT_FINANCE_CATEGORIES],
    transactions: [],
    budgets: [],
    savingsGoals: [],
    investments: [],
    debts: [],
    bills: [],
    tasks: [],
    events: [],
    routines: [],
    notes: [],
    habits: [],
    goals: [],
    careerProfile: { ...DEFAULT_CAREER_PROFILE },
    skills: [],
    courses: [],
    studySessions: [],
    jobApplications: [],
    journalEntries: [],
    memories: [],
    wishlist: [],
    healthLogs: [],
    vaultEntries: [],
    attachments: [],
    notifications: [],
    assistantHistory: [],
  };
}
