import { getSession } from '@/lib/auth';
import { supabaseQuery, supabaseInsert } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section') || 'all';

    const result: Record<string, unknown> = {};

    if (section === 'all' || section === 'kaizen') {
      result.kaizen = await supabaseQuery('kaizen_audits', 'GET', {
        order: 'created_at.desc', limit: 20,
      });
    }

    if (section === 'all' || section === 'andon') {
      result.andon = await supabaseQuery('andon_signals', 'GET', {
        order: 'project.asc,area.asc',
      });
    }

    if (section === 'all' || section === 'ooda') {
      result.ooda = await supabaseQuery('ooda_decisions', 'GET', {
        order: 'created_at.desc', limit: 30,
      });
    }

    return Response.json(result);
  } catch (err) {
    console.error('[ops-center] Error:', err);
    return Response.json({ error: 'Error al cargar Ops Center' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'kaizen_create': {
        const audits = await supabaseQuery('kaizen_audits', 'GET', { order: 'audit_number.desc', limit: 1 });
        const nextNumber = ((audits[0] as Record<string, unknown>)?.audit_number as number || 0) + 1;
        const result = await supabaseInsert('kaizen_audits', { ...data, audit_number: nextNumber });
        return Response.json(result[0] || result, { status: 201 });
      }

      case 'andon_update': {
        const { project, area, status, score, detail } = data;
        if (!project || !area) return Response.json({ error: 'project y area requeridos' }, { status: 400 });
        // Upsert: try update first, then insert
        const existing = await supabaseQuery('andon_signals', 'GET', {
          filter: `project=eq.${project}&area=eq.${area}`,
        });
        if (existing.length > 0) {
          await supabaseQuery('andon_signals', 'PATCH', {
            filter: `project=eq.${project}&area=eq.${area}`,
            body: { status, score, detail, last_checked: new Date().toISOString() },
          });
          return Response.json({ updated: true });
        }
        const result = await supabaseInsert('andon_signals', { project, area, status, score, detail });
        return Response.json(result[0] || result, { status: 201 });
      }

      case 'ooda_create': {
        const result = await supabaseInsert('ooda_decisions', data);
        return Response.json(result[0] || result, { status: 201 });
      }

      default:
        return Response.json({ error: 'Acción no reconocida' }, { status: 400 });
    }
  } catch (err) {
    console.error('[ops-center] Error POST:', err);
    return Response.json({ error: 'Error en Ops Center' }, { status: 500 });
  }
}
