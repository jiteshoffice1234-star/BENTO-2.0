import React, { useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { useBentoStore } from '../store/useBentoStore';
import { sha256Hex } from '../services/backup';

export const LockScreen: React.FC = () => {
  const { isLocked, setLocked, settings } = useBentoStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!isLocked || !settings.appLockEnabled || !settings.appLockPinHash) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const hash = await sha256Hex(pin.trim());
    if (hash === settings.appLockPinHash) {
      setLocked(false);
      setPin('');
      setError('');
    } else {
      setError('Incorrect PIN. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-canvas)] p-4">
      <form
        onSubmit={handleUnlock}
        className="bento-surface w-full max-w-sm rounded-2xl p-6 text-center space-y-5"
      >
        <div className="w-12 h-12 rounded-2xl bg-[var(--bg-elevated)] border bento-divider flex items-center justify-center mx-auto">
          <Lock className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold">BENTO Locked</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Enter your local security PIN to access your records.
          </p>
        </div>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            setError('');
          }}
          placeholder="Enter PIN"
          className="w-full text-center tracking-[0.4em] font-mono-num text-lg rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-4 py-3 focus:outline-none focus:border-emerald-500"
        />
        {error && <p className="text-xs text-rose-500">{error}</p>}
        <button
          type="submit"
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
        >
          <Unlock className="w-4 h-4" />
          Unlock
        </button>
      </form>
    </div>
  );
};
