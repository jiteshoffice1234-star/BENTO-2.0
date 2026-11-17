import JSZip from 'jszip';
import { BentoDatabaseSnapshot } from '../types/bento';
import { normalizeSnapshot } from '../db/storage';

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function deriveAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const rawKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 120000,
      hash: 'SHA-256',
    },
    rawKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptPayload(plainText: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(password, salt);
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plainText)
  );
  const pack = {
    bentoEncrypted: true,
    version: 1,
    salt: btoa(String.fromCharCode(...salt)),
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(cipherBuffer))),
  };
  return JSON.stringify(pack, null, 2);
}

export async function decryptPayload(encryptedJson: string, password: string): Promise<string> {
  const pack = JSON.parse(encryptedJson);
  if (!pack?.bentoEncrypted) return encryptedJson;
  const salt = Uint8Array.from(atob(pack.salt), (c) => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(pack.iv), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(pack.ciphertext), (c) => c.charCodeAt(0));
  const key = await deriveAesKey(password, salt);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(plainBuf);
}

export async function createZipBackupBlob(
  snapshot: BentoDatabaseSnapshot,
  password?: string
): Promise<Blob> {
  const zip = new JSZip();
  const cleanSnapshot: BentoDatabaseSnapshot = {
    ...snapshot,
    exportedAt: new Date().toISOString(),
  };

  const dbJson = JSON.stringify(cleanSnapshot, null, 2);
  const manifest = {
    app: 'BENTO',
    schemaVersion: cleanSnapshot.schemaVersion,
    exportedAt: cleanSnapshot.exportedAt,
    encrypted: Boolean(password && password.trim().length > 0),
    counts: {
      accounts: cleanSnapshot.accounts.length,
      transactions: cleanSnapshot.transactions.length,
      tasks: cleanSnapshot.tasks.length,
      habits: cleanSnapshot.habits.length,
      goals: cleanSnapshot.goals.length,
      journalEntries: cleanSnapshot.journalEntries.length,
      attachments: cleanSnapshot.attachments.length,
    },
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  if (password && password.trim().length > 0) {
    const encrypted = await encryptPayload(dbJson, password.trim());
    zip.file('database.enc.json', encrypted);
  } else {
    zip.file('database.json', dbJson);
    const attFolder = zip.folder('attachments');
    if (attFolder) {
      for (const att of cleanSnapshot.attachments) {
        const base64Part = att.dataUrl.split(',')[1];
        if (base64Part) {
          attFolder.file(`${att.id}_${att.name}`, base64Part, { base64: true });
        }
      }
    }
  }

  return zip.generateAsync({ type: 'blob' });
}

export interface BackupInspectionResult {
  valid: boolean;
  encrypted: boolean;
  schemaVersion: number;
  exportedAt: string;
  snapshot?: BentoDatabaseSnapshot;
  error?: string;
}

export async function parseAndValidateBackupFile(
  file: File,
  password?: string
): Promise<BackupInspectionResult> {
  try {
    if (file.name.endsWith('.zip')) {
      const zip = await JSZip.loadAsync(file);
      const encFile = zip.file('database.enc.json');
      const plainFile = zip.file('database.json');

      if (encFile) {
        const encText = await encFile.async('string');
        if (!password) {
          return {
            valid: false,
            encrypted: true,
            schemaVersion: 3,
            exportedAt: '',
            error: 'This backup is encrypted. Enter your backup password to decrypt.',
          };
        }
        const plain = await decryptPayload(encText, password);
        const parsed = normalizeSnapshot(JSON.parse(plain));
        return {
          valid: true,
          encrypted: true,
          schemaVersion: parsed.schemaVersion,
          exportedAt: parsed.exportedAt,
          snapshot: parsed,
        };
      }

      if (plainFile) {
        const plain = await plainFile.async('string');
        const parsed = normalizeSnapshot(JSON.parse(plain));
        return {
          valid: true,
          encrypted: false,
          schemaVersion: parsed.schemaVersion,
          exportedAt: parsed.exportedAt,
          snapshot: parsed,
        };
      }

      return { valid: false, encrypted: false, schemaVersion: 0, exportedAt: '', error: 'Missing database file inside ZIP.' };
    }

    const text = await file.text();
    const raw = JSON.parse(text);
    if (raw?.bentoEncrypted) {
      if (!password) {
        return {
          valid: false,
          encrypted: true,
          schemaVersion: 3,
          exportedAt: '',
          error: 'Encrypted JSON backup requires password.',
        };
      }
      const decrypted = await decryptPayload(text, password);
      const parsed = normalizeSnapshot(JSON.parse(decrypted));
      return {
        valid: true,
        encrypted: true,
        schemaVersion: parsed.schemaVersion,
        exportedAt: parsed.exportedAt,
        snapshot: parsed,
      };
    }

    const parsed = normalizeSnapshot(raw);
    return {
      valid: true,
      encrypted: false,
      schemaVersion: parsed.schemaVersion,
      exportedAt: parsed.exportedAt,
      snapshot: parsed,
    };
  } catch (err) {
    return {
      valid: false,
      encrypted: Boolean(password),
      schemaVersion: 0,
      exportedAt: '',
      error: err instanceof Error ? err.message : 'Failed to parse backup file.',
    };
  }
}

export function mergeSnapshotsDeduplicatingById(
  current: BentoDatabaseSnapshot,
  incoming: BentoDatabaseSnapshot
): BentoDatabaseSnapshot {
  const mergeById = <T extends { id: string }>(a: T[], b: T[]): T[] => {
    const map = new Map<string, T>();
    for (const item of a) map.set(item.id, item);
    for (const item of b) {
      if (!map.has(item.id)) map.set(item.id, item);
    }
    return [...map.values()];
  };

  return {
    ...current,
    accounts: mergeById(current.accounts, incoming.accounts),
    categories: mergeById(current.categories, incoming.categories),
    transactions: mergeById(current.transactions, incoming.transactions),
    budgets: mergeById(current.budgets, incoming.budgets),
    savingsGoals: mergeById(current.savingsGoals, incoming.savingsGoals),
    investments: mergeById(current.investments, incoming.investments),
    debts: mergeById(current.debts, incoming.debts),
    bills: mergeById(current.bills, incoming.bills),
    tasks: mergeById(current.tasks, incoming.tasks),
    events: mergeById(current.events, incoming.events),
    routines: mergeById(current.routines, incoming.routines),
    notes: mergeById(current.notes, incoming.notes),
    habits: mergeById(current.habits, incoming.habits),
    goals: mergeById(current.goals, incoming.goals),
    skills: mergeById(current.skills, incoming.skills),
    courses: mergeById(current.courses, incoming.courses),
    studySessions: mergeById(current.studySessions, incoming.studySessions),
    jobApplications: mergeById(current.jobApplications, incoming.jobApplications),
    journalEntries: mergeById(current.journalEntries, incoming.journalEntries),
    memories: mergeById(current.memories, incoming.memories),
    wishlist: mergeById(current.wishlist, incoming.wishlist),
    healthLogs: mergeById(current.healthLogs, incoming.healthLogs),
    vaultEntries: mergeById(current.vaultEntries, incoming.vaultEntries),
    attachments: mergeById(current.attachments, incoming.attachments),
    assistantHistory: mergeById(current.assistantHistory, incoming.assistantHistory),
  };
}
