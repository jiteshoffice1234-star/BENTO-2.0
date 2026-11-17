import React, { useMemo, useState } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import { useBentoStore } from '../store/useBentoStore';
import { NavSection } from '../types/bento';
import { formatMoney } from '../utils/finance';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuickAdd: () => void;
  onOpenAssistant: () => void;
}

interface SearchHit {
  id: string;
  module: string;
  title: string;
  subtitle: string;
  route: NavSection;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onOpenQuickAdd,
  onOpenAssistant,
}) => {
  const store = useBentoStore();
  const [query, setQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [recentQueries, setRecentQueries] = useState<string[]>([]);

  const hits = useMemo<SearchHit[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const results: SearchHit[] = [];

    for (const tx of store.transactions) {
      if (tx.deletedAt) continue;
      if (
        tx.description.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q) ||
        tx.merchant.toLowerCase().includes(q)
      ) {
        results.push({
          id: `tx-${tx.id}`,
          module: 'Money',
          title: tx.description || tx.merchant || tx.category,
          subtitle: `${tx.type} · ${tx.category} · ${formatMoney(tx.amountMinor, store.settings.currency)} · ${tx.date}`,
          route: 'money',
        });
      }
    }

    for (const task of store.tasks) {
      if (task.deletedAt) continue;
      if (task.title.toLowerCase().includes(q) || task.notes.toLowerCase().includes(q)) {
        results.push({
          id: `task-${task.id}`,
          module: 'Daily',
          title: task.title,
          subtitle: `Task · ${task.status} · ${task.dueDate ?? 'No due date'}`,
          route: 'daily',
        });
      }
    }

    for (const g of store.goals) {
      if (g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)) {
        results.push({
          id: `goal-${g.id}`,
          module: 'Goals',
          title: g.title,
          subtitle: `Goal · ${g.category} · ${g.currentValue}/${g.targetValue} ${g.unit}`,
          route: 'goals',
        });
      }
    }

    for (const h of store.habits) {
      if (h.name.toLowerCase().includes(q)) {
        results.push({
          id: `habit-${h.id}`,
          module: 'Habits',
          title: h.name,
          subtitle: `Habit · ${h.frequency} · ${h.category}`,
          route: 'goals',
        });
      }
    }

    for (const n of store.notes) {
      if (n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)) {
        results.push({
          id: `note-${n.id}`,
          module: 'Daily',
          title: n.title,
          subtitle: `Note · ${n.category}`,
          route: 'daily',
        });
      }
    }

    for (const j of store.journalEntries) {
      if (j.title.toLowerCase().includes(q) || j.content.toLowerCase().includes(q)) {
        results.push({
          id: `journal-${j.id}`,
          module: 'Life',
          title: j.title || `Journal ${j.date}`,
          subtitle: `Journal · ${j.date}`,
          route: 'life',
        });
      }
    }

    for (const c of store.courses) {
      if (c.title.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q)) {
        results.push({
          id: `course-${c.id}`,
          module: 'Career',
          title: c.title,
          subtitle: `Course · ${c.completedLessons}/${c.totalLessons} lessons`,
          route: 'goals',
        });
      }
    }

    for (const sk of store.skills) {
      if (sk.name.toLowerCase().includes(q)) {
        results.push({
          id: `skill-${sk.id}`,
          module: 'Career',
          title: sk.name,
          subtitle: `Skill · ${sk.proficiencyPct}%`,
          route: 'goals',
        });
      }
    }

    for (const job of store.jobApplications) {
      if (job.company.toLowerCase().includes(q) || job.role.toLowerCase().includes(q)) {
        results.push({
          id: `job-${job.id}`,
          module: 'Career',
          title: `${job.role} — ${job.company}`,
          subtitle: `Application · ${job.status}`,
          route: 'goals',
        });
      }
    }

    for (const m of store.memories) {
      if (m.title.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)) {
        results.push({
          id: `mem-${m.id}`,
          module: 'Life',
          title: m.title,
          subtitle: `Memory · ${m.date}`,
          route: 'life',
        });
      }
    }

    return moduleFilter === 'all' ? results : results.filter((r) => r.module === moduleFilter);
  }, [query, moduleFilter, store]);

  if (!isOpen) return null;

  const navigateTo = (route: NavSection) => {
    if (query.trim()) {
      setRecentQueries((prev) => [query.trim(), ...prev.filter((x) => x !== query.trim())].slice(0, 5));
    }
    store.setActiveSection(route);
    onClose();
  };

  const modules = ['all', 'Money', 'Daily', 'Goals', 'Habits', 'Career', 'Life'];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-14" onClick={onClose}>
      <div
        className="bento-surface w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b bento-divider">
          <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions, tasks, goals, habits, notes, journal, career..."
            className="w-full bg-transparent text-sm focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 px-4 py-2 border-b bento-divider overflow-x-auto">
          {modules.map((mod) => (
            <button
              key={mod}
              type="button"
              onClick={() => setModuleFilter(mod)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg capitalize whitespace-nowrap shrink-0 transition-colors ${
                moduleFilter === mod
                  ? 'bg-accent'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {mod}
            </button>
          ))}
        </div>

        <div className="max-h-[55vh] overflow-y-auto bento-scroll p-3 space-y-2">
          {!query.trim() ? (
            <div className="p-2 space-y-4">
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Quick Actions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenQuickAdd();
                    }}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-sm font-medium text-left transition-colors"
                  >
                    <span>Quick Capture Entry</span>
                    <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAssistant();
                    }}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-sm font-medium text-left transition-colors"
                  >
                    <span>Tell BENTO Assistant</span>
                    <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
                  </button>
                </div>
              </div>

              {recentQueries.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Recent Searches</p>
                  <div className="flex flex-wrap gap-2">
                    {recentQueries.map((rq) => (
                      <button
                        key={rq}
                        type="button"
                        onClick={() => setQuery(rq)}
                        className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        {rq}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Jump to Workspace</p>
                <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                  {(['home', 'money', 'daily', 'goals', 'life', 'improvements', 'more'] as NavSection[]).map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => navigateTo(sec)}
                      className="px-3 py-2 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-xs font-medium capitalize text-center transition-colors"
                    >
                      {sec}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : hits.length === 0 ? (
            <div className="py-10 text-center text-sm text-[var(--text-muted)]">
              No matching records found for "{query}".
            </div>
          ) : (
            <div className="divide-y bento-divider">
              {hits.slice(0, 30).map((hit) => (
                <button
                  key={hit.id}
                  type="button"
                  onClick={() => navigateTo(hit.route)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{hit.title}</p>
                    <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                      {hit.module} · {hit.subtitle}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
