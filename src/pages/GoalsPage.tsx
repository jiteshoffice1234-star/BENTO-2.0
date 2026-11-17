import React, { useMemo, useState } from 'react';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { useBentoStore } from '../store/useBentoStore';
import {
  GoalCategory,
  GoalKind,
  GoalStatus,
  HabitFrequency,
  HabitKind,
  JobApplicationStatus,
} from '../types/bento';
import { getMonthBounds, getWeekBounds, todayISO, toLocalISODate } from '../utils/finance';
import { computeHabitStats } from '../utils/habits';

type GoalsTab = 'goals' | 'habits' | 'career' | 'learning';

export const GoalsPage: React.FC = () => {
  const store = useBentoStore();
  const [tab, setTab] = useState<GoalsTab>('goals');
  const today = todayISO();

  // Goals state
  const [goalStatusFilter, setGoalStatusFilter] = useState<'all' | GoalStatus>('active');
  const [gTitle, setGTitle] = useState('');
  const [gCat, setGCat] = useState<GoalCategory>('personal');
  const [gKind, setGKind] = useState<GoalKind>('numeric');
  const [gTarget, setGTarget] = useState('100');
  const [gUnit, setGUnit] = useState('%');
  const [gDeadline, setGDeadline] = useState('');
  const [gMilestonesText, setGMilestonesText] = useState('');
  const [goalProgressInputs, setGoalProgressInputs] = useState<Record<string, string>>({});
  const [goalMilestoneDrafts, setGoalMilestoneDrafts] = useState<Record<string, string>>({});

  // Habits state
  const [habitWindowDays, setHabitWindowDays] = useState<7 | 28>(7);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [hName, setHName] = useState('');
  const [hKind, setHKind] = useState<HabitKind>('positive');
  const [hFreq, setHFreq] = useState<HabitFrequency>('daily');
  const [hTarget, setHTarget] = useState('1');
  const [hUnit, setHUnit] = useState('session');
  const [hCat, setHCat] = useState('Health');

  // Career state
  const [skillName, setSkillName] = useState('');
  const [skillLevel, setSkillLevel] = useState('60');
  const [expCompany, setExpCompany] = useState('');
  const [expRole, setExpRole] = useState('');
  const [expStart, setExpStart] = useState(today);
  const [expHighlights, setExpHighlights] = useState('');
  const [certInput, setCertInput] = useState('');
  const [jobCompany, setJobCompany] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [jobStatus, setJobStatus] = useState<JobApplicationStatus>('applied');
  const [jobSalary, setJobSalary] = useState('');

  // Learning state
  const [courseTitle, setCourseTitle] = useState('');
  const [courseSubject, setCourseSubject] = useState('');
  const [courseUnits, setCourseUnits] = useState('12');
  const [studySubject, setStudySubject] = useState('');
  const [studyMinutes, setStudyMinutes] = useState('45');
  const [studyCourseId, setStudyCourseId] = useState('');
  const [studySkillId, setStudySkillId] = useState('');
  const [studyGoalId, setStudyGoalId] = useState('');

  const habitDays = useMemo(
    () =>
      Array.from({ length: habitWindowDays }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (habitWindowDays - 1 - i));
        return toLocalISODate(d);
      }),
    [habitWindowDays]
  );

  const weekBounds = getWeekBounds(new Date(), store.settings.startOfWeek);
  const monthBounds = getMonthBounds(new Date().getFullYear(), new Date().getMonth());
  const weekStudyMins = store.studySessions
    .filter((s) => s.date >= weekBounds.start && s.date <= weekBounds.end)
    .reduce((sum, s) => sum + s.durationMinutes, 0);
  const monthStudyMins = store.studySessions
    .filter((s) => s.date >= monthBounds.start && s.date <= monthBounds.end)
    .reduce((sum, s) => sum + s.durationMinutes, 0);

  const visibleGoals = store.goals.filter((g) => goalStatusFilter === 'all' || g.status === goalStatusFilter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Goals, Habits & Growth</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Personal achievement milestones, flexible behavior tracking, career pipeline, and study hours
        </p>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {(
          [
            { id: 'goals', label: `Goals (${store.goals.length})` },
            { id: 'habits', label: `Habits (${store.habits.length})` },
            { id: 'career', label: 'Career & Jobs' },
            { id: 'learning', label: 'Courses & Study' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              tab === t.id
                ? 'bg-accent'
                : 'bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-secondary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* GOALS */}
      {tab === 'goals' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center gap-1.5">
              {(['active', 'completed', 'archived', 'all'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setGoalStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${
                    goalStatusFilter === st
                      ? 'bg-accent'
                      : 'bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-secondary)]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {visibleGoals.length === 0 ? (
              <div className="bento-surface rounded-2xl p-8 text-center text-xs text-[var(--text-muted)]">
                No goals in this view. Set numeric, financial, completion, or habit-linked goals.
              </div>
            ) : (
              visibleGoals.map((g) => {
                const pct = g.targetValue > 0 ? Math.min(100, Math.round((g.currentValue / g.targetValue) * 100)) : 0;
                return (
                  <div key={g.id} className="bento-surface rounded-2xl p-5 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold">{g.title}</h3>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {g.category} · {g.kind} · {g.status} {g.deadline ? `· Due ${g.deadline}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            store.updateGoal(g.id, {
                              status: g.status === 'completed' ? 'active' : 'completed',
                              currentValue: g.status === 'completed' ? g.currentValue : g.targetValue,
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] text-xs font-medium"
                        >
                          {g.status === 'completed' ? 'Reopen' : 'Complete'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            store.updateGoal(g.id, {
                              status: g.status === 'archived' ? 'active' : 'archived',
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] text-xs font-medium"
                        >
                          {g.status === 'archived' ? 'Restore' : 'Archive'}
                        </button>
                        <button type="button" onClick={() => store.deleteGoal(g.id)} aria-label="Delete goal" className="text-rose-400 p-1.5">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono-num">
                        <span>
                          {g.currentValue} / {g.targetValue} {g.unit}
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          store.updateGoal(g.id, {
                            currentValue: Math.min(g.targetValue, g.currentValue + Math.max(1, Math.round(g.targetValue * 0.1))),
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-xs font-medium"
                      >
                        +10% Progress
                      </button>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={goalProgressInputs[g.id] ?? ''}
                          onChange={(e) => setGoalProgressInputs((prev) => ({ ...prev, [g.id]: e.target.value }))}
                          placeholder={`Set exact (${g.unit})`}
                          className="w-28 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-2 py-1 text-xs font-mono-num"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const raw = goalProgressInputs[g.id];
                            if (raw === undefined || raw === '') return;
                            const val = Math.max(0, Number(raw) || 0);
                            store.updateGoal(g.id, {
                              currentValue: val,
                              status: val >= g.targetValue ? 'completed' : g.status,
                            });
                            setGoalProgressInputs((prev) => ({ ...prev, [g.id]: '' }));
                          }}
                          className="px-2.5 py-1 rounded-lg bg-accent text-xs font-semibold"
                        >
                          Update
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t bento-divider space-y-1.5">
                      <p className="text-[11px] font-semibold text-[var(--text-secondary)]">
                        Milestones ({g.milestones.filter((m) => m.completed).length}/{g.milestones.length})
                      </p>
                      {g.milestones.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => store.toggleGoalMilestone(g.id, m.id)}
                          className="w-full flex items-center gap-2 text-left text-xs py-1"
                        >
                          <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${m.completed ? 'bg-accent border-accent' : 'border-[var(--border-strong)]'}`}>
                            {m.completed && <Check className="w-3 h-3" />}
                          </span>
                          <span className={m.completed ? 'line-through text-[var(--text-muted)]' : ''}>{m.title}</span>
                        </button>
                      ))}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const title = (goalMilestoneDrafts[g.id] || '').trim();
                          if (!title) return;
                          store.updateGoal(g.id, {
                            milestones: [
                              ...g.milestones,
                              { id: `ms-${Date.now()}`, title, completed: false, targetDate: g.deadline },
                            ],
                          });
                          setGoalMilestoneDrafts((prev) => ({ ...prev, [g.id]: '' }));
                        }}
                        className="flex gap-2 pt-1"
                      >
                        <input
                          type="text"
                          value={goalMilestoneDrafts[g.id] || ''}
                          onChange={(e) => setGoalMilestoneDrafts((prev) => ({ ...prev, [g.id]: e.target.value }))}
                          placeholder="Add milestone..."
                          className="flex-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-2.5 py-1 text-xs"
                        />
                        <button type="submit" className="px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] text-xs font-medium">
                          Add
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!gTitle.trim()) return;
              const milestones = gMilestonesText
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((title, i) => ({
                  id: `ms-${Date.now()}-${i}`,
                  title,
                  completed: false,
                  targetDate: gDeadline || null,
                }));
              store.addGoal({
                title: gTitle.trim(),
                description: '',
                category: gCat,
                kind: gKind,
                targetValue: Number(gTarget) || 100,
                currentValue: 0,
                unit: gUnit,
                startDate: today,
                deadline: gDeadline || null,
                priority: 'medium',
                status: 'active',
                milestones,
                linkedHabitIds: [],
                notes: '',
                color: '#8b5cf6',
              });
              setGTitle('');
              setGMilestonesText('');
            }}
            className="bento-surface rounded-2xl p-5 lg:col-span-4 space-y-3 h-fit"
          >
            <h2 className="text-sm font-bold">New Goal</h2>
            <input type="text" required value={gTitle} onChange={(e) => setGTitle(e.target.value)} placeholder="Goal title" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <select value={gCat} onChange={(e) => setGCat(e.target.value as GoalCategory)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                <option value="personal">Personal</option>
                <option value="financial">Financial</option>
                <option value="career">Career</option>
                <option value="education">Education</option>
                <option value="health">Health</option>
                <option value="lifestyle">Lifestyle</option>
              </select>
              <select value={gKind} onChange={(e) => setGKind(e.target.value as GoalKind)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                <option value="numeric">Numeric</option>
                <option value="financial">Financial</option>
                <option value="completion">Milestone Completion</option>
                <option value="habit">Habit-based</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={gTarget} onChange={(e) => setGTarget(e.target.value)} placeholder="Target" className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <input type="text" value={gUnit} onChange={(e) => setGUnit(e.target.value)} placeholder="Unit (INR, books)" className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
            </div>
            <input type="date" value={gDeadline} onChange={(e) => setGDeadline(e.target.value)} className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
            <textarea rows={3} value={gMilestonesText} onChange={(e) => setGMilestonesText(e.target.value)} placeholder="Milestones (one per line, optional)" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
            <button type="submit" className="w-full py-2.5 rounded-xl bg-accent text-xs font-semibold">Create Goal</button>
          </form>
        </div>
      )}

      {/* HABITS */}
      {tab === 'habits' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--text-secondary)]">
                Flexible streaks preserve progress across rest & skipped days
              </p>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-elevated)]">
                {([7, 28] as const).map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setHabitWindowDays(days)}
                    className={`px-2.5 py-1 rounded text-xs font-medium font-mono-num ${
                      habitWindowDays === days ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {days}d
                  </button>
                ))}
              </div>
            </div>

            {store.habits.length === 0 ? (
              <div className="bento-surface rounded-2xl p-8 text-center text-xs text-[var(--text-muted)]">
                No habits yet. Supports rest days and skipped days without breaking streaks.
              </div>
            ) : (
              store.habits.map((h) => {
                const stats = computeHabitStats(h);
                const todayEntry = h.logs[today];
                const todayStatus = todayEntry?.status;
                return (
                  <div key={h.id} className={`bento-surface rounded-2xl p-5 space-y-3 ${!h.enabled ? 'opacity-60' : ''}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold">{h.name}</h3>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {h.kind} · {h.frequency} · Streak {stats.currentStreak}d (best {stats.bestStreak}d) · {stats.completionRatePct}% 30d consistency
                          {(h.kind === 'quantitative' || h.kind === 'time') && ` · Today: ${todayEntry?.count ?? 0}/${h.targetCount} ${h.unit}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(h.kind === 'quantitative' || h.kind === 'time') && (
                          <button
                            type="button"
                            onClick={() => {
                              const nextCount = (todayEntry?.count ?? 0) + 1;
                              store.logHabitForDate(
                                h.id,
                                today,
                                nextCount >= h.targetCount ? 'completed' : 'partial',
                                nextCount
                              );
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-xs font-mono-num font-medium"
                          >
                            +1 {h.unit}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => store.logHabitForDate(h.id, today, 'completed', h.targetCount)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${todayStatus === 'completed' ? 'bg-accent' : 'bg-[var(--bg-elevated)]'}`}
                        >
                          Done
                        </button>
                        <button
                          type="button"
                          onClick={() => store.logHabitForDate(h.id, today, 'rest', 0)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${todayStatus === 'rest' ? 'bg-violet-600 text-white' : 'bg-[var(--bg-elevated)]'}`}
                        >
                          Rest Day
                        </button>
                        <button
                          type="button"
                          onClick={() => store.logHabitForDate(h.id, today, 'skipped', 0)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${todayStatus === 'skipped' ? 'bg-amber-600 text-white' : 'bg-[var(--bg-elevated)]'}`}
                        >
                          Skip
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingHabitId(h.id);
                            setHName(h.name);
                            setHKind(h.kind);
                            setHFreq(h.frequency);
                            setHTarget(String(h.targetCount));
                            setHUnit(h.unit);
                            setHCat(h.category);
                          }}
                          aria-label="Edit habit"
                          className="p-1.5 text-[var(--text-secondary)]"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => store.deleteHabit(h.id)} aria-label="Delete habit" className="text-rose-400 p-1.5">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5 pt-2 border-t bento-divider">
                      {habitDays.map((day) => {
                        const st = h.logs[day]?.status;
                        const label = st === 'completed' ? 'Done' : st === 'rest' ? 'Rest' : st === 'skipped' ? 'Skip' : st === 'partial' ? 'Part' : '—';
                        const cls =
                          st === 'completed'
                            ? 'bg-accent-soft text-accent border-accent'
                            : st === 'rest'
                            ? 'bg-violet-500/20 text-violet-400 border-violet-500/40'
                            : st === 'partial'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-hairline)]';
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => store.logHabitForDate(h.id, day, st === 'completed' ? 'rest' : 'completed', h.targetCount)}
                            className={`p-1.5 sm:p-2 rounded-lg border text-center ${cls}`}
                          >
                            <p className="text-[10px] font-mono-num">{day.slice(5)}</p>
                            <p className="text-[11px] font-semibold mt-0.5">{label}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!hName.trim()) return;
              if (editingHabitId) {
                store.updateHabit(editingHabitId, {
                  name: hName.trim(),
                  kind: hKind,
                  frequency: hFreq,
                  targetCount: Math.max(1, Number(hTarget) || 1),
                  unit: hUnit,
                  category: hCat,
                });
                setEditingHabitId(null);
              } else {
                store.addHabit({
                  name: hName.trim(),
                  description: '',
                  kind: hKind,
                  frequency: hFreq,
                  scheduledDays: [0, 1, 2, 3, 4, 5, 6],
                  targetCount: Math.max(1, Number(hTarget) || 1),
                  unit: hUnit,
                  reminderTime: null,
                  startDate: today,
                  endDate: null,
                  category: hCat,
                  color: '#10b981',
                  enabled: true,
                });
              }
              setHName('');
            }}
            className="bento-surface rounded-2xl p-5 lg:col-span-4 space-y-3 h-fit"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">{editingHabitId ? 'Edit Habit' : 'New Habit'}</h2>
              {editingHabitId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingHabitId(null);
                    setHName('');
                  }}
                  className="text-xs text-[var(--text-muted)]"
                >
                  Cancel
                </button>
              )}
            </div>
            <input type="text" required value={hName} onChange={(e) => setHName(e.target.value)} placeholder="Habit name (e.g., Drink 3L water)" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <select value={hKind} onChange={(e) => setHKind(e.target.value as HabitKind)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                <option value="positive">Positive</option>
                <option value="negative">Avoid / Negative</option>
                <option value="quantitative">Quantitative</option>
                <option value="time">Time-based</option>
                <option value="checklist">Checklist</option>
              </select>
              <select value={hFreq} onChange={(e) => setHFreq(e.target.value as HabitFrequency)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays</option>
                <option value="weekends">Weekends</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" min={1} value={hTarget} onChange={(e) => setHTarget(e.target.value)} placeholder="Target" className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <input type="text" value={hUnit} onChange={(e) => setHUnit(e.target.value)} placeholder="Unit" className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
            </div>
            <input type="text" value={hCat} onChange={(e) => setHCat(e.target.value)} placeholder="Category" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
            <button type="submit" className="w-full py-2.5 rounded-xl bg-accent text-xs font-semibold">
              {editingHabitId ? 'Save Changes' : 'Create Habit'}
            </button>
          </form>
        </div>
      )}

      {/* CAREER & JOBS */}
      {tab === 'career' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-5">
            <div className="bento-surface rounded-2xl p-5 space-y-4">
              <h2 className="text-base font-bold">Career Profile & Skills</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={store.careerProfile.headline}
                  onChange={(e) => store.updateCareerProfile({ headline: e.target.value })}
                  placeholder="Headline (e.g., Data Analyst)"
                  className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  value={store.careerProfile.targetRole}
                  onChange={(e) => store.updateCareerProfile({ targetRole: e.target.value })}
                  placeholder="Target role"
                  className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs"
                />
              </div>
              <textarea
                rows={2}
                value={store.careerProfile.summary}
                onChange={(e) => store.updateCareerProfile({ summary: e.target.value })}
                placeholder="Career summary & focus areas..."
                className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs"
              />

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!skillName.trim()) return;
                  store.addSkill({
                    name: skillName.trim(),
                    category: 'Professional',
                    proficiencyPct: Math.min(100, Math.max(0, Number(skillLevel) || 50)),
                    targetPct: 100,
                    notes: '',
                  });
                  setSkillName('');
                }}
                className="flex gap-2"
              >
                <input type="text" value={skillName} onChange={(e) => setSkillName(e.target.value)} placeholder="Add skill (e.g., Excel, SQL)" className="flex-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
                <input type="number" min={0} max={100} value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)} className="w-16 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-2 py-2 text-xs font-mono-num" />
                <button type="submit" className="px-3.5 py-2 rounded-xl bg-accent text-xs font-semibold">Add</button>
              </form>

              <div className="space-y-3 divide-y bento-divider">
                {store.skills.map((sk) => (
                  <div key={sk.id} className="pt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">{sk.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-num">{sk.proficiencyPct}%</span>
                        <button type="button" onClick={() => store.updateSkill(sk.id, { proficiencyPct: Math.min(100, sk.proficiencyPct + 10) })} className="px-2 py-0.5 rounded bg-[var(--bg-elevated)]">+10%</button>
                        <button type="button" onClick={() => store.deleteSkill(sk.id)} aria-label="Delete skill" className="text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${sk.proficiencyPct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Experience & Certifications */}
            <div className="bento-surface rounded-2xl p-5 space-y-4">
              <h2 className="text-base font-bold">Work Experience & Certifications</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!expCompany.trim() || !expRole.trim()) return;
                  store.updateCareerProfile({
                    experiences: [
                      {
                        id: `exp-${Date.now()}`,
                        company: expCompany.trim(),
                        role: expRole.trim(),
                        startDate: expStart,
                        endDate: null,
                        current: true,
                        highlights: expHighlights.trim(),
                      },
                      ...store.careerProfile.experiences,
                    ],
                  });
                  setExpCompany('');
                  setExpRole('');
                  setExpHighlights('');
                }}
                className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[var(--bg-elevated)]"
              >
                <input type="text" required value={expRole} onChange={(e) => setExpRole(e.target.value)} placeholder="Role / Title" className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
                <input type="text" required value={expCompany} onChange={(e) => setExpCompany(e.target.value)} placeholder="Company" className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
                <input type="date" value={expStart} onChange={(e) => setExpStart(e.target.value)} className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
                <input type="text" value={expHighlights} onChange={(e) => setExpHighlights(e.target.value)} placeholder="Key achievements..." className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
                <button type="submit" className="col-span-2 py-2 rounded-lg bg-accent text-xs font-semibold">Add Experience</button>
              </form>

              {store.careerProfile.experiences.length > 0 && (
                <div className="divide-y bento-divider">
                  {store.careerProfile.experiences.map((ex) => (
                    <div key={ex.id} className="py-2.5 flex items-start justify-between gap-2 text-xs">
                      <div>
                        <p className="font-semibold">{ex.role} — {ex.company}</p>
                        <p className="text-[var(--text-secondary)]">Since {ex.startDate}{ex.highlights ? ` · ${ex.highlights}` : ''}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          store.updateCareerProfile({
                            experiences: store.careerProfile.experiences.filter((x) => x.id !== ex.id),
                          })
                        }
                        aria-label="Delete experience"
                        className="text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!certInput.trim()) return;
                  store.updateCareerProfile({
                    certifications: [...store.careerProfile.certifications, certInput.trim()],
                  });
                  setCertInput('');
                }}
                className="flex gap-2 pt-2 border-t bento-divider"
              >
                <input type="text" value={certInput} onChange={(e) => setCertInput(e.target.value)} placeholder="Add certification..." className="flex-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
                <button type="submit" className="px-3.5 py-2 rounded-xl bg-[var(--bg-elevated)] text-xs font-medium">Add Cert</button>
              </form>
              {store.careerProfile.certifications.length > 0 && (
                <div className="divide-y bento-divider">
                  {store.careerProfile.certifications.map((cert, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between text-xs">
                      <span>{cert}</span>
                      <button
                        type="button"
                        onClick={() =>
                          store.updateCareerProfile({
                            certifications: store.careerProfile.certifications.filter((_, i) => i !== idx),
                          })
                        }
                        aria-label="Remove certification"
                        className="text-rose-400 p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Job Applications */}
          <div className="bento-surface rounded-2xl p-5 space-y-4 h-fit">
            <h2 className="text-base font-bold">Job Applications ({store.jobApplications.length})</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!jobCompany.trim() || !jobRole.trim()) return;
                store.addJobApplication({
                  company: jobCompany.trim(),
                  role: jobRole.trim(),
                  status: jobStatus,
                  salaryExpectation: jobSalary,
                  location: '',
                  appliedDate: today,
                  followUpDate: null,
                  notes: '',
                });
                setJobCompany('');
                setJobRole('');
                setJobSalary('');
              }}
              className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[var(--bg-elevated)]"
            >
              <input type="text" required value={jobCompany} onChange={(e) => setJobCompany(e.target.value)} placeholder="Company" className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
              <input type="text" required value={jobRole} onChange={(e) => setJobRole(e.target.value)} placeholder="Role" className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
              <select value={jobStatus} onChange={(e) => setJobStatus(e.target.value as JobApplicationStatus)} className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                <option value="interested">Interested</option>
                <option value="applied">Applied</option>
                <option value="assessment">Assessment</option>
                <option value="interview">Interview</option>
                <option value="offer">Offer</option>
                <option value="rejected">Rejected</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
              <input type="text" value={jobSalary} onChange={(e) => setJobSalary(e.target.value)} placeholder="Expected CTC / Salary" className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
              <button type="submit" className="col-span-2 py-2 rounded-lg bg-accent text-xs font-semibold">Add Application</button>
            </form>

            {store.jobApplications.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-4">No job applications tracked yet.</p>
            ) : (
              <div className="divide-y bento-divider">
                {store.jobApplications.map((job) => (
                  <div key={job.id} className="py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{job.role} — {job.company}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {job.status} · Applied {job.appliedDate} {job.salaryExpectation ? `· ${job.salaryExpectation}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={job.status}
                        onChange={(e) => store.updateJobApplication(job.id, { status: e.target.value as JobApplicationStatus })}
                        className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-2 py-1 text-[11px]"
                      >
                        <option value="interested">Interested</option>
                        <option value="applied">Applied</option>
                        <option value="assessment">Assessment</option>
                        <option value="interview">Interview</option>
                        <option value="offer">Offer</option>
                        <option value="rejected">Rejected</option>
                        <option value="withdrawn">Withdrawn</option>
                      </select>
                      <button type="button" onClick={() => store.deleteJobApplication(job.id)} aria-label="Delete application" className="text-rose-400 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* LEARNING & STUDY */}
      {tab === 'learning' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bento-surface rounded-2xl p-4">
              <p className="text-xs text-[var(--text-secondary)]">Study Hours This Week</p>
              <p className="text-xl font-bold font-mono-num mt-1">{(weekStudyMins / 60).toFixed(1)}h</p>
            </div>
            <div className="bento-surface rounded-2xl p-4">
              <p className="text-xs text-[var(--text-secondary)]">Study Hours This Month</p>
              <p className="text-xl font-bold font-mono-num mt-1">{(monthStudyMins / 60).toFixed(1)}h</p>
            </div>
            <div className="bento-surface rounded-2xl p-4 col-span-2 sm:col-span-1">
              <p className="text-xs text-[var(--text-secondary)]">Courses Completed</p>
              <p className="text-xl font-bold font-mono-num mt-1">
                {store.courses.filter((c) => c.status === 'completed').length} / {store.courses.length}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bento-surface rounded-2xl p-5 space-y-4">
              <h2 className="text-base font-bold">Courses & Subjects</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!courseTitle.trim()) return;
                  store.addCourse({
                    title: courseTitle.trim(),
                    provider: '',
                    subject: courseSubject.trim() || 'General',
                    totalLessons: Math.max(1, Number(courseUnits) || 10),
                    completedLessons: 0,
                    status: 'active',
                    notes: '',
                  });
                  setCourseTitle('');
                  setCourseSubject('');
                }}
                className="grid grid-cols-3 gap-2"
              >
                <input type="text" required value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} placeholder="Course title" className="col-span-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
                <input type="number" min={1} value={courseUnits} onChange={(e) => setCourseUnits(e.target.value)} placeholder="Lessons" className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
                <input type="text" value={courseSubject} onChange={(e) => setCourseSubject(e.target.value)} placeholder="Subject (e.g., Accounting)" className="col-span-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
                <button type="submit" className="rounded-xl bg-accent text-xs font-semibold">Add Course</button>
              </form>

              <div className="divide-y bento-divider">
                {store.courses.map((c) => {
                  const pct = c.totalLessons > 0 ? Math.round((c.completedLessons / c.totalLessons) * 100) : 0;
                  return (
                    <div key={c.id} className="py-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-semibold truncate">{c.title} ({c.subject})</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-mono-num">{c.completedLessons}/{c.totalLessons} ({pct}%)</span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.min(c.totalLessons, c.completedLessons + 1);
                              store.updateCourse(c.id, {
                                completedLessons: next,
                                status: next >= c.totalLessons ? 'completed' : 'active',
                              });
                            }}
                            className="px-2 py-0.5 rounded bg-[var(--bg-elevated)]"
                          >
                            +1 Lesson
                          </button>
                          <button type="button" onClick={() => store.deleteCourse(c.id)} aria-label="Delete course" className="text-rose-400 p-1">
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

            <div className="bento-surface rounded-2xl p-5 space-y-4">
              <h2 className="text-base font-bold">Study Sessions Log</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!studySubject.trim()) return;
                  store.addStudySession({
                    subject: studySubject.trim(),
                    courseId: studyCourseId || null,
                    skillId: studySkillId || null,
                    goalId: studyGoalId || null,
                    durationMinutes: Math.max(1, Number(studyMinutes) || 30),
                    date: today,
                    notes: '',
                  });
                  setStudySubject('');
                }}
                className="space-y-2"
              >
                <div className="flex gap-2">
                  <input type="text" required value={studySubject} onChange={(e) => setStudySubject(e.target.value)} placeholder="Subject studied" className="flex-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
                  <input type="number" min={1} value={studyMinutes} onChange={(e) => setStudyMinutes(e.target.value)} placeholder="Mins" className="w-20 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
                  <button type="submit" className="px-3.5 py-2 rounded-xl bg-accent text-xs font-semibold inline-flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log</span>
                  </button>
                </div>
                {(store.courses.length > 0 || store.skills.length > 0 || store.goals.length > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {store.courses.length > 0 && (
                      <select value={studyCourseId} onChange={(e) => setStudyCourseId(e.target.value)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-2.5 py-1.5 text-[11px]">
                        <option value="">Link Course (opt)</option>
                        {store.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    )}
                    {store.skills.length > 0 && (
                      <select value={studySkillId} onChange={(e) => setStudySkillId(e.target.value)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-2.5 py-1.5 text-[11px]">
                        <option value="">Link Skill (opt)</option>
                        {store.skills.map((sk) => <option key={sk.id} value={sk.id}>{sk.name}</option>)}
                      </select>
                    )}
                    {store.goals.length > 0 && (
                      <select value={studyGoalId} onChange={(e) => setStudyGoalId(e.target.value)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-2.5 py-1.5 text-[11px]">
                        <option value="">Link Goal (opt)</option>
                        {store.goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                      </select>
                    )}
                  </div>
                )}
              </form>

              <div className="divide-y bento-divider">
                {store.studySessions.map((ss) => {
                  const linkedCourse = ss.courseId ? store.courses.find((c) => c.id === ss.courseId)?.title : null;
                  const linkedSkill = ss.skillId ? store.skills.find((s) => s.id === ss.skillId)?.name : null;
                  return (
                    <div key={ss.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold">{ss.subject}</p>
                        <p className="text-[var(--text-secondary)]">
                          {ss.date}
                          {linkedCourse ? ` · ${linkedCourse}` : ''}
                          {linkedSkill ? ` · ${linkedSkill}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono-num font-bold">{ss.durationMinutes}m</span>
                        <button type="button" onClick={() => store.deleteStudySession(ss.id)} aria-label="Delete study session" className="text-rose-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
