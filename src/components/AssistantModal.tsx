import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Send, Sparkles, X } from 'lucide-react';
import { useBentoStore } from '../store/useBentoStore';
import { ParsedAssistantProposal, parseBentoCommand, queryOptionalExternalAI } from '../services/bentoParser';
import { fromMinor, todayISO, toMinor } from '../utils/finance';
import { TransactionType } from '../types/bento';

interface AssistantModalProps {
  isOpen: boolean;
  initialPrompt?: string;
  onClose: () => void;
}

const EXAMPLE_PROMPTS = [
  'Spent 450 on dinner today',
  'Received salary of 20000 in my bank account',
  'Tomorrow at 7 PM remind me to study Excel',
  'Create a goal to save 50000',
  'I studied accounting for 45 minutes',
  'Show my food expenses this month',
  'How much money do I have?',
  'Summarize my week',
];

export const AssistantModal: React.FC<AssistantModalProps> = ({ isOpen, initialPrompt, onClose }) => {
  const store = useBentoStore();
  const [input, setInput] = useState('');
  const [proposal, setProposal] = useState<ParsedAssistantProposal | null>(null);
  const [externalReply, setExternalReply] = useState<string>('');
  const [loadingExternal, setLoadingExternal] = useState(false);

  // Editable confirmation state
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editAccountId, setEditAccountId] = useState('');
  const [editDate, setEditDate] = useState(todayISO());
  const [editTitle, setEditTitle] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editDuration, setEditDuration] = useState('30');

  const evaluatePrompt = (text: string) => {
    const parsed = parseBentoCommand(text, store.getSnapshot());
    setProposal(parsed);
    setExternalReply('');
    setEditAmount(parsed.payload.amountMinor ? String(fromMinor(parsed.payload.amountMinor)) : '');
    setEditCategory(parsed.payload.category || 'Food');
    setEditAccountId(parsed.payload.accountId || store.accounts[0]?.id || '');
    setEditDate(parsed.payload.date || parsed.payload.dueDate || todayISO());
    setEditTitle(
      parsed.payload.taskTitle ||
        parsed.payload.goalTitle ||
        parsed.payload.studySubject ||
        parsed.payload.description ||
        parsed.payload.noteContent ||
        ''
    );
    setEditTime(parsed.payload.dueTime || '');
    setEditDuration(String(parsed.payload.durationMinutes || 30));

    if (parsed.kind === 'query_response') {
      store.addAssistantHistory({
        prompt: text,
        intent: parsed.kind,
        module: parsed.module,
        summary: parsed.summary,
        confirmed: true,
      });
    }
  };

  useEffect(() => {
    if (isOpen && initialPrompt) {
      setInput(initialPrompt);
      evaluatePrompt(initialPrompt);
    }
  }, [isOpen, initialPrompt]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    evaluatePrompt(input.trim());
  };

  const handleAskExternalAI = async () => {
    if (!proposal) return;
    setLoadingExternal(true);
    try {
      const reply = await queryOptionalExternalAI(proposal.rawInput, store.getSnapshot());
      setExternalReply(reply);
    } catch (err) {
      setExternalReply(err instanceof Error ? err.message : 'External AI request failed.');
    } finally {
      setLoadingExternal(false);
    }
  };

  const handleConfirmProposal = () => {
    if (!proposal) return;

    if (proposal.kind === 'create_transaction') {
      const minor = toMinor(editAmount);
      if (minor <= 0) return;
      let accId = editAccountId;
      if (!accId) {
        if (store.accounts.length > 0) {
          accId = store.accounts[0].id;
        } else {
          accId = store.addAccount({
            name: 'Primary Account',
            institution: 'Local',
            type: 'savings',
            openingBalanceMinor: 0,
            currency: store.settings.currency,
            color: '#10b981',
            notes: 'Created from Tell BENTO confirmation',
            active: true,
          }).id;
        }
      }
      store.addTransaction({
        type: (proposal.payload.txType ?? 'expense') as TransactionType,
        amountMinor: minor,
        category: editCategory || 'Other',
        subcategory: '',
        accountId: accId,
        toAccountId: proposal.payload.toAccountId ?? null,
        date: editDate || todayISO(),
        time: '12:00',
        merchant: '',
        description: editTitle || editCategory,
        tags: ['assistant'],
        notes: `Parsed from: "${proposal.rawInput}"`,
        recurring: false,
        recurrence: 'none',
      });
    } else if (proposal.kind === 'create_task') {
      store.addTask({
        title: editTitle || proposal.rawInput,
        dueDate: editDate || todayISO(),
        dueTime: editTime || null,
        reminderAt: editTime ? `${editDate || todayISO()}T${editTime}` : null,
        priority: proposal.payload.priority ?? 'medium',
        status: editDate === todayISO() ? 'in_progress' : 'upcoming',
      });
    } else if (proposal.kind === 'create_goal') {
      store.addGoal({
        title: editTitle || 'New Goal',
        description: '',
        category: proposal.payload.goalKind === 'financial' ? 'financial' : 'personal',
        kind: proposal.payload.goalKind ?? 'numeric',
        targetValue: Number(editAmount) || proposal.payload.goalTarget || 100,
        currentValue: 0,
        unit: proposal.payload.goalUnit || store.settings.currency,
        startDate: todayISO(),
        deadline: editDate || null,
        priority: 'medium',
        status: 'active',
        milestones: [],
        linkedHabitIds: [],
        notes: '',
        color: '#8b5cf6',
      });
    } else if (proposal.kind === 'log_study') {
      store.addStudySession({
        subject: editTitle || 'Study Session',
        durationMinutes: Math.max(1, parseInt(editDuration, 10) || 30),
        date: editDate || todayISO(),
        notes: `Logged via Tell BENTO`,
      });
    } else if (proposal.kind === 'log_habit' && proposal.payload.habitId) {
      store.logHabitForDate(proposal.payload.habitId, editDate || todayISO(), 'completed');
    } else if (proposal.kind === 'create_journal') {
      store.addJournalEntry({
        date: editDate || todayISO(),
        title: editTitle.slice(0, 48) || `Journal ${editDate}`,
        content: editTitle,
        mood: 'good',
        tags: [],
      });
    } else if (proposal.kind === 'create_note') {
      store.addNote({
        title: editTitle.slice(0, 48) || 'Quick Note',
        content: editTitle,
        category: 'General',
        pinned: false,
        tags: [],
      });
    }

    store.addAssistantHistory({
      prompt: proposal.rawInput,
      intent: proposal.kind,
      module: proposal.module,
      summary: `${proposal.summary} (Confirmed)`,
      confirmed: true,
    });

    setProposal(null);
    setInput('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="bento-surface w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden w-10 h-1.5 bg-[var(--border-strong)] rounded-full mx-auto mt-3" />

        <div className="flex items-center justify-between px-5 py-4 border-b bento-divider">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">Tell BENTO</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Offline Deterministic Engine · Layer 1 active
                {store.settings.aiLayer3ExternalEnabled ? ' · External AI enabled' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assistant"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-[var(--bg-hover)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto bento-scroll space-y-5 flex-1">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Try "Spent 450 on dinner today" or "How much money do I have?"'
              className="flex-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-4 py-3 text-sm focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="min-h-[44px] px-4 rounded-xl bg-accent text-sm font-semibold inline-flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>Run</span>
            </button>
          </form>

          {/* Confirmation Preview or Query Answer */}
          {proposal && (
            <div className="bento-elevated rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-accent font-medium">
                    {proposal.module} · {proposal.confidence} confidence · {proposal.layer}
                  </p>
                  <h3 className="text-sm font-bold mt-0.5">{proposal.summary}</h3>
                </div>
                {proposal.requiresConfirmation && (
                  <span className="text-xs text-[var(--text-muted)]">Review & edit before saving</span>
                )}
              </div>

              {proposal.kind === 'query_response' ? (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed whitespace-pre-line">{proposal.answerText}</p>
                  {proposal.answerRoute && (
                    <button
                      type="button"
                      onClick={() => {
                        store.setActiveSection(proposal.answerRoute!);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                    >
                      <span>Open {proposal.module}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {proposal.kind === 'create_transaction' && (
                      <>
                        <div>
                          <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                            Amount ({store.settings.currency})
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-full rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-sm font-mono-num"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                            Category
                          </label>
                          <input
                            type="text"
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="w-full rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                            Account
                          </label>
                          <select
                            value={editAccountId}
                            onChange={(e) => setEditAccountId(e.target.value)}
                            className="w-full rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-sm"
                          >
                            {store.accounts.length === 0 ? (
                              <option value="">Primary Account (auto-create)</option>
                            ) : (
                              store.accounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                      </>
                    )}

                    <div className={proposal.kind === 'create_transaction' ? '' : 'sm:col-span-2'}>
                      <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                        Title / Details
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-[var(--text-secondary)] mb-1">Date</label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-sm font-mono-num"
                      />
                    </div>

                    {proposal.kind === 'create_task' && (
                      <div>
                        <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                          Reminder Time
                        </label>
                        <input
                          type="time"
                          value={editTime}
                          onChange={(e) => setEditTime(e.target.value)}
                          className="w-full rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-sm font-mono-num"
                        />
                      </div>
                    )}

                    {proposal.kind === 'create_goal' && (
                      <div>
                        <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                          Target ({proposal.payload.goalUnit})
                        </label>
                        <input
                          type="number"
                          value={editAmount || proposal.payload.goalTarget || 100}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-full rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-sm font-mono-num"
                        />
                      </div>
                    )}

                    {proposal.kind === 'log_study' && (
                      <div>
                        <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                          Minutes
                        </label>
                        <input
                          type="number"
                          value={editDuration}
                          onChange={(e) => setEditDuration(e.target.value)}
                          className="w-full rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-sm font-mono-num"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    {store.settings.aiLayer3ExternalEnabled ? (
                      <button
                        type="button"
                        onClick={handleAskExternalAI}
                        disabled={loadingExternal}
                        className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline"
                      >
                        {loadingExternal ? 'Querying External AI...' : 'Ask Optional External AI'}
                      </button>
                    ) : (
                      <span className="text-[11px] text-[var(--text-muted)]">
                        Nothing is saved until you confirm.
                      </span>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setProposal(null)}
                        className="px-3.5 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                      >
                        Discard
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmProposal}
                        disabled={proposal.kind === 'create_transaction' && toMinor(editAmount) <= 0}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent disabled:opacity-40 text-xs font-semibold"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm & Save</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {externalReply && (
                <div className="pt-3 border-t bento-divider text-xs text-[var(--text-secondary)] whitespace-pre-line">
                  <p className="font-semibold text-[var(--text-primary)] mb-1">External AI Suggestion (non-authoritative):</p>
                  {externalReply}
                </div>
              )}
            </div>
          )}

          {/* Example Commands */}
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Try saying</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setInput(ex);
                    evaluatePrompt(ex);
                  }}
                  className="text-left px-3 py-2 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  "{ex}"
                </button>
              ))}
            </div>
          </div>

          {/* Action History */}
          {store.assistantHistory.length > 0 && (
            <div className="pt-2 border-t bento-divider">
              <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Recent Assistant Actions</p>
              <div className="divide-y bento-divider">
                {store.assistantHistory.slice(0, 6).map((item) => (
                  <div key={item.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-medium truncate">"{item.prompt}"</p>
                      <p className="text-[var(--text-secondary)] truncate">
                        {item.module} · {item.summary}
                      </p>
                    </div>
                    <span className="font-mono-num text-[11px] text-[var(--text-muted)] shrink-0">
                      {item.timestamp.slice(11, 16)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
