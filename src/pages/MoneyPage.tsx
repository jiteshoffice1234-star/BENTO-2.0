import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Copy,
  Download,
  Edit3,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useBentoStore } from '../store/useBentoStore';
import {
  AccountType,
  BudgetPeriod,
  DebtKind,
  FinanceTransaction,
  InvestmentAssetType,
  TransactionType,
} from '../types/bento';
import {
  calculateFinancialSummary,
  computeAllAccountBalances,
  computeNetWorthBreakdown,
  evaluateBudgets,
  exportTransactionsToCSV,
  filterTransactionsByDateRange,
  formatMoney,
  fromMinor,
  getCategoryExpenseBreakdown,
  getMonthBounds,
  getMonthlyCashflowSeries,
  getWeekBounds,
  parseTransactionsCSV,
  todayISO,
  toMinor,
} from '../utils/finance';
import { BENTO_PALETTE } from '../utils/defaults';

type MoneyTab =
  | 'overview'
  | 'accounts'
  | 'transactions'
  | 'budgets'
  | 'savings_investments'
  | 'debt_bills'
  | 'categories';

export const MoneyPage: React.FC = () => {
  const store = useBentoStore();
  const cur = store.settings.currency;
  const [tab, setTab] = useState<MoneyTab>('overview');
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  // Filters for transactions
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [rangeFilter, setRangeFilter] = useState<'month' | 'week' | 'all' | 'custom'>('month');
  const [customStart, setCustomStart] = useState(getMonthBounds(new Date().getFullYear(), new Date().getMonth()).start);
  const [customEnd, setCustomEnd] = useState(todayISO());
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [bulkCat, setBulkCat] = useState('Food');

  // Add/Edit Transaction Modal
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<FinanceTransaction | null>(null);
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('Food');
  const [txSubcategory, setTxSubcategory] = useState('');
  const [txAccountId, setTxAccountId] = useState('');
  const [txToAccountId, setTxToAccountId] = useState('');
  const [txDate, setTxDate] = useState(todayISO());
  const [txTime, setTxTime] = useState('12:00');
  const [txMerchant, setTxMerchant] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txNotes, setTxNotes] = useState('');

  // Account Form
  const [accName, setAccName] = useState('');
  const [accInst, setAccInst] = useState('');
  const [accType, setAccType] = useState<AccountType>('savings');
  const [accOpenBal, setAccOpenBal] = useState('');
  const [accColor, setAccColor] = useState<string>(BENTO_PALETTE[0]);

  // Budget Form
  const [budName, setBudName] = useState('');
  const [budCat, setBudCat] = useState('Food');
  const [budLimit, setBudLimit] = useState('');
  const [budPeriod, setBudPeriod] = useState<BudgetPeriod>('monthly');
  const [budWarnPct, setBudWarnPct] = useState('80');

  // Savings Form
  const [savName, setSavName] = useState('');
  const [savTarget, setSavTarget] = useState('');
  const [savCurrent, setSavCurrent] = useState('');
  const [savMonthly, setSavMonthly] = useState('');
  const [savEmergency, setSavEmergency] = useState(false);

  // Investment Form
  const [invName, setInvName] = useState('');
  const [invType, setInvType] = useState<InvestmentAssetType>('mutual_funds');
  const [invInvested, setInvInvested] = useState('');
  const [invCurrent, setInvCurrent] = useState('');
  const [invQty, setInvQty] = useState('');
  const [invDate, setInvDate] = useState(todayISO());

  // Debt Form
  const [debtTitle, setDebtTitle] = useState('');
  const [debtKind, setDebtKind] = useState<DebtKind>('loan');
  const [debtCounterparty, setDebtCounterparty] = useState('');
  const [debtPrincipal, setDebtPrincipal] = useState('');
  const [debtDue, setDebtDue] = useState(todayISO());

  // Bill Form
  const [billName, setBillName] = useState('');
  const [billKind, setBillKind] = useState<'bill' | 'subscription'>('subscription');
  const [billAmount, setBillAmount] = useState('');
  const [billFreq, setBillFreq] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [billNextDue, setBillNextDue] = useState(todayISO());
  const [billCat, setBillCat] = useState('Subscriptions');

  // Category Form
  const [catName, setCatName] = useState('');
  const [catKind, setCatKind] = useState<'expense' | 'income'>('expense');
  const [catSub, setCatSub] = useState('');

  const [csvFeedback, setCsvFeedback] = useState('');

  const now = new Date();
  const monthBounds = getMonthBounds(now.getFullYear(), now.getMonth());
  const weekBounds = getWeekBounds(now, store.settings.startOfWeek);

  const balances = useMemo(
    () => computeAllAccountBalances(store.accounts, store.transactions),
    [store.accounts, store.transactions]
  );

  const netWorth = useMemo(
    () =>
      computeNetWorthBreakdown(
        store.accounts,
        store.transactions,
        store.investments,
        store.debts,
        store.savingsGoals
      ),
    [store.accounts, store.transactions, store.investments, store.debts, store.savingsGoals]
  );

  const monthTxs = useMemo(
    () => filterTransactionsByDateRange(store.transactions, monthBounds.start, monthBounds.end),
    [store.transactions, monthBounds]
  );
  const monthSummary = useMemo(() => calculateFinancialSummary(monthTxs), [monthTxs]);
  const catBreakdown = useMemo(() => getCategoryExpenseBreakdown(monthTxs), [monthTxs]);
  const cashflowSeries = useMemo(() => getMonthlyCashflowSeries(store.transactions, 6, now), [store.transactions]);
  const budgetRows = useMemo(
    () => evaluateBudgets(store.budgets, store.transactions, now, store.settings.startOfWeek),
    [store.budgets, store.transactions, store.settings.startOfWeek]
  );

  const filteredTransactions = useMemo(() => {
    let base = store.transactions.filter((t) => !t.deletedAt);
    if (rangeFilter === 'month') base = filterTransactionsByDateRange(base, monthBounds.start, monthBounds.end);
    else if (rangeFilter === 'week') base = filterTransactionsByDateRange(base, weekBounds.start, weekBounds.end);
    else if (rangeFilter === 'custom') base = filterTransactionsByDateRange(base, customStart, customEnd);

    if (typeFilter !== 'all') base = base.filter((t) => t.type === typeFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      base = base.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.merchant.toLowerCase().includes(q) ||
          t.notes.toLowerCase().includes(q)
      );
    }
    return base.sort((a, b) => b.date.localeCompare(a.date));
  }, [store.transactions, rangeFilter, customStart, customEnd, typeFilter, search, monthBounds, weekBounds]);

  const openNewTxModal = (presetType: TransactionType = 'expense') => {
    setEditingTx(null);
    setTxType(presetType);
    setTxAmount('');
    setTxCategory(presetType === 'income' ? 'Salary' : presetType === 'transfer' ? 'Transfer' : 'Food');
    setTxSubcategory('');
    setTxAccountId(store.accounts[0]?.id ?? '');
    setTxToAccountId(store.accounts[1]?.id ?? '');
    setTxDate(todayISO());
    setTxTime('12:00');
    setTxMerchant('');
    setTxDescription('');
    setTxNotes('');
    setTxModalOpen(true);
  };

  const openEditTxModal = (tx: FinanceTransaction) => {
    setEditingTx(tx);
    setTxType(tx.type);
    setTxAmount(String(fromMinor(tx.amountMinor)));
    setTxCategory(tx.category);
    setTxSubcategory(tx.subcategory);
    setTxAccountId(tx.accountId);
    setTxToAccountId(tx.toAccountId ?? '');
    setTxDate(tx.date);
    setTxTime(tx.time);
    setTxMerchant(tx.merchant);
    setTxDescription(tx.description);
    setTxNotes(tx.notes);
    setTxModalOpen(true);
  };

  const handleSaveTx = (e: React.FormEvent) => {
    e.preventDefault();
    const minor = toMinor(txAmount);
    if (minor <= 0 && txType !== 'adjustment') return;

    let primaryAcc = txAccountId || store.accounts[0]?.id;
    if (!primaryAcc) {
      primaryAcc = store.addAccount({
        name: 'Primary Cash',
        institution: 'Local',
        type: 'cash',
        openingBalanceMinor: 0,
        currency: cur,
        color: '#10b981',
        notes: '',
        active: true,
      }).id;
    }

    if (txType === 'transfer' && (!txToAccountId || txToAccountId === primaryAcc)) return;

    const payload = {
      type: txType,
      amountMinor: minor,
      category: txType === 'transfer' ? 'Transfer' : txCategory,
      subcategory: txSubcategory,
      accountId: primaryAcc,
      toAccountId: txType === 'transfer' ? txToAccountId : null,
      date: txDate,
      time: txTime,
      merchant: txMerchant,
      description: txDescription || txCategory,
      tags: [],
      notes: txNotes,
      recurring: false,
      recurrence: 'none' as const,
    };

    if (editingTx) store.updateTransaction(editingTx.id, payload);
    else store.addTransaction(payload);
    setTxModalOpen(false);
  };

  const handleExportCSV = () => {
    const csv = exportTransactionsToCSV(store.transactions, store.accounts);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bento-transactions-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseTransactionsCSV(text);
    if (parsed.length === 0) {
      setCsvFeedback('No valid transaction rows detected in CSV.');
      return;
    }
    let defaultAcc = store.accounts[0]?.id;
    if (!defaultAcc) {
      defaultAcc = store.addAccount({
        name: 'Imported Account',
        institution: '',
        type: 'savings',
        openingBalanceMinor: 0,
        currency: cur,
        color: '#10b981',
        notes: '',
        active: true,
      }).id;
    }
    for (const row of parsed) {
      const matchedAcc = store.accounts.find(
        (a) => a.name.toLowerCase() === row.accountName.toLowerCase()
      )?.id;
      store.addTransaction({
        type: row.type,
        amountMinor: row.amountMinor,
        category: row.category,
        subcategory: '',
        accountId: matchedAcc || defaultAcc,
        toAccountId: null,
        date: row.date,
        time: row.time,
        merchant: row.merchant,
        description: row.description,
        tags: ['csv-import'],
        notes: '',
        recurring: false,
        recurrence: 'none',
      });
    }
    setCsvFeedback(`Imported ${parsed.length} transaction${parsed.length === 1 ? '' : 's'} cleanly.`);
    e.target.value = '';
  };

  const accountNameMap = new Map(store.accounts.map((a) => [a.id, a.name]));

  const TABS: Array<{ id: MoneyTab; label: string }> = [
    { id: 'overview', label: 'Overview & Analytics' },
    { id: 'accounts', label: 'Accounts' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'budgets', label: 'Budgets' },
    { id: 'savings_investments', label: 'Savings & Investments' },
    { id: 'debt_bills', label: 'Debt & Bills' },
    { id: 'categories', label: 'Categories' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Money</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Accounts, ledger, budgets, savings, manual investments, debts, and recurring bills
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openNewTxModal('transfer')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-xs font-medium whitespace-nowrap shrink-0"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Transfer</span>
          </button>
          <button
            type="button"
            onClick={() => openNewTxModal('expense')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto bento-scroll pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              tab === t.id
                ? 'bg-emerald-600 text-white'
                : 'bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 1. OVERVIEW & ANALYTICS */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bento-surface rounded-2xl p-4">
              <p className="text-xs text-[var(--text-secondary)]">Net Worth</p>
              <p className="text-xl sm:text-2xl font-bold font-mono-num mt-1">
                {formatMoney(netWorth.netWorthMinor, cur)}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Assets {formatMoney(netWorth.totalAssetsMinor, cur)} · Debt {formatMoney(netWorth.liabilitiesMinor, cur)}
              </p>
            </div>
            <div className="bento-surface rounded-2xl p-4">
              <p className="text-xs text-[var(--text-secondary)]">Liquid Cash & Bank</p>
              <p className="text-xl sm:text-2xl font-bold font-mono-num mt-1">
                {formatMoney(netWorth.liquidCashMinor, cur)}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                {store.accounts.filter((a) => a.active).length} active accounts
              </p>
            </div>
            <div className="bento-surface rounded-2xl p-4">
              <p className="text-xs text-[var(--text-secondary)]">Income (This Month)</p>
              <p className="text-xl sm:text-2xl font-bold font-mono-num text-emerald-500 mt-1">
                {formatMoney(monthSummary.incomeMinor, cur)}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Transfers excluded
              </p>
            </div>
            <div className="bento-surface rounded-2xl p-4">
              <p className="text-xs text-[var(--text-secondary)]">Net Expenses (This Month)</p>
              <p className="text-xl sm:text-2xl font-bold font-mono-num text-rose-400 mt-1">
                {formatMoney(monthSummary.netExpenseMinor, cur)}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Savings rate: {monthSummary.savingsRatePct}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="bento-surface rounded-2xl p-5 lg:col-span-7">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold">6-Month Income vs Expenses</h2>
                  <p className="text-xs text-[var(--text-secondary)]">Computed directly from stored transactions</p>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashflowSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expense" name="Expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bento-surface rounded-2xl p-5 lg:col-span-5">
              <h2 className="text-base font-bold">Expense Breakdown (This Month)</h2>
              <p className="text-xs text-[var(--text-secondary)] mb-4">Net of category refunds</p>
              {catBreakdown.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-8 text-center">
                  No expenses logged this month yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {catBreakdown.slice(0, 6).map((item) => (
                    <div key={item.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">
                          {item.category} · <span className="text-[var(--text-muted)]">{item.count} tx</span>
                        </span>
                        <span className="font-mono-num font-semibold">
                          {formatMoney(item.amountMinor, cur)} ({item.percent}%)
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. ACCOUNTS */}
      {tab === 'accounts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="bento-surface rounded-2xl p-5 lg:col-span-7 space-y-4">
            <h2 className="text-base font-bold">Accounts & Reconciled Balances</h2>
            {store.accounts.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-6">
                No accounts added yet. Create a Savings, Current, Cash, Wallet, or Credit Card account.
              </p>
            ) : (
              <div className="divide-y bento-divider">
                {store.accounts.map((acc) => {
                  const bal = balances[acc.id] ?? acc.openingBalanceMinor;
                  return (
                    <div key={acc.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: acc.color }} />
                          <p className="text-sm font-semibold truncate">{acc.name}</p>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {acc.type.replace('_', ' ')} {acc.institution ? `· ${acc.institution}` : ''} · {acc.active ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-bold font-mono-num">{formatMoney(bal, acc.currency)}</span>
                        <button
                          type="button"
                          onClick={() => store.updateAccount(acc.id, { active: !acc.active })}
                          className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          {acc.active ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => store.deleteAccount(acc.id)}
                          aria-label="Delete account"
                          className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!accName.trim()) return;
              store.addAccount({
                name: accName.trim(),
                institution: accInst.trim(),
                type: accType,
                openingBalanceMinor: toMinor(accOpenBal),
                currency: cur,
                color: accColor,
                notes: '',
                active: true,
              });
              setAccName('');
              setAccInst('');
              setAccOpenBal('');
            }}
            className="bento-surface rounded-2xl p-5 lg:col-span-5 space-y-3 h-fit"
          >
            <h3 className="text-sm font-bold">New Account</h3>
            <input
              type="text"
              value={accName}
              onChange={(e) => setAccName(e.target.value)}
              placeholder="Account Name (e.g., HDFC Savings)"
              className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3.5 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={accType}
                onChange={(e) => setAccType(e.target.value as AccountType)}
                className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm"
              >
                <option value="savings">Savings</option>
                <option value="current">Current</option>
                <option value="cash">Cash</option>
                <option value="wallet">Wallet</option>
                <option value="credit_card">Credit Card</option>
                <option value="custom">Custom</option>
              </select>
              <input
                type="text"
                value={accInst}
                onChange={(e) => setAccInst(e.target.value)}
                placeholder="Institution"
                className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm"
              />
            </div>
            <input
              type="number"
              step="0.01"
              value={accOpenBal}
              onChange={(e) => setAccOpenBal(e.target.value)}
              placeholder={`Opening balance (${cur})`}
              className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3.5 py-2 text-sm font-mono-num"
            />
            <div className="flex items-center gap-2 pt-1">
              {BENTO_PALETTE.slice(0, 7).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAccColor(c)}
                  className={`w-6 h-6 rounded-full border-2 ${accColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
            >
              Create Account
            </button>
          </form>
        </div>
      )}

      {/* 3. TRANSACTIONS */}
      {tab === 'transactions' && (
        <div className="bento-surface rounded-2xl p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search merchant, category, description..."
                className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3.5 py-2 text-xs w-60"
              />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | TransactionType)}
                className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs"
              >
                <option value="all">All Types</option>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="transfer">Transfer</option>
                <option value="refund">Refund</option>
                <option value="adjustment">Adjustment</option>
              </select>
              <select
                value={rangeFilter}
                onChange={(e) => setRangeFilter(e.target.value as typeof rangeFilter)}
                className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs"
              >
                <option value="month">This Month</option>
                <option value="week">This Week</option>
                <option value="all">All Time</option>
                <option value="custom">Custom Range</option>
              </select>
              {rangeFilter === 'custom' && (
                <div className="flex items-center gap-1.5">
                  <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-2 py-1.5 text-xs font-mono-num" />
                  <span className="text-xs text-[var(--text-muted)]">to</span>
                  <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-2 py-1.5 text-xs font-mono-num" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input ref={csvInputRef} type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border-hairline)] text-xs font-medium hover:bg-[var(--bg-hover)]"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border-hairline)] text-xs font-medium hover:bg-[var(--bg-hover)]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {csvFeedback && <p className="text-xs text-emerald-500">{csvFeedback}</p>}

          {selectedTxIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[var(--bg-elevated)]">
              <span className="text-xs font-medium">{selectedTxIds.length} selected</span>
              <div className="flex items-center gap-2">
                <select
                  value={bulkCat}
                  onChange={(e) => setBulkCat(e.target.value)}
                  className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-2.5 py-1.5 text-xs"
                >
                  {store.categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    store.bulkCategorizeTransactions(selectedTxIds, bulkCat);
                    setSelectedTxIds([]);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                >
                  Bulk Categorize
                </button>
              </div>
            </div>
          )}

          {filteredTransactions.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-sm text-[var(--text-secondary)]">No transactions match your filters.</p>
              <button
                type="button"
                onClick={() => openNewTxModal('expense')}
                className="text-xs font-semibold text-emerald-500 hover:underline"
              >
                Log your first transaction
              </button>
            </div>
          ) : (
            <div className="divide-y bento-divider">
              {filteredTransactions.slice(0, 100).map((tx) => {
                const checked = selectedTxIds.includes(tx.id);
                const sign = tx.type === 'income' || tx.type === 'refund' ? '+' : tx.type === 'expense' ? '-' : '';
                const amountCls =
                  tx.type === 'income' || tx.type === 'refund'
                    ? 'text-emerald-500'
                    : tx.type === 'expense'
                    ? 'text-rose-400'
                    : 'text-[var(--text-primary)]';
                return (
                  <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedTxIds((prev) =>
                            checked ? prev.filter((id) => id !== tx.id) : [...prev, tx.id]
                          )
                        }
                        className="rounded"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {tx.description || tx.merchant || tx.category}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] truncate">
                          {tx.type} · {tx.category} · {accountNameMap.get(tx.accountId) || 'Account'}
                          {tx.toAccountId ? ` → ${accountNameMap.get(tx.toAccountId) || 'Target'}` : ''} · {tx.date}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-sm font-bold font-mono-num ${amountCls}`}>
                        {sign}{formatMoney(tx.amountMinor, cur)}
                      </span>
                      <button type="button" onClick={() => openEditTxModal(tx)} aria-label="Edit" className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => store.duplicateTransaction(tx.id)} aria-label="Duplicate" className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => store.deleteTransaction(tx.id)} aria-label="Delete" className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-rose-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. BUDGETS */}
      {tab === 'budgets' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="bento-surface rounded-2xl p-5 lg:col-span-7 space-y-4">
            <h2 className="text-base font-bold">Active Budgets & Utilization</h2>
            {budgetRows.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-6">No budgets configured yet.</p>
            ) : (
              <div className="space-y-4">
                {budgetRows.map((row) => {
                  const barColor =
                    row.status === 'exceeded'
                      ? 'bg-rose-500'
                      : row.status === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500';
                  return (
                    <div key={row.budget.id} className="pb-4 border-b bento-divider last:border-b-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{row.budget.name}</p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {row.budget.category} · {row.budget.period} · {row.status === 'exceeded' ? 'Over limit' : row.status === 'warning' ? 'Near threshold' : 'On track'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono-num font-semibold">
                            {formatMoney(row.spentMinor, cur)} / {formatMoney(row.budget.limitMinor, cur)}
                          </span>
                          <button type="button" onClick={() => store.deleteBudget(row.budget.id)} className="text-rose-400 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${Math.min(100, row.utilizationPct)}%` }} />
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] font-mono-num">
                        {row.utilizationPct}% used · Remaining {formatMoney(row.remainingMinor, cur)} · Prev period {formatMoney(row.previousPeriodSpentMinor, cur)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const lim = toMinor(budLimit);
              if (lim <= 0) return;
              store.addBudget({
                name: budName.trim() || `${budCat} Budget`,
                category: budCat,
                limitMinor: lim,
                period: budPeriod,
                warningThresholdPct: Number(budWarnPct) || 80,
                notes: '',
              });
              setBudName('');
              setBudLimit('');
            }}
            className="bento-surface rounded-2xl p-5 lg:col-span-5 space-y-3 h-fit"
          >
            <h3 className="text-sm font-bold">Create Budget</h3>
            <input type="text" value={budName} onChange={(e) => setBudName(e.target.value)} placeholder="Budget Name (e.g., Monthly Dining)" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3.5 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <select value={budCat} onChange={(e) => setBudCat(e.target.value)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm">
                <option value="ALL">All Expenses</option>
                {store.categories.filter((c) => c.kind === 'expense').map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <select value={budPeriod} onChange={(e) => setBudPeriod(e.target.value as BudgetPeriod)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm">
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={budLimit} onChange={(e) => setBudLimit(e.target.value)} placeholder={`Limit (${cur})`} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3.5 py-2 text-sm font-mono-num" />
              <input type="number" value={budWarnPct} onChange={(e) => setBudWarnPct(e.target.value)} placeholder="Alert %" className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3.5 py-2 text-sm font-mono-num" />
            </div>
            <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold">
              Save Budget
            </button>
          </form>
        </div>
      )}

      {/* 5. SAVINGS & MANUAL INVESTMENTS */}
      {tab === 'savings_investments' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Savings */}
          <div className="bento-surface rounded-2xl p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold">Savings Targets & Emergency Fund</h2>
              <p className="text-xs text-[var(--text-secondary)]">Track monthly contributions and progress</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!savName.trim() || toMinor(savTarget) <= 0) return;
                store.addSavingsGoal({
                  name: savName.trim(),
                  targetMinor: toMinor(savTarget),
                  currentMinor: toMinor(savCurrent),
                  monthlyContributionMinor: toMinor(savMonthly),
                  isEmergencyFund: savEmergency,
                  notes: '',
                });
                setSavName('');
                setSavTarget('');
                setSavCurrent('');
                setSavMonthly('');
              }}
              className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[var(--bg-elevated)]"
            >
              <input type="text" value={savName} onChange={(e) => setSavName(e.target.value)} placeholder="Savings goal name" className="col-span-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
              <input type="number" value={savTarget} onChange={(e) => setSavTarget(e.target.value)} placeholder="Target amount" className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <input type="number" value={savCurrent} onChange={(e) => setSavCurrent(e.target.value)} placeholder="Current saved" className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <input type="checkbox" checked={savEmergency} onChange={(e) => setSavEmergency(e.target.checked)} />
                Emergency fund
              </label>
              <button type="submit" className="py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold">Add Target</button>
            </form>

            <div className="divide-y bento-divider">
              {store.savingsGoals.map((sg) => {
                const pct = sg.targetMinor > 0 ? Math.min(100, Math.round((sg.currentMinor / sg.targetMinor) * 100)) : 0;
                return (
                  <div key={sg.id} className="py-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">
                          {sg.name} {sg.isEmergencyFund ? '· Emergency Fund' : ''}
                        </p>
                        <p className="text-xs font-mono-num text-[var(--text-secondary)]">
                          {formatMoney(sg.currentMinor, cur)} / {formatMoney(sg.targetMinor, cur)} ({pct}%)
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => store.contributeSavings(sg.id, toMinor(1000), 'Quick deposit')}
                          className="px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-xs font-medium"
                        >
                          +1,000
                        </button>
                        <button type="button" onClick={() => store.deleteSavingsGoal(sg.id)} className="text-rose-400 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Manual Investments */}
          <div className="bento-surface rounded-2xl p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold">Investments (Manual Valuation)</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Offline-first manual tracking — market prices are never simulated or fetched externally
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!invName.trim() || toMinor(invInvested) <= 0) return;
                store.addInvestment({
                  name: invName.trim(),
                  assetType: invType,
                  investedMinor: toMinor(invInvested),
                  currentValuationMinor: toMinor(invCurrent || invInvested),
                  valuationUpdatedAt: todayISO(),
                  purchaseDate: invDate,
                  quantity: invQty ? Number(invQty) : null,
                  notes: '',
                });
                setInvName('');
                setInvInvested('');
                setInvCurrent('');
                setInvQty('');
              }}
              className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[var(--bg-elevated)]"
            >
              <input type="text" value={invName} onChange={(e) => setInvName(e.target.value)} placeholder="Asset name (e.g., Nifty 50 Index)" className="col-span-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
              <select value={invType} onChange={(e) => setInvType(e.target.value as InvestmentAssetType)} className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                <option value="mutual_funds">Mutual Funds</option>
                <option value="stocks">Stocks</option>
                <option value="fixed_deposit">Fixed Deposit</option>
                <option value="gold">Gold</option>
                <option value="other">Other Asset</option>
              </select>
              <input type="number" value={invQty} onChange={(e) => setInvQty(e.target.value)} placeholder="Quantity (opt)" className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <input type="number" value={invInvested} onChange={(e) => setInvInvested(e.target.value)} placeholder="Invested amount" className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <input type="number" value={invCurrent} onChange={(e) => setInvCurrent(e.target.value)} placeholder="Manual valuation" className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <input type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <button type="submit" className="py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold">Add Holding</button>
            </form>

            <div className="divide-y bento-divider">
              {store.investments.map((inv) => {
                const gainMinor = inv.currentValuationMinor - inv.investedMinor;
                return (
                  <div key={inv.id} className="py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{inv.name}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {inv.assetType.replace('_', ' ')} · Manual valuation ({inv.valuationUpdatedAt})
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-3">
                      <div>
                        <p className="text-sm font-bold font-mono-num">{formatMoney(inv.currentValuationMinor, cur)}</p>
                        <p className={`text-[11px] font-mono-num ${gainMinor >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                          {gainMinor >= 0 ? '+' : ''}{formatMoney(gainMinor, cur)}
                        </p>
                      </div>
                      <button type="button" onClick={() => store.deleteInvestment(inv.id)} className="text-rose-400 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 6. DEBT & BILLS */}
      {tab === 'debt_bills' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Debts */}
          <div className="bento-surface rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-bold">Debt, EMIs, Borrowed & Lent</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!debtTitle.trim() || toMinor(debtPrincipal) <= 0) return;
                const amt = toMinor(debtPrincipal);
                store.addDebt({
                  title: debtTitle.trim(),
                  kind: debtKind,
                  counterparty: debtCounterparty.trim(),
                  principalMinor: amt,
                  remainingMinor: amt,
                  dueDate: debtDue,
                  notes: '',
                });
                setDebtTitle('');
                setDebtCounterparty('');
                setDebtPrincipal('');
              }}
              className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[var(--bg-elevated)]"
            >
              <input type="text" value={debtTitle} onChange={(e) => setDebtTitle(e.target.value)} placeholder="Title (e.g., Car EMI, Lent to Alex)" className="col-span-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
              <select value={debtKind} onChange={(e) => setDebtKind(e.target.value as DebtKind)} className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                <option value="loan">Loan</option>
                <option value="emi">EMI</option>
                <option value="credit_card">Credit Card</option>
                <option value="borrowed">Borrowed</option>
                <option value="lent">Money Lent</option>
              </select>
              <input type="number" value={debtPrincipal} onChange={(e) => setDebtPrincipal(e.target.value)} placeholder="Amount" className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <input type="date" value={debtDue} onChange={(e) => setDebtDue(e.target.value)} className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <button type="submit" className="py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold">Add Record</button>
            </form>

            <div className="divide-y bento-divider">
              {store.debts.map((d) => (
                <div key={d.id} className="py-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{d.title}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {d.kind.replace('_', ' ')} · Remaining {formatMoney(d.remainingMinor, cur)} · Due {d.dueDate || '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.remainingMinor > 0 && (
                      <button
                        type="button"
                        onClick={() => store.recordDebtPayment(d.id, Math.min(d.remainingMinor, toMinor(1000)), 'Repayment')}
                        className="px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-xs font-medium"
                      >
                        Pay 1,000
                      </button>
                    )}
                    <button type="button" onClick={() => store.deleteDebt(d.id)} className="text-rose-400 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bills & Subscriptions */}
          <div className="bento-surface rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-bold">Bills & Subscriptions</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!billName.trim() || toMinor(billAmount) <= 0) return;
                store.addBill({
                  name: billName.trim(),
                  kind: billKind,
                  amountMinor: toMinor(billAmount),
                  frequency: billFreq,
                  nextDueDate: billNextDue,
                  category: billCat,
                  reminderDaysBefore: 3,
                  notes: '',
                  active: true,
                });
                setBillName('');
                setBillAmount('');
              }}
              className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[var(--bg-elevated)]"
            >
              <input type="text" value={billName} onChange={(e) => setBillName(e.target.value)} placeholder="Bill / Subscription name" className="col-span-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
              <select value={billKind} onChange={(e) => setBillKind(e.target.value as 'bill' | 'subscription')} className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                <option value="subscription">Subscription</option>
                <option value="bill">Bill</option>
              </select>
              <select value={billFreq} onChange={(e) => setBillFreq(e.target.value as typeof billFreq)} className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
              <input type="number" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} placeholder="Amount" className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <input type="date" value={billNextDue} onChange={(e) => setBillNextDue(e.target.value)} className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <select value={billCat} onChange={(e) => setBillCat(e.target.value)} className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                {store.categories.filter((c) => c.kind === 'expense').map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <button type="submit" className="py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold">Add Bill</button>
            </form>

            <div className="divide-y bento-divider">
              {store.bills.map((b) => (
                <div key={b.id} className="py-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{b.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {b.kind} · {b.frequency} · Next due {b.nextDueDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono-num font-bold">{formatMoney(b.amountMinor, cur)}</span>
                    <button
                      type="button"
                      onClick={() => store.markBillPaid(b.id, true)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-medium"
                    >
                      Mark Paid
                    </button>
                    <button type="button" onClick={() => store.deleteBill(b.id)} className="text-rose-400 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. CATEGORIES */}
      {tab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="bento-surface rounded-2xl p-5 lg:col-span-8 space-y-4">
            <h2 className="text-base font-bold">Expense & Income Categories</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(['expense', 'income'] as const).map((kind) => (
                <div key={kind} className="space-y-2">
                  <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">{kind}</h3>
                  <div className="divide-y bento-divider">
                    {store.categories.filter((c) => c.kind === kind).map((cat) => (
                      <div key={cat.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="font-medium">{cat.name}</span>
                          {cat.subcategories.length > 0 && (
                            <p className="text-[11px] text-[var(--text-muted)]">{cat.subcategories.join(' · ')}</p>
                          )}
                        </div>
                        {!cat.isDefault && (
                          <button type="button" onClick={() => store.deleteCategory(cat.id)} className="text-rose-400 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!catName.trim()) return;
              store.addCategory({
                name: catName.trim(),
                kind: catKind,
                icon: 'tag',
                color: BENTO_PALETTE[0],
                subcategories: catSub ? catSub.split(',').map((s) => s.trim()).filter(Boolean) : [],
              });
              setCatName('');
              setCatSub('');
            }}
            className="bento-surface rounded-2xl p-5 lg:col-span-4 space-y-3 h-fit"
          >
            <h3 className="text-sm font-bold">Add Custom Category</h3>
            <input type="text" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Category name" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm" />
            <select value={catKind} onChange={(e) => setCatKind(e.target.value as 'expense' | 'income')} className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm">
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <input type="text" value={catSub} onChange={(e) => setCatSub(e.target.value)} placeholder="Subcategories (comma-separated)" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm" />
            <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold">Create Category</button>
          </form>
        </div>
      )}

      {/* Add/Edit Transaction Modal */}
      {txModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setTxModalOpen(false)}>
          <form
            onSubmit={handleSaveTx}
            onClick={(e) => e.stopPropagation()}
            className="bento-surface w-full max-w-md rounded-2xl p-6 space-y-4"
          >
            <h3 className="text-base font-bold">{editingTx ? 'Edit Transaction' : 'New Transaction'}</h3>
            <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-[var(--bg-elevated)]">
              {(['expense', 'income', 'transfer', 'refund', 'adjustment'] as TransactionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTxType(t)}
                  className={`py-1.5 rounded-lg text-[11px] font-medium capitalize ${
                    txType === t ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" step="0.01" required value={txAmount} onChange={(e) => setTxAmount(e.target.value)} placeholder={`Amount (${cur})`} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm font-mono-num" />
              <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm font-mono-num" />
            </div>
            {txType !== 'transfer' && (
              <select value={txCategory} onChange={(e) => setTxCategory(e.target.value)} className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm">
                {store.categories
                  .filter((c) => (txType === 'income' ? c.kind === 'income' : c.kind === 'expense'))
                  .map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
              </select>
            )}
            <div className="grid grid-cols-2 gap-3">
              <select value={txAccountId} onChange={(e) => setTxAccountId(e.target.value)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm">
                {store.accounts.length === 0 ? <option value="">Primary Cash</option> : store.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {txType === 'transfer' && (
                <select value={txToAccountId} onChange={(e) => setTxToAccountId(e.target.value)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm">
                  <option value="">Destination...</option>
                  {store.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              )}
            </div>
            <input type="text" value={txMerchant} onChange={(e) => setTxMerchant(e.target.value)} placeholder="Merchant / Payee" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm" />
            <input type="text" value={txDescription} onChange={(e) => setTxDescription(e.target.value)} placeholder="Description" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm" />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setTxModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)]">Cancel</button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
