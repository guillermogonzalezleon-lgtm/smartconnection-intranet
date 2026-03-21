import { NextResponse } from 'next/server';
import { supabaseInsert } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'contact') {
      const { nombre, empresa, email, telefono, servicio, mensaje, website } = body;
      if (!nombre || !email || !servicio || !mensaje) {
        return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 });
      }
      // Honeypot
      if (website) {
        return NextResponse.json({ success: true });
      }

      const record = await supabaseInsert('leads', { nombre, empresa, email, telefono, servicio, mensaje, fuente: 'website', estado: 'nuevo' });
      return NextResponse.json({ success: true, id: record[0]?.id });
    }

    if (action === 'scheduler') {
      const { nombre, email, fecha, hora, tema } = body;
      if (!nombre || !email || !fecha || !hora) {
        return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 });
      }

      const record = await supabaseInsert('reuniones', { nombre, email, fecha, hora, tema, estado: 'pendiente' });
      return NextResponse.json({ success: true, id: record[0]?.id });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
