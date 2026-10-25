import type { Digest, Message, Notification, Preferences, RuntimeStatus, Task } from './types';

const API_BASE = '/api/v1';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  } catch (err: unknown) {
    throw new Error(
      err instanceof Error
        ? `Cannot reach local backend: ${err.message}`
        : 'Cannot reach local backend on port 8080'
    );
  }

  const text = await res.text();
  let json: any = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      // not valid JSON
    }
  }

  if (!res.ok) {
    const errorMsg =
      json?.error?.message ||
      (res.status === 502 || res.status === 504
        ? 'Local backend on port 8080 is unreachable. Ensure snoozebox is running.'
        : `Server returned status ${res.status}`);
    throw new Error(errorMsg);
  }

  if (json?.error) {
    throw new Error(json.error?.message || 'Server returned an error');
  }

  if (!json && res.status !== 204) {
    throw new Error('Local backend returned an empty response. Ensure snoozebox is running on port 8080.');
  }

  return json?.data;
}

export const api = {
  getRuntime: () => fetchJSON<RuntimeStatus>(`${API_BASE}/runtime`),

  getMessages: (limit = 30, offset = 0) =>
    fetchJSON<{ messages: Message[]; count: number }>(`${API_BASE}/messages?limit=${limit}&offset=${offset}`),

  getMessage: (id: string) =>
    fetchJSON<Message>(`${API_BASE}/messages/${id}`),

  createMessage: (msg: { from_address: string; subject: string; body_text: string; thread_id?: string }) =>
    fetchJSON<Message>(`${API_BASE}/messages`, {
      method: 'POST',
      body: JSON.stringify(msg),
    }),

  analyzeMessage: (id: string) =>
    fetchJSON<unknown>(`${API_BASE}/messages/${id}/analyze`, { method: 'POST' }),

  analyzeAll: () =>
    fetchJSON<{ processed_count: number }>(`${API_BASE}/analyze/all`, { method: 'POST' }),

  getTasks: (status?: string) => {
    const q = status ? `?status=${status}` : '';
    return fetchJSON<{ tasks: Task[]; count: number }>(`${API_BASE}/tasks${q}`);
  },

  getTask: (id: string) =>
    fetchJSON<Task>(`${API_BASE}/tasks/${id}`),

  updateTask: (id: string, updates: Partial<Task>) =>
    fetchJSON<Task>(`${API_BASE}/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  snoozeTask: (id: string, until: string) =>
    fetchJSON<Task>(`${API_BASE}/tasks/${id}/snooze`, {
      method: 'POST',
      body: JSON.stringify({ until }),
    }),

  syncAttentionDebt: () =>
    fetchJSON<{ synced_count: number; total_tasks: number }>(`${API_BASE}/attention/sync`, { method: 'POST' }),

  clearFixtures: () =>
    fetchJSON<{ status: string; message: string; digest: Digest }>(`${API_BASE}/fixtures/clear`, {
      method: 'POST',
    }),

  getDigest: (date?: string) => {
    const q = date ? `?date=${date}` : '';
    return fetchJSON<Digest>(`${API_BASE}/digest${q}`);
  },

  generateDigest: () =>
    fetchJSON<Digest>(`${API_BASE}/digest/generate`, { method: 'POST' }),

  getNotifications: () =>
    fetchJSON<{ notifications: Notification[]; count: number }>(`${API_BASE}/notifications`),

  getSettings: () =>
    fetchJSON<Preferences>(`${API_BASE}/settings`),

  updateSettings: (settings: Partial<Preferences>) =>
    fetchJSON<Preferences>(`${API_BASE}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  // Gmail OAuth2 & Sync API
  getGmailStatus: () =>
    fetchJSON<{ authorized: boolean; creds_present: boolean; message: string }>(`${API_BASE}/gmail/status`),

  getGmailAuth: () =>
    fetchJSON<{ auth_url?: string; already_authorized?: boolean; instructions?: string }>(`${API_BASE}/gmail/auth`),

  exchangeGmailCode: (code: string) =>
    fetchJSON<{ authorized: boolean; message: string }>(`${API_BASE}/gmail/exchange`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  syncGmail: (maxResults = 30) =>
    fetchJSON<{ synced_count: number; analyzed_count: number; attention_tasks: number; message: string }>(
      `${API_BASE}/gmail/sync`,
      {
        method: 'POST',
        body: JSON.stringify({ max_results: maxResults }),
      }
    ),
};
