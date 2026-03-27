import { getSession } from '@/lib/auth';
import { supabaseInsert } from '@/lib/supabase';

// POST — Intervención del usuario en el debate
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const { id } = await params;
    const { content } = await request.json();

    if (!content?.trim()) {
      return Response.json({ error: 'Contenido requerido' }, { status: 400 });
    }

    if (content.trim().length > 2000) {
      return Response.json({ error: 'El contenido no puede superar los 2000 caracteres' }, { status: 400 });
    }

    const result = await supabaseInsert('debate_messages', {
      debate_id: id,
      agent_id: 'user',
      agent_name: session.user || 'Usuario',
      content: content.trim(),
      role: 'user',
      tokens_used: 0,
    });

    return Response.json(result[0] || result, { status: 201 });
  } catch (err) {
    console.error('Error guardando mensaje del debate:', err);
    return Response.json({ error: 'Error al guardar el mensaje' }, { status: 500 });
  }
}
