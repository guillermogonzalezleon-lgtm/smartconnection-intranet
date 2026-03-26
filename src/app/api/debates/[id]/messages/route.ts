import { getSession } from '@/lib/auth';
import { supabaseInsert } from '@/lib/supabase';

// POST — Intervención del usuario en el debate
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.valid) return new Response('No autorizado', { status: 401 });

  const { id } = await params;
  const { content } = await request.json();

  if (!content?.trim()) {
    return new Response('Contenido requerido', { status: 400 });
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
}
