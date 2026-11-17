import React, { useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useBentoStore } from '../store/useBentoStore';
import { CURRENCY_OPTIONS } from '../utils/defaults';
import { toMinor } from '../utils/finance';
import { ThemeMode } from '../types/bento';

export const OnboardingModal: React.FC = () => {
  const { settings, updateSettings, addAccount, accounts } = useBentoStore();
  const [name, setName] = useState(settings.userName);
  const [currency, setCurrency] = useState(settings.currency);
  const [theme, setTheme] = useState<ThemeMode>(settings.theme);
  const [initialAccountName, setInitialAccountName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');

  if (settings.onboardingCompleted) return null;

  const handleComplete = (skipAccount = false) => {
    updateSettings({
      userName: name.trim(),
      currency,
      theme,
      onboardingCompleted: true,
    });

    if (!skipAccount && initialAccountName.trim() && accounts.length === 0) {
      addAccount({
        name: initialAccountName.trim(),
        institution: '',
        type: 'savings',
        openingBalanceMinor: toMinor(initialBalance),
        currency,
        color: '#10b981',
        notes: 'Initial account created during setup',
        active: true,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bento-surface w-full max-w-lg rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-medium text-accent tracking-wide">BENTO Personal OS</p>
            <h1 className="text-2xl font-bold tracking-tight mt-1 text-balance">
              Your Life. One Place.
            </h1>
          </div>
          <button
            type="button"
            onClick={() => handleComplete(true)}
            className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors whitespace-nowrap shrink-0"
          >
            Skip setup
          </button>
        </div>

        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
          Local-first and private by design. Every financial record, task, habit, and journal entry stays on your device with full offline functionality.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Your Name (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Jitesh"
              className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Primary Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Appearance
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)]">
                {(['dark', 'light', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className={`py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                      theme === t
                        ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t bento-divider">
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">
              Optional: Add your first account now
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={initialAccountName}
                onChange={(e) => setInitialAccountName(e.target.value)}
                placeholder="Account name (e.g., Bank, Cash)"
                className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
              />
              <input
                type="number"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="Opening balance (0)"
                className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3.5 py-2.5 text-sm font-mono-num focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t bento-divider flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
            <span>No account required · Offline-first storage</span>
          </div>
          <button
            type="button"
            onClick={() => handleComplete(false)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            Enter BENTO
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
