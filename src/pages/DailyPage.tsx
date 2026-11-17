import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Pencil,
  Pin,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useBentoStore } from '../store/useBentoStore';
import {
  RecurrencePattern,
  Routine,
  Subtask,
  Task,
  TaskPriority,
  TaskStatus,
} from '../types/bento';
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
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDue, setTaskDue] = useState(todayISO());
  const [taskTime, setTaskTime] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('in_progress');
  const [taskCategory, setTaskCategory] = useState('Personal');
  const [taskRecurrence, setTaskRecurrence] = useState<RecurrencePattern>('none');
  const [taskGoalId, setTaskGoalId] = useState('');

  // Task Edit Modal
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [eTitle, setETitle] = useState('');
  const [eDesc, setEDesc] = useState('');
  const [eNotes, setENotes] = useState('');
  const [eDue, setEDue] = useState('');
  const [eTime, setETime] = useState('');
  const [ePriority, setEPriority] = useState<TaskPriority>('medium');
  const [eStatus, setEStatus] = useState<TaskStatus>('in_progress');
  const [eCategory, setECategory] = useState('');
  const [eRecurrence, setERecurrence] = useState<RecurrencePattern>('none');
  const [eGoalId, setEGoalId] = useState('');
  const [eSubtasks, setESubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

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
  const [stepDrafts, setStepDrafts] = useState<Record<string, string>>({});

  // Notes state
  const [noteSearch, setNoteSearch] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState('General');
  const [noteTags, setNoteTags] = useState('');

  const today = todayISO();
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toLocalISODate(d);
  }, []);

  const activeTasks = store.tasks.filter((t) => !t.deletedAt);

  const openTaskEditor = (t: Task) => {
    setEditingTaskId(t.id);
    setETitle(t.title);
    setEDesc(t.description || '');
    setENotes(t.notes || '');
    setEDue(t.dueDate || '');
    setETime(t.dueTime || '');
    setEPriority(t.priority);
    setEStatus(t.status);
    setECategory(t.category || 'Personal');
    setERecurrence(t.recurrence);
    setEGoalId(t.goalId || '');
    setESubtasks(t.subtasks || []);
    setNewSubtaskTitle('');
  };

  const handleSaveTaskEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTaskId || !eTitle.trim()) return;
    store.updateTask(editingTaskId, {
      title: eTitle.trim(),
      description: eDesc.trim(),
      notes: eNotes.trim(),
      dueDate: eDue || null,
      dueTime: eTime || null,
      priority: ePriority,
      status: eStatus,
      completedAt: eStatus === 'completed' ? new Date().toISOString() : null,
      category: eCategory.trim() || 'Personal',
      recurrence: eRecurrence,
      goalId: eGoalId || null,
      subtasks: eSubtasks,
    });
    setEditingTaskId(null);
  };

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
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeTasks, taskFilter, taskSearch, today, tomorrow]);

  const startOnMonday = store.settings.startOfWeek === 'monday';
  const weekdayLabels = startOnMonday
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Weekday-aligned calendar grid
  const calendarCells = useMemo(() => {
    const ref = new Date(`${calDate}T12:00:00`);
    if (calMode === 'day') {
      return [{ iso: calDate, inMonth: true }];
    }
    if (calMode === 'week') {
      const cells: { iso: string; inMonth: boolean }[] = [];
      const start = new Date(ref);
      const day = start.getDay();
      const offset = startOnMonday ? (day === 0 ? -6 : 1 - day) : -day;
      start.setDate(start.getDate() + offset);
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        cells.push({ iso: toLocalISODate(d), inMonth: true });
      }
      return cells;
    }
    const year = ref.getFullYear();
    const month = ref.getMonth();
    const firstOfMonth = new Date(year, month, 1, 12);
    const firstWeekday = firstOfMonth.getDay();
    const leading = startOnMonday ? (firstWeekday === 0 ? 6 : firstWeekday - 1) : firstWeekday;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { iso: string; inMonth: boolean }[] = [];

    for (let i = leading; i > 0; i--) {
      const d = new Date(year, month, 1 - i, 12);
      cells.push({ iso: toLocalISODate(d), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ iso: toLocalISODate(new Date(year, month, d, 12)), inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const last = new Date(`${cells[cells.length - 1].iso}T12:00:00`);
      last.setDate(last.getDate() + 1);
      cells.push({ iso: toLocalISODate(last), inMonth: false });
    }
    return cells;
  }, [calDate, calMode, startOnMonday]);

  const shiftCalendar = (dir: -1 | 1) => {
    const d = new Date(`${calDate}T12:00:00`);
    if (calMode === 'day') d.setDate(d.getDate() + dir);
    else if (calMode === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCalDate(toLocalISODate(d));
  };

  const calendarTitle = useMemo(() => {
    const d = new Date(`${calDate}T12:00:00`);
    return calMode === 'day'
      ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
      : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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
            { id: 'tasks', label: `Tasks (${activeTasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length})` },
            { id: 'calendar', label: 'Calendar' },
            { id: 'routines', label: `Routines (${store.routines.length})` },
            { id: 'notes', label: `Notes (${store.notes.length})` },
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
                        ? 'bg-accent'
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
                  const subDone = task.subtasks.filter((s) => s.completed).length;
                  return (
                    <div key={task.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => store.toggleTaskComplete(task.id)}
                        className="flex items-start gap-3 text-left min-w-0 flex-1"
                      >
                        {done ? (
                          <CheckCircle2 className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className={`text-sm font-medium ${done ? 'line-through text-[var(--text-muted)]' : ''}`}>
                            {task.title}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            {task.category} · {task.priority !== 'none' ? `${task.priority} priority` : 'normal'}
                            {task.dueDate ? ` · Due ${task.dueDate}` : ''}
                            {task.dueTime ? ` ${task.dueTime}` : ''}
                            {task.subtasks.length > 0 ? ` · ${subDone}/${task.subtasks.length} subtasks` : ''}
                          </p>
                          {task.description && (
                            <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-1">{task.description}</p>
                          )}
                        </div>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <select
                          value={task.status}
                          onChange={(e) => store.updateTask(task.id, { status: e.target.value as TaskStatus })}
                          className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-2 py-1.5 text-[11px]"
                        >
                          <option value="inbox">Inbox</option>
                          <option value="upcoming">Upcoming</option>
                          <option value="in_progress">In progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => openTaskEditor(task)}
                          aria-label="Edit task"
                          className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => store.deleteTask(task.id)}
                          aria-label="Delete task"
                          className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] text-rose-400"
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
                description: taskDescription.trim(),
                dueDate: taskDue || null,
                dueTime: taskTime || null,
                priority: taskPriority,
                status: taskStatus,
                category: taskCategory.trim() || 'Personal',
                recurrence: taskRecurrence,
                goalId: taskGoalId || null,
              });
              setTaskTitle('');
              setTaskDescription('');
              setTaskTime('');
            }}
            className="bento-surface rounded-2xl p-5 lg:col-span-4 space-y-3 h-fit"
          >
            <h2 className="text-sm font-bold">New Task</h2>
            <input type="text" required value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Task title" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm" />
            <input type="text" value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} placeholder="Description / context (optional)" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
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
            <button type="submit" className="w-full py-2.5 rounded-xl bg-accent text-xs font-semibold inline-flex items-center justify-center gap-1.5">
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
              <div className="flex items-center gap-2">
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
                <span className="text-sm font-bold ml-1">{calendarTitle}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => shiftCalendar(-1)}
                  aria-label="Previous period"
                  className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCalDate(today)}
                  className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-xs font-medium"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => shiftCalendar(1)}
                  aria-label="Next period"
                  className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={calDate}
                  onChange={(e) => setCalDate(e.target.value)}
                  className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-2.5 py-1.5 text-xs font-mono-num"
                />
              </div>
            </div>

            {calMode !== 'day' && (
              <div className="hidden sm:grid grid-cols-7 gap-2 text-center text-[11px] font-semibold text-[var(--text-muted)]">
                {weekdayLabels.map((w) => (
                  <div key={w}>{w}</div>
                ))}
              </div>
            )}

            <div className={`grid gap-2 ${calMode === 'day' ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-7'}`}>
              {calendarCells.map(({ iso, inMonth }) => {
                const dayEvents = store.events.filter((ev) => ev.startDate === iso);
                const dayTasks = activeTasks.filter((t) => t.dueDate === iso && t.status !== 'completed');
                const isSelected = iso === calDate;
                const isToday = iso === today;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => {
                      setCalDate(iso);
                      setEvDate(iso);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-colors min-h-[82px] flex flex-col justify-between ${
                      isSelected
                        ? 'border-accent bg-accent-soft'
                        : inMonth
                        ? 'border-[var(--border-hairline)] bg-[var(--bg-elevated)]/60 hover:bg-[var(--bg-hover)]'
                        : 'border-[var(--border-hairline)]/50 bg-[var(--bg-elevated)]/25 opacity-50'
                    }`}
                  >
                    <span className={`text-xs font-mono-num font-semibold ${isToday ? 'text-accent' : ''}`}>
                      {isToday ? `${iso.slice(8)} · Today` : calMode === 'day' ? iso : iso.slice(8)}
                    </span>
                    <div className="space-y-1 mt-1">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <p key={ev.id} className="text-[11px] truncate text-accent font-medium">
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
              <button type="submit" className="w-full py-2.5 rounded-xl bg-accent text-xs font-semibold">
                Save to Calendar
              </button>
            </form>

            <div className="pt-3 border-t bento-divider space-y-2">
              <p className="text-xs font-semibold">Agenda for {calDate}</p>
              {store.events.filter((e) => e.startDate === calDate).length === 0 &&
              activeTasks.filter((t) => t.dueDate === calDate).length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No events or tasks on this date.</p>
              ) : (
                <>
                  {store.events.filter((e) => e.startDate === calDate).map((e) => (
                    <div key={e.id} className="flex items-center justify-between text-xs py-1">
                      <span>{e.startTime} · {e.title} ({e.kind})</span>
                      <button type="button" onClick={() => store.deleteEvent(e.id)} aria-label="Delete event" className="text-rose-400 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {activeTasks.filter((t) => t.dueDate === calDate).map((tk) => (
                    <button
                      key={tk.id}
                      type="button"
                      onClick={() => store.toggleTaskComplete(tk.id)}
                      className="w-full flex items-center justify-between text-xs py-1 text-left"
                    >
                      <span className={tk.status === 'completed' ? 'line-through text-[var(--text-muted)]' : ''}>
                        {tk.status === 'completed' ? '✓' : '○'} {tk.title}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">{tk.priority}</span>
                    </button>
                  ))}
                </>
              )}
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
                const pct = r.steps.length > 0 ? Math.round((doneIds.length / r.steps.length) * 100) : 0;
                return (
                  <div key={r.id} className={`bento-surface rounded-2xl p-5 space-y-3 ${!r.enabled ? 'opacity-65' : ''}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold">{r.name}</h3>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {r.kind} routine · {r.scheduledTime || 'Flexible'} · {doneIds.length}/{r.steps.length} steps today ({pct}%)
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => store.updateRoutine(r.id, { enabled: !r.enabled })}
                          className="px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] text-xs font-medium"
                        >
                          {r.enabled ? 'Pause' : 'Enable'}
                        </button>
                        <button type="button" onClick={() => store.deleteRoutine(r.id)} aria-label="Delete routine" className="text-rose-400 p-1.5">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                      <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
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

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const title = (stepDrafts[r.id] || '').trim();
                        if (!title) return;
                        store.updateRoutine(r.id, {
                          steps: [
                            ...r.steps,
                            {
                              id: `step-${Date.now()}`,
                              title,
                              durationMinutes: 10,
                              order: r.steps.length,
                            },
                          ],
                        });
                        setStepDrafts((prev) => ({ ...prev, [r.id]: '' }));
                      }}
                      className="flex gap-2 pt-2 border-t bento-divider"
                    >
                      <input
                        type="text"
                        value={stepDrafts[r.id] || ''}
                        onChange={(e) => setStepDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        placeholder="Add step..."
                        className="flex-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-1.5 text-xs"
                      />
                      <button type="submit" className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-xs font-medium">
                        Add Step
                      </button>
                    </form>
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
            <button type="submit" className="w-full py-2.5 rounded-xl bg-accent text-xs font-semibold">
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
                className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-1.5 text-xs w-44 sm:w-52"
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
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => store.updateNote(n.id, { pinned: !n.pinned })}
                          aria-label="Pin note"
                          className={`p-1.5 rounded ${n.pinned ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNoteId(n.id);
                            setNoteTitle(n.title);
                            setNoteContent(n.content);
                            setNoteCategory(n.category);
                            setNoteTags(n.tags.join(', '));
                          }}
                          aria-label="Edit note"
                          className="p-1.5 rounded text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => store.deleteNote(n.id)} aria-label="Delete note" className="text-rose-400 p-1.5">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] whitespace-pre-line">{n.content}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {n.category} {n.pinned ? '· Pinned' : ''} {n.tags.length > 0 ? `· ${n.tags.join(', ')}` : ''} · {n.updatedAt.slice(0, 10)}
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
              const tags = noteTags.split(',').map((s) => s.trim()).filter(Boolean);
              if (editingNoteId) {
                store.updateNote(editingNoteId, {
                  title: noteTitle.trim() || 'Untitled Note',
                  content: noteContent.trim(),
                  category: noteCategory.trim() || 'General',
                  tags,
                });
                setEditingNoteId(null);
              } else {
                store.addNote({
                  title: noteTitle.trim() || 'Untitled Note',
                  content: noteContent.trim(),
                  category: noteCategory.trim() || 'General',
                  pinned: false,
                  tags,
                });
              }
              setNoteTitle('');
              setNoteContent('');
              setNoteTags('');
            }}
            className="bento-surface rounded-2xl p-5 lg:col-span-4 space-y-3 h-fit"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">{editingNoteId ? 'Edit Note' : 'New Note'}</h2>
              {editingNoteId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingNoteId(null);
                    setNoteTitle('');
                    setNoteContent('');
                    setNoteTags('');
                  }}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
              )}
            </div>
            <input type="text" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Title" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={noteCategory} onChange={(e) => setNoteCategory(e.target.value)} placeholder="Category" className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
              <input type="text" value={noteTags} onChange={(e) => setNoteTags(e.target.value)} placeholder="Tags (comma-sep)" className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
            </div>
            <textarea rows={5} value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Write note..." className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm" />
            <button type="submit" className="w-full py-2.5 rounded-xl bg-accent text-xs font-semibold">
              {editingNoteId ? 'Update Note' : 'Save Note'}
            </button>
          </form>
        </div>
      )}

      {/* TASK EDIT / SUBTASKS MODAL */}
      {editingTaskId && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
          onClick={() => setEditingTaskId(null)}
        >
          <form
            onSubmit={handleSaveTaskEdit}
            onClick={(e) => e.stopPropagation()}
            className="bento-surface w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto bento-scroll"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Edit Task & Subtasks</h2>
              <button
                type="button"
                onClick={() => setEditingTaskId(null)}
                aria-label="Close modal"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              required
              value={eTitle}
              onChange={(e) => setETitle(e.target.value)}
              placeholder="Task title"
              className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={eDesc}
              onChange={(e) => setEDesc(e.target.value)}
              placeholder="Description"
              className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={eDue} onChange={(e) => setEDue(e.target.value)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <input type="time" value={eTime} onChange={(e) => setETime(e.target.value)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <select value={ePriority} onChange={(e) => setEPriority(e.target.value as TaskPriority)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                <option value="none">No priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <select value={eStatus} onChange={(e) => setEStatus(e.target.value as TaskStatus)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                <option value="inbox">Inbox</option>
                <option value="upcoming">Upcoming</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <input type="text" value={eCategory} onChange={(e) => setECategory(e.target.value)} placeholder="Category" className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
              <select value={eRecurrence} onChange={(e) => setERecurrence(e.target.value as RecurrencePattern)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                <option value="none">One-time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            {store.goals.length > 0 && (
              <select value={eGoalId} onChange={(e) => setEGoalId(e.target.value)} className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                <option value="">No linked goal</option>
                {store.goals.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            )}

            {/* Subtasks */}
            <div className="space-y-2 pt-2 border-t bento-divider">
              <p className="text-xs font-semibold">Subtasks ({eSubtasks.filter((s) => s.completed).length}/{eSubtasks.length})</p>
              {eSubtasks.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setESubtasks((prev) =>
                        prev.map((x) => (x.id === sub.id ? { ...x, completed: !x.completed } : x))
                      )
                    }
                    className="flex items-center gap-2 text-left flex-1 min-w-0"
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${sub.completed ? 'bg-accent border-accent' : 'border-[var(--border-strong)]'}`}>
                      {sub.completed && <Check className="w-3 h-3" />}
                    </span>
                    <span className={`truncate ${sub.completed ? 'line-through text-[var(--text-muted)]' : ''}`}>{sub.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setESubtasks((prev) => prev.filter((x) => x.id !== sub.id))}
                    className="text-rose-400 p-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSubtaskTitle.trim()) {
                      e.preventDefault();
                      setESubtasks((prev) => [
                        ...prev,
                        { id: `sub-${Date.now()}`, title: newSubtaskTitle.trim(), completed: false },
                      ]);
                      setNewSubtaskTitle('');
                    }
                  }}
                  placeholder="Add subtask..."
                  className="flex-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-2.5 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newSubtaskTitle.trim()) return;
                    setESubtasks((prev) => [
                      ...prev,
                      { id: `sub-${Date.now()}`, title: newSubtaskTitle.trim(), completed: false },
                    ]);
                    setNewSubtaskTitle('');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] text-xs font-medium"
                >
                  Add
                </button>
              </div>
            </div>

            <textarea
              rows={2}
              value={eNotes}
              onChange={(e) => setENotes(e.target.value)}
              placeholder="Task notes..."
              className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs"
            />

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingTaskId(null)} className="px-4 py-2 rounded-xl text-xs text-[var(--text-secondary)]">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-accent text-xs font-semibold">
                Save Task
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
