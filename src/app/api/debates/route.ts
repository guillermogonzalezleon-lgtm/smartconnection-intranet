import { getSession } from '@/lib/auth';
import { supabaseQuery, supabaseInsert } from '@/lib/supabase';

// POST — Crear debate
// GET — Listar debates
export async function POST(request: Request) {
  const session = await getSession();
  if (!session.valid) return new Response('No autorizado', { status: 401 });

  const body = await request.json();
  const { title, topic, active_agent_ids, orchestration_mode, temporal_enabled, temporal_config } = body;

  if (!title || !topic || !active_agent_ids?.length) {
    return new Response('Faltan campos requeridos (title, topic, active_agent_ids)', { status: 400 });
  }

  const result = await supabaseInsert('debates', {
    title,
    topic,
    active_agent_ids,
    orchestration_mode: orchestration_mode || 'tutti',
    temporal_enabled: temporal_enabled || false,
    temporal_config: temporal_config || {},
    created_by: session.user || 'admin',
  });

  return Response.json(result[0] || result, { status: 201 });
}

export async function GET() {
  const session = await getSession();
  if (!session.valid) return new Response('No autorizado', { status: 401 });

  const debates = await supabaseQuery('debates', 'GET', {
    order: 'created_at.desc',
    limit: 50,
  });

  return Response.json(debates);
}
