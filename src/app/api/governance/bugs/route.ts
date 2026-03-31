import { getSession } from '@/lib/auth';
import { supabaseQuery, supabaseInsert } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const { searchParams } = new URL(request.url);
    const proyecto = searchParams.get('proyecto');
    const severidad = searchParams.get('severidad');
    const status = searchParams.get('status');

    let filter: string | undefined;
    if (proyecto) filter = `proyecto=eq.${proyecto}`;
    else if (severidad) filter = `severidad=eq.${severidad}`;
    else if (status) filter = `status=eq.${status}`;

    const bugs = await supabaseQuery('gov_bugs', 'GET', {
      order: 'created_at.desc',
      filter,
    });

    return Response.json({ bugs });
  } catch (err) {
    console.error('[governance/bugs] Error:', err);
    return Response.json({ error: 'Error al cargar bugs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const body = await request.json();

    if (Array.isArray(body)) {
      const results = [];
      for (const bug of body) {
        const r = await supabaseInsert('gov_bugs', {
          ...bug,
          updated_at: new Date().toISOString(),
        });
        results.push(r[0] || r);
      }
      return Response.json(results, { status: 201 });
    }

    const { titulo, proyecto, severidad, persona, status, asignado, descripcion } = body;
    if (!titulo || !severidad) {
      return Response.json({ error: 'titulo y severidad son requeridos' }, { status: 400 });
    }

    const result = await supabaseInsert('gov_bugs', {
      titulo,
      proyecto: proyecto || null,
      severidad,
      persona: persona || null,
      status: status || 'abierto',
      asignado: asignado || null,
      descripcion: descripcion || null,
      updated_at: new Date().toISOString(),
    });

    return Response.json(result[0] || result, { status: 201 });
  } catch (err) {
    console.error('[governance/bugs] Error POST:', err);
    return Response.json({ error: 'Error al crear bug' }, { status: 500 });
  }
}
