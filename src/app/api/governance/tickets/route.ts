import { getSession } from '@/lib/auth';
import { supabaseQuery, supabaseInsert } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const severidad = searchParams.get('severidad');

    let filter: string | undefined;
    if (status) filter = `status=eq.${status}`;
    else if (severidad) filter = `severidad=eq.${severidad}`;

    const tickets = await supabaseQuery('gov_customer_tickets', 'GET', {
      order: 'created_at.desc',
      filter,
    });

    return Response.json({ tickets });
  } catch (err) {
    console.error('[governance/tickets] Error:', err);
    return Response.json({ error: 'Error al cargar tickets' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const body = await request.json();

    if (Array.isArray(body)) {
      const results = [];
      for (const ticket of body) {
        const r = await supabaseInsert('gov_customer_tickets', {
          ...ticket,
          updated_at: new Date().toISOString(),
        });
        results.push(r[0] || r);
      }
      return Response.json(results, { status: 201 });
    }

    const { cliente, severidad, canal, status, sla_hours, resolucion_hours, descripcion } = body;
    if (!cliente || !severidad) {
      return Response.json({ error: 'cliente y severidad son requeridos' }, { status: 400 });
    }

    const result = await supabaseInsert('gov_customer_tickets', {
      cliente,
      severidad,
      canal: canal || 'email',
      status: status || 'abierto',
      sla_hours: sla_hours || null,
      resolucion_hours: resolucion_hours || null,
      descripcion: descripcion || null,
      updated_at: new Date().toISOString(),
    });

    return Response.json(result[0] || result, { status: 201 });
  } catch (err) {
    console.error('[governance/tickets] Error POST:', err);
    return Response.json({ error: 'Error al crear ticket' }, { status: 500 });
  }
}
