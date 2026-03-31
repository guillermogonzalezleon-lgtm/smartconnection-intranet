import { getSession } from '@/lib/auth';
import { supabaseQuery, supabaseInsert } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const tokens = await supabaseQuery('gov_design_tokens', 'GET', {
      order: 'categoria.asc,nombre.asc',
    });

    return Response.json({ tokens });
  } catch (err) {
    console.error('[governance/design-tokens] Error:', err);
    return Response.json({ error: 'Error al cargar design tokens' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const body = await request.json();

    if (Array.isArray(body)) {
      const results = [];
      for (const token of body) {
        const r = await supabaseInsert('gov_design_tokens', {
          ...token,
          updated_at: new Date().toISOString(),
        });
        results.push(r[0] || r);
      }
      return Response.json(results, { status: 201 });
    }

    const { nombre, categoria, valor, descripcion } = body;
    if (!nombre || !categoria || !valor) {
      return Response.json({ error: 'nombre, categoria y valor son requeridos' }, { status: 400 });
    }

    const result = await supabaseInsert('gov_design_tokens', {
      nombre,
      categoria,
      valor,
      descripcion: descripcion || null,
      updated_at: new Date().toISOString(),
    });

    return Response.json(result[0] || result, { status: 201 });
  } catch (err) {
    console.error('[governance/design-tokens] Error POST:', err);
    return Response.json({ error: 'Error al crear design token' }, { status: 500 });
  }
}
