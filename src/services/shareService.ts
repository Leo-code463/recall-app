import { apiFetch } from './apiClient';

export interface ShareMeta {
  id: string;
  title: string;
  meetingDate: string;
  createdAt: string;
  read: boolean;
  ownerEmail: string;
  ownerName: string;
  recipientEmail: string;
  recipientName: string;
}

async function call<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error || 'Operazione non riuscita.');
  return data as T;
}

/**
 * Copia "pulita" della conversazione da inviare: toglie audio/blob/base64 e stringhe enormi,
 * così la condivisione resta leggera e non espone file pesanti.
 */
export function buildShareSnapshot(meeting: any): any {
  const SKIP_KEY = /(audio|blob|base64|file)/i;
  const MAX_STR = 100_000;
  const clean = (v: any, depth: number): any => {
    if (v === null || v === undefined) return undefined;
    if (typeof v === 'string') return v.length > MAX_STR ? undefined : v;
    if (typeof v === 'number' || typeof v === 'boolean') return v;
    if (depth > 8) return undefined;
    if (Array.isArray(v)) return v.map((x) => clean(x, depth + 1)).filter((x) => x !== undefined);
    if (typeof v === 'object') {
      const out: Record<string, any> = {};
      for (const [k, val] of Object.entries(v)) {
        if (SKIP_KEY.test(k)) continue;
        const c = clean(val, depth + 1);
        if (c !== undefined) out[k] = c;
      }
      return out;
    }
    return undefined;
  };
  return clean(meeting, 0) || {};
}

export const createShare = (friendEmail: string, meeting: any) =>
  call<{ share: ShareMeta }>('/api/shares', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ friendEmail, meeting: buildShareSnapshot(meeting) }),
  });

export const listReceivedShares = async (): Promise<ShareMeta[]> =>
  (await call<{ shares: ShareMeta[] }>('/api/shares/received')).shares || [];

export const listSentShares = async (): Promise<ShareMeta[]> =>
  (await call<{ shares: ShareMeta[] }>('/api/shares/sent')).shares || [];

export const getShare = (id: string) =>
  call<{ share: ShareMeta; snapshot: any }>(`/api/shares/${encodeURIComponent(id)}`);

export const deleteShare = async (id: string): Promise<void> => {
  await call(`/api/shares/${encodeURIComponent(id)}`, { method: 'DELETE' });
};
