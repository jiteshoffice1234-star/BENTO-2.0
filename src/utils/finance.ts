import {
  DebtRecord,
  FinanceAccount,
  FinanceBudget,
  FinanceTransaction,
  InvestmentHolding,
  SavingsGoal,
} from '../types/bento';
import { CURRENCY_OPTIONS } from './defaults';

export const MINOR_SCALE = 100;

export function toMinor(major: number | string | null | undefined): number {
  if (major === null || major === undefined) return 0;
  const cleaned = typeof major === 'string' ? major.replace(/[^0-9.-]/g, '') : String(major);
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * MINOR_SCALE);
}

export function fromMinor(minor: number): number {
  if (!Number.isFinite(minor)) return 0;
  return minor / MINOR_SCALE;
}

export function formatMoney(minor: number, currency = 'INR'): string {
  const safeMinor = Number.isFinite(minor) ? minor : 0;
  const major = fromMinor(safeMinor);
  const meta = CURRENCY_OPTIONS.find((c) => c.code === currency);
  const locale = meta?.locale ?? 'en-IN';
  const maxFrac = currency === 'JPY' ? 0 : Math.abs(safeMinor % 100) === 0 ? 0 : 2;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: maxFrac,
    }).format(major);
  } catch {
    return `${currency} ${major.toFixed(maxFrac)}`;
  }
}

export function todayISO(): string {
  const d = new Date();
  return toLocalISODate(d);
}

export function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDisplayDate(isoDate: string | null | undefined, format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' = 'DD/MM/YYYY'): string {
  if (!isoDate) return '—';
  const parts = isoDate.slice(0, 10).split('-');
  if (parts.length !== 3) return isoDate;
  const [y, m, d] = parts;
  if (format === 'MM/DD/YYYY') return `${m}/${d}/${y}`;
  if (format === 'YYYY-MM-DD') return `${y}-${m}-${d}`;
  return `${d}/${m}/${y}`;
}

export function activeTransactions(transactions: FinanceTransaction[]): FinanceTransaction[] {
  return transactions.filter((t) => !t.deletedAt);
}

/**
 * Deterministic account balance reconciliation from opening balance + all non-deleted transactions.
 * Guarantees editing or deleting a transaction always yields an exact balance without drift.
 */
export function computeAccountBalanceMinor(account: FinanceAccount, transactions: FinanceTransaction[]): number {
  let balance = account.openingBalanceMinor;
  for (const tx of transactions) {
    if (tx.deletedAt) continue;
    if (tx.type === 'income' && tx.accountId === account.id) {
      balance += tx.amountMinor;
    } else if (tx.type === 'expense' && tx.accountId === account.id) {
      balance -= tx.amountMinor;
    } else if (tx.type === 'refund' && tx.accountId === account.id) {
      balance += tx.amountMinor;
    } else if (tx.type === 'adjustment' && tx.accountId === account.id) {
      balance += tx.amountMinor;
    } else if (tx.type === 'transfer') {
      if (tx.accountId === account.id) balance -= tx.amountMinor;
      if (tx.toAccountId === account.id) balance += tx.amountMinor;
    }
  }
  return balance;
}

export function computeAllAccountBalances(
  accounts: FinanceAccount[],
  transactions: FinanceTransaction[]
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const acc of accounts) {
    map[acc.id] = computeAccountBalanceMinor(acc, transactions);
  }
  return map;
}

export function filterTransactionsByDateRange(
  transactions: FinanceTransaction[],
  startDate: string,
  endDate: string
): FinanceTransaction[] {
  return transactions.filter((tx) => !tx.deletedAt && tx.date >= startDate && tx.date <= endDate);
}

export function getMonthBounds(year: number, monthIndex0: number): { start: string; end: string } {
  const start = new Date(year, monthIndex0, 1);
  const end = new Date(year, monthIndex0 + 1, 0);
  return { start: toLocalISODate(start), end: toLocalISODate(end) };
}

export function getWeekBounds(refDate = new Date(), startOfWeek: 'monday' | 'sunday' = 'monday'): { start: string; end: string } {
  const d = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const day = d.getDay();
  const diff = startOfWeek === 'monday' ? (day === 0 ? -6 : 1 - day) : -day;
  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toLocalISODate(start), end: toLocalISODate(end) };
}

export interface PeriodFinancialSummary {
  incomeMinor: number;
  grossExpenseMinor: number;
  refundMinor: number;
  netExpenseMinor: number;
  savingsMinor: number;
  savingsRatePct: number;
  transferVolumeMinor: number;
}

/**
 * Computes period income, net expenses (expenses minus refunds), savings, and savings rate.
 * Transfers between owned accounts are NEVER counted as income or expense.
 */
export function calculateFinancialSummary(transactions: FinanceTransaction[]): PeriodFinancialSummary {
  let incomeMinor = 0;
  let grossExpenseMinor = 0;
  let refundMinor = 0;
  let transferVolumeMinor = 0;

  for (const tx of transactions) {
    if (tx.deletedAt) continue;
    if (tx.type === 'income') {
      incomeMinor += tx.amountMinor;
    } else if (tx.type === 'expense') {
      grossExpenseMinor += tx.amountMinor;
    } else if (tx.type === 'refund') {
      refundMinor += tx.amountMinor;
    } else if (tx.type === 'transfer') {
      transferVolumeMinor += tx.amountMinor;
    }
  }

  const netExpenseMinor = Math.max(0, grossExpenseMinor - refundMinor);
  const savingsMinor = incomeMinor - netExpenseMinor;
  const savingsRatePct = incomeMinor > 0 ? Math.round((savingsMinor / incomeMinor) * 1000) / 10 : 0;

  return {
    incomeMinor,
    grossExpenseMinor,
    refundMinor,
    netExpenseMinor,
    savingsMinor,
    savingsRatePct,
    transferVolumeMinor,
  };
}

export function getCategoryExpenseBreakdown(transactions: FinanceTransaction[]): {
  category: string;
  amountMinor: number;
  percent: number;
  count: number;
}[] {
  const totals = new Map<string, { amountMinor: number; count: number }>();

  for (const tx of transactions) {
    if (tx.deletedAt) continue;
    if (tx.type === 'expense') {
      const cur = totals.get(tx.category) ?? { amountMinor: 0, count: 0 };
      totals.set(tx.category, { amountMinor: cur.amountMinor + tx.amountMinor, count: cur.count + 1 });
    } else if (tx.type === 'refund') {
      const cur = totals.get(tx.category) ?? { amountMinor: 0, count: 0 };
      totals.set(tx.category, { amountMinor: cur.amountMinor - tx.amountMinor, count: cur.count });
    }
  }

  const rows = [...totals.entries()]
    .map(([category, data]) => ({ category, amountMinor: Math.max(0, data.amountMinor), count: data.count }))
    .filter((r) => r.amountMinor > 0)
    .sort((a, b) => b.amountMinor - a.amountMinor);

  const total = rows.reduce((s, r) => s + r.amountMinor, 0);
  return rows.map((r) => ({
    ...r,
    percent: total > 0 ? Math.round((r.amountMinor / total) * 1000) / 10 : 0,
  }));
}

export interface BudgetProgressRow {
  budget: FinanceBudget;
  spentMinor: number;
  remainingMinor: number;
  utilizationPct: number;
  status: 'healthy' | 'warning' | 'exceeded';
  previousPeriodSpentMinor: number;
}

export function evaluateBudgets(
  budgets: FinanceBudget[],
  transactions: FinanceTransaction[],
  refDate = new Date(),
  startOfWeek: 'monday' | 'sunday' = 'monday'
): BudgetProgressRow[] {
  const monthBounds = getMonthBounds(refDate.getFullYear(), refDate.getMonth());
  const prevMonthBounds = getMonthBounds(
    refDate.getMonth() === 0 ? refDate.getFullYear() - 1 : refDate.getFullYear(),
    refDate.getMonth() === 0 ? 11 : refDate.getMonth() - 1
  );
  const weekBounds = getWeekBounds(refDate, startOfWeek);
  const prevWeekRef = new Date(refDate);
  prevWeekRef.setDate(prevWeekRef.getDate() - 7);
  const prevWeekBounds = getWeekBounds(prevWeekRef, startOfWeek);

  return budgets.map((budget) => {
    let curStart = monthBounds.start;
    let curEnd = monthBounds.end;
    let prevStart = prevMonthBounds.start;
    let prevEnd = prevMonthBounds.end;

    if (budget.period === 'weekly') {
      curStart = weekBounds.start;
      curEnd = weekBounds.end;
      prevStart = prevWeekBounds.start;
      prevEnd = prevWeekBounds.end;
    } else if (budget.period === 'custom' && budget.startDate && budget.endDate) {
      curStart = budget.startDate;
      curEnd = budget.endDate;
      prevStart = '';
      prevEnd = '';
    }

    const sumForBounds = (start: string, end: string) => {
      if (!start || !end) return 0;
      let net = 0;
      for (const tx of transactions) {
        if (tx.deletedAt) continue;
        if (tx.date < start || tx.date > end) continue;
        if (budget.category !== 'ALL' && tx.category !== budget.category) continue;
        if (tx.type === 'expense') net += tx.amountMinor;
        else if (tx.type === 'refund') net -= tx.amountMinor;
      }
      return Math.max(0, net);
    };

    const spentMinor = sumForBounds(curStart, curEnd);
    const previousPeriodSpentMinor = sumForBounds(prevStart, prevEnd);
    const remainingMinor = budget.limitMinor - spentMinor;
    const utilizationPct = budget.limitMinor > 0 ? Math.round((spentMinor / budget.limitMinor) * 1000) / 10 : 0;

    let status: 'healthy' | 'warning' | 'exceeded' = 'healthy';
    if (spentMinor > budget.limitMinor) status = 'exceeded';
    else if (utilizationPct >= budget.warningThresholdPct) status = 'warning';

    return {
      budget,
      spentMinor,
      remainingMinor,
      utilizationPct,
      status,
      previousPeriodSpentMinor,
    };
  });
}

export function computeNetWorthBreakdown(
  accounts: FinanceAccount[],
  transactions: FinanceTransaction[],
  investments: InvestmentHolding[],
  debts: DebtRecord[],
  savingsGoals: SavingsGoal[]
) {
  const balances = computeAllAccountBalances(accounts, transactions);
  let liquidCashMinor = 0;
  let creditCardOutstandingMinor = 0;

  for (const acc of accounts) {
    if (!acc.active) continue;
    const bal = balances[acc.id] ?? 0;
    if (acc.type === 'credit_card') {
      // Negative balance on a credit card or positive outstanding represents debt
      creditCardOutstandingMinor += bal < 0 ? Math.abs(bal) : 0;
      if (bal > 0) liquidCashMinor += bal;
    } else {
      liquidCashMinor += bal;
    }
  }

  const investmentValueMinor = investments.reduce((s, inv) => s + inv.currentValuationMinor, 0);
  const investmentCostMinor = investments.reduce((s, inv) => s + inv.investedMinor, 0);
  const lentToOthersMinor = debts
    .filter((d) => d.kind === 'lent')
    .reduce((s, d) => s + d.remainingMinor, 0);
  const liabilitiesMinor =
    debts
      .filter((d) => d.kind !== 'lent')
      .reduce((s, d) => s + d.remainingMinor, 0) + creditCardOutstandingMinor;

  const totalSavingsTargetedMinor = savingsGoals.reduce((s, g) => s + g.currentMinor, 0);
  const totalAssetsMinor = liquidCashMinor + investmentValueMinor + lentToOthersMinor;
  const netWorthMinor = totalAssetsMinor - liabilitiesMinor;

  return {
    liquidCashMinor,
    investmentValueMinor,
    investmentCostMinor,
    lentToOthersMinor,
    liabilitiesMinor,
    totalAssetsMinor,
    netWorthMinor,
    totalSavingsTargetedMinor,
  };
}

export function getMonthlyCashflowSeries(transactions: FinanceTransaction[], months = 6, refDate = new Date()) {
  const series: { monthKey: string; label: string; income: number; expense: number; savings: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
    const bounds = getMonthBounds(d.getFullYear(), d.getMonth());
    const txs = filterTransactionsByDateRange(transactions, bounds.start, bounds.end);
    const summary = calculateFinancialSummary(txs);
    series.push({
      monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-US', { month: 'short' }),
      income: fromMinor(summary.incomeMinor),
      expense: fromMinor(summary.netExpenseMinor),
      savings: fromMinor(summary.savingsMinor),
    });
  }
  return series;
}

function escapeCsvCell(val: string): string {
  if (/[",\n\r]/.test(val)) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function exportTransactionsToCSV(
  transactions: FinanceTransaction[],
  accounts: FinanceAccount[]
): string {
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  const headers = ['Date', 'Time', 'Type', 'Amount', 'Category', 'Subcategory', 'Account', 'ToAccount', 'Merchant', 'Description', 'Tags', 'Notes'];
  const rows = transactions
    .filter((t) => !t.deletedAt)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((tx) => [
      tx.date,
      tx.time,
      tx.type,
      fromMinor(tx.amountMinor).toFixed(2),
      tx.category,
      tx.subcategory,
      accountMap.get(tx.accountId) ?? tx.accountId,
      tx.toAccountId ? (accountMap.get(tx.toAccountId) ?? tx.toAccountId) : '',
      tx.merchant,
      tx.description,
      tx.tags.join('; '),
      tx.notes,
    ]);
  return [headers, ...rows].map((r) => r.map((c) => escapeCsvCell(String(c ?? ''))).join(',')).join('\n');
}

export function parseTransactionsCSV(csvText: string): Array<{
  date: string;
  time: string;
  type: 'income' | 'expense' | 'transfer' | 'refund';
  amountMinor: number;
  category: string;
  merchant: string;
  description: string;
  accountName: string;
}> {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    if (inQuotes) {
      if (ch === '"' && csvText[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(cell.trim());
        cell = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && csvText[i + 1] === '\n') i++;
        row.push(cell.trim());
        if (row.some((c) => c.length > 0)) lines.push(row);
        row = [];
        cell = '';
      } else {
        cell += ch;
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((c) => c.length > 0)) lines.push(row);
  }
  if (lines.length < 2) return [];

  const header = lines[0].map((h) => h.toLowerCase());
  const idx = (names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));
  const dateIdx = idx(['date']);
  const timeIdx = idx(['time']);
  const typeIdx = idx(['type']);
  const amountIdx = idx(['amount', 'value']);
  const catIdx = idx(['category']);
  const merchIdx = idx(['merchant', 'payee']);
  const descIdx = idx(['description', 'memo', 'note']);
  const accIdx = idx(['account']);

  const out: Array<{
    date: string;
    time: string;
    type: 'income' | 'expense' | 'transfer' | 'refund';
    amountMinor: number;
    category: string;
    merchant: string;
    description: string;
    accountName: string;
  }> = [];

  for (let r = 1; r < lines.length; r++) {
    const cols = lines[r];
    const rawAmount = amountIdx >= 0 ? cols[amountIdx] : '0';
    const parsedNum = Number(rawAmount.replace(/[^0-9.-]/g, ''));
    if (!Number.isFinite(parsedNum) || parsedNum === 0) continue;
    const rawType = (typeIdx >= 0 ? cols[typeIdx] : '').toLowerCase();
    let type: 'income' | 'expense' | 'transfer' | 'refund' = parsedNum < 0 ? 'expense' : 'expense';
    if (rawType.includes('inc') || rawType.includes('credit')) type = 'income';
    else if (rawType.includes('trans')) type = 'transfer';
    else if (rawType.includes('ref')) type = 'refund';
    else if (rawType.includes('exp') || rawType.includes('deb')) type = 'expense';

    const rawDate = dateIdx >= 0 ? cols[dateIdx] : todayISO();
    const isoDate = /^\d{4}-\d{2}-\d{2}/.test(rawDate) ? rawDate.slice(0, 10) : todayISO();

    out.push({
      date: isoDate,
      time: timeIdx >= 0 && cols[timeIdx] ? cols[timeIdx] : '12:00',
      type,
      amountMinor: Math.abs(toMinor(parsedNum)),
      category: (catIdx >= 0 && cols[catIdx]) || (type === 'income' ? 'Salary' : 'Other'),
      merchant: (merchIdx >= 0 && cols[merchIdx]) || '',
      description: (descIdx >= 0 && cols[descIdx]) || 'Imported transaction',
      accountName: (accIdx >= 0 && cols[accIdx]) || '',
    });
  }
  return out;
}
