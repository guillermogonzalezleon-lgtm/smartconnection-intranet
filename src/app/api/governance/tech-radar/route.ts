import { getSession } from '@/lib/auth';
import { supabaseQuery, supabaseInsert } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const items = await supabaseQuery('gov_tech_radar', 'GET', {
      order: 'ring.asc,name.asc',
    });

    return Response.json({ items });
  } catch (err) {
    console.error('[governance/tech-radar] Error:', err);
    return Response.json({ error: 'Error al cargar Tech Radar' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const body = await request.json();
    const { name, ring, quadrant, description, moved } = body;

    if (!name || !ring || !quadrant) {
      return Response.json({ error: 'name, ring y quadrant son requeridos' }, { status: 400 });
    }

    const result = await supabaseInsert('gov_tech_radar', {
      name,
      ring,
      quadrant,
      description: description || null,
      moved: moved || 'none',
      updated_at: new Date().toISOString(),
    });

    return Response.json(result[0] || result, { status: 201 });
  } catch (err) {
    console.error('[governance/tech-radar] Error POST:', err);
    return Response.json({ error: 'Error al crear item de Tech Radar' }, { status: 500 });
  }
}
