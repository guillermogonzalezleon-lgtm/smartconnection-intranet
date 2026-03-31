import { getSession } from '@/lib/auth';
import { supabaseQuery } from '@/lib/supabase';

const AGENT_EMOJIS: Record<string, string> = {
  PM: '👔', Panchita: '🐕', Arielito: '🔍', Hoku: '🐾',
  ABAP: '🔧', Fiori: '🎨', Integrador: '🔌', Camilita: '👩',
  Sergito: '⚡', Comercial: '💼', Pipeline: '🛠️', ClienteX: '🎧',
};

function enrichDoc(doc: Record<string, unknown>) {
  return { ...doc, owner: doc.owner_agent, ownerEmoji: AGENT_EMOJIS[doc.owner_agent as string] || '📄' };
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const category = searchParams.get('category');
    const agent = searchParams.get('agent');

    // Si se pide un doc específico por slug
    if (slug) {
      const docs = await supabaseQuery('governance_documents', 'GET', {
        filter: `slug=eq.${slug}`,
      });
      if (docs.length > 0) {
        return Response.json({ document: enrichDoc(docs[0]) });
      }
      return Response.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

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
        return Response.json({ owned: docs.map(enrichDoc), reads: readDocs.map(enrichDoc) });
      }
    }

    return Response.json({ documents: docs.map(enrichDoc) });
  } catch (err) {
    console.error('[governance/documents] Error:', err);
    return Response.json({ error: 'Error al cargar documentos de governance' }, { status: 500 });
  }
}
