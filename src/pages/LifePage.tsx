import React, { useMemo, useState } from 'react';
import { Lock, ShieldAlert, Trash2, Upload } from 'lucide-react';
import { useBentoStore } from '../store/useBentoStore';
import { JournalMood, MemoryItem } from '../types/bento';
import { formatMoney, todayISO, toMinor } from '../utils/finance';
import { sha256Hex } from '../services/backup';

type LifeTab = 'journal' | 'memories' | 'wishlist' | 'health' | 'vault';

export const LifePage: React.FC = () => {
  const store = useBentoStore();
  const cur = store.settings.currency;
  const today = todayISO();
  const [tab, setTab] = useState<LifeTab>('journal');

  // Journal
  const [jSearch, setJSearch] = useState('');
  const [jDate, setJDate] = useState(today);
  const [jTitle, setJTitle] = useState('');
  const [jContent, setJContent] = useState('');
  const [jMood, setJMood] = useState<JournalMood | ''>('good');
  const [jTags, setJTags] = useState('');

  // Memories
  const [mTitle, setMTitle] = useState('');
  const [mDate, setMDate] = useState(today);
  const [mKind, setMKind] = useState<MemoryItem['kind']>('milestone');
  const [mLocation, setMLocation] = useState('');
  const [mDesc, setMDesc] = useState('');
  const [mAttachmentId, setMAttachmentId] = useState<string | null>(null);

  // Wishlist
  const [wName, setWName] = useState('');
  const [wPrice, setWPrice] = useState('');
  const [wCat, setWCat] = useState('Tech');
  const [wLink, setWLink] = useState('');
  const [wSavId, setWSavId] = useState('');

  // Health
  const [hDate, setHDate] = useState(today);
  const [hSleep, setHSleep] = useState('');
  const [hExercise, setHExercise] = useState('');
  const [hWater, setHWater] = useState('');
  const [hWeight, setHWeight] = useState('');
  const [hSteps, setHSteps] = useState('');

  // Vault
  const [vaultUnlocked, setVaultUnlocked] = useState(!store.settings.appLockEnabled);
  const [vaultPinInput, setVaultPinInput] = useState('');
  const [vaultPinError, setVaultPinError] = useState('');
  const [vTitle, setVTitle] = useState('');
  const [vCat, setVCat] = useState('Reference');
  const [vContent, setVContent] = useState('');

  const filteredJournal = useMemo(() => {
    const q = jSearch.trim().toLowerCase();
    return store.journalEntries.filter(
      (j) =>
        !q ||
        j.title.toLowerCase().includes(q) ||
        j.content.toLowerCase().includes(q) ||
        j.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [store.journalEntries, jSearch]);

  const attachmentMap = new Map(store.attachments.map((a) => [a.id, a]));

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const att = store.addAttachment({
          name: file.name,
          mimeType: file.type || 'image/jpeg',
          sizeBytes: file.size,
          dataUrl: reader.result,
          linkedModule: 'memories',
          linkedId: 'pending',
        });
        setMAttachmentId(att.id);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store.settings.appLockPinHash) {
      setVaultUnlocked(true);
      return;
    }
    const h = await sha256Hex(vaultPinInput.trim());
    if (h === store.settings.appLockPinHash) {
      setVaultUnlocked(true);
      setVaultPinInput('');
      setVaultPinError('');
    } else {
      setVaultPinError('Incorrect PIN.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Life</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Private journal, life memories, wishlist, optional health logs, and personal vault
        </p>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {(
          [
            { id: 'journal', label: 'Journal' },
            { id: 'memories', label: 'Memories' },
            { id: 'wishlist', label: 'Wishlist' },
            { id: 'health', label: 'Health & Lifestyle' },
            { id: 'vault', label: 'Personal Vault' },
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

      {/* JOURNAL */}
      {tab === 'journal' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="bento-surface rounded-2xl p-5 lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold">Journal History</h2>
              <input
                type="text"
                value={jSearch}
                onChange={(e) => setJSearch(e.target.value)}
                placeholder="Search entries or tags..."
                className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-1.5 text-xs w-48"
              />
            </div>

            {filteredJournal.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-8 text-center">No journal entries yet.</p>
            ) : (
              <div className="divide-y bento-divider">
                {filteredJournal.map((j) => (
                  <div key={j.id} className="py-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold">{j.title}</p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {j.date} {j.mood ? `· Mood: ${j.mood}` : ''}{' '}
                          {j.tags.length > 0 ? `· ${j.tags.join(', ')}` : ''}
                        </p>
                      </div>
                      <button type="button" onClick={() => store.deleteJournalEntry(j.id)} className="text-rose-400 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                      {j.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!jContent.trim()) return;
              store.addJournalEntry({
                date: jDate,
                title: jTitle.trim() || `Entry — ${jDate}`,
                content: jContent.trim(),
                mood: jMood || null,
                tags: jTags
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              });
              setJTitle('');
              setJContent('');
              setJTags('');
            }}
            className="bento-surface rounded-2xl p-5 lg:col-span-5 space-y-3 h-fit"
          >
            <h2 className="text-sm font-bold">Write Today's Entry</h2>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={jDate} onChange={(e) => setJDate(e.target.value)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <select value={jMood} onChange={(e) => setJMood(e.target.value as JournalMood | '')} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                <option value="">Mood (optional)</option>
                <option value="great">Great</option>
                <option value="good">Good</option>
                <option value="neutral">Neutral</option>
                <option value="low">Low</option>
                <option value="stressed">Stressed</option>
              </select>
            </div>
            <input type="text" value={jTitle} onChange={(e) => setJTitle(e.target.value)} placeholder="Title" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm" />
            <textarea rows={6} required value={jContent} onChange={(e) => setJContent(e.target.value)} placeholder="Thoughts, reflections, Markdown notes..." className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm" />
            <input type="text" value={jTags} onChange={(e) => setJTags(e.target.value)} placeholder="Tags (comma-separated)" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
            <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold">Save Entry</button>
          </form>
        </div>
      )}

      {/* MEMORIES */}
      {tab === 'memories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4 h-fit">
            {store.memories.length === 0 ? (
              <div className="bento-surface rounded-2xl p-8 text-center text-xs text-[var(--text-muted)] sm:col-span-2">
                Capture trips, personal milestones, achievements, and offline photos.
              </div>
            ) : (
              store.memories.map((m) => {
                const att = m.attachmentId ? attachmentMap.get(m.attachmentId) : undefined;
                return (
                  <div key={m.id} className="bento-surface rounded-2xl overflow-hidden flex flex-col">
                    {att && (
                      <img
                        src={att.dataUrl}
                        alt={m.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-40 object-cover"
                      />
                    )}
                    <div className="p-4 space-y-1.5 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold">{m.title}</p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {m.kind} · {m.date} {m.location ? `· ${m.location}` : ''}
                          </p>
                        </div>
                        <button type="button" onClick={() => store.deleteMemory(m.id)} className="text-rose-400 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {m.description && <p className="text-xs text-[var(--text-secondary)]">{m.description}</p>}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!mTitle.trim()) return;
              store.addMemory({
                title: mTitle.trim(),
                date: mDate,
                kind: mKind,
                location: mLocation.trim(),
                description: mDesc.trim(),
                attachmentId: mAttachmentId,
              });
              setMTitle('');
              setMLocation('');
              setMDesc('');
              setMAttachmentId(null);
            }}
            className="bento-surface rounded-2xl p-5 lg:col-span-4 space-y-3 h-fit"
          >
            <h2 className="text-sm font-bold">Record Memory</h2>
            <input type="text" required value={mTitle} onChange={(e) => setMTitle(e.target.value)} placeholder="Title" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <select value={mKind} onChange={(e) => setMKind(e.target.value as MemoryItem['kind'])} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                <option value="milestone">Milestone</option>
                <option value="achievement">Achievement</option>
                <option value="trip">Trip</option>
                <option value="event">Event</option>
              </select>
            </div>
            <input type="text" value={mLocation} onChange={(e) => setMLocation(e.target.value)} placeholder="Location (optional)" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
            <textarea rows={3} value={mDesc} onChange={(e) => setMDesc(e.target.value)} placeholder="Story / notes..." className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-xs cursor-pointer hover:bg-[var(--bg-hover)]">
              <Upload className="w-3.5 h-3.5 text-emerald-500" />
              <span>{mAttachmentId ? 'Photo attached locally' : 'Attach local photo (optional)'}</span>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
            <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold">Save Memory</button>
          </form>
        </div>
      )}

      {/* WISHLIST */}
      {tab === 'wishlist' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="bento-surface rounded-2xl p-5 lg:col-span-8 space-y-3">
            <h2 className="text-base font-bold">Wishlist</h2>
            {store.wishlist.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-6">No wishlist items yet.</p>
            ) : (
              <div className="divide-y bento-divider">
                {store.wishlist.map((w) => (
                  <div key={w.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className={`text-sm font-semibold ${w.purchased ? 'line-through text-[var(--text-muted)]' : ''}`}>
                        {w.name}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {formatMoney(w.priceMinor, cur)} · {w.category} · {w.purchased ? 'Purchased' : 'Planned'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => store.updateWishlistItem(w.id, { purchased: !w.purchased })}
                        className="px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] text-xs font-medium"
                      >
                        {w.purchased ? 'Unmark' : 'Purchased'}
                      </button>
                      <button type="button" onClick={() => store.deleteWishlistItem(w.id)} className="text-rose-400 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!wName.trim()) return;
              store.addWishlistItem({
                name: wName.trim(),
                priceMinor: toMinor(wPrice),
                priority: 'medium',
                category: wCat,
                purchaseLink: wLink.trim(),
                targetDate: null,
                purchased: false,
                linkedSavingsId: wSavId || null,
                notes: '',
              });
              setWName('');
              setWPrice('');
              setWLink('');
            }}
            className="bento-surface rounded-2xl p-5 lg:col-span-4 space-y-3 h-fit"
          >
            <h2 className="text-sm font-bold">Add Wishlist Item</h2>
            <input type="text" required value={wName} onChange={(e) => setWName(e.target.value)} placeholder="Item name" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" value={wPrice} onChange={(e) => setWPrice(e.target.value)} placeholder={`Price (${cur})`} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <input type="text" value={wCat} onChange={(e) => setWCat(e.target.value)} placeholder="Category" className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
            </div>
            <input type="url" value={wLink} onChange={(e) => setWLink(e.target.value)} placeholder="Purchase link (optional)" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
            {store.savingsGoals.length > 0 && (
              <select value={wSavId} onChange={(e) => setWSavId(e.target.value)} className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs">
                <option value="">Link to savings goal (optional)</option>
                {store.savingsGoals.map((sg) => <option key={sg.id} value={sg.id}>{sg.name}</option>)}
              </select>
            )}
            <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold">Add Item</button>
          </form>
        </div>
      )}

      {/* HEALTH & LIFESTYLE */}
      {tab === 'health' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="bento-surface rounded-2xl p-5 lg:col-span-8 space-y-3">
            <div>
              <h2 className="text-base font-bold">Optional Health & Lifestyle Logs</h2>
              <p className="text-xs text-[var(--text-secondary)]">Private manual logs stored strictly on this device</p>
            </div>
            {store.healthLogs.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-6">No health measurements logged yet.</p>
            ) : (
              <div className="divide-y bento-divider">
                {store.healthLogs.map((h) => (
                  <div key={h.id} className="py-3 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <p className="font-semibold font-mono-num">{h.date}</p>
                      <p className="text-[var(--text-secondary)] font-mono-num">
                        {h.sleepHours ? `Sleep ${h.sleepHours}h · ` : ''}
                        {h.exerciseMinutes ? `Exercise ${h.exerciseMinutes}m · ` : ''}
                        {h.waterLiters ? `Water ${h.waterLiters}L · ` : ''}
                        {h.weightKg ? `Weight ${h.weightKg}kg · ` : ''}
                        {h.steps ? `Steps ${h.steps}` : ''}
                      </p>
                    </div>
                    <button type="button" onClick={() => store.deleteHealthLog(h.id)} className="text-rose-400 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              store.addHealthLog({
                date: hDate,
                sleepHours: hSleep ? Number(hSleep) : null,
                exerciseMinutes: hExercise ? Number(hExercise) : null,
                waterLiters: hWater ? Number(hWater) : null,
                weightKg: hWeight ? Number(hWeight) : null,
                steps: hSteps ? Number(hSteps) : null,
                notes: '',
              });
              setHSleep('');
              setHExercise('');
              setHWater('');
              setHWeight('');
              setHSteps('');
            }}
            className="bento-surface rounded-2xl p-5 lg:col-span-4 space-y-3 h-fit"
          >
            <h2 className="text-sm font-bold">Log Daily Metrics</h2>
            <input type="date" value={hDate} onChange={(e) => setHDate(e.target.value)} className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" step="0.5" value={hSleep} onChange={(e) => setHSleep(e.target.value)} placeholder="Sleep (hrs)" className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <input type="number" value={hExercise} onChange={(e) => setHExercise(e.target.value)} placeholder="Exercise (min)" className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <input type="number" step="0.2" value={hWater} onChange={(e) => setHWater(e.target.value)} placeholder="Water (L)" className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
              <input type="number" step="0.1" value={hWeight} onChange={(e) => setHWeight(e.target.value)} placeholder="Weight (kg)" className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
            </div>
            <input type="number" value={hSteps} onChange={(e) => setHSteps(e.target.value)} placeholder="Walking steps" className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono-num" />
            <button type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold">Save Log</button>
          </form>
        </div>
      )}

      {/* PERSONAL VAULT */}
      {tab === 'vault' && (
        <div className="bento-surface rounded-2xl p-5 space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--bg-elevated)] text-xs text-[var(--text-secondary)]">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              Store personal document references, policy numbers, and private notes here. Do not store bank passwords, card CVVs, or authentication secrets in plain records.
            </span>
          </div>

          {!vaultUnlocked ? (
            <form onSubmit={handleUnlockVault} className="max-w-xs space-y-3 py-4">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Lock className="w-4 h-4 text-emerald-500" />
                <span>Enter App PIN to view Vault</span>
              </div>
              <input
                type="password"
                inputMode="numeric"
                value={vaultPinInput}
                onChange={(e) => setVaultPinInput(e.target.value)}
                placeholder="Enter PIN"
                className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm font-mono-num"
              />
              {vaultPinError && <p className="text-xs text-rose-500">{vaultPinError}</p>}
              <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold">
                Unlock Vault
              </button>
            </form>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 divide-y bento-divider">
                {store.vaultEntries.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-6">No vault references stored.</p>
                ) : (
                  store.vaultEntries.map((v) => (
                    <div key={v.id} className="py-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{v.title}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{v.category}</p>
                        <p className="text-xs mt-1 whitespace-pre-line">{v.content}</p>
                      </div>
                      <button type="button" onClick={() => store.deleteVaultEntry(v.id)} className="text-rose-400 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!vTitle.trim() || !vContent.trim()) return;
                  store.addVaultEntry({ title: vTitle.trim(), category: vCat, content: vContent.trim() });
                  setVTitle('');
                  setVContent('');
                }}
                className="lg:col-span-5 space-y-3 p-4 rounded-xl bg-[var(--bg-elevated)] h-fit"
              >
                <h3 className="text-sm font-bold">Add Reference</h3>
                <input type="text" required value={vTitle} onChange={(e) => setVTitle(e.target.value)} placeholder="Title (e.g., Passport Reference)" className="w-full rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
                <input type="text" value={vCat} onChange={(e) => setVCat(e.target.value)} placeholder="Category" className="w-full rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
                <textarea rows={3} required value={vContent} onChange={(e) => setVContent(e.target.value)} placeholder="Reference details..." className="w-full rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 py-2 text-xs" />
                <button type="submit" className="w-full py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold">Save Reference</button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
