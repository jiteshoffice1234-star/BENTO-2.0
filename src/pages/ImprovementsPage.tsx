import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Lightbulb,
  Loader2,
  Send,
  Trash2,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import {
  BENTO_ISSUES_URL,
  BENTO_REPO_URL,
  CommunityRequest,
  IMPROVEMENT_KIND_LABELS,
  ImprovementKind,
  ImprovementRequest,
  buildIssueUrl,
  deleteRequest,
  fetchCommunityRequests,
  formatRequestForCopy,
  loadRequests,
  saveRequest,
} from '../services/improvements';

const KINDS: ImprovementKind[] = ['bug', 'ui', 'feature', 'other'];

export const ImprovementsPage: React.FC = () => {
  const [kind, setKind] = useState<ImprovementKind>('bug');
  const [title, setTitle] = useState('');
  const [problem, setProblem] = useState('');
  const [need, setNeed] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState<ImprovementRequest | null>(null);
  const [copied, setCopied] = useState(false);
  const [requests, setRequests] = useState<ImprovementRequest[]>([]);

  const [community, setCommunity] = useState<CommunityRequest[]>([]);
  const [communityState, setCommunityState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    setRequests(loadRequests());
    let cancelled = false;
    fetchCommunityRequests(10)
      .then((list) => {
        if (cancelled) return;
        setCommunity(list);
        setCommunityState('ready');
      })
      .catch(() => {
        if (!cancelled) setCommunityState('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const draft = useMemo(
    () => ({
      title,
      problem,
      need,
      kind,
      name,
      contact,
      createdAt: new Date().toISOString(),
    }),
    [title, problem, need, kind, name, contact]
  );

  const resetForm = () => {
    setTitle('');
    setProblem('');
    setNeed('');
    setContact('');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !problem.trim() || !need.trim()) {
      setError('Add a short title, the problem you faced, and what you need.');
      return;
    }
    const request: ImprovementRequest = {
      ...draft,
      id: uuidv4(),
      issueUrl: buildIssueUrl(draft),
    };
    setRequests(saveRequest(request));
    setSubmitted(request);
    setError('');
    window.open(request.issueUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = async (request: ImprovementRequest) => {
    try {
      await navigator.clipboard.writeText(
        formatRequestForCopy({
          title: request.title,
          problem: request.problem,
          need: request.need,
          kind: request.kind,
          name: request.name,
          contact: request.contact,
          createdAt: request.createdAt,
        })
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Improvements</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Tell us the problem you faced and what you need. Your request is published to the public{' '}
            user request board in the BENTO repository.
          </p>
        </div>
        <a
          href={BENTO_ISSUES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] hover:bg-[var(--bg-hover)] text-xs font-semibold whitespace-nowrap shrink-0"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Public request board</span>
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <form onSubmit={handleSubmit} className="bento-surface rounded-2xl p-5 lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-accent" />
            <h2 className="text-base font-bold">Report a problem or request a need</h2>
          </div>

          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1" htmlFor="imp-title">
              Short title
            </label>
            <input
              id="imp-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Budget tab resets when I switch accounts"
              className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3.5 py-2 text-sm"
            />
          </div>

          <div>
            <span className="block text-xs text-[var(--text-secondary)] mb-1">What kind of request is this?</span>
            <div className="flex flex-wrap gap-1.5">
              {KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    kind === k
                      ? 'bg-accent'
                      : 'bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {IMPROVEMENT_KIND_LABELS[k]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1" htmlFor="imp-problem">
              Problem you faced
            </label>
            <textarea
              id="imp-problem"
              required
              rows={4}
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="What happened, where in the app, and what you expected instead…"
              className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3.5 py-2 text-sm resize-y"
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1" htmlFor="imp-need">
              What you need
            </label>
            <textarea
              id="imp-need"
              required
              rows={3}
              value={need}
              onChange={(e) => setNeed(e.target.value)}
              placeholder="The outcome you want — a fix, a new screen, a different flow…"
              className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3.5 py-2 text-sm resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1" htmlFor="imp-name">
                Your name (optional)
              </label>
              <input
                id="imp-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jitesh"
                className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1" htmlFor="imp-contact">
                Contact or GitHub handle (optional)
              </label>
              <input
                id="imp-contact"
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="@username or email"
                className="w-full rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-3 py-2 text-sm"
              />
            </div>
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent text-xs font-semibold"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send to BENTO repo</span>
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-2.5 rounded-xl text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            >
              Clear
            </button>
          </div>

          {submitted && (
            <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-accent space-y-2">
              <p className="text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                Request prepared
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                GitHub opened in a new tab with your request pre-filled. Press{' '}
                <strong>Submit new issue</strong> there to publish it publicly. Your copy is saved on this device too.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={submitted.issueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-xs font-semibold"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open GitHub issue</span>
                </a>
                <button
                  type="button"
                  onClick={() => void handleCopy(submitted)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-xs font-medium"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copied ? 'Copied' : 'Copy request'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSubmitted(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-[var(--text-secondary)]"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </form>

        <div className="lg:col-span-5 space-y-5">
          <div className="bento-surface rounded-2xl p-5 space-y-3">
            <h2 className="text-base font-bold">How your request travels</h2>
            <ol className="space-y-2 text-xs text-[var(--text-secondary)] list-decimal list-inside">
              <li>You describe the problem and the need here.</li>
              <li>It is filed as a public issue labelled <span className="font-mono-num">user-request</span> in the repo.</li>
              <li>A repo workflow copies it into <span className="font-mono-num">user-requests/</span> as a versioned file.</li>
              <li>Requests get reviewed, the app is updated, and a new APK is built.</li>
            </ol>
            <a
              href={`${BENTO_REPO_URL}/tree/main/user-requests`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              <span>Browse the request folder</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="bento-surface rounded-2xl p-5 space-y-3">
            <h2 className="text-base font-bold">Your submissions</h2>
            {requests.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                Nothing sent from this device yet. Submitted requests appear here with their GitHub link.
              </p>
            ) : (
              <div className="divide-y bento-divider">
                {requests.map((r) => (
                  <div key={r.id} className="py-2.5 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{r.title}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {IMPROVEMENT_KIND_LABELS[r.kind]} · {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={r.issueUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open request on GitHub"
                        className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-accent"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => setRequests(deleteRequest(r.id))}
                        aria-label="Remove from this device"
                        className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bento-surface rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold">Public user requests</h2>
          <span className="text-[11px] text-[var(--text-muted)]">
            Live from github.com
          </span>
        </div>
        {communityState === 'loading' && (
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Loading requests…
          </p>
        )}
        {communityState === 'error' && (
          <p className="text-xs text-[var(--text-muted)]">
            Could not reach GitHub right now. Open the{' '}
            <a href={BENTO_ISSUES_URL} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              request board
            </a>{' '}
            directly.
          </p>
        )}
        {communityState === 'ready' && community.length === 0 && (
          <p className="text-xs text-[var(--text-muted)]">
            No open requests yet — yours would be the first.
          </p>
        )}
        {communityState === 'ready' && community.length > 0 && (
          <div className="divide-y bento-divider">
            {community.map((c) => (
              <a
                key={c.number}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 flex items-center justify-between gap-3 hover:bg-[var(--bg-hover)]/40 rounded-lg px-1 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{c.title}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    #{c.number} · @{c.author}
                  </p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
