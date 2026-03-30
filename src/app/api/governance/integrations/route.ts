import { getSession } from '@/lib/auth';
import { supabaseQuery, supabaseInsert } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const filter = type ? `type=eq.${type}` : undefined;

    const integrations = await supabaseQuery('gov_integrations', 'GET', {
      order: 'service.asc',
      filter,
    });

    return Response.json({ integrations });
  } catch (err) {
    console.error('[governance/integrations] Error:', err);
    return Response.json({ error: 'Error al cargar integraciones' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const body = await request.json();
    const { service, type, projects, status, version, rate_limit, cost_monthly, notes } = body;

    if (!service || !type) {
      return Response.json({ error: 'service y type son requeridos' }, { status: 400 });
    }

    const result = await supabaseInsert('gov_integrations', {
      service,
      type,
      projects: projects || [],
      status: status || 'ok',
      version: version || null,
      rate_limit: rate_limit || null,
      cost_monthly: cost_monthly || null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    });

    return Response.json(result[0] || result, { status: 201 });
  } catch (err) {
    console.error('[governance/integrations] Error POST:', err);
    return Response.json({ error: 'Error al crear integración' }, { status: 500 });
  }
}
