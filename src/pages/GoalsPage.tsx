import React, { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { useBentoStore } from '../store/useBentoStore';
import { GoalCategory, GoalKind, HabitFrequency, HabitKind, JobApplicationStatus } from '../types/bento';
import { todayISO, toLocalISODate } from '../utils/finance';
import { computeHabitStats } from '../utils/habits';

type GoalsTab = 'goals' | 'habits' | 'career' | 'learning';

export const GoalsPage: React.FC = () => {
  const store = useBentoStore();
  const [tab, setTab] = useState<GoalsTab>('goals');
  const today = todayISO();

  // Goals state
  const [gTitle, setGTitle] = useState('');
  const [gCat, setGCat] = useState<GoalCategory>('personal');
  const [gKind, setGKind] = useState<GoalKind>('numeric');
  const [gTarget, setGTarget] = useState('100');
  const [gUnit, setGUnit] = useState('%');
  const [gDeadline, setGDeadline] = useState('');
  const [gMilestonesText, setGMilestonesText] = useState('');

  // Habits state
  const [hName, setHName] = useState('');
  const [hKind, setHKind] = useState<HabitKind>('positive');
  const [hFreq, setHFreq] = useState<HabitFrequency>('daily');
  const [hTarget, setHTarget] = useState('1');
  const [hUnit, setHUnit] = useState('session');
  const [hCat, setHCat] = useState('Health');

  // Career state
  const [skillName, setSkillName] = useState('');
  const [skillLevel, setSkillLevel] = useState('60');
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

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return toLocalISODate(d);
  });

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
            { id: 'goals', label: 'Goals & Milestones' },
            { id: 'habits', label: 'Habits' },
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
                ? 'bg-emerald-600 text-white'
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
            {store.goals.length === 0 ? (
              <div className="bento-surface rounded-2xl p-8 text-center text-xs text-[var(--text-muted)]">
                No goals created yet. Set numeric, financial, completion, or habit-linked goals.
              </div>
            ) : (
              store.goals.map((g) => {
                const pct = g.targetValue > 0 ? Math.min(100, Math.round((g.currentValue / g.targetValue) * 100)) : 0;
                return (
                  <div key={g.id} className="bento-surface rounded-2xl p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold">{g.title}</h3>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {g.category} · {g.kind} · {g.status} {g.deadline ? `· Due ${g.deadline}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
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
                        <button type="button" onClick={() => store.deleteGoal(g.id)} className="text-rose-400 p-1">
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
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
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
                    </div>

                    {g.milestones.length > 0 && (
                      <div className="pt-2 border-t bento-divider space-y-1.5">
                        <p className="text-[11px] font-semibold text-[var(--text-secondary)]">Milestones</p>
                        {g.milestones.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => store.toggleGoalMilestone(g.id, m.id)}
                            className="w-full flex items-center gap-2 text-left text-xs py-1"
                          >
                            <span className={`w-4 h-4 rounded border flex items-center justify-center ${m.completed ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-[var(--border-strong)]'}`}>
                              {m.completed && <Check className="w-3 h-3" />}
                            </span>
                            <span className={m.completed ? 'line-through text-[var(--text-muted)]' : ''}>{m.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
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
            <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold">Create Goal</button>
          </form>
        </div>
      )}

      {/* HABITS */}
      {tab === 'habits' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 space-y-4">
            {store.habits.length === 0 ? (
              <div className="bento-surface rounded-2xl p-8 text-center text-xs text-[var(--text-muted)]">
                No habits yet. Supports rest days and skipped days without breaking streaks.
              </div>
            ) : (
              store.habits.map((h) => {
                const stats = computeHabitStats(h);
                const todayStatus = h.logs[today]?.status;
                return (
                  <div key={h.id} className="bento-surface rounded-2xl p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold">{h.name}</h3>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {h.kind} · {h.frequency} · Streak {stats.currentStreak}d (best {stats.bestStreak}d) · {stats.completionRatePct}% 30d consistency
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => store.logHabitForDate(h.id, today, 'completed', h.targetCount)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${todayStatus === 'completed' ? 'bg-emerald-600 text-white' : 'bg-[var(--bg-elevated)]'}`}
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
                        <button type="button" onClick={() => store.deleteHabit(h.id)} className="text-rose-400 p-1.5">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* 7-day interactive grid */}
                    <div className="grid grid-cols-7 gap-1.5 pt-2 border-t bento-divider">
                      {last7Days.map((day) => {
                        const st = h.logs[day]?.status;
                        const label = st === 'completed' ? 'Done' : st === 'rest' ? 'Rest' : st === 'skipped' ? 'Skip' : '—';
                        const cls =
                          st === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : st === 'rest'
                            ? 'bg-violet-500/20 text-violet-400 border-violet-500/40'
                            : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-hairline)]';
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => store.logHabitForDate(h.id, day, st === 'completed' ? 'rest' : 'completed', h.targetCount)}
                            className={`p-2 rounded-lg border text-center ${cls}`}
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
              setHName('');
            }}
            className="bento-surface rounded-2xl p-5 lg:col-span-4 space-y-3 h-fit"
          >
            <h2 className="text-sm font-bold">New Habit</h2>
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
            <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold">Create Habit</button>
          </form>
        </div>
      )}

      {/* CAREER & JOBS */}
      {tab === 'career' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Skills & Profile */}
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
              <button type="submit" className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold">Add</button>
            </form>

            <div className="space-y-3 divide-y bento-divider">
              {store.skills.map((sk) => (
                <div key={sk.id} className="pt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">{sk.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono-num">{sk.proficiencyPct}%</span>
                      <button type="button" onClick={() => store.updateSkill(sk.id, { proficiencyPct: Math.min(100, sk.proficiencyPct + 10) })} className="px-2 py-0.5 rounded bg-[var(--bg-elevated)]">+10%</button>
                      <button type="button" onClick={() => store.deleteSkill(sk.id)} className="text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${sk.proficiencyPct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Job Applications */}
          <div className="bento-surface rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-bold">Job Applications</h2>
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
              <button type="submit" className="col-span-2 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold">Add Application</button>
            </form>

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
                    <button type="button" onClick={() => store.deleteJobApplication(job.id)} className="text-rose-400 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LEARNING & STUDY */}
      {tab === 'learning' && (
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
              <button type="submit" className="rounded-xl bg-emerald-600 text-white text-xs font-semibold">Add Course</button>
            </form>

            <div className="divide-y bento-divider">
              {store.courses.map((c) => {
                const pct = c.totalLessons > 0 ? Math.round((c.completedLessons / c.totalLessons) * 100) : 0;
                return (
                  <div key={c.id} className="py-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">{c.title} ({c.subject})</span>
                      <div className="flex items-center gap-2">
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
                        <button type="button" onClick={() => store.deleteCourse(c.id)} className="text-rose-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
                  durationMinutes: Math.max(1, Number(studyMinutes) || 30),
                  date: today,
                  notes: '',
                });
                setStudySubject('');
              }}
              className="flex gap-2"
            >
              <input type="text" required value={studySubject} onChange={(e) => setStudySubject(e.target.value)} placeholder="Subject studied" className="flex-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
              <input type="number" min={1} value={studyMinutes} onChange={(e) => setStudyMinutes(e.target.value)} placeholder="Mins" className="w-20 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <button type="submit" className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />
                <span>Log</span>
              </button>
            </form>

            <div className="divide-y bento-divider">
              {store.studySessions.map((ss) => (
                <div key={ss.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold">{ss.subject}</p>
                    <p className="text-[var(--text-secondary)]">{ss.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono-num font-bold">{ss.durationMinutes}m</span>
                    <button type="button" onClick={() => store.deleteStudySession(ss.id)} className="text-rose-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
