import assert from 'node:assert/strict';
import { createEmptySnapshot } from '../utils/defaults';
import {
  calculateFinancialSummary,
  computeAccountBalanceMinor,
  evaluateBudgets,
  exportTransactionsToCSV,
  parseTransactionsCSV,
  toMinor,
} from '../utils/finance';
import { computeHabitStats } from '../utils/habits';
import { computeBentoScore, generateExplainableInsights } from '../services/intelligence';
import { parseBentoCommand } from '../services/bentoParser';
import { mergeSnapshotsDeduplicatingById } from '../services/backup';

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`);
    throw err;
  }
}

test('Minor unit conversion avoids floating point drift', () => {
  assert.equal(toMinor(19.99) + toMinor(0.01), 2000);
  assert.equal(toMinor('₹1,250.50'), 125050);
});

test('Transfers do NOT count as income or expense, and reconcile balances accurately', () => {
  const bank = {
    id: 'acc-bank',
    name: 'HDFC Savings',
    institution: 'HDFC',
    type: 'savings' as const,
    openingBalanceMinor: 1000000, // ₹10,000
    currency: 'INR',
    color: '#10b981',
    notes: '',
    active: true,
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
  };
  const cash = {
    id: 'acc-cash',
    name: 'Cash Wallet',
    institution: 'Cash',
    type: 'cash' as const,
    openingBalanceMinor: 100000, // ₹1,000
    currency: 'INR',
    color: '#d4a053',
    notes: '',
    active: true,
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
  };

  const txs = [
    {
      id: 't1',
      type: 'income' as const,
      amountMinor: 2000000, // +₹20,000
      category: 'Salary',
      subcategory: '',
      accountId: 'acc-bank',
      toAccountId: null,
      date: '2026-11-05',
      time: '09:00',
      merchant: '',
      description: 'Monthly salary',
      tags: [],
      notes: '',
      recurring: false,
      recurrence: 'none' as const,
      createdAt: '2026-11-05T09:00:00Z',
      updatedAt: '2026-11-05T09:00:00Z',
    },
    {
      id: 't2',
      type: 'transfer' as const,
      amountMinor: 500000, // ₹5,000 bank -> cash
      category: 'Transfer',
      subcategory: '',
      accountId: 'acc-bank',
      toAccountId: 'acc-cash',
      date: '2026-11-06',
      time: '10:00',
      merchant: '',
      description: 'ATM Withdrawal',
      tags: [],
      notes: '',
      recurring: false,
      recurrence: 'none' as const,
      createdAt: '2026-11-06T10:00:00Z',
      updatedAt: '2026-11-06T10:00:00Z',
    },
    {
      id: 't3',
      type: 'expense' as const,
      amountMinor: 45000, // ₹450
      category: 'Food',
      subcategory: '',
      accountId: 'acc-cash',
      toAccountId: null,
      date: '2026-11-07',
      time: '20:00',
      merchant: 'Bistro',
      description: 'Dinner',
      tags: [],
      notes: '',
      recurring: false,
      recurrence: 'none' as const,
      createdAt: '2026-11-07T20:00:00Z',
      updatedAt: '2026-11-07T20:00:00Z',
    },
    {
      id: 't4',
      type: 'refund' as const,
      amountMinor: 15000, // ₹150 refund
      category: 'Food',
      subcategory: '',
      accountId: 'acc-cash',
      toAccountId: null,
      date: '2026-11-08',
      time: '11:00',
      merchant: 'Bistro',
      description: 'Split bill refund',
      tags: [],
      notes: '',
      recurring: false,
      recurrence: 'none' as const,
      createdAt: '2026-11-08T11:00:00Z',
      updatedAt: '2026-11-08T11:00:00Z',
    },
  ];

  const summary = calculateFinancialSummary(txs);
  assert.equal(summary.incomeMinor, 2000000);
  assert.equal(summary.netExpenseMinor, 30000); // 450 - 150
  assert.equal(summary.transferVolumeMinor, 500000);
  assert.equal(computeAccountBalanceMinor(bank, txs), 2500000); // 10k + 20k - 5k
  assert.equal(computeAccountBalanceMinor(cash, txs), 570000); // 1k + 5k - 450 + 150
});

test('Budgets track warning and exceeded thresholds accurately', () => {
  const budgets = [
    {
      id: 'b1',
      name: 'Food Budget',
      category: 'Food',
      limitMinor: 100000, // ₹1,000
      period: 'monthly' as const,
      warningThresholdPct: 80,
      notes: '',
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    },
  ];
  const txs = [
    {
      id: 'tx-food',
      type: 'expense' as const,
      amountMinor: 85000,
      category: 'Food',
      subcategory: '',
      accountId: 'a1',
      date: '2026-11-10',
      time: '13:00',
      merchant: '',
      description: 'Groceries',
      tags: [],
      notes: '',
      recurring: false,
      recurrence: 'none' as const,
      createdAt: '2026-11-10T13:00:00Z',
      updatedAt: '2026-11-10T13:00:00Z',
    },
  ];
  const rows = evaluateBudgets(budgets, txs, new Date('2026-11-16T12:00:00'));
  assert.equal(rows[0].status, 'warning');
  assert.equal(rows[0].remainingMinor, 15000);
});

test('Habit streaks preserve progress across planned rest days and skipped days', () => {
  const habit = {
    id: 'h1',
    name: 'Exercise',
    description: '',
    kind: 'positive' as const,
    frequency: 'daily' as const,
    scheduledDays: [0, 1, 2, 3, 4, 5, 6],
    targetCount: 1,
    unit: 'session',
    reminderTime: null,
    startDate: '2026-11-10',
    endDate: null,
    category: 'Health',
    color: '#10b981',
    logs: {
      '2026-11-13': { status: 'completed' as const, count: 1 },
      '2026-11-14': { status: 'rest' as const, count: 0 },
      '2026-11-15': { status: 'completed' as const, count: 1 },
      '2026-11-16': { status: 'completed' as const, count: 1 },
    },
    enabled: true,
    createdAt: '2026-11-10T00:00:00Z',
    updatedAt: '2026-11-16T00:00:00Z',
  };
  const stats = computeHabitStats(habit, new Date('2026-11-16T12:00:00'));
  assert.equal(stats.currentStreak, 3); // 13th, 15th, 16th — rest day on 14th does NOT break streak
});

test('BENTO Score excludes untracked dimensions instead of counting them as zero', () => {
  const db = createEmptySnapshot();
  db.tasks.push({
    id: 'task1',
    title: 'Finish report',
    description: '',
    priority: 'high',
    status: 'completed',
    startDate: null,
    dueDate: '2026-11-16',
    dueTime: null,
    category: 'Work',
    tags: [],
    reminderAt: null,
    recurrence: 'none',
    goalId: null,
    notes: '',
    subtasks: [],
    completedAt: '2026-11-16T10:00:00Z',
    createdAt: '2026-11-16T08:00:00Z',
    updatedAt: '2026-11-16T10:00:00Z',
  });

  const score = computeBentoScore(db, new Date('2026-11-16T12:00:00'));
  assert.equal(score.hasData, true);
  assert.equal(score.overallScore, 100); // Only productivity tracked -> 100%, not dragged down by 0s!
  const prodDim = score.dimensions.find((d) => d.key === 'productivity');
  assert.equal(prodDim?.effectiveWeightPct, 100);
});

test('Tell BENTO offline deterministic parser parses key commands accurately', () => {
  const db = createEmptySnapshot();
  db.accounts.push({
    id: 'acc-1',
    name: 'Bank Account',
    institution: 'HDFC',
    type: 'savings',
    openingBalanceMinor: 500000,
    currency: 'INR',
    color: '#10b981',
    notes: '',
    active: true,
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
  });

  const ref = new Date('2026-11-16T12:00:00');
  const exp = parseBentoCommand('Spent 450 on dinner today', db, ref);
  assert.equal(exp.kind, 'create_transaction');
  assert.equal(exp.payload.txType, 'expense');
  assert.equal(exp.payload.amountMinor, 45000);
  assert.equal(exp.payload.category, 'Food');

  const inc = parseBentoCommand('Received salary of 20000 in my bank account', db, ref);
  assert.equal(inc.kind, 'create_transaction');
  assert.equal(inc.payload.txType, 'income');
  assert.equal(inc.payload.amountMinor, 2000000);
  assert.equal(inc.payload.category, 'Salary');

  const rem = parseBentoCommand('Tomorrow at 7 PM remind me to study Excel', db, ref);
  assert.equal(rem.kind, 'create_task');
  assert.equal(rem.payload.dueDate, '2026-11-17');
  assert.equal(rem.payload.dueTime, '19:00');

  const goal = parseBentoCommand('Create a goal to save 50000', db, ref);
  assert.equal(goal.kind, 'create_goal');
  assert.equal(goal.payload.goalTarget, 50000);

  const study = parseBentoCommand('I studied accounting for 45 minutes', db, ref);
  assert.equal(study.kind, 'log_study');
  assert.equal(study.payload.durationMinutes, 45);

  const balQuery = parseBentoCommand('How much money do I have?', db, ref);
  assert.equal(balQuery.kind, 'query_response');
  assert.match(balQuery.answerText ?? '', /5,000/);
});

test('CSV export/import roundtrip and merge deduplication work cleanly', () => {
  const db = createEmptySnapshot();
  db.accounts.push({
    id: 'a1',
    name: 'Cash',
    institution: '',
    type: 'cash',
    openingBalanceMinor: 0,
    currency: 'INR',
    color: '#10b981',
    notes: '',
    active: true,
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
  });
  db.transactions.push({
    id: 'tx-1',
    type: 'expense',
    amountMinor: 12345,
    category: 'Food',
    subcategory: '',
    accountId: 'a1',
    toAccountId: null,
    date: '2026-11-16',
    time: '12:00',
    merchant: 'Cafe',
    description: 'Lunch',
    tags: ['work'],
    notes: '',
    recurring: false,
    recurrence: 'none',
    createdAt: '2026-11-16T12:00:00Z',
    updatedAt: '2026-11-16T12:00:00Z',
  });
  const csv = exportTransactionsToCSV(db.transactions, db.accounts);
  const parsed = parseTransactionsCSV(csv);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].amountMinor, 12345);
  assert.equal(parsed[0].category, 'Food');

  const merged = mergeSnapshotsDeduplicatingById(db, db);
  assert.equal(merged.transactions.length, 1);
  generateExplainableInsights(db, new Date('2026-11-16T12:00:00'));
});

console.log(`All ${passed} BENTO domain & logic tests passed.`);
