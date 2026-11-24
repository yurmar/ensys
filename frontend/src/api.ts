export type Block = Record<string, any>;
export type Field = {
  key: string; label: string; type: 'text' | 'textarea' | 'url' | 'svg' | 'bool' | 'group' | 'list' | 'strlist';
  fields?: Field[]; max?: number; required?: boolean;
};
export type Schema = { title: string; fields: Field[] };
export type Content = {
  blocks: Record<string, Block>;
  admin: boolean;
  schemas?: Record<string, Schema>;
  csrf?: string;
};

let csrf = '';
export const setCsrf = (t: string | undefined | null) => { csrf = t ?? ''; };

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch('/api' + path, {
    credentials: 'same-origin',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...init.headers },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Ошибка ${res.status}`);
  return json as T;
}

export const api = {
  content: () => call<Content>('/content'),
  login: (login: string, password: string) =>
    call<{ admin: boolean; csrf: string }>('/login', { method: 'POST', body: JSON.stringify({ login, password }) }),
  logout: () => call('/logout', { method: 'POST' }),
  saveBlock: (slug: string, data: Block) =>
    call<{ data: Block }>(`/blocks/${slug}`, { method: 'PUT', body: JSON.stringify({ data }) }),
  sendRequest: (payload: Record<string, string>) =>
    call('/requests', { method: 'POST', body: JSON.stringify(payload) }),
  requests: () => call<{ items: { id: number; name: string; phone: string; company: string; message: string; created_at: string }[] }>('/requests'),
};
