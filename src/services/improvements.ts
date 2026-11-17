/**
 * Improvements / User Requests service.
 *
 * A request written in the app is published straight into the public BENTO
 * repository as a GitHub issue labelled `user-request`. A repository workflow
 * then mirrors every such issue into `user-requests/` so the request list is
 * versioned inside the repo itself.
 *
 * No token ever ships in the client: submissions use GitHub's own issue form,
 * so the person submitting signs in with their own account.
 */

export type ImprovementKind = 'bug' | 'ui' | 'feature' | 'other';

export interface ImprovementRequest {
  id: string;
  title: string;
  problem: string;
  need: string;
  kind: ImprovementKind;
  name: string;
  contact: string;
  createdAt: string;
  issueUrl: string;
}

export interface CommunityRequest {
  number: number;
  title: string;
  url: string;
  author: string;
  createdAt: string;
  labels: string[];
}

export const BENTO_REPO_OWNER = 'jiteshoffice1234-star';
export const BENTO_REPO_NAME = 'BENTO-2.0';
export const BENTO_REPO_URL = `https://github.com/${BENTO_REPO_OWNER}/${BENTO_REPO_NAME}`;
export const BENTO_ISSUES_URL = `${BENTO_REPO_URL}/issues`;
export const USER_REQUEST_LABEL = 'user-request';

export const IMPROVEMENT_KIND_LABELS: Record<ImprovementKind, string> = {
  bug: 'Something is broken',
  ui: 'Looks or feels wrong',
  feature: 'Missing feature',
  other: 'Something else',
};

const STORAGE_KEY = 'bento.improvementRequests.v1';

export function loadRequests(): ImprovementRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r): r is ImprovementRequest => Boolean(r && typeof r.id === 'string'))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

function persist(requests: ImprovementRequest[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch {
    /* storage full or blocked — requests stay in memory for this session */
  }
}

export function saveRequest(request: ImprovementRequest): ImprovementRequest[] {
  const next = [request, ...loadRequests().filter((r) => r.id !== request.id)];
  persist(next);
  return next;
}

export function deleteRequest(id: string): ImprovementRequest[] {
  const next = loadRequests().filter((r) => r.id !== id);
  persist(next);
  return next;
}

export function buildIssueTitle(request: Pick<ImprovementRequest, 'title'>): string {
  const clean = request.title.trim().replace(/\s+/g, ' ');
  return `[Improvement] ${clean}`;
}

export function buildIssueBody(
  request: Omit<ImprovementRequest, 'id' | 'issueUrl'>
): string {
  const lines = [
    '### Problem faced',
    request.problem.trim() || '_Not provided_',
    '',
    '### What I need',
    request.need.trim() || '_Not provided_',
    '',
    '---',
    `**Category:** ${IMPROVEMENT_KIND_LABELS[request.kind]}`,
    `**Submitted from:** BENTO app → Improvements`,
    `**Submitted on:** ${request.createdAt}`,
  ];
  if (request.name.trim()) lines.push(`**Submitted by:** ${request.name.trim()}`);
  if (request.contact.trim()) lines.push(`**Contact:** ${request.contact.trim()}`);
  lines.push('', '<!-- bento-user-request -->');
  return lines.join('\n');
}

export function buildIssueUrl(
  request: Omit<ImprovementRequest, 'id' | 'issueUrl'>
): string {
  const params = new URLSearchParams({
    title: buildIssueTitle(request),
    body: buildIssueBody(request),
    labels: USER_REQUEST_LABEL,
  });
  return `${BENTO_ISSUES_URL}/new?${params.toString()}`;
}

export function formatRequestForCopy(
  request: Omit<ImprovementRequest, 'id' | 'issueUrl'>
): string {
  return [
    buildIssueTitle(request),
    '',
    buildIssueBody(request),
  ].join('\n');
}

/** Reads the public request list straight from the repository. */
export async function fetchCommunityRequests(limit = 10): Promise<CommunityRequest[]> {
  const url = `https://api.github.com/repos/${BENTO_REPO_OWNER}/${BENTO_REPO_NAME}/issues?state=open&labels=${USER_REQUEST_LABEL}&per_page=${limit}`;
  const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
  const data = (await res.json()) as Array<{
    number: number;
    title: string;
    html_url: string;
    created_at: string;
    pull_request?: unknown;
    user?: { login?: string } | null;
    labels?: Array<{ name?: string } | string>;
  }>;
  return data
    .filter((item) => !item.pull_request)
    .map((item) => ({
      number: item.number,
      title: item.title,
      url: item.html_url,
      author: item.user?.login ?? 'unknown',
      createdAt: item.created_at,
      labels: (item.labels ?? []).map((l) => (typeof l === 'string' ? l : l.name ?? '')),
    }));
}
