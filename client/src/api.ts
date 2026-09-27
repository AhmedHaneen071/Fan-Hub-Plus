export async function api<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${url}`, { credentials: 'include', ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data as T;
}
