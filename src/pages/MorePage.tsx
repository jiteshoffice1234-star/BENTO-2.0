import React, { useMemo, useRef, useState } from 'react';
import {
  Bell,
  Clock,
  Download,
  Lock,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { useBentoStore } from '../store/useBentoStore';
import { computeBentoScore, generateExplainableInsights, generatePeriodReview } from '../services/intelligence';
import { deriveActiveReminders, isWithinQuietHours } from '../services/notifications';
import { createZipBackupBlob, parseAndValidateBackupFile, sha256Hex } from '../services/backup';
import { exportTransactionsToCSV, formatMoney, todayISO } from '../utils/finance';
import { CURRENCY_OPTIONS } from '../utils/defaults';
import { AccentChoice, BentoDatabaseSnapshot, BentoScoreWeights, ThemeMode, TimeFormat } from '../types/bento';

type MoreTab = 'reviews' | 'score' | 'notifications' | 'backup' | 'privacy_ai' | 'settings';

export const MorePage: React.FC = () => {
  const store = useBentoStore();
  const snap = store.getSnapshot();
  const cur = store.settings.currency;
  const [tab, setTab] = useState<MoreTab>('reviews');
  const [reviewMode, setReviewMode] = useState<'week' | 'month'>('week');

  // Backup & Restore state
  const [backupPassword, setBackupPassword] = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [backupStatus, setBackupStatus] = useState('');
  const [pendingRestore, setPendingRestore] = useState<{
    snapshot: BentoDatabaseSnapshot;
    schemaVersion: number;
    fileName: string;
  } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement | null>(null);

  // PIN App Lock state
  const [newPin, setNewPin] = useState('');
  const [pinMsg, setPinMsg] = useState('');

  const review = useMemo(() => generatePeriodReview(snap, reviewMode), [snap, reviewMode]);
  const insights = useMemo(() => generateExplainableInsights(snap), [snap]);
  const bentoScore = useMemo(() => computeBentoScore(snap), [snap]);
  const nowIso = new Date().toISOString();
  const reminders = useMemo(
    () =>
      deriveActiveReminders(snap).filter((r) => {
        if (store.dismissedNotificationIds.includes(r.id)) return false;
        const snoozedUntil = store.snoozedNotifications[r.id];
        if (snoozedUntil && snoozedUntil > nowIso) return false;
        return true;
      }),
    [snap, store.dismissedNotificationIds, store.snoozedNotifications, nowIso]
  );

  const handleExportJSON = () => {
    const json = JSON.stringify(snap, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bento-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupStatus('Exported full JSON database backup.');
  };

  const handleExportZIP = async () => {
    const blob = await createZipBackupBlob(snap, backupPassword);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bento-backup-${todayISO()}${backupPassword.trim() ? '-encrypted' : ''}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupStatus(
      backupPassword.trim()
        ? 'Exported AES-GCM encrypted ZIP backup package.'
        : 'Exported ZIP backup package with attachments.'
    );
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
    setBackupStatus('Exported CSV transaction ledger.');
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await parseAndValidateBackupFile(file, restorePassword);
    if (!res.valid || !res.snapshot) {
      setBackupStatus(res.error || 'Backup validation failed.');
      setPendingRestore(null);
      e.target.value = '';
      return;
    }
    setPendingRestore({
      snapshot: res.snapshot,
      schemaVersion: res.schemaVersion,
      fileName: file.name,
    });
    setBackupStatus('');
    e.target.value = '';
  };

  const confirmPendingRestore = () => {
    if (!pendingRestore) return;
    store.restoreFromSnapshot(pendingRestore.snapshot, restoreMode);
    setBackupStatus(
      `Restored "${pendingRestore.fileName}" (schema v${pendingRestore.schemaVersion}, ${pendingRestore.snapshot.transactions.length} transactions, ${pendingRestore.snapshot.tasks.length} tasks) via ${restoreMode}.`
    );
    setPendingRestore(null);
  };

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.trim().length < 4) {
      setPinMsg('PIN must be at least 4 digits.');
      return;
    }
    const hash = await sha256Hex(newPin.trim());
    store.updateSettings({ appLockEnabled: true, appLockPinHash: hash });
    setNewPin('');
    setPinMsg('App Lock PIN saved locally.');
  };

  const updateWeight = (key: keyof BentoScoreWeights, val: number) => {
    store.updateSettings({
      bentoScoreWeights: {
        ...store.settings.bentoScoreWeights,
        [key]: Math.max(0, Math.min(100, val)),
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Intelligence, Backup & Settings</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Weekly & monthly reviews, BENTO Score methodology, reminders, encrypted backups, privacy, and preferences
        </p>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {(
          [
            { id: 'reviews', label: 'Reviews & Insights' },
            { id: 'score', label: 'BENTO Score' },
            { id: 'notifications', label: `Notifications (${reminders.length})` },
            { id: 'backup', label: 'Backup & Restore' },
            { id: 'privacy_ai', label: 'Privacy & AI' },
            { id: 'settings', label: 'Settings' },
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

      {/* 1. REVIEWS & INSIGHTS */}
      {tab === 'reviews' && (
        <div className="space-y-5">
          <div className="bento-surface rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold">{review.periodLabel}</h2>
                <p className="text-xs font-mono-num text-[var(--text-secondary)]">
                  {review.startDate} to {review.endDate}
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-elevated)]">
                {(['week', 'month'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setReviewMode(m)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium capitalize ${
                      reviewMode === m ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t bento-divider">
              <div>
                <p className="text-[11px] text-[var(--text-secondary)]">Tasks Done</p>
                <p className="text-lg font-bold font-mono-num">{review.tasksCompleted}</p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--text-secondary)]">Habit Rate</p>
                <p className="text-lg font-bold font-mono-num">{review.habitConsistencyPct}%</p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--text-secondary)]">Money Spent</p>
                <p className="text-lg font-bold font-mono-num text-rose-400">{formatMoney(review.expenseMinor, cur)}</p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--text-secondary)]">Net Saved</p>
                <p className="text-lg font-bold font-mono-num text-accent">{formatMoney(review.savingsMinor, cur)}</p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--text-secondary)]">Learning</p>
                <p className="text-lg font-bold font-mono-num">{(review.learningMinutes / 60).toFixed(1)}h</p>
              </div>
              <div>
                <p className="text-[11px] text-[var(--text-secondary)]">Active Goals</p>
                <p className="text-lg font-bold font-mono-num">{review.activeGoalsCount}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t bento-divider">
              <div>
                <h3 className="text-xs font-bold mb-2">Achievements & Highlights</h3>
                {review.highlights.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">No highlights recorded in this period yet.</p>
                ) : (
                  <ul className="space-y-1 text-xs text-[var(--text-secondary)]">
                    {review.highlights.map((h, i) => <li key={i}>• {h}</li>)}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-xs font-bold mb-2">Areas Needing Attention</h3>
                {review.attentionAreas.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">Everything tracked is currently healthy.</p>
                ) : (
                  <ul className="space-y-1 text-xs text-amber-400">
                    {review.attentionAreas.map((a, i) => <li key={i}>• {a}</li>)}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="bento-surface rounded-2xl p-5 space-y-3">
            <h2 className="text-base font-bold">Explainable Local Insights</h2>
            {insights.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">Insights appear automatically once local records accumulate.</p>
            ) : (
              <div className="divide-y bento-divider">
                {insights.map((ins) => (
                  <button
                    key={ins.id}
                    type="button"
                    onClick={() => store.setActiveSection(ins.route)}
                    className="w-full py-3 text-left space-y-0.5 hover:bg-[var(--bg-hover)]/40 rounded-lg px-2 transition-colors"
                  >
                    <p className="text-sm font-semibold">{ins.title}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{ins.detail}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">Trace: {ins.trace}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. BENTO SCORE */}
      {tab === 'score' && (
        <div className="bento-surface rounded-2xl p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">BENTO Score</h2>
              <p className="text-xs text-[var(--text-secondary)]">{bentoScore.methodologyNote}</p>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={store.settings.bentoScoreEnabled}
                onChange={(e) => store.updateSettings({ bentoScoreEnabled: e.target.checked })}
              />
              <span>Enable BENTO Score</span>
            </label>
          </div>

          {bentoScore.enabled && (
            <>
              <div className="p-4 rounded-xl bg-[var(--bg-elevated)] flex items-baseline gap-3">
                <span className="text-4xl font-extrabold font-mono-num text-accent">
                  {bentoScore.overallScore ?? '—'}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {bentoScore.hasData ? '/ 100 across tracked dimensions' : 'No tracked activity yet'}
                </span>
              </div>

              <div className="divide-y bento-divider">
                {bentoScore.dimensions.map((d) => (
                  <div key={d.key} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">
                        {d.label} · {d.tracked ? `Score ${d.score}/100 (Weight ${d.effectiveWeightPct}%)` : 'Untracked (excluded)'}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">{d.rationale}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-[var(--text-muted)]">Weight</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={store.settings.bentoScoreWeights[d.key]}
                        onChange={(e) => updateWeight(d.key, Number(e.target.value))}
                        className="w-16 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-2 py-1 text-xs font-mono-num"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 3. NOTIFICATION CENTER */}
      {tab === 'notifications' && (
        <div className="bento-surface rounded-2xl p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Notification Center</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Quiet hours: {store.settings.quietHoursEnabled ? `${store.settings.quietHoursStart}–${store.settings.quietHoursEnd}` : 'Off'}
                {isWithinQuietHours(store.settings) ? ' · Currently in quiet hours' : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
                  void Notification.requestPermission();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] text-xs font-medium"
            >
              <Bell className="w-3.5 h-3.5 text-accent" />
              <span>Enable Browser Alerts</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[var(--bg-elevated)] text-xs">
            <label className="flex items-center gap-2 font-medium">
              <input
                type="checkbox"
                checked={store.settings.notificationsEnabled}
                onChange={(e) => store.updateSettings({ notificationsEnabled: e.target.checked })}
              />
              <span>In-App Reminders</span>
            </label>
            <label className="flex items-center gap-2 font-medium">
              <input
                type="checkbox"
                checked={store.settings.quietHoursEnabled}
                onChange={(e) => store.updateSettings({ quietHoursEnabled: e.target.checked })}
              />
              <span>Enable Quiet Hours</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)]">Start</span>
              <input
                type="time"
                value={store.settings.quietHoursStart}
                onChange={(e) => store.updateSettings({ quietHoursStart: e.target.value })}
                className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-2 py-1 font-mono-num"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)]">End</span>
              <input
                type="time"
                value={store.settings.quietHoursEnd}
                onChange={(e) => store.updateSettings({ quietHoursEnd: e.target.value })}
                className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-2 py-1 font-mono-num"
              />
            </div>
          </div>

          {!store.settings.notificationsEnabled ? (
            <p className="text-xs text-[var(--text-muted)] py-8 text-center">Reminders are currently muted in Notification settings.</p>
          ) : reminders.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-8 text-center">No active reminders or due alerts.</p>
          ) : (
            <div className="divide-y bento-divider">
              {reminders.map((r) => (
                <div key={r.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{r.title}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{r.category} · {r.body}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => store.setActiveSection(r.route)}
                      className="px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] text-xs font-medium"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                        store.snoozeNotification(r.id, tomorrow);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] text-xs font-medium"
                    >
                      <Clock className="w-3 h-3" />
                      <span>Snooze 1d</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => store.dismissNotification(r.id)}
                      className="px-2.5 py-1 rounded-lg text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. BACKUP & RESTORE */}
      {tab === 'backup' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bento-surface rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-bold">Export & Encrypted Backup</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Move your complete BENTO database and attachments to another device without any cloud account.
            </p>
            <input
              type="password"
              value={backupPassword}
              onChange={(e) => setBackupPassword(e.target.value)}
              placeholder="Optional backup encryption password (AES-GCM 256)"
              className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3.5 py-2 text-xs"
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleExportZIP} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent text-xs font-semibold">
                <Download className="w-3.5 h-3.5" />
                <span>Download ZIP Backup</span>
              </button>
              <button type="button" onClick={handleExportJSON} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] text-xs font-medium">
                <Download className="w-3.5 h-3.5" />
                <span>JSON Export</span>
              </button>
              <button type="button" onClick={handleExportCSV} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] text-xs font-medium">
                <Download className="w-3.5 h-3.5" />
                <span>CSV Ledger</span>
              </button>
            </div>
            {backupStatus && <p className="text-xs text-accent">{backupStatus}</p>}
          </div>

          <div className="bento-surface rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-bold">Restore From Backup</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Inspects and validates backup contents before restoring. Deduplicates records by UUID in Merge mode.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <select value={restoreMode} onChange={(e) => setRestoreMode(e.target.value as 'merge' | 'replace')} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                <option value="merge">Merge (Skip duplicate UUIDs)</option>
                <option value="replace">Replace entire database</option>
              </select>
              <input
                type="password"
                value={restorePassword}
                onChange={(e) => setRestorePassword(e.target.value)}
                placeholder="Password (if encrypted)"
                className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs"
              />
            </div>
            <input ref={restoreInputRef} type="file" accept=".zip,.json" onChange={handleRestoreFile} className="hidden" />
            <button
              type="button"
              onClick={() => restoreInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] hover:bg-[var(--bg-hover)] text-xs font-semibold"
            >
              <Upload className="w-3.5 h-3.5 text-accent" />
              <span>Choose .ZIP or .JSON Backup</span>
            </button>

            {pendingRestore && (
              <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-accent space-y-2 text-xs">
                <p className="font-bold">Backup Ready: {pendingRestore.fileName}</p>
                <p className="text-[var(--text-secondary)] font-mono-num">
                  Schema v{pendingRestore.schemaVersion} · {pendingRestore.snapshot.transactions.length} transactions ·{' '}
                  {pendingRestore.snapshot.tasks.length} tasks · {pendingRestore.snapshot.habits.length} habits ·{' '}
                  {pendingRestore.snapshot.goals.length} goals · {pendingRestore.snapshot.attachments.length} attachments
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={confirmPendingRestore}
                    className="px-3.5 py-1.5 rounded-lg bg-accent text-xs font-semibold"
                  >
                    Confirm {restoreMode === 'merge' ? 'Merge' : 'Replace'} Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingRestore(null)}
                    className="px-3 py-1.5 rounded-lg text-xs text-[var(--text-secondary)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. PRIVACY & AI */}
      {tab === 'privacy_ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bento-surface rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <h2 className="text-base font-bold">Privacy & App Lock</h2>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              No registration, no cloud telemetry, no ads. Optional PIN lock protects both app entry and Personal Vault.
            </p>
            <form onSubmit={handleSetPin} className="flex gap-2">
              <input
                type="password"
                inputMode="numeric"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Set 4+ digit PIN"
                className="flex-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num"
              />
              <button type="submit" className="px-4 py-2 rounded-xl bg-accent text-xs font-semibold">
                Enable PIN
              </button>
            </form>
            {pinMsg && <p className="text-xs text-accent">{pinMsg}</p>}
            {store.settings.appLockEnabled && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => store.setLocked(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] text-xs font-medium"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => store.updateSettings({ appLockEnabled: false, appLockPinHash: '' })}
                  className="px-3 py-1.5 rounded-lg text-xs text-rose-400"
                >
                  Disable PIN Lock
                </button>
              </div>
            )}
          </div>

          <div className="bento-surface rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-bold">BENTO Assistant Layers</h2>
            <div className="space-y-2 text-xs text-[var(--text-secondary)]">
              <p><strong>Layer 1 (Active):</strong> Deterministic offline parser handles finances, tasks, goals, study, and local Q&A with zero internet.</p>
              <p><strong>Layer 2 (Local Model Adapter):</strong> Optional browser/on-device runtime check (falls back cleanly to Layer 1 when no local model runtime is present).</p>
              <p><strong>Layer 3 (External AI):</strong> Disabled by default. Never transmits personal data unless explicitly enabled below.</p>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={store.settings.aiLayer2LocalEnabled}
                onChange={(e) => store.updateSettings({ aiLayer2LocalEnabled: e.target.checked })}
              />
              <span>Enable Layer 2 On-Device Model Probe (when supported)</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={store.settings.aiLayer3ExternalEnabled}
                onChange={(e) =>
                  store.updateSettings({
                    aiLayer3ExternalEnabled: e.target.checked,
                    aiProvider: e.target.checked ? 'openai_compatible' : 'none',
                  })
                }
              />
              <span>Enable Optional External OpenAI-Compatible Provider</span>
            </label>
            {store.settings.aiLayer3ExternalEnabled && (
              <div className="space-y-2">
                <input type="url" value={store.settings.aiEndpoint} onChange={(e) => store.updateSettings({ aiEndpoint: e.target.value })} placeholder="Endpoint URL" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={store.settings.aiModel} onChange={(e) => store.updateSettings({ aiModel: e.target.value })} placeholder="Model" className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
                  <input type="password" value={store.settings.aiApiKey} onChange={(e) => store.updateSettings({ aiApiKey: e.target.value })} placeholder="API Key (stored locally)" className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. SETTINGS */}
      {tab === 'settings' && (
        <div className="bento-surface rounded-2xl p-5 space-y-5">
          <h2 className="text-base font-bold">Personalization & Preferences</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Display Name</label>
              <input
                type="text"
                value={store.settings.userName}
                onChange={(e) => store.updateSettings({ userName: e.target.value })}
                placeholder="Your name"
                className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Currency</label>
              <select
                value={store.settings.currency}
                onChange={(e) => store.updateSettings({ currency: e.target.value })}
                className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm"
              >
                {CURRENCY_OPTIONS.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Theme</label>
              <select
                value={store.settings.theme}
                onChange={(e) => store.updateSettings({ theme: e.target.value as ThemeMode })}
                className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm"
              >
                <option value="dark">Dark Premium</option>
                <option value="light">Light Editorial</option>
                <option value="system">System</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Accent Color</label>
              <select
                value={store.settings.accent}
                onChange={(e) => store.updateSettings({ accent: e.target.value as AccentChoice })}
                className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm"
              >
                <option value="emerald">Soft Emerald</option>
                <option value="violet">Muted Violet</option>
                <option value="champagne">Warm Champagne</option>
                <option value="sky">Ocean Blue</option>
                <option value="rose">Coral Rose</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">First Day of Week</label>
              <select
                value={store.settings.startOfWeek}
                onChange={(e) => store.updateSettings({ startOfWeek: e.target.value as 'monday' | 'sunday' })}
                className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm"
              >
                <option value="monday">Monday</option>
                <option value="sunday">Sunday</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Date Format</label>
              <select
                value={store.settings.dateFormat}
                onChange={(e) => store.updateSettings({ dateFormat: e.target.value as typeof store.settings.dateFormat })}
                className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Time Format</label>
              <select
                value={store.settings.timeFormat}
                onChange={(e) => store.updateSettings({ timeFormat: e.target.value as TimeFormat })}
                className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm"
              >
                <option value="12h">12-hour (AM/PM)</option>
                <option value="24h">24-hour</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Language</label>
              <select
                value={store.settings.language}
                onChange={(e) => store.updateSettings({ language: e.target.value })}
                className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm"
              >
                <option value="en">English (Global)</option>
                <option value="en-IN">English (India)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t bento-divider flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-[var(--text-secondary)]">
              <p className="font-semibold text-[var(--text-primary)]">About BENTO</p>
              <p>Version 2.1.0 · Local-first Personal Operating System · IndexedDB + Offline PWA</p>
            </div>

            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-500/40 text-rose-400 text-xs font-semibold hover:bg-rose-500/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Erase All Local Data</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await store.resetAllData();
                    setConfirmReset(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold"
                >
                  Confirm Permanent Erase
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-3 py-2 rounded-xl text-xs text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
