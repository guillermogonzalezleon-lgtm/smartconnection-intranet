import { getSession } from '@/lib/auth';
import { supabaseQuery, supabaseInsert } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const costs = await supabaseQuery('gov_infra_costs', 'GET', {
      order: 'mes.desc,servicio.asc',
    });

    return Response.json({ costs });
  } catch (err) {
    console.error('[governance/infra-costs] Error:', err);
    return Response.json({ error: 'Error al cargar costos de infra' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const body = await request.json();

    if (Array.isArray(body)) {
      const results = [];
      for (const cost of body) {
        const r = await supabaseInsert('gov_infra_costs', {
          ...cost,
          updated_at: new Date().toISOString(),
        });
        results.push(r[0] || r);
      }
      return Response.json(results, { status: 201 });
    }

    const { servicio, categoria, mes, costo_usd, notas } = body;
    if (!servicio || !mes || costo_usd === undefined) {
      return Response.json({ error: 'servicio, mes y costo_usd son requeridos' }, { status: 400 });
    }

    const result = await supabaseInsert('gov_infra_costs', {
      servicio,
      categoria: categoria || 'otros',
      mes,
      costo_usd,
      notas: notas || null,
      updated_at: new Date().toISOString(),
    });

    return Response.json(result[0] || result, { status: 201 });
  } catch (err) {
    console.error('[governance/infra-costs] Error POST:', err);
    return Response.json({ error: 'Error al crear registro de costo' }, { status: 500 });
  }
}
