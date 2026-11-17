import { BentoDatabaseSnapshot, NavSection, TaskPriority, TransactionType } from '../types/bento';
import {
  calculateFinancialSummary,
  computeAllAccountBalances,
  filterTransactionsByDateRange,
  formatMoney,
  getMonthBounds,
  toLocalISODate,
  toMinor,
} from '../utils/finance';
import { generatePeriodReview } from './intelligence';

export type AssistantActionKind =
  | 'create_transaction'
  | 'create_task'
  | 'create_goal'
  | 'log_study'
  | 'log_habit'
  | 'create_journal'
  | 'create_note'
  | 'query_response';

export interface ParsedAssistantProposal {
  id: string;
  rawInput: string;
  layer: 'deterministic' | 'external_ai';
  kind: AssistantActionKind;
  module: string;
  confidence: 'high' | 'medium' | 'ambiguous';
  summary: string;
  requiresConfirmation: boolean;
  answerText?: string;
  answerRoute?: NavSection;
  payload: {
    // Transaction fields
    txType?: TransactionType;
    amountMinor?: number;
    category?: string;
    accountId?: string;
    toAccountId?: string;
    description?: string;
    merchant?: string;
    date?: string;
    // Task fields
    taskTitle?: string;
    dueDate?: string;
    dueTime?: string | null;
    priority?: TaskPriority;
    hasReminder?: boolean;
    // Goal fields
    goalTitle?: string;
    goalKind?: 'financial' | 'numeric' | 'completion';
    goalTarget?: number;
    goalUnit?: string;
    // Study fields
    studySubject?: string;
    durationMinutes?: number;
    // Habit fields
    habitId?: string;
    habitName?: string;
    // Journal / Note fields
    noteTitle?: string;
    noteContent?: string;
  };
}

function resolveRelativeDate(text: string, refDate = new Date()): string {
  const lower = text.toLowerCase();
  const base = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  if (lower.includes('day after tomorrow')) {
    base.setDate(base.getDate() + 2);
    return toLocalISODate(base);
  }
  if (lower.includes('tomorrow')) {
    base.setDate(base.getDate() + 1);
    return toLocalISODate(base);
  }
  if (lower.includes('yesterday')) {
    base.setDate(base.getDate() - 1);
    return toLocalISODate(base);
  }
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < weekdays.length; i++) {
    if (lower.includes(weekdays[i])) {
      const diff = (i - base.getDay() + 7) % 7 || 7;
      base.setDate(base.getDate() + diff);
      return toLocalISODate(base);
    }
  }
  return toLocalISODate(base);
}

function resolveTime(text: string): string | null {
  const match = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2] ? parseInt(match[2], 10) : 0;
    const meridiem = match[3].toLowerCase();
    if (meridiem === 'pm' && h < 12) h += 12;
    if (meridiem === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const match24 = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (match24) {
    return `${match24[1].padStart(2, '0')}:${match24[2]}`;
  }
  return null;
}

function extractAmount(text: string): number | null {
  const cleaned = text.replace(/,/g, '');
  const match = cleaned.match(/(?:₹|rs\.?|inr|\$|€|£)?\s*(\d+(?:\.\d{1,2})?)\s*(?:rs|inr|rupees|dollars)?/i);
  if (!match) return null;
  const num = Number(match[1]);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function matchCategory(text: string, kind: 'expense' | 'income', db: BentoDatabaseSnapshot): string {
  const lower = text.toLowerCase();
  const keywordMap: Array<[RegExp, string]> = [
    [/dinner|lunch|breakfast|coffee|tea|food|grocer|snack|meal|restaurant|pizza|biryani/, 'Food'],
    [/uber|ola|cab|taxi|bus|train|metro|fuel|petrol|diesel|auto|commute|transport/, 'Transport'],
    [/shop|amazon|flipkart|clothes|shoes|electronics|mall|order/, 'Shopping'],
    [/rent|lease|landlord|maintenance/, 'Rent'],
    [/electric|water bill|wifi|internet|broadband|recharge|mobile|gas|utility/, 'Utilities'],
    [/movie|cinema|netflix|game|concert|party|entertainment/, 'Entertainment'],
    [/doctor|hospital|medicine|pharmacy|health|clinic|gym/, 'Healthcare'],
    [/course|book|tuition|exam|udemy|coursera|education/, 'Education'],
    [/flight|hotel|trip|travel|vacation|booking/, 'Travel'],
    [/salon|haircut|grooming|skincare/, 'Personal Care'],
    [/subscription|spotify|icloud|prime|youtube/, 'Subscriptions'],
    [/salary|paycheck|payroll|wage/, 'Salary'],
    [/freelance|client|invoice|consulting/, 'Freelance'],
    [/business|sales|revenue/, 'Business'],
    [/interest|fd/, 'Interest'],
    [/dividend|mutual fund|stock|return/, 'Investment Returns'],
    [/gift|bonus|cashback|reward/, 'Gifts'],
  ];

  for (const [rx, cat] of keywordMap) {
    if (rx.test(lower)) {
      const exists = db.categories.find((c) => c.name.toLowerCase() === cat.toLowerCase() && c.kind === kind);
      if (exists) return exists.name;
      return cat;
    }
  }

  for (const cat of db.categories.filter((c) => c.kind === kind)) {
    if (lower.includes(cat.name.toLowerCase())) return cat.name;
  }

  return kind === 'income' ? 'Salary' : 'Other';
}

function matchAccount(text: string, db: BentoDatabaseSnapshot): string {
  const lower = text.toLowerCase();
  for (const acc of db.accounts) {
    if (lower.includes(acc.name.toLowerCase())) return acc.id;
  }
  if (lower.includes('cash')) {
    const cashAcc = db.accounts.find((a) => a.type === 'cash');
    if (cashAcc) return cashAcc.id;
  }
  if (lower.includes('bank')) {
    const bankAcc = db.accounts.find((a) => a.type === 'savings' || a.type === 'current');
    if (bankAcc) return bankAcc.id;
  }
  return db.accounts[0]?.id ?? '';
}

/**
 * Layer 1 — Offline Deterministic Natural Language Parser ("Tell BENTO...")
 */
export function parseBentoCommand(
  input: string,
  db: BentoDatabaseSnapshot,
  refDate = new Date()
): ParsedAssistantProposal {
  const text = input.trim();
  const lower = text.toLowerCase();
  const id = `prop-${Date.now()}`;
  const cur = db.settings.currency;

  // ── 1. Local Read-Only Queries ──────────────────────────────────────
  if (/^(how much money|what is my balance|my balance|net worth|total balance)/i.test(lower)) {
    const balances = computeAllAccountBalances(db.accounts, db.transactions);
    const activeAccounts = db.accounts.filter((a) => a.active);
    const totalMinor = activeAccounts.reduce((sum, a) => sum + (balances[a.id] ?? 0), 0);
    const breakdown = activeAccounts
      .map((a) => `${a.name}: ${formatMoney(balances[a.id] ?? 0, cur)}`)
      .join(' · ');

    return {
      id,
      rawInput: text,
      layer: 'deterministic',
      kind: 'query_response',
      module: 'Money',
      confidence: 'high',
      summary: 'Queried live account balances',
      requiresConfirmation: false,
      answerText:
        activeAccounts.length > 0
          ? `Your total across ${activeAccounts.length} active account${activeAccounts.length === 1 ? '' : 's'} is ${formatMoney(totalMinor, cur)}.\n${breakdown}`
          : 'You have not added any accounts yet. Add an account in Money to track your balance.',
      answerRoute: 'money',
      payload: {},
    };
  }

  if (/summarize my week|weekly summary|weekly review|how was my week/i.test(lower)) {
    const rev = generatePeriodReview(db, 'week', refDate);
    return {
      id,
      rawInput: text,
      layer: 'deterministic',
      kind: 'query_response',
      module: 'Intelligence',
      confidence: 'high',
      summary: 'Generated weekly summary from local records',
      requiresConfirmation: false,
      answerText: `Week (${rev.startDate} to ${rev.endDate}): ${rev.tasksCompleted} tasks completed · ${rev.habitConsistencyPct}% habit consistency · ${formatMoney(rev.expenseMinor, cur)} spent · ${formatMoney(rev.savingsMinor, cur)} net saved · ${(rev.learningMinutes / 60).toFixed(1)}h studied.`,
      answerRoute: 'more',
      payload: {},
    };
  }

  if (/show (my )?.*expenses?|how much did i spend/i.test(lower)) {
    const bounds = getMonthBounds(refDate.getFullYear(), refDate.getMonth());
    const txs = filterTransactionsByDateRange(db.transactions, bounds.start, bounds.end);
    const matchedCat = db.categories.find((c) => c.kind === 'expense' && lower.includes(c.name.toLowerCase()));
    const filtered = matchedCat ? txs.filter((t) => t.category === matchedCat.name) : txs;
    const summary = calculateFinancialSummary(filtered);
    const label = matchedCat ? matchedCat.name : 'all categories';
    const count = filtered.filter((t) => t.type === 'expense').length;
    return {
      id,
      rawInput: text,
      layer: 'deterministic',
      kind: 'query_response',
      module: 'Money',
      confidence: 'high',
      summary: `Queried ${label} expenses this month`,
      requiresConfirmation: false,
      answerText: `You spent ${formatMoney(summary.netExpenseMinor, cur)} on ${label} this month across ${count} expense transaction${count === 1 ? '' : 's'}.`,
      answerRoute: 'money',
      payload: {},
    };
  }

  if (/what tasks|overdue|due today/i.test(lower)) {
    const today = toLocalISODate(refDate);
    const dueToday = db.tasks.filter((t) => !t.deletedAt && t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate === today);
    const overdue = db.tasks.filter((t) => !t.deletedAt && t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate && t.dueDate < today);
    return {
      id,
      rawInput: text,
      layer: 'deterministic',
      kind: 'query_response',
      module: 'Daily',
      confidence: 'high',
      summary: 'Checked today & overdue tasks',
      requiresConfirmation: false,
      answerText: `Today: ${dueToday.length} task${dueToday.length === 1 ? '' : 's'} due. Overdue: ${overdue.length} task${overdue.length === 1 ? '' : 's'}.${dueToday.length > 0 ? ` Next: "${dueToday[0].title}".` : ''}`,
      answerRoute: 'daily',
      payload: {},
    };
  }

  // ── 2. Transfer Command ─────────────────────────────────────────────
  if (/\b(transfer|transferred|moved)\b/i.test(lower)) {
    const amount = extractAmount(text);
    const fromTo = text.match(/from\s+([a-z0-9 ]+?)\s+to\s+([a-z0-9 ]+)/i);
    let fromId = db.accounts[0]?.id ?? '';
    let toId = db.accounts[1]?.id ?? '';
    if (fromTo) {
      const fMatch = db.accounts.find((a) => a.name.toLowerCase().includes(fromTo[1].trim().toLowerCase()));
      const tMatch = db.accounts.find((a) => a.name.toLowerCase().includes(fromTo[2].trim().toLowerCase()));
      if (fMatch) fromId = fMatch.id;
      if (tMatch) toId = tMatch.id;
    }
    return {
      id,
      rawInput: text,
      layer: 'deterministic',
      kind: 'create_transaction',
      module: 'Money',
      confidence: amount && fromId && toId ? 'high' : 'ambiguous',
      summary: `Transfer ${amount ? formatMoney(toMinor(amount), cur) : '?'}`,
      requiresConfirmation: true,
      payload: {
        txType: 'transfer',
        amountMinor: amount ? toMinor(amount) : 0,
        category: 'Transfer',
        accountId: fromId,
        toAccountId: toId,
        description: text,
        date: resolveRelativeDate(text, refDate),
      },
    };
  }

  // ── 3. Goal Command ─────────────────────────────────────────────────
  if (/\b(create|add|set|new)\b.*\bgoal\b/i.test(lower)) {
    const amount = extractAmount(text);
    const isFinancial = /\b(save|savings|fund|money|₹|rs|inr|\$|budget)\b/i.test(lower);
    const cleanTitle = text
      .replace(/^(create|add|set|new)\s+(a\s+)?goal\s+(to\s+)?/i, '')
      .trim();
    return {
      id,
      rawInput: text,
      layer: 'deterministic',
      kind: 'create_goal',
      module: 'Goals',
      confidence: cleanTitle ? 'high' : 'medium',
      summary: `New ${isFinancial ? 'financial ' : ''}goal: "${cleanTitle || 'Personal Goal'}"`,
      requiresConfirmation: true,
      payload: {
        goalTitle: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
        goalKind: isFinancial ? 'financial' : amount ? 'numeric' : 'completion',
        goalTarget: amount ?? 100,
        goalUnit: isFinancial ? cur : 'units',
        dueDate: resolveRelativeDate(text, refDate),
      },
    };
  }

  // ── 4. Learning / Study Session Command ─────────────────────────────
  if (/\b(studied|study|learned|learning|practiced)\b/i.test(lower) && !/\bremind me\b/i.test(lower)) {
    let mins = 30;
    const hrMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i);
    const minMatch = lower.match(/(\d+)\s*(?:minutes?|mins?)/i);
    if (hrMatch) mins = Math.round(Number(hrMatch[1]) * 60);
    else if (minMatch) mins = parseInt(minMatch[1], 10);

    const subjMatch = text.match(/(?:studied|study|learned|practiced)\s+([a-z0-9 &+.#-]+?)(?:\s+for|\s+today|\s+yesterday|$)/i);
    const subject = subjMatch?.[1]?.trim() || 'Focused Study';

    return {
      id,
      rawInput: text,
      layer: 'deterministic',
      kind: 'log_study',
      module: 'Career & Learning',
      confidence: 'high',
      summary: `Log ${mins}m study session on ${subject}`,
      requiresConfirmation: true,
      payload: {
        studySubject: subject.charAt(0).toUpperCase() + subject.slice(1),
        durationMinutes: mins,
        date: resolveRelativeDate(text, refDate),
      },
    };
  }

  // ── 5. Income Command ───────────────────────────────────────────────
  if (/\b(received|earned|salary|income|credited|got paid|freelance payment)\b/i.test(lower)) {
    const amount = extractAmount(text);
    const category = matchCategory(text, 'income', db);
    const accountId = matchAccount(text, db);
    return {
      id,
      rawInput: text,
      layer: 'deterministic',
      kind: 'create_transaction',
      module: 'Money',
      confidence: amount ? 'high' : 'ambiguous',
      summary: `Income: ${amount ? formatMoney(toMinor(amount), cur) : 'Amount missing'} · ${category}`,
      requiresConfirmation: true,
      payload: {
        txType: 'income',
        amountMinor: amount ? toMinor(amount) : 0,
        category,
        accountId,
        description: text,
        merchant: '',
        date: resolveRelativeDate(text, refDate),
      },
    };
  }

  // ── 6. Expense Command ──────────────────────────────────────────────
  if (/\b(spent|paid|bought|expense|cost|ordered|bill)\b/i.test(lower)) {
    const amount = extractAmount(text);
    const category = matchCategory(text, 'expense', db);
    const accountId = matchAccount(text, db);
    const onMatch = text.match(/\b(?:on|for|at)\s+([a-z0-9 &'-]+?)(?:\s+today|\s+yesterday|\s+from|\s+using|$)/i);
    const desc = onMatch?.[1]?.trim() || category;

    return {
      id,
      rawInput: text,
      layer: 'deterministic',
      kind: 'create_transaction',
      module: 'Money',
      confidence: amount ? 'high' : 'ambiguous',
      summary: `Expense: ${amount ? formatMoney(toMinor(amount), cur) : 'Amount missing'} · ${category}`,
      requiresConfirmation: true,
      payload: {
        txType: 'expense',
        amountMinor: amount ? toMinor(amount) : 0,
        category,
        accountId,
        description: desc.charAt(0).toUpperCase() + desc.slice(1),
        merchant: '',
        date: resolveRelativeDate(text, refDate),
      },
    };
  }

  // ── 7. Journal / Note Command ───────────────────────────────────────
  if (/^(journal|diary):/i.test(lower)) {
    const body = text.replace(/^(journal|diary):\s*/i, '').trim();
    return {
      id,
      rawInput: text,
      layer: 'deterministic',
      kind: 'create_journal',
      module: 'Life',
      confidence: 'high',
      summary: `New journal entry (${toLocalISODate(refDate)})`,
      requiresConfirmation: true,
      payload: {
        noteTitle: body.slice(0, 48),
        noteContent: body,
        date: toLocalISODate(refDate),
      },
    };
  }

  if (/^(note|memo):/i.test(lower)) {
    const body = text.replace(/^(note|memo):\s*/i, '').trim();
    return {
      id,
      rawInput: text,
      layer: 'deterministic',
      kind: 'create_note',
      module: 'Daily',
      confidence: 'high',
      summary: `Quick note: "${body.slice(0, 40)}"`,
      requiresConfirmation: true,
      payload: {
        noteTitle: body.slice(0, 48),
        noteContent: body,
      },
    };
  }

  // ── 8. Habit Completion Command ─────────────────────────────────────
  if (/\b(completed|did|finished)\b/i.test(lower)) {
    const matchedHabit = db.habits.find((h) => lower.includes(h.name.toLowerCase()));
    if (matchedHabit) {
      return {
        id,
        rawInput: text,
        layer: 'deterministic',
        kind: 'log_habit',
        module: 'Habits',
        confidence: 'high',
        summary: `Log habit "${matchedHabit.name}" for ${resolveRelativeDate(text, refDate)}`,
        requiresConfirmation: true,
        payload: {
          habitId: matchedHabit.id,
          habitName: matchedHabit.name,
          date: resolveRelativeDate(text, refDate),
        },
      };
    }
  }

  // ── 9. Task / Reminder Command (Default structured fallback) ────────
  const dueDate = resolveRelativeDate(text, refDate);
  const dueTime = resolveTime(text);
  const hasReminder = /\bremind\b/i.test(lower) || dueTime !== null;
  let priority: TaskPriority = 'none';
  if (/\burgent\b/i.test(lower)) priority = 'urgent';
  else if (/\bhigh\b/i.test(lower)) priority = 'high';
  else if (/\bmedium\b/i.test(lower)) priority = 'medium';
  else if (/\blow\b/i.test(lower)) priority = 'low';

  const cleanedTask = text
    .replace(/^(add\s+task|task|remind\s+me\s+to|remind\s+me|todo)\s*/i, '')
    .replace(/\b(today|tomorrow|yesterday|day after tomorrow)\b/gi, '')
    .replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/gi, '')
    .replace(/\bremind\s+me\s+to\b/gi, '')
    .replace(/\b(high|medium|low|urgent)\s+priority\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const finalTitle = cleanedTask ? cleanedTask.charAt(0).toUpperCase() + cleanedTask.slice(1) : text;

  return {
    id,
    rawInput: text,
    layer: 'deterministic',
    kind: 'create_task',
    module: 'Daily',
    confidence: cleanedTask ? 'medium' : 'ambiguous',
    summary: `${hasReminder ? 'Reminder' : 'Task'}: "${finalTitle}"`,
    requiresConfirmation: true,
    payload: {
      taskTitle: finalTitle,
      dueDate,
      dueTime,
      priority,
      hasReminder,
    },
  };
}

/**
 * Layer 3 — Optional External AI Provider (Disabled by default; requires explicit opt-in)
 */
export async function queryOptionalExternalAI(
  prompt: string,
  db: BentoDatabaseSnapshot
): Promise<string> {
  const { aiLayer3ExternalEnabled, aiProvider, aiEndpoint, aiModel, aiApiKey } = db.settings;
  if (!aiLayer3ExternalEnabled || aiProvider === 'none' || !aiApiKey.trim()) {
    throw new Error('External AI provider is disabled or unconfigured.');
  }

  const res = await fetch(aiEndpoint || 'https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiApiKey.trim()}`,
    },
    body: JSON.stringify({
      model: aiModel || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are BENTO Assistant, a concise personal productivity advisor. Never fabricate user records.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Provider returned HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No response returned.';
}
