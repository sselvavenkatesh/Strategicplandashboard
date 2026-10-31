const apiBase = String(import.meta.env.VITE_API_BASE_URL || import.meta.env.BASE_URL.replace(/\/$/, '')).replace(/\/$/, '');
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type','application/json');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), path.includes('/ai/') ? 120000 : 30000);
  try {
    const response = await fetch(apiBase + path, {...init, headers, signal: controller.signal, cache: 'no-store'});
    if (!response.ok) {
      let message = `API request failed (${response.status}).`;
      try {const body = await response.json(); if (typeof body.detail === 'string') message = body.detail} catch { /* retain safe status */ }
      throw new Error(message);
    }
    if (response.status === 204) return undefined as T;
    const type = response.headers.get('Content-Type') ?? '';
    if (!type.includes('application/json')) throw new Error('The API returned a sign-in page instead of data.');
    const body = await response.json();
    if (body && typeof body.detail === 'string' && !body.answer) throw new Error(body.detail);
    return body as T;
  } finally {window.clearTimeout(timeout)}
}
export const apiGet = <T>(path: string) => apiRequest<T>(path);
export const apiPost = <T>(path: string, body: unknown) => apiRequest<T>(path, {method:'POST',body:JSON.stringify(body)});
