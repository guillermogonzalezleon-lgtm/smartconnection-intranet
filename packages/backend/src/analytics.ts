import { supabaseInsert } from './supabase';

export async function trackEvent(page: string, event: string, source?: string, detail?: string) {
  return supabaseInsert('analytics', {
    page,
    event,
    source: source || 'intranet',
    detail: detail || '',
    user_agent: '',
    created_at: new Date().toISOString(),
  }).catch(() => {});
}
