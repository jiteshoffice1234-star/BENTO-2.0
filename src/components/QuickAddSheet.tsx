import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useBentoStore } from '../store/useBentoStore';
import { fromMinor, todayISO, toMinor } from '../utils/finance';
import { parseBentoCommand } from '../services/bentoParser';
import { GoalCategory, TaskPriority } from '../types/bento';

type CaptureMode =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'task'
  | 'reminder'
  | 'habit'
  | 'goal'
  | 'study'
  | 'journal'
  | 'note'
  | 'event'
  | 'wishlist';

interface QuickAddSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAssistant: (prefill?: string) => void;
}

const CAPTURE_MODES: Array<{ id: CaptureMode; label: string }> = [
  { id: 'expense', label: 'Expense' },
  { id: 'income', label: 'Income' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'task', label: 'Task' },
  { id: 'reminder', label: 'Reminder' },
  { id: 'habit', label: 'Habit' },
  { id: 'goal', label: 'Goal' },
  { id: 'study', label: 'Study' },
  { id: 'journal', label: 'Journal' },
  { id: 'note', label: 'Note' },
  { id: 'event', label: 'Event' },
  { id: 'wishlist', label: 'Wishlist' },
];

export const QuickAddSheet: React.FC<QuickAddSheetProps> = ({ isOpen, onClose, onOpenAssistant }) => {
  const store = useBentoStore();
  const [mode, setMode] = useState<CaptureMode>('expense');
  const [nlInput, setNlInput] = useState('');

  // Shared form fields
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState('09:00');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [notes, setNotes] = useState('');
  const [durationMins, setDurationMins] = useState('45');
  const [goalCategory, setGoalCategory] = useState<GoalCategory>('personal');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const ensureDefaultAccount = () => {
    if (store.accounts.length > 0) return store.accounts[0].id;
    const created = store.addAccount({
      name: 'Primary Cash',
      institution: 'Wallet',
      type: 'cash',
      openingBalanceMinor: 0,
      currency: store.settings.currency,
      color: '#10b981',
      notes: 'Auto-created on first capture',
      active: true,
    });
    return created.id;
  };

  const handleNLSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlInput.trim()) return;
    const text = nlInput.trim();
    setNlInput('');
    onClose();
    onOpenAssistant(text);
  };

  const resetFields = () => {
    setTitle('');
    setAmount('');
    setNotes('');
    setError('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'expense' || mode === 'income' || mode === 'transfer') {
      const minor = toMinor(amount);
      if (minor <= 0) {
        setError('Enter a valid amount greater than 0.');
        return;
      }
      const primaryAcc = accountId || ensureDefaultAccount();
      if (mode === 'transfer') {
        const targetAcc = toAccountId || store.accounts.find((a) => a.id !== primaryAcc)?.id;
        if (!targetAcc || targetAcc === primaryAcc) {
          setError('Select two different accounts for a transfer.');
          return;
        }
        store.addTransaction({
          type: 'transfer',
          amountMinor: minor,
          category: 'Transfer',
          subcategory: '',
          accountId: primaryAcc,
          toAccountId: targetAcc,
          date,
          time,
          merchant: '',
          description: title.trim() || 'Account transfer',
          tags: [],
          notes,
          recurring: false,
          recurrence: 'none',
        });
      } else {
        store.addTransaction({
          type: mode,
          amountMinor: minor,
          category: category || (mode === 'income' ? 'Salary' : 'Other'),
          subcategory: '',
          accountId: primaryAcc,
          toAccountId: null,
          date,
          time,
          merchant: '',
          description: title.trim() || category,
          tags: [],
          notes,
          recurring: false,
          recurrence: 'none',
        });
      }
    } else if (mode === 'task' || mode === 'reminder') {
      if (!title.trim()) {
        setError('Title is required.');
        return;
      }
      store.addTask({
        title: title.trim(),
        description: notes,
        priority,
        status: date === todayISO() ? 'in_progress' : 'upcoming',
        dueDate: date,
        dueTime: mode === 'reminder' ? time : null,
        reminderAt: mode === 'reminder' ? `${date}T${time}` : null,
        category: 'Personal',
      });
    } else if (mode === 'habit') {
      if (!title.trim()) {
        setError('Habit name is required.');
        return;
      }
      store.addHabit({
        name: title.trim(),
        description: notes,
        kind: 'positive',
        frequency: 'daily',
        scheduledDays: [0, 1, 2, 3, 4, 5, 6],
        targetCount: 1,
        unit: 'time',
        reminderTime: null,
        startDate: todayISO(),
        endDate: null,
        category: 'Health',
        color: '#10b981',
        enabled: true,
      });
    } else if (mode === 'goal') {
      if (!title.trim()) {
        setError('Goal title is required.');
        return;
      }
      store.addGoal({
        title: title.trim(),
        description: notes,
        category: goalCategory,
        kind: goalCategory === 'financial' ? 'financial' : 'numeric',
        targetValue: Number(amount) > 0 ? Number(amount) : 100,
        currentValue: 0,
        unit: goalCategory === 'financial' ? store.settings.currency : '%',
        startDate: todayISO(),
        deadline: date,
        priority,
        status: 'active',
        milestones: [],
        linkedHabitIds: [],
        notes: '',
        color: '#8b5cf6',
      });
    } else if (mode === 'study') {
      if (!title.trim()) {
        setError('Subject or topic is required.');
        return;
      }
      store.addStudySession({
        subject: title.trim(),
        durationMinutes: Math.max(1, parseInt(durationMins, 10) || 30),
        date,
        notes,
      });
    } else if (mode === 'journal') {
      if (!notes.trim() && !title.trim()) {
        setError('Write something for your journal entry.');
        return;
      }
      store.addJournalEntry({
        date,
        title: title.trim() || `Entry for ${date}`,
        content: notes.trim() || title.trim(),
        mood: 'good',
        tags: [],
      });
    } else if (mode === 'note') {
      if (!title.trim() && !notes.trim()) {
        setError('Note content is required.');
        return;
      }
      store.addNote({
        title: title.trim() || 'Quick Note',
        content: notes.trim(),
        category: 'General',
        pinned: false,
        tags: [],
      });
    } else if (mode === 'event') {
      if (!title.trim()) {
        setError('Event title is required.');
        return;
      }
      store.addEvent({
        title: title.trim(),
        description: notes,
        kind: 'event',
        startDate: date,
        startTime: time,
        endDate: date,
        endTime: time,
        allDay: false,
        color: '#3b82f6',
        notes: '',
      });
    } else if (mode === 'wishlist') {
      if (!title.trim()) {
        setError('Item name is required.');
        return;
      }
      store.addWishlistItem({
        name: title.trim(),
        priceMinor: toMinor(amount),
        priority,
        category: 'Personal',
        purchaseLink: '',
        targetDate: date,
        purchased: false,
        notes,
      });
    }

    resetFields();
    onClose();
  };

  const expenseCategories = store.categories.filter((c) => c.kind === 'expense');
  const incomeCategories = store.categories.filter((c) => c.kind === 'income');

  const previewHint = nlInput.trim()
    ? parseBentoCommand(nlInput, store.getSnapshot()).summary
    : 'e.g. "Spent 450 on dinner today" or "Tomorrow at 7 PM remind me to study Excel"';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="bento-surface w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden w-10 h-1.5 bg-[var(--border-strong)] rounded-full mx-auto mt-3" />

        <div className="flex items-center justify-between px-5 py-4 border-b bento-divider">
          <div>
            <h2 className="text-base font-bold">Quick Capture</h2>
            <p className="text-xs text-[var(--text-secondary)]">Record anything in seconds</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quick capture"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-[var(--bg-hover)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Natural Language Bar */}
        <form onSubmit={handleNLSubmit} className="px-5 pt-4 pb-3 border-b bento-divider bg-[var(--bg-elevated)]/50">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Sparkles className="w-4 h-4 text-accent absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={nlInput}
                onChange={(e) => setNlInput(e.target.value)}
                placeholder="Tell BENTO in plain language..."
                className="w-full rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <button
              type="submit"
              disabled={!nlInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-accent disabled:opacity-40 text-xs font-semibold whitespace-nowrap shrink-0"
            >
              Parse
            </button>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1.5 truncate">{previewHint}</p>
        </form>

        {/* Mode Selector */}
        <div className="px-5 py-3 border-b bento-divider flex items-center gap-1.5 overflow-x-auto bento-scroll">
          {CAPTURE_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setMode(m.id);
                setError('');
                if (m.id === 'income') setCategory('Salary');
                if (m.id === 'expense') setCategory('Food');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                mode === m.id
                  ? 'bg-accent'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Structured Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto bento-scroll">
          {(mode === 'expense' || mode === 'income' || mode === 'transfer' || mode === 'goal' || mode === 'wishlist') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  {mode === 'goal' ? 'Target Value' : `Amount (${store.settings.currency})`}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={mode === 'goal' ? '50000' : '0.00'}
                  className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3.5 py-2.5 text-sm font-mono-num focus:outline-none focus:border-emerald-500"
                />
              </div>

              {(mode === 'expense' || mode === 'income') && (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    {(mode === 'income' ? incomeCategories : expenseCategories).map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {mode === 'goal' && (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Area
                  </label>
                  <select
                    value={goalCategory}
                    onChange={(e) => setGoalCategory(e.target.value as GoalCategory)}
                    className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="financial">Financial</option>
                    <option value="career">Career</option>
                    <option value="education">Education</option>
                    <option value="health">Health</option>
                    <option value="personal">Personal</option>
                    <option value="lifestyle">Lifestyle</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {(mode === 'expense' || mode === 'income' || mode === 'transfer') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  {mode === 'transfer' ? 'From Account' : 'Account'}
                </label>
                <select
                  value={accountId || store.accounts[0]?.id || ''}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                >
                  {store.accounts.length === 0 ? (
                    <option value="">Primary Cash (auto-create)</option>
                  ) : (
                    store.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({fromMinor(a.openingBalanceMinor).toFixed(0)} open)
                      </option>
                    ))
                  )}
                </select>
              </div>
              {mode === 'transfer' && (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    To Account
                  </label>
                  {store.accounts.length < 2 ? (
                    <div className="flex items-center justify-between gap-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                      <span className="text-[var(--text-secondary)]">Need a 2nd account</span>
                      <button
                        type="button"
                        onClick={() => {
                          const firstId = ensureDefaultAccount();
                          const created = store.addAccount({
                            name: 'Savings Bank',
                            institution: 'Bank',
                            type: 'savings',
                            openingBalanceMinor: 0,
                            currency: store.settings.currency,
                            color: '#3b82f6',
                            notes: 'Created for transfer',
                            active: true,
                          });
                          setAccountId(firstId);
                          setToAccountId(created.id);
                        }}
                        className="text-accent font-semibold hover:underline shrink-0"
                      >
                        + Create 2nd
                      </button>
                    </div>
                  ) : (
                    <select
                      value={toAccountId}
                      onChange={(e) => setToAccountId(e.target.value)}
                      className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent"
                    >
                      <option value="">Select destination...</option>
                      {store.accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              {mode === 'study'
                ? 'Subject / Topic'
                : mode === 'expense' || mode === 'income'
                ? 'Description / Merchant'
                : 'Title'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                mode === 'expense'
                  ? 'Dinner at cafe'
                  : mode === 'study'
                  ? 'Excel Pivot Tables'
                  : mode === 'habit'
                  ? 'Morning Walk 20m'
                  : 'Enter title...'
              }
              className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm font-mono-num focus:outline-none focus:border-emerald-500"
              />
            </div>

            {(mode === 'reminder' || mode === 'event') && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm font-mono-num focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {mode === 'study' && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Minutes</label>
                <input
                  type="number"
                  min={1}
                  value={durationMins}
                  onChange={(e) => setDurationMins(e.target.value)}
                  className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm font-mono-num focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {(mode === 'task' || mode === 'reminder' || mode === 'goal' || mode === 'wishlist') && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="none">None</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              {mode === 'journal' || mode === 'note' ? 'Content' : 'Notes (optional)'}
            </label>
            <textarea
              rows={mode === 'journal' || mode === 'note' ? 4 : 2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add details..."
              className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {error && <p className="text-xs text-rose-500">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-accent text-xs font-semibold transition-colors"
            >
              Save {CAPTURE_MODES.find((c) => c.id === mode)?.label}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
