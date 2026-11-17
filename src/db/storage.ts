import { BentoDatabaseSnapshot } from '../types/bento';
import { createEmptySnapshot, DEFAULT_CAREER_PROFILE, DEFAULT_DASHBOARD_CARDS, DEFAULT_FINANCE_CATEGORIES, DEFAULT_SETTINGS } from '../utils/defaults';

const DB_NAME = 'bento_os_local_db';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';
const SNAPSHOT_KEY = 'primary_snapshot';
const FALLBACK_LS_KEY = 'bento_os_snapshot_v3';
const LEGACY_LS_KEY = 'bento-storage';

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveSnapshotToLocalDB(snapshot: BentoDatabaseSnapshot): Promise<void> {
  try {
    const db = await openIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(snapshot, SNAPSHOT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Fallback to localStorage if IndexedDB is restricted
  }
  try {
    localStorage.setItem(FALLBACK_LS_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage quota guard
  }
}

export async function loadSnapshotFromLocalDB(): Promise<BentoDatabaseSnapshot> {
  try {
    const db = await openIndexedDB();
    const record = await new Promise<BentoDatabaseSnapshot | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(SNAPSHOT_KEY);
      req.onsuccess = () => resolve(req.result as BentoDatabaseSnapshot | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (record && typeof record === 'object') {
      return normalizeSnapshot(record);
    }
  } catch {
    // Fall back to localStorage
  }

  try {
    const raw = localStorage.getItem(FALLBACK_LS_KEY);
    if (raw) {
      return normalizeSnapshot(JSON.parse(raw));
    }
    // Migrate legacy v2 repo data if present
    const legacyRaw = localStorage.getItem(LEGACY_LS_KEY);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      const state = parsed?.state ?? parsed;
      if (state && typeof state === 'object') {
        return migrateLegacyV2State(state);
      }
    }
  } catch {
    // Corrupted JSON fallback
  }

  return createEmptySnapshot();
}

export async function clearLocalDB(): Promise<void> {
  try {
    const db = await openIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(SNAPSHOT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore
  }
  localStorage.removeItem(FALLBACK_LS_KEY);
}

export function normalizeSnapshot(raw: Partial<BentoDatabaseSnapshot>): BentoDatabaseSnapshot {
  const empty = createEmptySnapshot();
  return {
    ...empty,
    ...raw,
    schemaVersion: 3,
    settings: {
      ...DEFAULT_SETTINGS,
      ...(raw.settings ?? {}),
      bentoScoreWeights: {
        ...DEFAULT_SETTINGS.bentoScoreWeights,
        ...(raw.settings?.bentoScoreWeights ?? {}),
      },
      dashboardCards:
        Array.isArray(raw.settings?.dashboardCards) && raw.settings.dashboardCards.length > 0
          ? raw.settings.dashboardCards
          : DEFAULT_DASHBOARD_CARDS,
    },
    categories:
      Array.isArray(raw.categories) && raw.categories.length > 0
        ? raw.categories
        : [...DEFAULT_FINANCE_CATEGORIES],
    careerProfile: {
      ...DEFAULT_CAREER_PROFILE,
      ...(raw.careerProfile ?? {}),
    },
  };
}

// Preserves user records if migrating from the original v2.x bento-app repo
function migrateLegacyV2State(legacy: Record<string, any>): BentoDatabaseSnapshot {
  const base = createEmptySnapshot();
  if (legacy.settings) {
    base.settings.userName = legacy.settings.userName || '';
    base.settings.currency = legacy.settings.currency || 'INR';
    base.settings.theme = legacy.settings.theme === 'light' ? 'light' : 'dark';
    base.settings.onboardingCompleted = Boolean(legacy.settings.onboardingCompleted);
  }
  if (Array.isArray(legacy.accounts)) {
    base.accounts = legacy.accounts.map((a: any) => ({
      id: a.id,
      name: a.name || 'Account',
      institution: '',
      type: a.type === 'bank' ? 'savings' : a.type === 'credit_card' ? 'credit_card' : 'cash',
      openingBalanceMinor: Math.round(Number(a.balance || 0) * 100),
      currency: base.settings.currency,
      color: a.color || '#10b981',
      notes: a.notes || '',
      active: true,
      createdAt: a.createdAt || new Date().toISOString(),
      updatedAt: a.updatedAt || new Date().toISOString(),
    }));
  }
  if (Array.isArray(legacy.transactions)) {
    const defaultAccId = base.accounts[0]?.id ?? 'unassigned';
    base.transactions = legacy.transactions.map((t: any) => ({
      id: t.id,
      type: t.type === 'income' ? 'income' : 'expense',
      amountMinor: Math.round(Number(t.amount || 0) * 100),
      category: t.category || 'Other',
      subcategory: '',
      accountId: defaultAccId,
      toAccountId: null,
      date: t.date || new Date().toISOString().slice(0, 10),
      time: '12:00',
      merchant: '',
      description: t.description || '',
      tags: [],
      notes: t.notes || '',
      recurring: Boolean(t.recurring),
      recurrence: t.recurring ? 'monthly' : 'none',
      createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: t.updatedAt || new Date().toISOString(),
    }));
  }
  return base;
}
