import { getSession } from '@/lib/auth';
import { supabaseQuery } from '@/lib/supabase';

// PATCH — Aprobar/Rechazar hilo
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const { id } = await params;
    const { status } = await request.json();

    if (!['approved', 'rejected', 'merged', 'open'].includes(status)) {
      return Response.json({ error: 'Status inválido. Valores permitidos: approved, rejected, merged, open' }, { status: 400 });
    }

    const result = await supabaseQuery('threads', 'PATCH', {
      filter: `id=eq.${id}`,
      body: { status },
    });

    return Response.json(result[0] || { success: true });
  } catch (err) {
    console.error('Error actualizando estado del hilo:', err);
    return Response.json({ error: 'Error al actualizar el hilo' }, { status: 500 });
  }
}
