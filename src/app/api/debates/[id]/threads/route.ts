import { getSession } from '@/lib/auth';
import { supabaseInsert } from '@/lib/supabase';

// POST — Crear hilo desde un mensaje del debate
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const { id } = await params;
    const { source_message_id, title } = await request.json();

    if (!source_message_id || !title?.trim()) {
      return Response.json({ error: 'source_message_id y title son requeridos' }, { status: 400 });
    }

    if (title.trim().length > 200) {
      return Response.json({ error: 'El título no puede superar los 200 caracteres' }, { status: 400 });
    }

    const result = await supabaseInsert('threads', {
      debate_id: id,
      source_message_id,
      title: title.trim(),
      created_by: session.user || 'admin',
    });

    return Response.json(result[0] || result, { status: 201 });
  } catch (err) {
    console.error('Error creando hilo:', err);
    return Response.json({ error: 'Error al crear el hilo' }, { status: 500 });
  }
}
