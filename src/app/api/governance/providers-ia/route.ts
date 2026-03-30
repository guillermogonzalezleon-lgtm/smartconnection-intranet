import { getSession } from '@/lib/auth';
import { supabaseQuery, supabaseInsert } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const providers = await supabaseQuery('gov_providers_ia', 'GET', {
      order: 'provider.asc,model.asc',
    });

    return Response.json({ providers });
  } catch (err) {
    console.error('[governance/providers-ia] Error:', err);
    return Response.json({ error: 'Error al cargar providers IA' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const body = await request.json();
    const { provider, model, use_case, latency_ms, cost_per_1m_tokens, quality_score, is_fallback } = body;

    if (!provider || !model) {
      return Response.json({ error: 'provider y model son requeridos' }, { status: 400 });
    }

    const result = await supabaseInsert('gov_providers_ia', {
      provider,
      model,
      use_case: use_case || null,
      latency_ms: latency_ms || null,
      cost_per_1m_tokens: cost_per_1m_tokens || null,
      quality_score: quality_score || null,
      is_fallback: is_fallback || false,
      updated_at: new Date().toISOString(),
    });

    return Response.json(result[0] || result, { status: 201 });
  } catch (err) {
    console.error('[governance/providers-ia] Error POST:', err);
    return Response.json({ error: 'Error al crear provider IA' }, { status: 500 });
  }
}
