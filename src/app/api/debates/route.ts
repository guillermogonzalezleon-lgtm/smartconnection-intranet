import { getSession } from '@/lib/auth';
import { supabaseQuery, supabaseInsert } from '@/lib/supabase';

// POST — Crear debate
// GET — Listar debates
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const body = await request.json();
    const { title, topic, active_agent_ids, orchestration_mode, temporal_enabled, temporal_config } = body;

    if (!title || !topic || !active_agent_ids?.length) {
      return Response.json({ error: 'Faltan campos requeridos (title, topic, active_agent_ids)' }, { status: 400 });
    }

    if (title.length > 200) {
      return Response.json({ error: 'El título no puede superar los 200 caracteres' }, { status: 400 });
    }

    if (topic.length > 5000) {
      return Response.json({ error: 'El tema no puede superar los 5000 caracteres' }, { status: 400 });
    }

    const result = await supabaseInsert('debates', {
      title: title.trim(),
      topic: topic.trim(),
      active_agent_ids,
      orchestration_mode: orchestration_mode || 'tutti',
      temporal_enabled: temporal_enabled || false,
      temporal_config: temporal_config || {},
      created_by: session.user || 'admin',
    });

    console.info('[debates] Debate creado:', { id: result[0]?.id, title: title.trim(), agents: active_agent_ids.length, mode: orchestration_mode || 'tutti' });
    return Response.json(result[0] || result, { status: 201 });
  } catch (err) {
    console.error('[debates] Error creando debate:', err);
    return Response.json({ error: 'Error al crear el debate' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const debates = await supabaseQuery('debates', 'GET', {
      order: 'created_at.desc',
      limit: 50,
    });

    return Response.json(debates);
  } catch (err) {
    console.error('Error listando debates:', err);
    return Response.json({ error: 'Error al obtener debates' }, { status: 500 });
  }
}
