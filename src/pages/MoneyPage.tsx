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
  FinanceAccount,
  FinanceBudget,
  FinanceTransaction,
  InvestmentAssetType,
  RecurrencePattern,
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
  const [catFilter, setCatFilter] = useState<string>('all');
  const [accFilter, setAccFilter] = useState<string>('all');
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
  const [txTags, setTxTags] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [txRecurring, setTxRecurring] = useState(false);
  const [txRecurrence, setTxRecurrence] = useState<RecurrencePattern>('monthly');

  // Account Form (supports Add & Edit)
  const [editingAcc, setEditingAcc] = useState<FinanceAccount | null>(null);
  const [accName, setAccName] = useState('');
  const [accInst, setAccInst] = useState('');
  const [accType, setAccType] = useState<AccountType>('savings');
  const [accOpenBal, setAccOpenBal] = useState('');
  const [accColor, setAccColor] = useState<string>(BENTO_PALETTE[0]);

  // Budget Form (supports Add & Edit)
  const [editingBudget, setEditingBudget] = useState<FinanceBudget | null>(null);
  const [budName, setBudName] = useState('');
  const [budCat, setBudCat] = useState('Food');
  const [budLimit, setBudLimit] = useState('');
  const [budPeriod, setBudPeriod] = useState<BudgetPeriod>('monthly');
  const [budStart, setBudStart] = useState(todayISO());
  const [budEnd, setBudEnd] = useState(todayISO());
  const [budWarnPct, setBudWarnPct] = useState('80');

  // Savings Form + Custom Deposit
  const [savName, setSavName] = useState('');
  const [savTarget, setSavTarget] = useState('');
  const [savCurrent, setSavCurrent] = useState('');
  const [savMonthly, setSavMonthly] = useState('');
  const [savEmergency, setSavEmergency] = useState(false);
  const [savDepositById, setSavDepositById] = useState<Record<string, string>>({});

  // Investment Form + Manual Valuation Update
  const [invName, setInvName] = useState('');
  const [invType, setInvType] = useState<InvestmentAssetType>('mutual_funds');
  const [invInvested, setInvInvested] = useState('');
  const [invCurrent, setInvCurrent] = useState('');
  const [invQty, setInvQty] = useState('');
  const [invDate, setInvDate] = useState(todayISO());
  const [invValEditById, setInvValEditById] = useState<Record<string, string>>({});

  // Debt Form + Custom Repayment
  const [debtTitle, setDebtTitle] = useState('');
  const [debtKind, setDebtKind] = useState<DebtKind>('loan');
  const [debtCounterparty, setDebtCounterparty] = useState('');
  const [debtPrincipal, setDebtPrincipal] = useState('');
  const [debtDue, setDebtDue] = useState(todayISO());
  const [debtPayById, setDebtPayById] = useState<Record<string, string>>({});

  // Bill Form
  const [billName, setBillName] = useState('');
  const [billKind, setBillKind] = useState<'bill' | 'subscription'>('subscription');
  const [billAmount, setBillAmount] = useState('');
  const [billFreq, setBillFreq] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [billNextDue, setBillNextDue] = useState(todayISO());
  const [billCat, setBillCat] = useState('Subscriptions');
  const [billAccountId, setBillAccountId] = useState('');

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
    if (catFilter !== 'all') base = base.filter((t) => t.category === catFilter);
    if (accFilter !== 'all') base = base.filter((t) => t.accountId === accFilter || t.toAccountId === accFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      base = base.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.merchant.toLowerCase().includes(q) ||
          t.notes.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    return base.sort((a, b) => b.date.localeCompare(a.date));
  }, [store.transactions, rangeFilter, customStart, customEnd, typeFilter, catFilter, accFilter, search, monthBounds, weekBounds]);

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
    setTxTags('');
    setTxNotes('');
    setTxRecurring(false);
    setTxRecurrence('monthly');
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
    setTxTags(tx.tags.join(', '));
    setTxNotes(tx.notes);
    setTxRecurring(tx.recurring);
    setTxRecurrence(tx.recurrence);
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
      subcategory: txSubcategory.trim(),
      accountId: primaryAcc,
      toAccountId: txType === 'transfer' ? txToAccountId : null,
      date: txDate,
      time: txTime,
      merchant: txMerchant.trim(),
      description: txDescription.trim() || txCategory,
      tags: txTags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      notes: txNotes.trim(),
      recurring: txRecurring,
      recurrence: txRecurring ? txRecurrence : ('none' as const),
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
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-xs font-semibold whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto bento-scroll pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              tab === t.id
                ? 'bg-accent'
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
              <div className="mb-4">
                <h2 className="text-base font-bold">6-Month Income vs Expenses</h2>
                <p className="text-xs text-[var(--text-secondary)]">Computed directly from stored transactions</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashflowSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip
                      formatter={(value) => formatMoney(toMinor(Number(value)), cur)}
                      contentStyle={{
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
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
                        <div className="h-full bg-accent rounded-full" style={{ width: `${item.percent}%` }} />
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
                    <div key={acc.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: acc.color }} />
                          <p className="text-sm font-semibold truncate">{acc.name}</p>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {acc.type.replace('_', ' ')} {acc.institution ? `· ${acc.institution}` : ''} · {acc.active ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold font-mono-num mr-1">{formatMoney(bal, acc.currency)}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setAccFilter(acc.id);
                            setTab('transactions');
                          }}
                          className="text-xs text-accent hover:underline px-2 py-1"
                        >
                          Ledger
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAcc(acc);
                            setAccName(acc.name);
                            setAccInst(acc.institution);
                            setAccType(acc.type);
                            setAccOpenBal(String(fromMinor(acc.openingBalanceMinor)));
                            setAccColor(acc.color);
                          }}
                          aria-label="Edit account"
                          className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => store.updateAccount(acc.id, { active: !acc.active })}
                          className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1"
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
              if (editingAcc) {
                store.updateAccount(editingAcc.id, {
                  name: accName.trim(),
                  institution: accInst.trim(),
                  type: accType,
                  openingBalanceMinor: toMinor(accOpenBal),
                  color: accColor,
                });
                setEditingAcc(null);
              } else {
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
              }
              setAccName('');
              setAccInst('');
              setAccOpenBal('');
            }}
            className="bento-surface rounded-2xl p-5 lg:col-span-5 space-y-3 h-fit"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">{editingAcc ? 'Edit Account' : 'New Account'}</h3>
              {editingAcc && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingAcc(null);
                    setAccName('');
                    setAccInst('');
                    setAccOpenBal('');
                  }}
                  className="text-xs text-[var(--text-secondary)]"
                >
                  Cancel edit
                </button>
              )}
            </div>
            <input
              type="text"
              required
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
                  aria-label={`Select color ${c}`}
                  className={`w-6 h-6 rounded-full border-2 ${accColor === c ? 'border-[var(--text-primary)] scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-accent text-xs font-semibold"
            >
              {editingAcc ? 'Save Account Changes' : 'Create Account'}
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
                placeholder="Search merchant, category, tag..."
                className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3.5 py-2 text-xs w-56"
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
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
                className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs"
              >
                <option value="all">All Categories</option>
                {store.categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <select
                value={accFilter}
                onChange={(e) => setAccFilter(e.target.value)}
                className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs"
              >
                <option value="all">All Accounts</option>
                {store.accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
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

          {csvFeedback && <p className="text-xs text-accent">{csvFeedback}</p>}

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
                  className="px-3 py-1.5 rounded-lg bg-accent text-xs font-semibold"
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
                className="text-xs font-semibold text-accent hover:underline"
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
                    <div className="flex items-center gap-2 min-w-0">
                      <label className="min-w-[36px] min-h-[36px] flex items-center justify-center shrink-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedTxIds((prev) =>
                              checked ? prev.filter((id) => id !== tx.id) : [...prev, tx.id]
                            )
                          }
                          className="rounded w-4 h-4"
                        />
                      </label>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {tx.description || tx.merchant || tx.category}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] truncate">
                          {tx.type} · {tx.category}{tx.subcategory ? ` / ${tx.subcategory}` : ''} · {accountNameMap.get(tx.accountId) || 'Account'}
                          {tx.toAccountId ? ` → ${accountNameMap.get(tx.toAccountId) || 'Target'}` : ''} · {tx.date}
                          {tx.recurring ? ` · ${tx.recurrence}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-sm font-bold font-mono-num mr-1 ${amountCls}`}>
                        {sign}{formatMoney(tx.amountMinor, cur)}
                      </span>
                      <button type="button" onClick={() => openEditTxModal(tx)} aria-label="Edit" className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => store.duplicateTransaction(tx.id)} aria-label="Duplicate" className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => store.deleteTransaction(tx.id)} aria-label="Delete" className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] text-rose-400">
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono-num font-semibold">
                            {formatMoney(row.spentMinor, cur)} / {formatMoney(row.budget.limitMinor, cur)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBudget(row.budget);
                              setBudName(row.budget.name);
                              setBudCat(row.budget.category);
                              setBudLimit(String(fromMinor(row.budget.limitMinor)));
                              setBudPeriod(row.budget.period);
                              setBudStart(row.budget.startDate || todayISO());
                              setBudEnd(row.budget.endDate || todayISO());
                              setBudWarnPct(String(row.budget.warningThresholdPct));
                            }}
                            aria-label="Edit budget"
                            className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => store.deleteBudget(row.budget.id)} aria-label="Delete budget" className="text-rose-400 p-1.5">
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
              const payload = {
                name: budName.trim() || `${budCat} Budget`,
                category: budCat,
                limitMinor: lim,
                period: budPeriod,
                startDate: budPeriod === 'custom' ? budStart : null,
                endDate: budPeriod === 'custom' ? budEnd : null,
                warningThresholdPct: Number(budWarnPct) || 80,
                notes: '',
              };
              if (editingBudget) {
                store.updateBudget(editingBudget.id, payload);
                setEditingBudget(null);
              } else {
                store.addBudget(payload);
              }
              setBudName('');
              setBudLimit('');
            }}
            className="bento-surface rounded-2xl p-5 lg:col-span-5 space-y-3 h-fit"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">{editingBudget ? 'Edit Budget' : 'Create Budget'}</h3>
              {editingBudget && (
                <button type="button" onClick={() => setEditingBudget(null)} className="text-xs text-[var(--text-secondary)]">
                  Cancel
                </button>
              )}
            </div>
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
            {budPeriod === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={budStart} onChange={(e) => setBudStart(e.target.value)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
                <input type="date" value={budEnd} onChange={(e) => setBudEnd(e.target.value)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <input type="number" required value={budLimit} onChange={(e) => setBudLimit(e.target.value)} placeholder={`Limit (${cur})`} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3.5 py-2 text-sm font-mono-num" />
              <input type="number" value={budWarnPct} onChange={(e) => setBudWarnPct(e.target.value)} placeholder="Alert %" className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3.5 py-2 text-sm font-mono-num" />
            </div>
            <button type="submit" className="w-full py-2.5 rounded-xl bg-accent text-xs font-semibold">
              {editingBudget ? 'Update Budget' : 'Save Budget'}
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
              <input type="text" required value={savName} onChange={(e) => setSavName(e.target.value)} placeholder="Savings goal name" className="col-span-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
              <input type="number" required value={savTarget} onChange={(e) => setSavTarget(e.target.value)} placeholder="Target amount" className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <input type="number" value={savCurrent} onChange={(e) => setSavCurrent(e.target.value)} placeholder="Current saved" className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <input type="checkbox" checked={savEmergency} onChange={(e) => setSavEmergency(e.target.checked)} />
                Emergency fund
              </label>
              <button type="submit" className="py-2 rounded-lg bg-accent text-xs font-semibold">Add Target</button>
            </form>

            <div className="divide-y bento-divider">
              {store.savingsGoals.map((sg) => {
                const pct = sg.targetMinor > 0 ? Math.min(100, Math.round((sg.currentMinor / sg.targetMinor) * 100)) : 0;
                const depositAmt = savDepositById[sg.id] ?? '';
                return (
                  <div key={sg.id} className="py-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">
                          {sg.name} {sg.isEmergencyFund ? '· Emergency Fund' : ''}
                        </p>
                        <p className="text-xs font-mono-num text-[var(--text-secondary)]">
                          {formatMoney(sg.currentMinor, cur)} / {formatMoney(sg.targetMinor, cur)} ({pct}%)
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={depositAmt}
                          onChange={(e) => setSavDepositById((p) => ({ ...p, [sg.id]: e.target.value }))}
                          placeholder="Amount"
                          className="w-20 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-2 py-1 text-xs font-mono-num"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const amt = toMinor(depositAmt || 1000);
                            if (amt > 0) {
                              store.contributeSavings(sg.id, amt, 'Contribution');
                              setSavDepositById((p) => ({ ...p, [sg.id]: '' }));
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-accent text-xs font-medium"
                        >
                          Add
                        </button>
                        <button type="button" onClick={() => store.deleteSavingsGoal(sg.id)} className="text-rose-400 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
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
              <input type="text" required value={invName} onChange={(e) => setInvName(e.target.value)} placeholder="Asset name (e.g., Nifty 50 Index)" className="col-span-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
              <select value={invType} onChange={(e) => setInvType(e.target.value as InvestmentAssetType)} className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                <option value="mutual_funds">Mutual Funds</option>
                <option value="stocks">Stocks</option>
                <option value="fixed_deposit">Fixed Deposit</option>
                <option value="gold">Gold</option>
                <option value="other">Other Asset</option>
              </select>
              <input type="number" value={invQty} onChange={(e) => setInvQty(e.target.value)} placeholder="Quantity (opt)" className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <input type="number" required value={invInvested} onChange={(e) => setInvInvested(e.target.value)} placeholder="Invested amount" className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <input type="number" value={invCurrent} onChange={(e) => setInvCurrent(e.target.value)} placeholder="Manual valuation" className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <input type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <button type="submit" className="py-2 rounded-lg bg-accent text-xs font-semibold">Add Holding</button>
            </form>

            <div className="divide-y bento-divider">
              {store.investments.map((inv) => {
                const gainMinor = inv.currentValuationMinor - inv.investedMinor;
                const valInput = invValEditById[inv.id] ?? '';
                return (
                  <div key={inv.id} className="py-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{inv.name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {inv.assetType.replace('_', ' ')} · Manual valuation ({inv.valuationUpdatedAt})
                        </p>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-2">
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
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={valInput}
                        onChange={(e) => setInvValEditById((p) => ({ ...p, [inv.id]: e.target.value }))}
                        placeholder="New manual valuation"
                        className="flex-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-2.5 py-1 text-xs font-mono-num"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = toMinor(valInput);
                          if (nextVal > 0) {
                            store.updateInvestment(inv.id, {
                              currentValuationMinor: nextVal,
                              valuationUpdatedAt: todayISO(),
                            });
                            setInvValEditById((p) => ({ ...p, [inv.id]: '' }));
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-xs font-medium"
                      >
                        Update Value
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
              <input type="text" required value={debtTitle} onChange={(e) => setDebtTitle(e.target.value)} placeholder="Title (e.g., Car EMI, Lent to Alex)" className="col-span-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
              <select value={debtKind} onChange={(e) => setDebtKind(e.target.value as DebtKind)} className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                <option value="loan">Loan</option>
                <option value="emi">EMI</option>
                <option value="credit_card">Credit Card</option>
                <option value="borrowed">Borrowed</option>
                <option value="lent">Money Lent</option>
              </select>
              <input type="text" value={debtCounterparty} onChange={(e) => setDebtCounterparty(e.target.value)} placeholder="Lender / Person" className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
              <input type="number" required value={debtPrincipal} onChange={(e) => setDebtPrincipal(e.target.value)} placeholder="Amount" className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <input type="date" value={debtDue} onChange={(e) => setDebtDue(e.target.value)} className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <button type="submit" className="col-span-2 py-2 rounded-lg bg-accent text-xs font-semibold">Add Record</button>
            </form>

            <div className="divide-y bento-divider">
              {store.debts.map((d) => {
                const payVal = debtPayById[d.id] ?? '';
                return (
                  <div key={d.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">
                        {d.title} {d.counterparty ? `· ${d.counterparty}` : ''}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {d.kind.replace('_', ' ')} · Remaining {formatMoney(d.remainingMinor, cur)} · Due {d.dueDate || '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {d.remainingMinor > 0 && (
                        <>
                          <input
                            type="number"
                            value={payVal}
                            onChange={(e) => setDebtPayById((p) => ({ ...p, [d.id]: e.target.value }))}
                            placeholder="Repay"
                            className="w-20 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-2 py-1 text-xs font-mono-num"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const amt = toMinor(payVal || 1000);
                              if (amt > 0) {
                                store.recordDebtPayment(d.id, Math.min(d.remainingMinor, amt), 'Repayment');
                                setDebtPayById((p) => ({ ...p, [d.id]: '' }));
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-accent text-xs font-medium"
                          >
                            Pay
                          </button>
                        </>
                      )}
                      <button type="button" onClick={() => store.deleteDebt(d.id)} className="text-rose-400 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
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
                  accountId: billAccountId || store.accounts[0]?.id || null,
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
              <input type="text" required value={billName} onChange={(e) => setBillName(e.target.value)} placeholder="Bill / Subscription name" className="col-span-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
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
              <input type="number" required value={billAmount} onChange={(e) => setBillAmount(e.target.value)} placeholder="Amount" className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <input type="date" value={billNextDue} onChange={(e) => setBillNextDue(e.target.value)} className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <select value={billCat} onChange={(e) => setBillCat(e.target.value)} className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                {store.categories.filter((c) => c.kind === 'expense').map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <select value={billAccountId} onChange={(e) => setBillAccountId(e.target.value)} className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                <option value="">Default Account</option>
                {store.accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <button type="submit" className="col-span-2 py-2 rounded-lg bg-accent text-xs font-semibold">Add Bill</button>
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
                      className="px-2.5 py-1 rounded-lg bg-accent text-xs font-medium"
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
            <input type="text" required value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Category name" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm" />
            <select value={catKind} onChange={(e) => setCatKind(e.target.value as 'expense' | 'income')} className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm">
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <input type="text" value={catSub} onChange={(e) => setCatSub(e.target.value)} placeholder="Subcategories (comma-separated)" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm" />
            <button type="submit" className="w-full py-2.5 rounded-xl bg-accent text-xs font-semibold">Create Category</button>
          </form>
        </div>
      )}

      {/* Add/Edit Transaction Modal */}
      {txModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setTxModalOpen(false)}>
          <form
            onSubmit={handleSaveTx}
            onClick={(e) => e.stopPropagation()}
            className="bento-surface w-full max-w-md rounded-2xl p-6 space-y-3 max-h-[90vh] overflow-y-auto bento-scroll"
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
              <div className="grid grid-cols-2 gap-3">
                <select value={txCategory} onChange={(e) => setTxCategory(e.target.value)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm">
                  {store.categories
                    .filter((c) => (txType === 'income' ? c.kind === 'income' : c.kind === 'expense'))
                    .map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                </select>
                <input type="text" value={txSubcategory} onChange={(e) => setTxSubcategory(e.target.value)} placeholder="Subcategory (opt)" className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm" />
              </div>
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
            <input type="text" value={txTags} onChange={(e) => setTxTags(e.target.value)} placeholder="Tags (comma-separated)" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
            <textarea rows={2} value={txNotes} onChange={(e) => setTxNotes(e.target.value)} placeholder="Notes (optional)" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
            <div className="flex items-center justify-between gap-2 text-xs">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={txRecurring} onChange={(e) => setTxRecurring(e.target.checked)} />
                <span>Recurring transaction</span>
              </label>
              {txRecurring && (
                <select value={txRecurrence} onChange={(e) => setTxRecurrence(e.target.value as RecurrencePattern)} className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-2 py-1">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setTxModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)]">Cancel</button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-accent text-xs font-semibold">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
