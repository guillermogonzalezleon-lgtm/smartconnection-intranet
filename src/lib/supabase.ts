const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

export async function supabaseQuery<T = Record<string, unknown>>(
  table: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  options: { body?: Record<string, unknown>; filter?: string; order?: string; limit?: number } = {}
): Promise<T[]> {
  const params = new URLSearchParams();
  if (options.order) params.set('order', options.order);
  if (options.limit) params.set('limit', String(options.limit));
  const filterPart = options.filter ? `&${options.filter}` : '';
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}${filterPart}`;

  const headers: Record<string, string> = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };
  if (method === 'POST') headers['Prefer'] = 'return=representation';

  const res = await fetch(url, { method, headers, body: options.body ? JSON.stringify(options.body) : undefined, cache: 'no-store' });
  if (!res.ok) throw new Error(`Supabase ${method} ${table}: ${res.status}`);
  if (res.status === 204) return [];
  return res.json();
}

export async function supabaseInsert<T = Record<string, unknown>>(table: string, data: Record<string, unknown>): Promise<T[]> {
  return supabaseQuery<T>(table, 'POST', { body: data });
}
