import { getSession } from '@/lib/auth';
import { getFileContent, getFileMetadata } from '@/lib/google-drive';

export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const session = await getSession();
    if (!session.valid) return new Response('No autorizado', { status: 401 });

    const { fileId } = await params;

    if (!fileId || fileId.length < 10) {
      return Response.json({ error: 'fileId inválido' }, { status: 400 });
    }

    const [html, metadata] = await Promise.all([
      getFileContent(fileId),
      getFileMetadata(fileId),
    ]);

    return Response.json({
      html,
      metadata: {
        id: metadata.id,
        name: metadata.name,
        mimeType: metadata.mimeType,
        modifiedTime: metadata.modifiedTime,
      },
    });
  } catch (err) {
    console.error('[governance/drive] Error:', err);
    return Response.json({ error: 'Error al obtener contenido de Drive' }, { status: 500 });
  }
}
