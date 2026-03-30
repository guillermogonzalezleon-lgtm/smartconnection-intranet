import { getSession } from '@/lib/auth';
import { supabaseQuery } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const agent = searchParams.get('agent');

    // Construir filtros
    const filters: string[] = [];
    if (category) filters.push(`category=eq.${category}`);
    if (agent) filters.push(`owner_agent=eq.${agent}`);
    const filter = filters.length ? filters.join('&') : undefined;

    const docs = await supabaseQuery('governance_documents', 'GET', {
      order: 'category.asc,title.asc',
      filter,
    });

    // Si se pidió por agente, incluir también docs donde tiene acceso de lectura
    if (agent) {
      const accessEntries = await supabaseQuery<{ document_slug: string }>('governance_access', 'GET', {
        filter: `agent=eq.${agent}&access_type=eq.reads`,
      });
      if (accessEntries.length > 0) {
        const slugs = accessEntries.map(a => a.document_slug);
        const slugFilter = `slug=in.(${slugs.join(',')})`;
        const readDocs = await supabaseQuery('governance_documents', 'GET', {
          filter: slugFilter,
          order: 'category.asc,title.asc',
        });
        return Response.json({ owned: docs, reads: readDocs });
      }
    }

    return Response.json({ documents: docs });
  } catch (err) {
    console.error('[governance/documents] Error:', err);
    return Response.json({ error: 'Error al cargar documentos de governance' }, { status: 500 });
  }
}
