import { getSession } from '@/lib/auth';
import { supabaseQuery, supabaseInsert } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const sprints = await supabaseQuery('gov_sprints', 'GET', {
      order: 'created_at.desc',
    });

    const items = await supabaseQuery('gov_sprint_items', 'GET', {
      order: 'created_at.asc',
    });

    return Response.json({ sprints, items });
  } catch (err) {
    console.error('[governance/sprints] Error:', err);
    return Response.json({ error: 'Error al cargar sprints' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const body = await request.json();

    // Si viene un array, asumimos que son sprint items
    if (Array.isArray(body)) {
      const results = [];
      for (const item of body) {
        const r = await supabaseInsert('gov_sprint_items', {
          ...item,
          updated_at: new Date().toISOString(),
        });
        results.push(r[0] || r);
      }
      return Response.json(results, { status: 201 });
    }

    // Sprint individual
    const { title, north_star, start_date, end_date, status } = body;
    if (!title) {
      return Response.json({ error: 'title es requerido' }, { status: 400 });
    }

    const result = await supabaseInsert('gov_sprints', {
      title,
      north_star: north_star || null,
      start_date: start_date || null,
      end_date: end_date || null,
      status: status || 'active',
      updated_at: new Date().toISOString(),
    });

    return Response.json(result[0] || result, { status: 201 });
  } catch (err) {
    console.error('[governance/sprints] Error POST:', err);
    return Response.json({ error: 'Error al crear sprint' }, { status: 500 });
  }
}
