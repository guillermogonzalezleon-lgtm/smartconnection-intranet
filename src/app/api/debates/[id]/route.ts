import { getSession } from '@/lib/auth';
import { supabaseQuery } from '@/lib/supabase';

// GET — Detalle del debate con mensajes y tensiones
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const { id } = await params;

    const [debates, messages, tensions, threads] = await Promise.all([
      supabaseQuery('debates', 'GET', { filter: `id=eq.${id}` }),
      supabaseQuery('debate_messages', 'GET', { filter: `debate_id=eq.${id}`, order: 'created_at.asc', limit: 500 }),
      supabaseQuery('debate_tensions', 'GET', { filter: `debate_id=eq.${id}`, order: 'created_at.desc', limit: 100 }),
      supabaseQuery('threads', 'GET', { filter: `debate_id=eq.${id}`, order: 'created_at.desc', limit: 50 }),
    ]);

    if (!debates.length) return Response.json({ error: 'Debate no encontrado' }, { status: 404 });

    return Response.json({ ...debates[0], messages, tensions, threads });
  } catch (err) {
    console.error('Error obteniendo debate:', err);
    return Response.json({ error: 'Error al obtener el debate' }, { status: 500 });
  }
}

// PATCH — Actualizar orquestación
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const allowed = ['orchestration_mode', 'active_agent_ids', 'temporal_enabled', 'temporal_config', 'status'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'Sin campos para actualizar' }, { status: 400 });
    }

    const result = await supabaseQuery('debates', 'PATCH', {
      filter: `id=eq.${id}`,
      body: updates,
    });

    return Response.json(result[0] || { success: true });
  } catch (err) {
    console.error('Error actualizando debate:', err);
    return Response.json({ error: 'Error al actualizar el debate' }, { status: 500 });
  }
}
