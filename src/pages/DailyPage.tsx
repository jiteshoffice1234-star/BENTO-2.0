import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Pin,
  Plus,
  Trash2,
} from 'lucide-react';
import { useBentoStore } from '../store/useBentoStore';
import { RecurrencePattern, Routine, TaskPriority, TaskStatus } from '../types/bento';
import { todayISO, toLocalISODate } from '../utils/finance';

type DailyTab = 'tasks' | 'calendar' | 'routines' | 'notes';
type TaskViewFilter = 'today' | 'tomorrow' | 'upcoming' | 'overdue' | 'completed' | 'inbox' | 'all' | 'priority';
type CalendarMode = 'day' | 'week' | 'month';

export const DailyPage: React.FC = () => {
  const store = useBentoStore();
  const [tab, setTab] = useState<DailyTab>('tasks');

  // Tasks state
  const [taskFilter, setTaskFilter] = useState<TaskViewFilter>('today');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState(todayISO());
  const [taskTime, setTaskTime] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('in_progress');
  const [taskCategory, setTaskCategory] = useState('Personal');
  const [taskRecurrence, setTaskRecurrence] = useState<RecurrencePattern>('none');
  const [taskGoalId, setTaskGoalId] = useState('');

  // Calendar state
  const [calMode, setCalMode] = useState<CalendarMode>('month');
  const [calDate, setCalDate] = useState(todayISO());
  const [evTitle, setEvTitle] = useState('');
  const [evKind, setEvKind] = useState<'event' | 'deadline' | 'reminder'>('event');
  const [evDate, setEvDate] = useState(todayISO());
  const [evStartTime, setEvStartTime] = useState('10:00');
  const [evEndTime, setEvEndTime] = useState('11:00');

  // Routines state
  const [rName, setRName] = useState('');
  const [rKind, setRKind] = useState<Routine['kind']>('morning');
  const [rTime, setRTime] = useState('07:30');
  const [rStepsText, setRStepsText] = useState('');

  // Notes state
  const [noteSearch, setNoteSearch] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState('General');

  const today = todayISO();
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toLocalISODate(d);
  }, []);

  const activeTasks = store.tasks.filter((t) => !t.deletedAt);

  const filteredTasks = useMemo(() => {
    let list = [...activeTasks];
    if (taskFilter === 'today') {
      list = list.filter((t) => t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate === today);
    } else if (taskFilter === 'tomorrow') {
      list = list.filter((t) => t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate === tomorrow);
    } else if (taskFilter === 'upcoming') {
      list = list.filter((t) => t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate && t.dueDate > today);
    } else if (taskFilter === 'overdue') {
      list = list.filter((t) => t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate && t.dueDate < today);
    } else if (taskFilter === 'completed') {
      list = list.filter((t) => t.status === 'completed');
    } else if (taskFilter === 'inbox') {
      list = list.filter((t) => t.status === 'inbox');
    } else if (taskFilter === 'priority') {
      const rank: Record<TaskPriority, number> = { urgent: 4, high: 3, medium: 2, low: 1, none: 0 };
      list = list
        .filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
        .sort((a, b) => rank[b.priority] - rank[a.priority]);
    }

    if (taskSearch.trim()) {
      const q = taskSearch.trim().toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }
    return list;
  }, [activeTasks, taskFilter, taskSearch, today, tomorrow]);

  // Calendar grid dates
  const calendarDays = useMemo(() => {
    const ref = new Date(`${calDate}T12:00:00`);
    if (calMode === 'day') return [calDate];
    if (calMode === 'week') {
      const days: string[] = [];
      const start = new Date(ref);
      const diff = start.getDay() === 0 ? -6 : 1 - start.getDay();
      start.setDate(start.getDate() + diff);
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(toLocalISODate(d));
      }
      return days;
    }
    const year = ref.getFullYear();
    const month = ref.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => toLocalISODate(new Date(year, month, i + 1)));
  }, [calDate, calMode]);

  const filteredNotes = useMemo(() => {
    const q = noteSearch.trim().toLowerCase();
    return [...store.notes]
      .filter((n) => !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.category.toLowerCase().includes(q))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  }, [store.notes, noteSearch]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Daily</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Tasks, calendar schedule, daily routines, and quick notes
        </p>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {(
          [
            { id: 'tasks', label: 'Tasks' },
            { id: 'calendar', label: 'Calendar' },
            { id: 'routines', label: 'Routines' },
            { id: 'notes', label: 'Notes' },
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

      {/* TASKS */}
      {tab === 'tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="bento-surface rounded-2xl p-5 lg:col-span-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto bento-scroll">
                {(
                  ['today', 'tomorrow', 'upcoming', 'overdue', 'priority', 'inbox', 'completed', 'all'] as TaskViewFilter[]
                ).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setTaskFilter(f)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap shrink-0 ${
                      taskFilter === f
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                placeholder="Search tasks..."
                className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-1.5 text-xs sm:w-48"
              />
            </div>

            {filteredTasks.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-8 text-center">
                No tasks in this view.
              </p>
            ) : (
              <div className="divide-y bento-divider">
                {filteredTasks.map((task) => {
                  const done = task.status === 'completed';
                  return (
                    <div key={task.id} className="py-3 flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => store.toggleTaskComplete(task.id)}
                        className="flex items-start gap-3 text-left min-w-0"
                      >
                        {done ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className={`text-sm font-medium ${done ? 'line-through text-[var(--text-muted)]' : ''}`}>
                            {task.title}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            {task.category} · {task.priority !== 'none' ? `${task.priority} priority` : 'normal'} · {task.status.replace('_', ' ')}
                            {task.dueDate ? ` · Due ${task.dueDate}` : ''}
                            {task.dueTime ? ` ${task.dueTime}` : ''}
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={task.status}
                          onChange={(e) => store.updateTask(task.id, { status: e.target.value as TaskStatus })}
                          className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-2 py-1 text-[11px]"
                        >
                          <option value="inbox">Inbox</option>
                          <option value="upcoming">Upcoming</option>
                          <option value="in_progress">In progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => store.deleteTask(task.id)}
                          aria-label="Delete task"
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
              if (!taskTitle.trim()) return;
              store.addTask({
                title: taskTitle.trim(),
                dueDate: taskDue || null,
                dueTime: taskTime || null,
                priority: taskPriority,
                status: taskStatus,
                category: taskCategory,
                recurrence: taskRecurrence,
                goalId: taskGoalId || null,
              });
              setTaskTitle('');
              setTaskTime('');
            }}
            className="bento-surface rounded-2xl p-5 lg:col-span-4 space-y-3 h-fit"
          >
            <h2 className="text-sm font-bold">New Task</h2>
            <input type="text" required value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Task title" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <input type="time" value={taskTime} onChange={(e) => setTaskTime(e.target.value)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value as TaskPriority)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                <option value="none">No priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <select value={taskStatus} onChange={(e) => setTaskStatus(e.target.value as TaskStatus)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                <option value="inbox">Inbox</option>
                <option value="in_progress">In Progress</option>
                <option value="upcoming">Upcoming</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={taskCategory} onChange={(e) => setTaskCategory(e.target.value)} placeholder="Category" className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
              <select value={taskRecurrence} onChange={(e) => setTaskRecurrence(e.target.value as RecurrencePattern)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                <option value="none">One-time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            {store.goals.length > 0 && (
              <select value={taskGoalId} onChange={(e) => setTaskGoalId(e.target.value)} className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                <option value="">Link to Goal (optional)</option>
                {store.goals.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            )}
            <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </form>
        </div>
      )}

      {/* CALENDAR */}
      {tab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="bento-surface rounded-2xl p-5 lg:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-elevated)]">
                {(['day', 'week', 'month'] as CalendarMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setCalMode(m)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium capitalize ${
                      calMode === m ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <input
                type="date"
                value={calDate}
                onChange={(e) => setCalDate(e.target.value)}
                className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-1.5 text-xs font-mono-num"
              />
            </div>

            <div className={`grid gap-2 ${calMode === 'day' ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-7'}`}>
              {calendarDays.map((dayIso) => {
                const dayEvents = store.events.filter((ev) => ev.startDate === dayIso);
                const dayTasks = activeTasks.filter((t) => t.dueDate === dayIso && t.status !== 'completed');
                const isSelected = dayIso === calDate;
                return (
                  <button
                    key={dayIso}
                    type="button"
                    onClick={() => setCalDate(dayIso)}
                    className={`p-2.5 rounded-xl border text-left transition-colors min-h-[84px] flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)]/60 hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <span className="text-xs font-mono-num font-semibold">
                      {dayIso === today ? `${dayIso.slice(8)} · Today` : dayIso.slice(5)}
                    </span>
                    <div className="space-y-1 mt-1">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <p key={ev.id} className="text-[11px] truncate text-emerald-400">
                          {ev.startTime} {ev.title}
                        </p>
                      ))}
                      {dayTasks.slice(0, 2).map((tk) => (
                        <p key={tk.id} className="text-[11px] truncate text-[var(--text-secondary)]">
                          • {tk.title}
                        </p>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bento-surface rounded-2xl p-5 lg:col-span-4 space-y-4 h-fit">
            <h2 className="text-sm font-bold">Add Event / Deadline</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!evTitle.trim()) return;
                store.addEvent({
                  title: evTitle.trim(),
                  description: '',
                  kind: evKind,
                  startDate: evDate,
                  startTime: evStartTime,
                  endDate: evDate,
                  endTime: evEndTime,
                  allDay: false,
                  color: '#10b981',
                  notes: '',
                });
                setEvTitle('');
              }}
              className="space-y-3"
            >
              <input type="text" required value={evTitle} onChange={(e) => setEvTitle(e.target.value)} placeholder="Title" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <select value={evKind} onChange={(e) => setEvKind(e.target.value as typeof evKind)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                  <option value="event">Event</option>
                  <option value="deadline">Deadline</option>
                  <option value="reminder">Reminder</option>
                </select>
                <input type="date" value={evDate} onChange={(e) => setEvDate(e.target.value)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="time" value={evStartTime} onChange={(e) => setEvStartTime(e.target.value)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
                <input type="time" value={evEndTime} onChange={(e) => setEvEndTime(e.target.value)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold">
                Save to Calendar
              </button>
            </form>

            <div className="pt-3 border-t bento-divider space-y-2">
              <p className="text-xs font-semibold">Agenda for {calDate}</p>
              {store.events.filter((e) => e.startDate === calDate).map((e) => (
                <div key={e.id} className="flex items-center justify-between text-xs py-1">
                  <span>{e.startTime} · {e.title} ({e.kind})</span>
                  <button type="button" onClick={() => store.deleteEvent(e.id)} className="text-rose-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ROUTINES */}
      {tab === 'routines' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 space-y-4">
            {store.routines.length === 0 ? (
              <div className="bento-surface rounded-2xl p-8 text-center text-xs text-[var(--text-muted)]">
                No routines yet. Build morning, evening, work, or study routines with step checklists.
              </div>
            ) : (
              store.routines.map((r) => {
                const doneIds = r.completionLogs[today] ?? [];
                return (
                  <div key={r.id} className="bento-surface rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold">{r.name}</h3>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {r.kind} routine · {r.scheduledTime || 'Flexible'} · {doneIds.length}/{r.steps.length} steps today
                        </p>
                      </div>
                      <button type="button" onClick={() => store.deleteRoutine(r.id)} className="text-rose-400 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="divide-y bento-divider border-t bento-divider">
                      {r.steps.map((step) => {
                        const checked = doneIds.includes(step.id);
                        return (
                          <button
                            key={step.id}
                            type="button"
                            onClick={() => store.toggleRoutineStep(r.id, today, step.id)}
                            className="w-full py-2.5 flex items-center justify-between text-left"
                          >
                            <span className={`text-sm ${checked ? 'line-through text-[var(--text-muted)]' : ''}`}>
                              {checked ? '✓ ' : '○ '}{step.title}
                            </span>
                            <span className="text-xs font-mono-num text-[var(--text-muted)]">{step.durationMinutes}m</span>
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
              if (!rName.trim()) return;
              const steps = rStepsText
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((title, idx) => ({
                  id: `step-${Date.now()}-${idx}`,
                  title,
                  durationMinutes: 10,
                  order: idx,
                }));
              store.addRoutine({
                name: rName.trim(),
                kind: rKind,
                description: '',
                steps,
                scheduledTime: rTime,
                daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                color: '#10b981',
                enabled: true,
              });
              setRName('');
              setRStepsText('');
            }}
            className="bento-surface rounded-2xl p-5 lg:col-span-4 space-y-3 h-fit"
          >
            <h2 className="text-sm font-bold">New Routine</h2>
            <input type="text" required value={rName} onChange={(e) => setRName(e.target.value)} placeholder="Routine name (e.g., Morning Reset)" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <select value={rKind} onChange={(e) => setRKind(e.target.value as Routine['kind'])} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                <option value="morning">Morning</option>
                <option value="evening">Evening</option>
                <option value="work">Work</option>
                <option value="study">Study</option>
                <option value="custom">Custom</option>
              </select>
              <input type="time" value={rTime} onChange={(e) => setRTime(e.target.value)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
            </div>
            <textarea
              rows={4}
              value={rStepsText}
              onChange={(e) => setRStepsText(e.target.value)}
              placeholder={"Steps (one per line):\nHydrate 500ml\nReview top 3 tasks\n15m reading"}
              className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs"
            />
            <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold">
              Create Routine
            </button>
          </form>
        </div>
      )}

      {/* NOTES */}
      {tab === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="bento-surface rounded-2xl p-5 lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold">Quick Notes</h2>
              <input
                type="text"
                value={noteSearch}
                onChange={(e) => setNoteSearch(e.target.value)}
                placeholder="Search notes..."
                className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-1.5 text-xs w-52"
              />
            </div>
            {filteredNotes.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-8 text-center">No notes yet.</p>
            ) : (
              <div className="divide-y bento-divider">
                {filteredNotes.map((n) => (
                  <div key={n.id} className="py-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{n.title}</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => store.updateNote(n.id, { pinned: !n.pinned })}
                          aria-label="Pin note"
                          className={`p-1 rounded ${n.pinned ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => store.deleteNote(n.id)} className="text-rose-400 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] whitespace-pre-line">{n.content}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {n.category} {n.pinned ? '· Pinned' : ''} · {n.updatedAt.slice(0, 10)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!noteTitle.trim() && !noteContent.trim()) return;
              store.addNote({
                title: noteTitle.trim() || 'Untitled Note',
                content: noteContent.trim(),
                category: noteCategory,
                pinned: false,
                tags: [],
              });
              setNoteTitle('');
              setNoteContent('');
            }}
            className="bento-surface rounded-2xl p-5 lg:col-span-4 space-y-3 h-fit"
          >
            <h2 className="text-sm font-bold">New Note</h2>
            <input type="text" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Title" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm" />
            <input type="text" value={noteCategory} onChange={(e) => setNoteCategory(e.target.value)} placeholder="Category" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
            <textarea rows={5} value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Write note..." className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm" />
            <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold">Save Note</button>
          </form>
        </div>
      )}
    </div>
  );
};
