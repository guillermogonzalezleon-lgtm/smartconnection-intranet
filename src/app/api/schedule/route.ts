import { NextResponse } from 'next/server';
import { createMeeting } from '@/lib/calendar';
import { supabaseInsert } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { nombre, email, fecha, hora, tema } = await request.json();

    if (!nombre || !email || !fecha || !hora) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 });
    }

    const result = await createMeeting({ nombre, email, fecha, hora, tema: tema || 'General' });

    await supabaseInsert('reuniones', {
      nombre, email, fecha, hora, tema,
      estado: result.eventId ? 'confirmed' : 'pending',
    }).catch(() => {});

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
